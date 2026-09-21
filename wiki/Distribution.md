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
| Claude Desktop | ⚠️ Standard JSON config documented, **not yet tested** |
| Cursor / VS Code | ⚠️ Standard JSON config documented, **not yet tested** |

> ⚠️ **As of 2026-09-21, tempo-mcp has been tested only with pi-coding-agent.** The stdio transport is universal, so other harnesses are expected to work, but they still need real-world verification.

## Future idea: automatic installer

`npx tempo-mcp install --claude|--cursor|...` that writes the config into the detected harness. See [Roadmap](Roadmap.md).
