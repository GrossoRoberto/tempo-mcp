# tempo-mcp Wiki

Project documentation for the **tempo-mcp** MCP server: the bridge between human time and machine time for LLMs.

## Vision

Humans reason with fuzzy temporal connectors (*"yesterday"*, *"last week"*, *"a few days ago"*). LLMs reason with absolute intervals, but have no access to real time. tempo-mcp solves the problem from both sides:

1. **Timestamping**: the LLM is instructed to prefix every response with the `YYYY/MM/DD HH:MM:SS` timestamp → the conversation becomes a navigable timeline.
2. **Anchoring**: the server always provides the real date/time (PC timezone), via an in-context resource or tools.

Result: *"find the code we used yesterday"* → the LLM compares the chat timestamps with yesterday's interval. No database: time lives in the conversation text.

## Index

- [Architecture](Architecture.md) — components and flows
- [Tools](Tools.md) — MCP tools and resource reference
- [pi extension](Pi-extension.md) — the bridge for pi-coding-agent
- [Distribution](Distribution.md) — GitHub, npm, one-liner installation
- [Decisions](Decisions.md) — decision log (and discarded ideas)
- [Development diary](Diary.md) — work history
- [Roadmap](Roadmap.md) — what's next

## Current status

✅ Working MCP server (stdio) · ✅ 11/11 smoke tests · ✅ pi bridge extension tested end-to-end · ✅ Published on GitHub · ⏳ npm publish · ⏳ Testing on other harnesses (so far tested **only with pi-coding-agent**)
