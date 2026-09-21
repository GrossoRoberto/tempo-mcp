# Tools (reference)

## Tools

### `current_time`
Current date and time in an IANA timezone.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timezone` | string? | PC timezone | e.g. `Europe/Rome`, `America/New_York`, `UTC` |

Output: `local_iso` (with offset), `readable_date` and `readable_time` (English), `timezone`, `utc_offset`, `timestamp_unix`, `timestamp_unix_ms`.
Invalid timezone → handled error (`isError: true`).

### `session_duration`
Time elapsed since server startup (≈ conversation start).

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timezone` | string? | PC timezone | for the returned instants |

Output: `elapsed_readable` ("2 hours, 5 minutes"), `elapsed_seconds`, `elapsed_ms`, `session_start`, `now`.

### `convert_timezone`
Converts a date/time between timezones, handling DST.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datetime` | string | `YYYY-MM-DDTHH:MM:SS` (also accepts a space instead of `T`) |
| `from_timezone` | string | source IANA timezone |
| `to_timezone` | string | destination IANA timezone |

Verified: `2025-06-15T14:30` Rome → `08:30` New York (summer DST).

### `timezone_difference`
Current time difference between two timezones.

| Parameter | Type | Description |
|-----------|------|-------------|
| `timezone_a` | string | first IANA timezone |
| `timezone_b` | string | second IANA timezone |

Output includes a readable description: *"Asia/Tokyo is 7 hours ahead of Europe/Rome"*.

## Resource

### `tempo://now`
JSON like `current_time` in the PC timezone. Subscribable: update notification every **30 seconds**.

## Tests

`npm test` → `test/smoke.test.js`: handshake, instructions, 4 tools, DST conversion, error handling, resource. Status: **11/11 ✅**
