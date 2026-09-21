# tempo-mcp

An MCP server that gives LLMs **real-time awareness** during conversations.

## The problem

Humans reason with fuzzy temporal connectors: *"the decision we made yesterday"*, *"last week's code"*. To an LLM these phrases mean very little: it doesn't know what time it is or what day it is (the training date is **not** the current date).

## The solution

tempo-mcp is a bridge between human time and machine time:

1. **It instructs the LLM** (via the MCP protocol `instructions` field) to prefix **every response** with the current timestamp in `YYYY/MM/DD HH:MM:SS` format:
   > `2026/09/21 17:05:42 Ok, code modified...`
2. **It exposes the `tempo://adesso` resource** with the current date/time, push-updated every 30 seconds for subscribed clients.
3. **It provides temporal tools** (see below).

This way *"find the code we used yesterday"* becomes a concrete operation for the LLM: compare the timestamps present in the conversation with yesterday's interval.

## Installation

Zero build, zero configuration: with Node.js ≥ 18 installed, the server starts with one line:

```bash
npx -y tempo-mcp
```

### Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tempo": {
      "command": "npx",
      "args": ["-y", "tempo-mcp"]
    }
  }
}
```

### Cursor / VS Code / other MCP harnesses

Same JSON configuration in the respective harness's MCP file (`.cursor/mcp.json`, etc.).

### pi (pi-coding-agent)

pi does not include a built-in MCP client: use the bridge extension included in this repository (`.pi/extensions/tempo-mcp/`), which spawns the server and registers its tools as native pi tools.

### From GitHub (development)

```bash
npx -y github:GrossoRoberto/tempo-mcp
```

## Exposed tools

| Tool | Description |
|------|-------------|
| `ora_attuale` | Current date and time in an IANA timezone (default: PC timezone). Includes ISO 8601, Unix timestamp, day of week. |
| `durata_sessione` | Time elapsed since server startup (≈ conversation start), in human-readable and numeric form. |
| `converti_fuso_orario` | Converts a date/time from one timezone to another (handles DST). |
| `differenza_fusi` | Current time difference between two timezones (e.g. Rome vs Tokyo). |

## Resource

| URI | Description |
|-----|-------------|
| `tempo://adesso` | Current date/time (PC timezone) as JSON. Subscribable: the server notifies updates every 30s. |

## Development

```bash
git clone https://github.com/GrossoRoberto/tempo-mcp
cd tempo-mcp
npm install
npm test        # protocol smoke test
npm start       # start the server on stdio
```

Project documentation (in Italian) lives in [`wiki/`](wiki/Home.md).

## License

MIT
