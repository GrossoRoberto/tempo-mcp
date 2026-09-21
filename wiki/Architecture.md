# Architecture

## Components

```
┌─────────────┐   stdio (JSON-RPC)   ┌──────────────────────────┐
│  Harness    │ ◄──────────────────► │  tempo-mcp (src/index.js)│
│ (Claude,    │                      │  - instructions          │
│  pi, ...)   │                      │  - tempo://now resource  │
└─────────────┘                      │  - 4 temporal tools      │
                                     └──────────────────────────┘
```

For **pi** (which has no built-in MCP client) a bridge extension sits in between:

```
pi ──► .pi/extensions/tempo-mcp/index.ts ──► spawn node src/index.js
         │                                      │
         ├─ registers MCP tools as pi tools ◄───┤
         ├─ injects instructions + current time into the system prompt (before_agent_start)
         └─ clock in the status bar (30s refresh)
```

## The three temporal mechanisms

### 1. `instructions` (the core)
On connection the server sends instructions that require the LLM to:
- prefix EVERY response with `YYYY/MM/DD HH:MM:SS` (PC timezone);
- translate relative references (in the chat language) into absolute intervals;
- never trust its training date.

### 2. Resource `tempo://now`
JSON with current date/time. Subscribable: `notifications/resources/updated` push every 30s. The TypeScript SDK does not handle subscriptions server-side → implemented manually with `SubscribeRequestSchema`/`UnsubscribeRequestSchema` + `setInterval`.

### 3. Tools
Precise fallback and utilities (timezone conversion, session duration). See [Tools](Tools.md).

## Timezone calculation

Zero dependencies: only `Intl.DateTimeFormat` with `formatToParts`.
A timezone's offset is derived by comparing local components with UTC (`offsetMinutes`). For conversion: interpret the date as UTC, then double-correct with the real offset (handles DST edge cases).

## Structural choices

| Choice | Reason |
|--------|--------|
| Pure ESM JavaScript | No build step → instant `npx`, easy debugging |
| Only `@modelcontextprotocol/sdk` + `zod` | Minimal surface, logic delegated to `Intl` |
| stdio | Universal transport for local servers |
| No storage | The timestamp lives in the conversation text |
