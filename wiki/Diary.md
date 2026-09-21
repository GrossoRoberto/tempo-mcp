# Development diary

## 2026-09-21 — Session 1: project birth

### Requirements gathered (conversation with Roberto)
1. MCP server to give LLMs real-time awareness.
2. The real problem: translating human temporal connectors ("yesterday", "last week") into concrete intervals.
3. Mechanism: timestamping of every LLM response (`2026/09/21 17:05:42 Ok, code modified...`). **No database**: time lives in the chat.
4. Constraints: PC timezone · seconds included · relative references in the chat language · testing on pi · later GitHub + one-liner installation.

### Work done
- Project setup: Node 22, `@modelcontextprotocol/sdk`, `zod`.
- **Server** (`src/index.js`): 4 tools, `tempo://now` resource with 30s push, timestamping `instructions`.
- Technical finding: the SDK does **not** implement subscribe/unsubscribe server-side → handled manually with `setRequestHandler`.
- **pi extension** (`.pi/extensions/tempo-mcp/index.ts`): MCP bridge → native pi tools, system prompt injection, status bar clock. Made necessary by pi having no built-in MCP.
- **Tests**: protocol smoke test `npm test` → 11/11 ✅. End-to-end test on pi in print mode → exact timestamping and autonomous use of `session_duration` ✅.
- Distribution prep: publish-ready `package.json`, multi-harness README.
- This wiki created.

### Result
Complete and verified MVP. Next step: GitHub repository.

## 2026-09-21 — Session 1 (continued): publication

- Repository created at [github.com/GrossoRoberto/tempo-mcp](https://github.com/GrossoRoberto/tempo-mcp), first push done ✅
- English README, MIT LICENSE, .gitignore added
- Push worked via Git Credential Manager (credentials already stored on the PC)

## 2026-09-21 — Session 1 (continued): English API

- **Breaking change before npm publish**: tool names, parameters, JSON output fields and instructions translated from Italian to English:
  - `ora_attuale` → `current_time`, `durata_sessione` → `session_duration`, `converti_fuso_orario` → `convert_timezone`, `differenza_fusi` → `timezone_difference`
  - resource `tempo://adesso` → `tempo://now`
- pi extension, smoke tests, README and wiki updated accordingly
- Wiki fully translated to English
- Compatibility note added: tested **only with pi-coding-agent** so far
