#!/usr/bin/env node
/**
 * tempo-mcp — MCP server that gives LLMs real-time awareness.
 *
 * Purpose: humans use relative time references ("yesterday", "last week")
 * that mean little to an LLM. This server:
 *  1. instructs the LLM (via the `instructions` field) to prefix EVERY
 *     response with the current timestamp in YYYY/MM/DD HH:MM:SS format
 *     (PC timezone);
 *  2. exposes the `tempo://now` resource with the current date/time,
 *     push-updated every 30s for subscribed clients;
 *  3. provides supporting tools:
 *     - current_time:        current date/time in an IANA timezone
 *     - session_duration:    time elapsed since server startup
 *     - convert_timezone:    converts a date/time from one timezone to another
 *     - timezone_difference: current time difference between two timezones
 *
 * This way "the decision we made yesterday" becomes a concrete timestamp
 * interval the LLM can find in the conversation.
 *
 * Transport: stdio (compatible with Claude Desktop, pi, etc.)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Server startup instant ≈ start of the session/conversation
const SESSION_START = Date.now();

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Checks that an IANA timezone is valid. */
function isValidTimeZone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Extracts date/time components of an instant in a given timezone. */
function timeParts(date, timeZone) {
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
  const daysEn = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: daysEn[p.weekday],
    offset: p.timeZoneName, // e.g. "GMT+2"
  };
}

/** Offset in minutes of a timezone from UTC at a given instant. */
function offsetMinutes(date, timeZone) {
  const c = timeParts(date, timeZone);
  const asUtc = Date.UTC(c.year, c.month - 1, c.day, c.hour, c.minute, c.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function formatOffset(minutes) {
  const sign = minutes >= 0 ? "+" : "-";
  const a = Math.abs(minutes);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** Full description of an instant in a timezone. */
function describeInstant(date, timeZone) {
  const c = timeParts(date, timeZone);
  const off = offsetMinutes(date, timeZone);
  const day = `${c.year}-${String(c.month).padStart(2, "0")}-${String(c.day).padStart(2, "0")}`;
  const time = `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}:${String(c.second).padStart(2, "0")}`;
  return {
    local_iso: `${day}T${time}${formatOffset(off)}`,
    readable_date: `${DAYS_EN[c.weekday]}, ${MONTHS_EN[c.month - 1]} ${c.day}, ${c.year}`,
    readable_time: time,
    timezone: timeZone,
    utc_offset: formatOffset(off),
    timestamp_unix: Math.floor(date.getTime() / 1000),
    timestamp_unix_ms: date.getTime(),
  };
}

/** Formats a duration in ms into human-readable English. */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const parts = [];
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (days) parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  return parts.join(", ");
}

function text(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const URI_NOW = "tempo://now";
const PUSH_INTERVAL_MS = 30_000;

/** Instructions sent to the MCP client on connection: this is the mechanism
 *  that makes timestamping of every LLM response automatic. */
const INSTRUCTIONS = `You have access to real time through the MCP server "tempo-mcp". ALWAYS follow these rules:

1. TIMESTAMPING: start EVERY response with the current timestamp in YYYY/MM/DD HH:MM:SS format (e.g. 2026/09/21 17:05:42), using the user's PC timezone. Get the time from the ${URI_NOW} resource (if available in context) or by calling the current_time tool.

2. RELATIVE TIME REFERENCES: when the user uses expressions like "yesterday", "last week", "a few days ago", "last time" (in the conversation language), translate them into absolute dates/intervals based on the current time, and use them to interpret timestamps in the conversation (e.g. "yesterday's code" = messages stamped with yesterday's date).

3. RELIABILITY: never estimate the time from memory. Your training date is NOT the current date: always use the value provided by this server, which is updated periodically.`;

const server = new McpServer(
  {
    name: "tempo-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: { subscribe: true },
    },
    instructions: INSTRUCTIONS,
  }
);

server.registerTool(
  "current_time",
  {
    title: "Current time",
    description:
      "Returns the current date and time (real time) in an IANA timezone. " +
      "If not specified, uses the system timezone. " +
      "Useful to know 'what time is it now' during the conversation.",
    inputSchema: {
      timezone: z
        .string()
        .optional()
        .describe("IANA timezone, e.g. 'Europe/Rome', 'America/New_York', 'UTC'"),
    },
  },
  async ({ timezone }) => {
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(tz)) {
      return { content: [{ type: "text", text: `Error: invalid timezone: '${tz}'` }], isError: true };
    }
    return text(describeInstant(new Date(), tz));
  }
);

server.registerTool(
  "session_duration",
  {
    title: "Session duration",
    description:
      "Returns how much time has elapsed since the MCP server started (≈ conversation start), " +
      "the start instant and the current instant. Useful to perceive the flow of time in the dialogue.",
    inputSchema: {
      timezone: z
        .string()
        .optional()
        .describe("IANA timezone for the returned instants"),
    },
  },
  async ({ timezone }) => {
    const tz = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!isValidTimeZone(tz)) {
      return { content: [{ type: "text", text: `Error: invalid timezone: '${tz}'` }], isError: true };
    }
    const now = new Date();
    const elapsedMs = now.getTime() - SESSION_START;
    return text({
      elapsed_readable: formatDuration(elapsedMs),
      elapsed_seconds: Math.floor(elapsedMs / 1000),
      elapsed_ms: elapsedMs,
      session_start: describeInstant(new Date(SESSION_START), tz),
      now: describeInstant(now, tz),
    });
  }
);

server.registerTool(
  "convert_timezone",
  {
    title: "Convert between timezones",
    description:
      "Converts a date/time from a source timezone to a destination timezone. " +
      "The date/time must be in ISO 8601 format (e.g. '2025-06-15T14:30:00'), interpreted in the source timezone.",
    inputSchema: {
      datetime: z.string().describe("Local ISO 8601 date/time, e.g. '2025-06-15T14:30:00' or '2025-06-15 14:30'"),
      from_timezone: z.string().describe("Source IANA timezone, e.g. 'Europe/Rome'"),
      to_timezone: z.string().describe("Destination IANA timezone, e.g. 'America/New_York'"),
    },
  },
  async ({ datetime, from_timezone, to_timezone }) => {
    for (const [tz, name] of [[from_timezone, "from_timezone"], [to_timezone, "to_timezone"]]) {
      if (!isValidTimeZone(tz)) {
        return { content: [{ type: "text", text: `Error: invalid timezone in ${name}: '${tz}'` }], isError: true };
      }
    }
    // Interpret the local date/time in the source timezone
    const m = datetime.trim().replace(" ", "T").match(
      /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );
    if (!m) {
      return {
        content: [{ type: "text", text: `Error: unrecognized date/time format: '${datetime}'. Use 'YYYY-MM-DDTHH:MM:SS'.` }],
        isError: true,
      };
    }
    const [, Y, Mo, D, H = "00", Mi = "00", S = "00"] = m;
    // Initial guess as if it were UTC, then correct with the real timezone offset (2 passes for DST edge cases)
    let guess = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S);
    guess -= offsetMinutes(new Date(guess), from_timezone) * 60000;
    guess = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +S) - offsetMinutes(new Date(guess), from_timezone) * 60000;
    const instant = new Date(guess);
    return text({
      source: describeInstant(instant, from_timezone),
      destination: describeInstant(instant, to_timezone),
    });
  }
);

server.registerTool(
  "timezone_difference",
  {
    title: "Timezone difference",
    description:
      "Calculates the time difference (in hours) between two timezones right now, " +
      "taking daylight saving time into account.",
    inputSchema: {
      timezone_a: z.string().describe("First IANA timezone, e.g. 'Europe/Rome'"),
      timezone_b: z.string().describe("Second IANA timezone, e.g. 'Asia/Tokyo'"),
    },
  },
  async ({ timezone_a, timezone_b }) => {
    for (const tz of [timezone_a, timezone_b]) {
      if (!isValidTimeZone(tz)) {
        return { content: [{ type: "text", text: `Error: invalid timezone: '${tz}'` }], isError: true };
      }
    }
    const now = new Date();
    const offA = offsetMinutes(now, timezone_a);
    const offB = offsetMinutes(now, timezone_b);
    const diff = offB - offA;
    const hours = Math.abs(diff) / 60;
    return text({
      timezone_a: { name: timezone_a, utc_offset: formatOffset(offA), current_time: describeInstant(now, timezone_a).readable_time },
      timezone_b: { name: timezone_b, utc_offset: formatOffset(offB), current_time: describeInstant(now, timezone_b).readable_time },
      difference_hours: diff / 60,
      description:
        diff === 0
          ? `${timezone_a} and ${timezone_b} have the same time`
          : `${timezone_b} is ${hours} ${hours === 1 ? "hour" : "hours"} ${diff > 0 ? "ahead of" : "behind"} ${timezone_a}`,
    });
  }
);

// ---------------------------------------------------------------------------
// Resource tempo://now — clock in context, with push updates
// ---------------------------------------------------------------------------

server.registerResource(
  "now",
  URI_NOW,
  {
    title: "Current date and time",
    description:
      "Current date and time (PC timezone). The server sends an update notification every 30 seconds to subscribed clients.",
    mimeType: "application/json",
  },
  async (uri) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(describeInstant(new Date(), tz), null, 2),
        },
      ],
    };
  }
);

// Subscription handling: the SDK does not implement them automatically server-side
const subscribers = new Set();
server.server.setRequestHandler(SubscribeRequestSchema, async (req) => {
  subscribers.add(req.params.uri);
  return {};
});
server.server.setRequestHandler(UnsubscribeRequestSchema, async (req) => {
  subscribers.delete(req.params.uri);
  return {};
});

// Startup
const transport = new StdioServerTransport();
await server.connect(transport);

// Periodic push of the updated time to subscribed clients
const pushTimer = setInterval(() => {
  if (subscribers.has(URI_NOW)) {
    void server.server
      .notification({
        method: "notifications/resources/updated",
        params: { uri: URI_NOW },
      })
      .catch(() => {}); // disconnected client: ignore
  }
}, PUSH_INTERVAL_MS);
pushTimer.unref();
console.error(`[tempo-mcp] Server started (session started: ${new Date(SESSION_START).toISOString()})`);
