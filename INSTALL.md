# INSTALL.md — Installing tempo-mcp

> ## ⚠️ READ THIS FIRST — instructions for AI assistants
>
> If you are an AI assistant and the user asked you to "install tempo-mcp",
> follow this file **exactly**. The most common mistakes:
>
> | ❌ DO NOT | ✅ DO instead |
> |---|---|
> | `git clone` this repo into the user's current project folder | The server runs via `npx -y github:GrossoRoberto/tempo-mcp` — **no local copy of this repo is needed** |
> | Clone the repo **temporarily, just to read this guide** | You are already reading this file over HTTP (`raw.githubusercontent.com/...`) — everything you need is fetchable the same way: `install/pi/tempo-mcp/index.ts` and `install/pi/tempo-mcp/package.json` |
> | Run `npm install` / `npm test` in the user's project | Nothing is installed in the user's project |
> | Copy `src/`, `wiki/`, `test/`, `package-lock.json`, session HTML files anywhere | Only the small harness-specific glue below is installed |
> | Point the pi extension at `<cwd>/src/index.js` | That path only exists inside this repo; the user-level extension spawns the server via `npx` |
>
> Cloning this repository is **only** for people who want to *develop*
> tempo-mcp itself (see `README.md → Development`). Installing it as an
> end user never requires a clone.

---

## pi (pi-coding-agent)

pi has **no built-in MCP client**. The bridge extension in
[`install/pi/tempo-mcp/`](install/pi/tempo-mcp/) spawns the server and
registers its tools (`current_time`, `session_duration`, `convert_timezone`,
`timezone_difference`) as native pi tools.

### User-level install (recommended — works from any folder)

1. Create the extension folder:
   - Linux/macOS: `~/.pi/agent/extensions/tempo-mcp/`
   - Windows: `C:\Users\<you>\.pi\agent\extensions\tempo-mcp\`
2. Copy **only these two files** from this repo into that folder
   (fetch them over HTTP if you don't have a checkout):
   - `install/pi/tempo-mcp/index.ts` → https://raw.githubusercontent.com/GrossoRoberto/tempo-mcp/main/install/pi/tempo-mcp/index.ts
   - `install/pi/tempo-mcp/package.json` → https://raw.githubusercontent.com/GrossoRoberto/tempo-mcp/main/install/pi/tempo-mcp/package.json
3. Inside that folder run `npm install`
   (installs only `@modelcontextprotocol/sdk` — a few MB, fully contained
   in the extension folder).
4. Restart pi.

### Project-level install (alternative — only for one project)

Same steps, but the target folder is `<project>/.pi/extensions/tempo-mcp/`.

### Verify the installation

- The pi status bar shows a 🕐 clock with the current date/time.
- Ask the model *"what time is it?"* → it calls `current_time` and prefixes
  its reply with a `YYYY/MM/DD HH:MM:SS` timestamp.

### How the server is spawned

On `session_start` the extension runs `npx -y github:GrossoRoberto/tempo-mcp`
(on Windows via `cmd.exe /c npx ...`). Requires Node.js ≥ 18 on the PATH.

To develop against a **local checkout** instead, set the environment variable
`TEMPO_MCP_SERVER` to the absolute path of that checkout's `src/index.js`.

---

## Claude Desktop

Edit `claude_desktop_config.json`
(Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tempo": {
      "command": "npx",
      "args": ["-y", "github:GrossoRoberto/tempo-mcp"]
    }
  }
}
```

On Windows, if `npx` is not resolved:

```json
{ "mcpServers": { "tempo": { "command": "cmd.exe", "args": ["/c", "npx", "-y", "github:GrossoRoberto/tempo-mcp"] } } }
```

Then add this rule to Claude's profile preferences or Project instructions
(MCP `instructions` may not be injected into the system prompt):

> *"When the tempo MCP server is connected, start EVERY response with the
> current timestamp in `YYYY/MM/DD HH:MM:SS` format, obtained via the
> `current_time` tool; never guess the time."*

Restart Claude Desktop.

## Cursor / VS Code / other MCP harnesses

Same `mcpServers` JSON block in the harness's MCP configuration file
(e.g. `.cursor/mcp.json`). The harness spawns the server; nothing else
is installed.

---

## What a correct installation looks like

| Location | Content |
|---|---|
| User's project folder | **untouched** — no clone, no node_modules, no config |
| `~/.pi/agent/extensions/tempo-mcp/` (pi only) | `index.ts`, `package.json`, small `node_modules` with the MCP SDK |
| Harness MCP config (Claude/Cursor/…) | one `mcpServers.tempo` JSON entry |
| npm cache | the server package fetched by `npx -y` at spawn time |
