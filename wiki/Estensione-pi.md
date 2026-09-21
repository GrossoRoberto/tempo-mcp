# Estensione pi (ponte MCP)

**File**: `.pi/extensions/tempo-mcp/index.ts`

pi-coding-agent [non include MCP di proposito](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/): questa estensione è il client.

## Cosa fa

1. **`session_start`** — avvia `node src/index.js` come processo figlio (`StdioClientTransport`), si connette e:
   - registra ogni tool MCP come tool nativo di pi (`pi.registerTool`, lo schema JSON Schema MCP è compatibile con typebox);
   - mostra l'orologio nella status bar, aggiornato ogni 30s rileggendo la risorsa.
2. **`before_agent_start`** — a ogni prompt utente, appende al system prompt:
   - le `instructions` del server (regole di marcatura);
   - l'orario corrente letto fresco dalla risorsa `tempo://adesso`.
3. **`session_shutdown`** — chiude il client (il trasporto termina il processo figlio) e ferma il timer.

## Note tecniche

- Le dipendenze (`@modelcontextprotocol/sdk`) si risolvono dal `node_modules` della root del progetto (jiti risale l'albero).
- Il percorso del server è `join(ctx.cwd, "src", "index.js")` → va avviato pi dalla root del progetto. *Da generalizzare quando diventerà pacchetto npm (spawn `npx tempo-mcp`).*
- I processi/timer si avviano solo in `session_start` (mai nella factory), come raccomandato dalla documentazione pi.

## Test end-to-end (21/09/2026)

```
$ pi -p --no-session -e .pi/extensions/tempo-mcp/index.ts \
    "Che ore sono adesso e quanto tempo è passato dall'inizio di questa conversazione?"

2026/09/21 17:25:53
Sono le 17:25:53. Dall'inizio della conversazione sono passati 8 secondi.
```

✅ Marcatura temporale nel formato esatto · ✅ Tool `durata_sessione` chiamato autonomamente
