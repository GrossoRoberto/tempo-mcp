# Roadmap

## Short term
- [x] GitHub repository (account in files, MIT LICENSE)
- [x] English API (tool names, parameters, output fields) and English documentation
- [ ] CI with GitHub Actions (`npm test` on Node 18/20/22, Linux/Windows/macOS)
- [ ] `npm publish` (check the name `tempo-mcp`)
- [ ] Test on other real harnesses: Claude Desktop, Cursor — **so far tested only with pi-coding-agent**

## Medium term
- [ ] pi extension as an installable package (`pi install npm:tempo-mcp`) spawning `npx tempo-mcp` instead of the local path
- [ ] Automatic installer: `npx tempo-mcp install --claude|--cursor|--vscode` writing the harness config
- [ ] `/tempo` pi command: panel with time, session duration, favorite timezones

## Ideas under evaluation
- [ ] HTTP transport for remote/shared use
- [ ] `stopwatch`/`timer` tool (tracking durations within the conversation: "how long did it take us?")
- [ ] Temporal reminders (the LLM asks "remind me in 10 minutes" → notification)
- [ ] Optional config: custom timestamp format, push interval

## Discarded ideas (with reason)
- ~~Temporal reference parser~~ → see [Decision D2](Decisions.md#d2--no-temporal-reference-parser-resolve_temporal_reference)
- ~~Conversation database~~ → see [Decision D3](Decisions.md#d3--no-storage--database)
