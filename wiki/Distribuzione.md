# Distribuzione

**Obiettivo**: repository GitHub pubblico, installazione con **una riga di comando da qualsiasi harness**.

## Strategia

JavaScript puro + zero build = il pacchetto si esegue direttamente via `npx`:

```bash
npx -y tempo-mcp            # da npm (dopo pubblicazione)
npx -y github:USER/tempoMCP # da GitHub (subito)
```

Configurazione tipica di un harness (Claude Desktop, Cursor, VS Code, ...):

```json
{ "mcpServers": { "tempo": { "command": "npx", "args": ["-y", "tempo-mcp"] } } }
```

## Checklist pubblicazione

- [x] `bin: tempo-mcp` + shebang `#!/usr/bin/env node` in `src/index.js`
- [x] `files: ["src", "README.md", "LICENSE"]` in package.json
- [x] README con istruzioni per harness multipli
- [x] `npm test` funzionante
- [ ] Sostituire `USER` con l'account GitHub reale in `package.json` e README
- [ ] File `LICENSE` (MIT dichiarata, file mancante)
- [ ] Repository GitHub + primo push
- [ ] `npm publish` (verificare disponibilità nome `tempo-mcp`, altrimenti scope `@user/tempo-mcp`)
- [ ] GitHub Actions: CI che esegue `npm test` (Node 18/20/22)

## Harness specifici

| Harness | Stato |
|---------|-------|
| Claude Desktop | Config JSON standard ✅ documentata |
| Cursor / VS Code | Config JSON standard ✅ documentata |
| pi | Estensione ponte nel repo ✅ testata; in futuro pacchetto pi (`pi install npm:tempo-mcp`) |

## Idea futura: installer automatico

`npx tempo-mcp install --claude|--cursor|...` che scrive la config nell'harness rilevato. Vedi [Roadmap](Roadmap.md).
