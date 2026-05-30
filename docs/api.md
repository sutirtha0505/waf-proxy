# Admin API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/requests/count` | Count pending requests |
| GET | `/api/admin/requests` | List pending request IDs |
| GET | `/api/admin/requests/{id}` | Get request JSON |
| POST | `/api/admin/requests/{id}/safe` | Label request safe |
| POST | `/api/admin/requests/{id}/unsafe` | Label request with attack vector |
| GET | `/api/admin/vectors` | List attack vectors |
| POST | `/api/admin/vectors` | Add attack vector |
