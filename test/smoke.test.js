/**
 * Smoke test del protocollo MCP di tempo-mcp.
 * Avvia il server su stdio e verifica: handshake, instructions, lista tool,
 * chiamata ai tool, lettura risorsa tempo://adesso.
 *
 * Esecuzione: npm test
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let falliti = 0;

function ok(cond, nome) {
  console.log(`${cond ? "✅" : "❌"} ${nome}`);
  if (!cond) falliti++;
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "src", "index.js")],
});
const client = new Client({ name: "smoke-test", version: "1.0.0" }, { capabilities: {} });

try {
  await client.connect(transport);

  const istruzioni = client.getInstructions() ?? "";
  ok(istruzioni.includes("YYYY/MM/DD HH:MM:SS"), "instructions: marcatura temporale presente");

  const { tools } = await client.listTools();
  const nomi = tools.map((t) => t.name);
  for (const atteso of ["ora_attuale", "durata_sessione", "converti_fuso_orario", "differenza_fusi"]) {
    ok(nomi.includes(atteso), `tool registrato: ${atteso}`);
  }

  const ora = await client.callTool({ name: "ora_attuale", arguments: { fuso_orario: "Europe/Rome" } });
  const datiOra = JSON.parse(ora.content[0].text);
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(datiOra.iso_locale), "ora_attuale: ISO 8601 con offset");
  ok(typeof datiOra.timestamp_unix === "number" && datiOra.timestamp_unix > 1_700_000_000, "ora_attuale: timestamp unix plausibile");

  const err = await client.callTool({ name: "ora_attuale", arguments: { fuso_orario: "Marte/Olympus" } });
  ok(err.isError === true, "ora_attuale: fuso non valido → errore gestito");

  const conv = await client.callTool({
    name: "converti_fuso_orario",
    arguments: { data_ora: "2025-06-15T14:30:00", da_fuso: "Europe/Rome", a_fuso: "America/New_York" },
  });
  const datiConv = JSON.parse(conv.content[0].text);
  ok(datiConv.destinazione.ora_leggibile === "08:30:00", "converti_fuso_orario: 14:30 Roma → 08:30 New York (DST)");

  const diff = await client.callTool({ name: "differenza_fusi", arguments: { fuso_a: "Europe/Rome", fuso_b: "Asia/Tokyo" } });
  const datiDiff = JSON.parse(diff.content[0].text);
  ok([6, 7].includes(datiDiff.differenza_ore), `differenza_fusi: Roma–Tokyo = ${datiDiff.differenza_ore}h (6 o 7 a seconda della DST)`);

  const risorsa = await client.readResource({ uri: "tempo://adesso" });
  const datiRisorsa = JSON.parse(risorsa.contents[0].text);
  ok(typeof datiRisorsa.iso_locale === "string", "risorsa tempo://adesso leggibile");
} catch (e) {
  console.error("❌ Eccezione durante il test:", e);
  falliti++;
} finally {
  await client.close();
}

console.log(falliti === 0 ? "\nTutti i test superati 🎉" : `\n${falliti} test falliti`);
process.exit(falliti === 0 ? 0 : 1);
