# tempo-mcp Wiki

Documentazione di progetto del server MCP **tempo-mcp**: il ponte tra il tempo umano e il tempo macchina per gli LLM.

## Visione

Gli umani ragionano per connettori temporali fuzzy (*"ieri"*, *"la settimana scorsa"*, *"qualche giorno fa"*). Gli LLM ragionano per intervalli assoluti, ma non hanno accesso al tempo reale. tempo-mcp risolve il problema da due lati:

1. **Marcatura**: l'LLM viene istruito a prefissare ogni risposta con il timestamp `YYYY/MM/DD HH:MM:SS` → la conversazione diventa una linea temporale navigabile.
2. **Ancoraggio**: il server fornisce sempre data/ora reali (fuso del PC), via risorsa in contesto o tool.

Risultato: *"cerca il codice che abbiamo usato ieri"* → l'LLM confronta i timestamp della chat con l'intervallo di ieri. Nessun database: il tempo vive nel testo della conversazione.

## Indice

- [Architettura](Architettura.md) — componenti e flussi
- [Strumenti](Strumenti.md) — riferimento tool e risorse MCP
- [Estensione pi](Estensione-pi.md) — il ponte per pi-coding-agent
- [Distribuzione](Distribuzione.md) — GitHub, npm, installazione one-liner
- [Decisioni](Decisioni.md) — registro delle decisioni (e delle idee scartate)
- [Diario di sviluppo](Diario.md) — cronologia del lavoro
- [Roadmap](Roadmap.md) — cosa c'è dopo

## Stato attuale

✅ Server MCP funzionante (stdio) · ✅ 11/11 smoke test · ✅ Estensione ponte per pi testata end-to-end · ⏳ Pubblicazione GitHub/npm
