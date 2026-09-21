# Registro delle decisioni

## D1 — JavaScript, non TypeScript
**Scelta**: JavaScript ESM puro, niente build step.
**Motivo**: esecuzione immediata via `npx`, debug più semplice, una barriera in meno per i contributor. La complessità del progetto non giustifica una toolchain.

## D2 — Niente parser di riferimenti temporali ~~`risolvi_riferimento_temporale`~~
**Scartata** (proposta iniziale: tool che traduce "ieri" → intervallo ISO).
**Motivo**: ridondante. Con (a) ora corrente nota e (b) messaggi marcati col timestamp, l'LLM risolve da solo i riferimenti relativi — meglio di qualsiasi regex, e in qualsiasi lingua. Confermato dall'utente: *"sarà l'llm a leggere le chat con data di ieri"*. Un parser aggiungerebbe solo superficie di bug.

## D3 — Niente storage / database
**Scelta**: il server è stateless (a parte l'istante di avvio).
**Motivo**: dal requisito dell'utente — il timestamp vive *nel testo* della conversazione (`2026/09/21 17:05:42 Ok, codice modificato...`). La chat stessa è la linea temporale.

## D4 — Marcatura via `instructions` MCP
**Scelta**: il comportamento di marcatura è consegnato tramite il campo `instructions` del protocollo, non tramite prompt dell'utente.
**Motivo**: automatico e harness-agnostico. Su pi viene re-iniettato nel system prompt a ogni turno dall'estensione ponte.
**Limite noto**: non tutti i client MCP onorano `instructions` → per pi il ponte lo applica esplicitamente.

## D5 — Formato timestamp: `YYYY/MM/DD HH:MM:SS`
Con secondi, su richiesta dell'utente. Fuso: sempre quello del PC che ospita il server (il tempo dell'utente).

## D6 — Lingua dei riferimenti relativi: quella della chat
Le istruzioni dicono all'LLM di interpretare le espressioni temporali nella lingua della conversazione. Nessuna logica lato server (v. D2).

## D7 — Trasporto stdio
Standard per server MCP locali; supportato da tutti gli harness. HTTP/SSE valutabile in futuro per uso remoto.

## D8 — Push ogni 30s sulla risorsa
Compromesso freschezza/traffico. L'orario che conta davvero (quello della risposta) viene comunque riletto fresco a ogni turno dal ponte pi.
