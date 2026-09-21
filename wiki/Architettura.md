# Architettura

## Componenti

```
┌─────────────┐   stdio (JSON-RPC)   ┌──────────────────────────┐
│  Harness    │ ◄──────────────────► │  tempo-mcp (src/index.js)│
│ (Claude,    │                      │  - instructions          │
│  pi, ...)   │                      │  - risorsa tempo://adesso│
└─────────────┘                      │  - 4 tool temporali      │
                                     └──────────────────────────┘
```

Per **pi** (che non ha client MCP integrato) si interpone l'estensione ponte:

```
pi ──► .pi/extensions/tempo-mcp/index.ts ──► spawn node src/index.js
         │                                      │
         ├─ registra i tool MCP come tool pi ◄──┤
         ├─ inietta instructions + orario nel system prompt (before_agent_start)
         └─ orologio in status bar (refresh 30s)
```

## I tre meccanismi temporali

### 1. `instructions` (il cuore)
Alla connessione il server invia istruzioni che obbligano l'LLM a:
- prefissare OGNI risposta con `YYYY/MM/DD HH:MM:SS` (fuso del PC);
- tradurre i riferimenti relativi (nella lingua della chat) in intervalli assoluti;
- non fidarsi mai della data del training.

### 2. Risorsa `tempo://adesso`
JSON con data/ora correnti. Sottoscrivibile: push `notifications/resources/updated` ogni 30s. L'SDK TypeScript (v1.30) non gestisce le subscribe lato server → implementate a mano con `SubscribeRequestSchema`/`UnsubscribeRequestSchema` + `setInterval`.

### 3. Tool
Fallback puntuale e utilità (conversioni fusi, durata sessione). Vedi [Strumenti](Strumenti.md).

## Calcolo dei fusi orari

Zero dipendenze: solo `Intl.DateTimeFormat` con `formatToParts`.
L'offset di un fuso si ricava confrontando le componenti locali con UTC (`offsetMinuti`). Per la conversione: interpretazione della data come UTC, poi doppia correzione con l'offset reale (gestisce i casi limite di ora legale).

## Scelte strutturali

| Scelta | Motivo |
|--------|--------|
| JavaScript ESM puro | Nessun build step → `npx` immediato, debug facile |
| Solo `@modelcontextprotocol/sdk` + `zod` | Superficie minima, logica affidata a `Intl` |
| stdio | Trasporto universale per server locali |
| Nessuno storage | Il timestamp vive nel testo della conversazione |
