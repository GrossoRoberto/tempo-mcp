# Distribution

**Goal**: public GitHub repository, installation with **one command line from any harness**.

## Strategy

Pure JavaScript + zero build = the package runs directly via `npx`:

```bash
npx -y tempo-mcp                      # from npm (after publishing)
npx -y github:GrossoRoberto/tempo-mcp # from GitHub (right now)
```

Typical harness configuration (Claude Desktop, Cursor, VS Code, ...):

```json
{ "mcpServers": { "tempo": { "command": "npx", "args": ["-y", "tempo-mcp"] } } }
```

## Publishing checklist

- [x] `bin: tempo-mcp` + shebang `#!/usr/bin/env node` in `src/index.js`
- [x] `files: ["src", "README.md", "LICENSE"]` in package.json
- [x] README with instructions for multiple harnesses
- [x] Working `npm test`
- [x] Real GitHub account in `package.json` and README
- [x] `LICENSE` file (MIT)
- [x] GitHub repository + first push
- [ ] `npm publish` (check availability of the name `tempo-mcp`, otherwise scope `@grossoroberto/tempo-mcp`)
- [ ] GitHub Actions: CI running `npm test` (Node 18/20/22)

## Harness support status

| Harness | Status |
|---------|--------|
| **pi (pi-coding-agent)** | ✅ **Tested end-to-end** — bridge extension in the repo; future pi package (`pi install npm:tempo-mcp`) |
| Claude Desktop | ✅ **Tested (2026-09-23)** — server/tools and `current_time` work; timestamp prefix verified with the rule added to Claude profile/project instructions |
| Cursor / VS Code | ⚠️ Standard JSON config documented, **not yet tested** |

> ⚠️ **As of 2026-09-23, pi-coding-agent is tested end-to-end.** Claude Desktop is verified when the timestamp-prefix rule is added to Claude profile/project instructions; MCP `instructions` alone may not enforce the prefix. Cursor/VS Code still need real-world verification.

## Future idea: automatic installer

`npx tempo-mcp install --claude|--cursor|...` that writes the config into the detected harness. See [Roadmap](Roadmap.md).
