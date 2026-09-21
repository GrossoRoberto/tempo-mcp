# Roadmap

## Breve termine
- [ ] Repository GitHub (sostituire `USER` nei file, aggiungere LICENSE MIT)
- [ ] CI con GitHub Actions (`npm test` su Node 18/20/22, Linux/Windows/macOS)
- [ ] `npm publish` (verificare nome `tempo-mcp`)
- [ ] Test su altri harness reali: Claude Desktop, Cursor

## Medio termine
- [ ] Estensione pi come pacchetto installabile (`pi install npm:tempo-mcp`) con spawn di `npx tempo-mcp` invece del path locale
- [ ] Installer automatico: `npx tempo-mcp install --claude|--cursor|--vscode` che scrive la config dell'harness
- [ ] `/tempo` comando pi: pannello con ora, durata sessione, fusi preferiti

## Idee in valutazione
- [ ] Trasporto HTTP per uso remoto/condiviso
- [ ] Tool `cronometro`/`timer` (marcare durate dentro la conversazione: "quanto ci abbiamo messo?")
- [ ] Promemoria temporali (l'LLM chiede "avvisami tra 10 minuti" → notifica)
- [ ] Config opzionale: formato timestamp personalizzato, intervallo push

## Idee scartate (con motivo)
- ~~Parser di riferimenti temporali~~ → vedi [Decisioni D2](Decisioni.md#d2--niente-parser-di-riferimenti-temporali-risolvi_riferimento_temporale)
- ~~Database delle conversazioni~~ → vedi [Decisioni D3](Decisioni.md#d3--niente-storage--database)
