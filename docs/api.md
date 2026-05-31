# Admin API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/requests/count` | Count pending requests |
| GET | `/api/admin/requests` | List pending request IDs |
| GET | `/api/admin/requests?limit=&offset=&q=&vector=&status=` | List with pagination and filters |
| GET | `/api/admin/requests/{id}` | Get request JSON |
| POST | `/api/admin/requests/{id}/safe` | Label request safe |
| POST | `/api/admin/requests/{id}/unsafe` | Label request with attack vector |
| GET | `/api/admin/vectors` | List attack vectors |
| POST | `/api/admin/vectors` | Add attack vector |
| GET | `/api/admin/blocked` | List requests blocked by AI |
| GET | `/api/admin/stream` | Server-sent events stream for live updates |
| GET | `/api/admin/traffic?from=<unix>&to=<unix>&interval=<seconds>` | Aggregated traffic metrics for charts |

## Stream Payload

`GET /api/admin/stream` emits SSE events named `update`.

Example:

```text
event: update
data: {"pending_count":12,"blocked_count":4,"ts":1717153300}
```

## Traffic Payload

Example response from `GET /api/admin/traffic`:

```json
{
	"from": 1717149700,
	"to": 1717153300,
	"interval": 60,
	"blocked": 18,
	"pending": 42,
	"by_vector": {
		"sql_injection": 10,
		"xss": 8
	},
	"time_series": [
		{"ts": 1717149700, "pending": 2, "blocked": 0},
		{"ts": 1717149760, "pending": 1, "blocked": 1}
	]
}
```
