# pi extension (MCP bridge)

**File**: `.pi/extensions/tempo-mcp/index.ts`

pi-coding-agent [deliberately does not include MCP](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/): this extension is the client.

## What it does

1. **`session_start`** — spawns `node src/index.js` as a child process (`StdioClientTransport`), connects and:
   - registers every MCP tool as a native pi tool (`pi.registerTool`; the MCP JSON Schema is typebox-compatible);
   - shows the clock in the status bar, refreshed every 30s by re-reading the resource.
2. **`before_agent_start`** — on every user prompt, appends to the system prompt:
   - the server `instructions` (timestamping rules);
   - the current time freshly read from the `tempo://now` resource.
3. **`session_shutdown`** — closes the client (the transport terminates the child process) and stops the timer.

## Technical notes

- Dependencies (`@modelcontextprotocol/sdk`) resolve from the project root `node_modules` (jiti walks up the tree).
- The server path is `join(ctx.cwd, "src", "index.js")` → pi must be started from the project root. *To be generalized when it becomes an npm package (spawn `npx tempo-mcp`).*
- Processes/timers start only in `session_start` (never in the factory), as recommended by the pi documentation.

## End-to-end test (2026-09-21)

```
$ pi -p --no-session -e .pi/extensions/tempo-mcp/index.ts \
    "Che ore sono adesso e quanto tempo è passato dall'inizio di questa conversazione?"

2026/09/21 17:25:53
Sono le 17:25:53. Dall'inizio della conversazione sono passati 8 secondi.
```

✅ Timestamping in the exact format · ✅ `session_duration` tool called autonomously

**This is currently the only harness where tempo-mcp has been tested end-to-end.**
