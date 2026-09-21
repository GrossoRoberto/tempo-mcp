# Diario di sviluppo

## 2026-09-21 — Sessione 1: nascita del progetto

### Requisiti raccolti (conversazione con Roberto)
1. Server MCP per dare agli LLM consapevolezza del tempo reale.
2. Il problema vero: tradurre i connettori temporali umani ("ieri", "la settimana scorsa") in intervalli concreti.
3. Meccanismo: marcatura di ogni risposta dell'LLM col timestamp (`2026/09/21 17:05:42 Ok, codice modificato...`). **Niente database**: il tempo vive nella chat.
4. Vincoli: fuso del PC · secondi inclusi · riferimenti relativi nella lingua della chat · test su pi · in futuro GitHub + installazione one-liner.

### Lavoro svolto
- Setup progetto: Node 22, `@modelcontextprotocol/sdk` 1.30, `zod`.
- **Server** (`src/index.js`): 4 tool (`ora_attuale`, `durata_sessione`, `converti_fuso_orario`, `differenza_fusi`), risorsa `tempo://adesso` con push ogni 30s, `instructions` di marcatura.
- Scoperta tecnica: l'SDK 1.30 **non** implementa subscribe/unsubscribe lato server → gestiti manualmente con `setRequestHandler`.
- **Estensione pi** (`.pi/extensions/tempo-mcp/index.ts`): ponte MCP → tool nativi pi, iniezione system prompt, orologio in status bar. Resa necessaria dal fatto che pi non ha MCP integrato.
- **Test**: smoke test protocollo `npm test` → 11/11 ✅. Test end-to-end su pi in print mode → marcatura esatta e uso autonomo di `durata_sessione` ✅.
- Preparazione distribuzione: `package.json` publish-ready, README multi-harness.
- Creata questa wiki.

### Risultato
MVP completo e verificato. Prossimo passo: repository GitHub.
