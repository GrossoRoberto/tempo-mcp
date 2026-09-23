/**
 * pi ↔ tempo-mcp bridge — USER-LEVEL installation.
 *
 * This variant is meant to be copied to:
 *   ~/.pi/agent/extensions/tempo-mcp/          (user level, works from any folder)
 *   <project>/.pi/extensions/tempo-mcp/        (project level)
 *
 * It spawns the tempo-mcp server as a child process and:
 *  - registers every MCP tool as a native pi tool;
 *  - injects the server `instructions` + the current time (read from the
 *    tempo://now resource) into the system prompt before every agent run;
 *  - shows a clock in the status bar (refreshed every 30s).
 *
 * Server resolution order:
 *  1. TEMPO_MCP_SERVER env var → absolute path to a local src/index.js
 *     (development checkout only);
 *  2. `npx -y github:GrossoRoberto/tempo-mcp` → no clone required.
 *
 * Lifecycle: server starts on session_start, stops on session_shutdown.
 *
 * NOTE: the sibling file package.json (with @modelcontextprotocol/sdk) must
 * be installed next to this file (`npm install` in the extension folder).
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync } from "node:fs";

const NOW_URI = "tempo://now";
const STATUS_INTERVAL_MS = 30_000;
const NPM_SPEC = "github:GrossoRoberto/tempo-mcp"; // "tempo-mcp" after npm publish

function serverSpawn(): { command: string; args: string[] } {
  const local = process.env.TEMPO_MCP_SERVER;
  if (local && existsSync(local)) {
    return { command: process.execPath, args: [local] };
  }
  // Windows cannot spawn .cmd shims directly: go through cmd.exe
  if (process.platform === "win32") {
    return { command: "cmd.exe", args: ["/c", "npx", "-y", NPM_SPEC] };
  }
  return { command: "npx", args: ["-y", NPM_SPEC] };
}

export default function (pi: ExtensionAPI) {
  let client: Client | null = null;
  let instructions = "";
  let statusTimer: ReturnType<typeof setInterval> | null = null;

  /** Reads the current time from the MCP resource. null when unavailable. */
  async function readNow(): Promise<string | null> {
    if (!client) return null;
    try {
      const res = await client.readResource({ uri: NOW_URI });
      const c = res.contents?.[0] as { text?: unknown } | undefined;
      return c && typeof c.text === "string" ? c.text : null;
    } catch {
      return null;
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    try {
      const spawn = serverSpawn();
      const transport = new StdioClientTransport({
        command: spawn.command,
        args: spawn.args,
      });
      const c = new Client(
        { name: "pi-tempo-bridge", version: "1.0.0" },
        { capabilities: {} }
      );
      await c.connect(transport);
      client = c;
      instructions = c.getInstructions() ?? "";

      // Register every MCP tool as a native pi tool
      const { tools } = await c.listTools();
      for (const tool of tools) {
        pi.registerTool({
          name: tool.name,
          label: tool.title ?? tool.annotations?.title ?? tool.name,
          description: tool.description ?? "",
          // MCP inputSchema is standard JSON Schema, typebox-compatible
          parameters: tool.inputSchema as never,
          async execute(_toolCallId, params) {
            if (!client) throw new Error("MCP client not connected");
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

      // Status bar clock
      if (ctx.hasUI) {
        const tick = async () => {
          const text = await readNow();
          if (!text) return;
          try {
            const p = JSON.parse(text) as { readable_date?: string; readable_time?: string };
            ctx.ui.setStatus("tempo-mcp", `🕐 ${p.readable_date ?? ""} ${p.readable_time ?? ""}`.trim());
          } catch {
            ctx.ui.setStatus("tempo-mcp", text);
          }
        };
        await tick();
        statusTimer = setInterval(tick, STATUS_INTERVAL_MS);
        ctx.ui.notify(`tempo-mcp connected: ${tools.length} tools registered`, "info");
      }
    } catch (err) {
      if (ctx.hasUI) ctx.ui.notify(`tempo-mcp: startup error: ${String(err)}`, "error");
    }
  });

  // Before every agent run: server instructions + fresh time in system prompt
  pi.on("before_agent_start", async (event) => {
    if (!client) return;
    const now = await readNow();
    const block = [
      "",
      "---",
      "INSTRUCTIONS FROM tempo-mcp MCP SERVER:",
      instructions,
      now ? `\nCurrent time (just read from the server):\n${now}` : "",
    ].join("\n");
    return { systemPrompt: event.systemPrompt + block };
  });

  pi.on("session_shutdown", async () => {
    if (statusTimer) clearInterval(statusTimer);
    statusTimer = null;
    try {
      await client?.close(); // closes the transport and terminates the child process
    } catch {
      /* ignore */
    }
    client = null;
    instructions = "";
  });
}
