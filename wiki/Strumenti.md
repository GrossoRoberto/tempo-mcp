# Strumenti (riferimento)

## Tool

### `ora_attuale`
Data e ora correnti in un fuso orario IANA.

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `fuso_orario` | string? | fuso del PC | es. `Europe/Rome`, `America/New_York`, `UTC` |

Output: `iso_locale` (con offset), `data_leggibile` e `ora_leggibile` (italiano), `fuso_orario`, `offset_utc`, `timestamp_unix`, `timestamp_unix_ms`.
Fuso non valido → errore gestito (`isError: true`).

### `durata_sessione`
Tempo trascorso dall'avvio del server (≈ inizio conversazione).

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `fuso_orario` | string? | fuso del PC | per gli istanti restituiti |

Output: `trascorso_leggibile` ("2 ore, 5 minuti"), `trascorso_secondi`, `trascorso_ms`, `inizio_sessione`, `adesso`.

### `converti_fuso_orario`
Converte una data/ora tra fusi, gestendo l'ora legale.

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `data_ora` | string | `YYYY-MM-DDTHH:MM:SS` (accetta anche spazio al posto di `T`) |
| `da_fuso` | string | fuso IANA di origine |
| `a_fuso` | string | fuso IANA di destinazione |

Verificato: `2025-06-15T14:30` Roma → `08:30` New York (DST estiva).

### `differenza_fusi`
Differenza oraria attuale tra due fusi.

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `fuso_a` | string | primo fuso IANA |
| `fuso_b` | string | secondo fuso IANA |

Output include descrizione leggibile: *"Asia/Tokyo è 7 ore avanti rispetto a Europe/Rome"*.

## Risorsa

### `tempo://adesso`
JSON come `ora_attuale` nel fuso del PC. Sottoscrivibile: notifica di aggiornamento ogni **30 secondi**.

## Test

`npm test` → `test/smoke.test.js`: handshake, instructions, 4 tool, conversione DST, gestione errori, risorsa. Stato: **11/11 ✅**
