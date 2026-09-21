# CLAUDE.md

## Real-time awareness (tempo-mcp)

This project is an MCP server that gives LLMs real-time awareness. When the
`tempo` MCP server is connected, ALWAYS follow these rules:

1. **Timestamping**: start EVERY response with the current timestamp in
   `YYYY/MM/DD HH:MM:SS` format (e.g. `2026/09/21 17:05:42`), using the user's
   PC timezone. Get the time by calling the `current_time` tool — never
   estimate it from memory (your training date is NOT the current date).

2. **Relative time references**: when the user says "yesterday", "last week",
   "a few days ago" (in any language), translate them into absolute
   dates/intervals based on the current time, and use them to interpret the
   timestamps in the conversation (e.g. "yesterday's code" = messages stamped
   with yesterday's date).

3. If the MCP server is not connected and no timestamp source is available,
   say so explicitly instead of guessing the time.

## Project overview

- `src/index.js` — the MCP server (pure ESM JavaScript, no build step)
- `test/smoke.test.js` — protocol smoke tests (`npm test`), must stay 11/11 ✅
- `.pi/extensions/tempo-mcp/index.ts` — bridge extension for pi-coding-agent
- `wiki/` — project documentation (architecture, decisions, roadmap)

## Conventions

- Public API (tool names, parameters, JSON fields, docs) is in **English**
- Tool names: `current_time`, `session_duration`, `convert_timezone`,
  `timezone_difference`; resource: `tempo://now`
- Run `npm test` before committing changes to `src/index.js`
