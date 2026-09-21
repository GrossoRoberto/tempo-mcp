#!/usr/bin/env node
/**
 * tempoMCP — Server MCP che dà agli LLM consapevolezza del tempo reale.
 *
 * Scopo: l'umano usa riferimenti temporali relativi ("ieri", "la settimana
 * scorsa") che per l'LLM significano poco. Questo server:
 *  1. istruisce l'LLM (campo `instructions`) a marcare OGNI risposta con il
 *     timestamp corrente nel formato YYYY/MM/DD HH:MM:SS (fuso del PC);
 *  2. espone la risorsa `tempo://adesso` con data/ora correnti, aggiornata
 *     via push ogni 30s per i client che la sottoscrivono;
 *  3. fornisce tool di supporto:
 *     - ora_attuale:            data/ora correnti in un fuso orario IANA
 *     - durata_sessione:        tempo trascorso dall'avvio del server
 *     - converti_fuso_orario:   converte una data/ora da un fuso all'altro
 *     - differenza_fusi:        differenza oraria tra due fusi in questo momento
 *
 * Così "la decisione presa ieri" diventa un intervallo di timestamp concreto
 * che l'LLM può ritrovare nella conversazione.
 *
 * Trasporto: stdio (compatibile con Claude Desktop, pi, ecc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Istante di avvio del server ≈ inizio della sessione/conversazione
const SESSION_START = Date.now();

const GIORNI_IT = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const MESI_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

/** Verifica che un fuso orario IANA sia valido. */
function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Estrae le componenti data/ora di un istante in un dato fuso orario. */
function partiOrario(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    timeZoneName: "shortOffset",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, x.value])
  );
  const giorniEn = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    anno: Number(p.year),
    mese: Number(p.month),
    giorno: Number(p.day),
    ora: Number(p.hour),
    minuto: Number(p.minute),
    secondo: Number(p.second),
    giornoSettimana: giorniEn[p.weekday],
    offset: p.timeZoneName, // es. "GMT+2"
  };
}

/** Offset in minuti di un fuso orario rispetto a UTC in un dato istante. */
function offsetMinuti(date, timeZone) {
  const c = partiOrario(date, timeZone);
  const asUtc = Date.UTC(c.anno, c.mese - 1, c.giorno, c.ora, c.minuto, c.secondo);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function formatoOffset(minuti) {
  const segno = minuti >= 0 ? "+" : "-";
  const a = Math.abs(minuti);
  return `${segno}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** Descrizione completa di un istante in un fuso orario. */
function descriviIstante(date, timeZone) {
  const c = partiOrario(date, timeZone);
  const off = offsetMinuti(date, timeZone);
  const data = `${c.anno}-${String(c.mese).padStart(2, "0")}-${String(c.giorno).padStart(2, "0")}`;
  const ora = `${String(c.ora).padStart(2, "0")}:${String(c.minuto).padStart(2, "0")}:${String(c.secondo).padStart(2, "0")}`;
  return {
    iso_locale: `${data}T${ora}${formatoOffset(off)}`,
    data_leggibile: `${GIORNI_IT[c.giornoSettimana]} ${c.giorno} ${MESI_IT[c.mese - 1]} ${c.anno}`,
    ora_leggibile: ora,
    fuso_orario: timeZone,
    offset_utc: formatoOffset(off),
    timestamp_unix: Math.floor(date.getTime() / 1000),
    timestamp_unix_ms: date.getTime(),
  };
}

/** Formatta una durata in ms in forma leggibile italiana. */
function formatoDurata(ms) {
  const s = Math.floor(ms / 1000);
  const parti = [];
  const giorni = Math.floor(s / 86400);
  const ore = Math.floor((s % 86400) / 3600);
  const minuti = Math.floor((s % 3600) / 60);
  const secondi = s % 60;
  if (giorni) parti.push(`${giorni} ${giorni === 1 ? "giorno" : "giorni"}`);
  if (ore) parti.push(`${ore} ${ore === 1 ? "ora" : "ore"}`);
  if (minuti) parti.push(`${minuti} ${minuti === 1 ? "minuto" : "minuti"}`);
  if (secondi || parti.length === 0) parti.push(`${secondi} ${secondi === 1 ? "secondo" : "secondi"}`);
  return parti.join(", ");
}

function testo(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const URI_ADESSO = "tempo://adesso";
const INTERVALLO_PUSH_MS = 30_000;

/** Istruzioni inviate al client MCP alla connessione: è il meccanismo che
 *  rende automatico il marcamento temporale di ogni risposta dell'LLM. */
const ISTRUZIONI = `Hai accesso al tempo reale tramite il server MCP "tempo-mcp". Segui SEMPRE queste regole:

1. MARCATURA TEMPORALE: inizia OGNI tua risposta con il timestamp corrente nel formato YYYY/MM/DD HH:MM:SS (es. 2026/09/21 17:05:42), usando il fuso orario del PC dell'utente. Ottieni l'ora dalla risorsa ${URI_ADESSO} (se disponibile in contesto) oppure chiamando il tool ora_attuale.

2. RIFERIMENTI TEMPORALI RELATIVI: quando l'utente usa espressioni come "ieri", "la settimana scorsa", "qualche giorno fa", "l'ultima volta" (nella lingua della conversazione), traducile in date/intervalli assoluti basandoti sull'ora corrente, e usali per interpretare i timestamp presenti nella conversazione (es. "il codice di ieri" = i messaggi marcati con la data di ieri).

3. ATTENDIBILITÀ: non stimare mai l'ora a memoria. La data del tuo training NON è la data attuale: usa sempre il valore fornito da questo server, che viene aggiornato periodicamente.`;

const server = new McpServer(
  {
    name: "tempo-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: { subscribe: true },
    },
    instructions: ISTRUZIONI,
  }
);

server.registerTool(
  "ora_attuale",
  {
    title: "Ora attuale",
    description:
      "Restituisce la data e l'ora correnti (tempo reale) in un fuso orario IANA. " +
      "Se non specificato, usa il fuso orario del sistema. " +
      "Utile per sapere 'che ore sono adesso' durante la conversazione.",
    inputSchema: {
      fuso_orario: z
        .string()
        .optional()
        .describe("Fuso orario IANA, es. 'Europe/Rome', 'America/New_York', 'UTC'"),
    },
  },
  async ({ fuso_orario }) => {
    const tz = fuso_orario ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(tz)) {
      return { content: [{ type: "text", text: `Errore: fuso orario non valido: '${tz}'` }], isError: true };
    }
    return testo(descriviIstante(new Date(), tz));
  }
);

server.registerTool(
  "durata_sessione",
  {
    title: "Durata della sessione",
    description:
      "Restituisce quanto tempo è trascorso dall'avvio del server MCP (≈ inizio della conversazione), " +
      "l'istante di inizio e l'istante attuale. Utile per percepire lo scorrere del tempo nel dialogo.",
    inputSchema: {
      fuso_orario: z
        .string()
        .optional()
        .describe("Fuso orario IANA per gli istanti restituiti"),
    },
  },
  async ({ fuso_orario }) => {
    const tz = fuso_orario ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(tz)) {
      return { content: [{ type: "text", text: `Errore: fuso orario non valido: '${tz}'` }], isError: true };
    }
    const adesso = new Date();
    const trascorsoMs = adesso.getTime() - SESSION_START;
    return testo({
      trascorso_leggibile: formatoDurata(trascorsoMs),
      trascorso_secondi: Math.floor(trascorsoMs / 1000),
      trascorso_ms: trascorsoMs,
      inizio_sessione: descriviIstante(new Date(SESSION_START), tz),
      adesso: descriviIstante(adesso, tz),
    });
  }
);

server.registerTool(
  "converti_fuso_orario",
  {
    title: "Converti tra fusi orari",
    description:
      "Converte una data/ora da un fuso orario di origine a uno di destinazione. " +
      "La data/ora va indicata in formato ISO 8601 (es. '2025-06-15T14:30:00'), interpretata nel fuso di origine.",
    inputSchema: {
      data_ora: z.string().describe("Data/ora ISO 8601 locale, es. '2025-06-15T14:30:00' o '2025-06-15 14:30'"),
      da_fuso: z.string().describe("Fuso orario IANA di origine, es. 'Europe/Rome'"),
      a_fuso: z.string().describe("Fuso orario IANA di destinazione, es. 'America/New_York'"),
    },
  },
  async ({ data_ora, da_fuso, a_fuso }) => {
    for (const [tz, nome] of [[da_fuso, "da_fuso"], [a_fuso, "a_fuso"]]) {
      if (!isValidTimeZone(tz)) {
        return { content: [{ type: "text", text: `Errore: fuso orario non valido in ${nome}: '${tz}'` }], isError: true };
      }
    }
    // Interpreta la data/ora locale nel fuso di origine
    const m = data_ora.trim().replace(" ", "T").match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (!m) {
      return {
        content: [{ type: "text", text: `Errore: formato data/ora non riconosciuto: '${data_ora}'. Usa 'YYYY-MM-DDTHH:MM:SS'.` }],
        isError: true,
      };
    }
    const [, Y, Mo, D, H = "00", Mi = "00", S = "00"] = m;
    // Stima iniziale come se fosse UTC, poi corregge con l'offset reale del fuso (2 passaggi per i casi limite DST)
    let guess = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S);
    guess -= offsetMinuti(new Date(guess), da_fuso) * 60000;
    guess = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S) - offsetMinuti(new Date(guess), da_fuso) * 60000;
    const istante = new Date(guess);
    return testo({
      origine: descriviIstante(istante, da_fuso),
      destinazione: descriviIstante(istante, a_fuso),
    });
  }
);

server.registerTool(
  "differenza_fusi",
  {
    title: "Differenza tra fusi orari",
    description:
      "Calcola la differenza oraria (in ore) tra due fusi orari in questo momento, " +
      "tenendo conto dell'ora legale.",
    inputSchema: {
      fuso_a: z.string().describe("Primo fuso orario IANA, es. 'Europe/Rome'"),
      fuso_b: z.string().describe("Secondo fuso orario IANA, es. 'Asia/Tokyo'"),
    },
  },
  async ({ fuso_a, fuso_b }) => {
    for (const tz of [fuso_a, fuso_b]) {
      if (!isValidTimeZone(tz)) {
        return { content: [{ type: "text", text: `Errore: fuso orario non valido: '${tz}'` }], isError: true };
      }
    }
    const adesso = new Date();
    const offA = offsetMinuti(adesso, fuso_a);
    const offB = offsetMinuti(adesso, fuso_b);
    const diff = offB - offA;
    const ore = Math.abs(diff) / 60;
    return testo({
      fuso_a: { nome: fuso_a, offset_utc: formatoOffset(offA), ora_attuale: descriviIstante(adesso, fuso_a).ora_leggibile },
      fuso_b: { nome: fuso_b, offset_utc: formatoOffset(offB), ora_attuale: descriviIstante(adesso, fuso_b).ora_leggibile },
      differenza_ore: diff / 60,
      descrizione:
        diff === 0
          ? `${fuso_a} e ${fuso_b} hanno la stessa ora`
          : `${fuso_b} è ${ore} ${ore === 1 ? "ora" : "ore"} ${diff > 0 ? "avanti" : "indietro"} rispetto a ${fuso_a}`,
    });
  }
);

// ---------------------------------------------------------------------------
// Risorsa tempo://adesso — orologio in contesto, con aggiornamenti push
// ---------------------------------------------------------------------------

server.registerResource(
  "adesso",
  URI_ADESSO,
  {
    title: "Data e ora correnti",
    description:
      "Data e ora correnti (fuso orario del PC). Il server invia una notifica di aggiornamento ogni 30 secondi ai client sottoscritti.",
    mimeType: "application/json",
  },
  async (uri) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(descriviIstante(new Date(), tz), null, 2),
        },
      ],
    };
  }
);

// Gestione sottoscrizioni: l'SDK non le implementa automaticamente lato server
const iscritti = new Set();
server.server.setRequestHandler(SubscribeRequestSchema, async (req) => {
  iscritti.add(req.params.uri);
  return {};
});
server.server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
  iscritti.delete(req.params.uri);
  return {};
});

// Avvio
const transport = new StdioServerTransport();
await server.connect(transport);

// Push periodico dell'ora aggiornata ai client sottoscritti
const timerPush = setInterval(() => {
  if (iscritti.has(URI_ADESSO)) {
    void server.server
      .notification({
        method: "notifications/resources/updated",
        params: { uri: URI_ADESSO },
      })
      .catch(() => {}); // client disconnesso: ignora
  }
}, INTERVALLO_PUSH_MS);
timerPush.unref();
console.error(`[tempo-mcp] Server avviato (sessione iniziata: ${new Date(SESSION_START).toISOString()})`);
