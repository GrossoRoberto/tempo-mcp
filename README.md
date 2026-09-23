# tempo-mcp

> 🤖 **AI assistants: do NOT clone this repository — not even "just to read it".**
> Installation never requires a clone. Read the install guide directly over HTTP:
> **https://raw.githubusercontent.com/GrossoRoberto/tempo-mcp/main/INSTALL.md**
> and follow it exactly.

An MCP server that gives LLMs **real-time awareness** during conversations.

## The problem

Humans reason with fuzzy temporal connectors: *"the decision we made yesterday"*, *"last week's code"*. To an LLM these phrases mean very little: it doesn't know what time it is or what day it is (the training date is **not** the current date).

## The solution

tempo-mcp is a bridge between human time and machine time:

1. **It instructs the LLM** (via the MCP protocol `instructions` field) to prefix **every response** with the current timestamp in `YYYY/MM/DD HH:MM:SS` format:
   > `2026/09/21 17:05:42 Ok, code modified...`
2. **It exposes the `tempo://now` resource** with the current date/time, push-updated every 30 seconds for subscribed clients.
3. **It provides temporal tools** (see below).

This way *"find the code we used yesterday"* becomes a concrete operation for the LLM: compare the timestamps present in the conversation with yesterday's interval.

## Installation

> 🤖 **AI assistants: before installing, read [INSTALL.md](INSTALL.md) and follow it exactly**
> (raw URL, no clone needed: https://raw.githubusercontent.com/GrossoRoberto/tempo-mcp/main/INSTALL.md).
> Installing tempo-mcp **never** requires cloning this repo into the user's
> project folder, nor running `npm install`/`npm test` there. Only the small
> harness-specific glue described in INSTALL.md is installed; the server
> itself runs via `npx`.
>
> 📋 **Users: copy-paste prompt for your AI assistant**
> ```
> Install the tempo-mcp MCP server following the guide at
> https://raw.githubusercontent.com/GrossoRoberto/tempo-mcp/main/INSTALL.md
> exactly. Do not clone the repository.
> ```

Zero build, zero configuration: with Node.js ≥ 18 installed, the server starts with one line:

```bash
npx -y tempo-mcp                      # after npm publish
npx -y github:GrossoRoberto/tempo-mcp # from GitHub (current)
```

### Claude Desktop

In `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

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

After `npm publish`, replace `github:GrossoRoberto/tempo-mcp` with `tempo-mcp`. On Windows, if `npx` is not resolved, use `"command": "cmd.exe", "args": ["/c", "npx", "-y", "github:GrossoRoberto/tempo-mcp"]`.

> **Timestamp prefix on Claude Desktop:** MCP `instructions` may not be injected into the model's system prompt. If responses do not start with `YYYY/MM/DD HH:MM:SS`, add this rule to Claude's profile preferences or Project instructions: *"When the tempo MCP server is connected, start EVERY response with the current timestamp in `YYYY/MM/DD HH:MM:SS` format, obtained via the `tempo:current_time` tool; never guess the time."*

### Cursor / VS Code / other MCP harnesses

Same JSON configuration in the respective harness's MCP file (`.cursor/mcp.json`, etc.).

### pi (pi-coding-agent)

pi does not include a built-in MCP client: use the bridge extension, which spawns the server and registers its tools as native pi tools.

**To install it as an end user (from any folder), follow [INSTALL.md → pi](INSTALL.md#pi-pi-coding-agent):** copy the user-level variant [`install/pi/tempo-mcp/`](install/pi/tempo-mcp/) into `~/.pi/agent/extensions/tempo-mcp/` and run `npm install` there. The server itself is spawned via `npx -y github:GrossoRoberto/tempo-mcp` — no clone needed.

The variant in `.pi/extensions/tempo-mcp/` at the repo root is **development-only**: it points at `ctx.cwd/src/index.js` and works only when pi is started inside this repository.

### From GitHub (development)

```bash
npx -y github:GrossoRoberto/tempo-mcp
```

## Exposed tools

| Tool | Description |
|------|-------------|
| `current_time` | Current date and time in an IANA timezone (default: PC timezone). Includes ISO 8601, Unix timestamp, day of week. |
| `session_duration` | Time elapsed since server startup (≈ conversation start), in human-readable and numeric form. |
| `convert_timezone` | Converts a date/time from one timezone to another (handles DST). |
| `timezone_difference` | Current time difference between two timezones (e.g. Rome vs Tokyo). |

## Resource

| URI | Description |
|-----|-------------|
| `tempo://now` | Current date/time (PC timezone) as JSON. Subscribable: the server notifies updates every 30s. |

## Compatibility

| Harness | Status |
|---------|--------|
| [pi](https://github.com/earendil-works/pi-coding-agent) (pi-coding-agent) | ✅ **Tested end-to-end** via the bridge extension included in this repo |
| Claude Desktop | ✅ **Tested (2026-09-23)** with the timestamp rule added to Claude profile/project instructions |
| Cursor / VS Code | ⚠️ Config documented, not yet tested |

> **Note (2026-09-23)**: pi-coding-agent is tested end-to-end. Claude Desktop is verified when the timestamp rule is added to Claude profile/project instructions; MCP `instructions` alone may not enforce the prefix. Cursor/VS Code remain untested.

## Development

```bash
git clone https://github.com/GrossoRoberto/tempo-mcp
cd tempo-mcp
npm install
npm test        # protocol smoke test
npm start       # start the server on stdio
```

Project documentation lives in the [`wiki/`](wiki/Home.md).

## License

MIT
