/**
 * Ponte pi ↔ tempo-mcp
 *
 * pi non include un client MCP: questa estensione avvia il server
 * (src/index.js del progetto) come processo figlio e:
 *  - registra ogni tool MCP come tool nativo di pi;
 *  - inietta nel system prompt, a ogni richiesta utente, le `instructions`
 *    del server + l'orario corrente letto dalla risorsa tempo://adesso;
 *  - mostra l'orologio nella status bar (aggiornato ogni 30s).
 *
 * Il ciclo di vita segue le sessioni pi: avvio su session_start,
 * chiusura su session_shutdown.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from "node:path";

const URI_ADESSO = "tempo://now";
const INTERVALLO_STATUS_MS = 30_000;

export default function (pi: ExtensionAPI) {
  let client: Client | null = null;
  let instructions = "";
  let statusTimer: ReturnType<typeof setInterval> | null = null;

  /** Legge l'orario corrente dalla risorsa MCP. null se non disponibile. */
  async function leggiAdesso(): Promise<string | null> {
    if (!client) return null;
    try {
      const res = await client.readResource({ uri: URI_ADESSO });
      const c = res.contents?.[0] as { text?: unknown } | undefined;
      return c && typeof c.text === "string" ? c.text : null;
    } catch {
      return null;
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    try {
      const serverPath = join(ctx.cwd, "src", "index.js");
      const transport = new StdioClientTransport({
        command: process.execPath, // node.exe corrente
        args: [serverPath],
      });
      const c = new Client(
        { name: "pi-tempo-bridge", version: "1.0.0" },
        { capabilities: {} }
      );
      await c.connect(transport);
      client = c;
      instructions = c.getInstructions() ?? "";

      // Registra ogni tool MCP come tool nativo di pi
      const { tools } = await c.listTools();
      for (const tool of tools) {
        pi.registerTool({
          name: tool.name,
          label: tool.title ?? tool.annotations?.title ?? tool.name,
          description: tool.description ?? "",
          // inputSchema MCP è JSON Schema standard, compatibile con typebox
          parameters: tool.inputSchema as never,
          async execute(_toolCallId, params) {
            if (!client) throw new Error("Client MCP non connesso");
            const res = await client.callTool({
              name: tool.name,
              arguments: params as Record<string, unknown>,
            });
            const content = ((res.content as unknown[]) ?? []).map((b) => {
              const block = b as { type?: string; text?: string };
              return block.type === "text"
                ? { type: "text" as const, text: block.text ?? "" }
                : { type: "text" as const, text: JSON.stringify(block) };
            });
            return { content, details: {}, isError: Boolean(res.isError) };
          },
        });
      }

      // Orologio in status bar
      if (ctx.hasUI) {
        const tick = async () => {
          const testo = await leggiAdesso();
          if (!testo) return;
          try {
            const p = JSON.parse(testo) as { readable_date?: string; readable_time?: string };
            ctx.ui.setStatus("tempo-mcp", `🕐 ${p.readable_date ?? ""} ${p.readable_time ?? ""}`.trim());
          } catch {
            ctx.ui.setStatus("tempo-mcp", testo);
          }
        };
        await tick();
        statusTimer = setInterval(tick, INTERVALLO_STATUS_MS);
      }
      if (ctx.hasUI) ctx.ui.notify(`tempo-mcp connesso: ${tools.length} tool registrati`, "info");
    } catch (err) {
      if (ctx.hasUI) ctx.ui.notify(`tempo-mcp: errore di avvio: ${String(err)}`, "error");
    }
  });

  // A ogni prompt utente: istruzioni del server + orario fresco nel system prompt
  pi.on("before_agent_start", async (event) => {
    if (!client) return;
    const adesso = await leggiAdesso();
    const blocco = [
      "",
      "---",
      "ISTRUZIONI DAL SERVER MCP tempo-mcp:",
      instructions,
      adesso ? `\nOrario corrente (letto ora dal server):\n${adesso}` : "",
    ].join("\n");
    return { systemPrompt: event.systemPrompt + blocco };
  });

  pi.on("session_shutdown", async () => {
    if (statusTimer) clearInterval(statusTimer);
    statusTimer = null;
    try {
      await client?.close(); // chiude il trasporto e termina il processo figlio
    } catch {
      /* ignora */
    }
    client = null;
    instructions = "";
  });
}
