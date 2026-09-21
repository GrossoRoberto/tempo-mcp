# Decision log

## D1 — JavaScript, not TypeScript
**Choice**: pure ESM JavaScript, no build step.
**Reason**: instant execution via `npx`, simpler debugging, one less barrier for contributors. The project's complexity does not justify a toolchain.

## D2 — No temporal reference parser ~~`resolve_temporal_reference`~~
**Discarded** (initial proposal: a tool translating "yesterday" → ISO interval).
**Reason**: redundant. With (a) the current time known and (b) timestamped messages, the LLM resolves relative references by itself — better than any regex, and in any language. Confirmed by the user: *"the LLM will read the chats stamped with yesterday's date"*. A parser would only add bug surface.

## D3 — No storage / database
**Choice**: the server is stateless (apart from the startup instant).
**Reason**: from the user's requirement — the timestamp lives *in the text* of the conversation (`2026/09/21 17:05:42 Ok, code modified...`). The chat itself is the timeline.

## D4 — Timestamping via MCP `instructions`
**Choice**: the timestamping behavior is delivered through the protocol's `instructions` field, not through a user prompt.
**Reason**: automatic and harness-agnostic. On pi it is re-injected into the system prompt on every turn by the bridge extension.
**Known limit**: not all MCP clients honor `instructions` → the pi bridge applies it explicitly.

## D5 — Timestamp format: `YYYY/MM/DD HH:MM:SS`
With seconds, per user request. Timezone: always that of the PC hosting the server (the user's time).

## D6 — Language of relative references: the chat's language
The instructions tell the LLM to interpret temporal expressions in the conversation language. No server-side logic (see D2).

## D7 — stdio transport
Standard for local MCP servers; supported by all harnesses. HTTP/SSE may be evaluated in the future for remote use.

## D8 — Push every 30s on the resource
Freshness/traffic trade-off. The time that really matters (the response's) is freshly re-read on every turn by the pi bridge anyway.
