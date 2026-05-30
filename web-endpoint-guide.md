Web Endpoint Guide — WAF Dashboard and DVWA integration

Purpose
- Document every web endpoint used by the dashboard and admin UI, how requests flow from the incoming HTTP stream (through the WAF) into the "Website output"/DVWA environment, and how items are displayed and acted on in the dashboard UI.
- Explain DB tables involved, AI interaction points, fail-open behavior, how to reproduce request sequences, and how frontend JS communicates with backend endpoints (including the bulk action endpoints you just added).

Audience
- Operators who need to understand how the WAF dashboard surfaces requests and how to triage/label requests.
- Developers who need to extend or debug the dashboard, bulk actions or the DVWA replay/testing flow.

1) High-level architecture
- Incoming HTTP request -> internal/proxy handler -> static checks -> AI engine (health -> detect) -> decision (block/allow) -> response to client.
- If request is recorded for operator review (low confidence / fail-open / other rule), a `pending_request` row is saved in the local SQLite DB.
- Dashboard serves pages and an admin API that reads `pending_requests`, serves single request JSON, lists `attack_vectors`, and accepts label/save/delete actions (including bulk actions).
- DVWA runs separately (via Docker Compose in `deploy/docker/docker-compose.yml` by default) behind the WAF so requests made to the WAF that target the DVWA host are proxied and the responses are returned to the test client.

2) Key files (quick reference)
- Backend entrypoint(s): `cmd/waf/main.go` — starts proxy + dashboard.
- Proxy handler: `internal/proxy/handler.go` — core interception, detection, and decision logic.
- AI client/health: `internal/ai/client.go`, `internal/ai/health.go`, `internal/ai/detect.go`.
- Fail-open handling: `internal/engine/failopen.go` (persist fail-open events to pending requests).
- Storage layer: `internal/storage/sqlite.go` — DB schema & repository methods.
- Admin API & handlers: `internal/admin/api.go`, `internal/admin/handlers.go`.
- Dashboard templates & JS: `web/dashboard/templates/requests.html`, `web/dashboard/static/js/requests.js`, `web/dashboard/static/js/review.js`.
- Bulk support (server & client): `internal/admin/handlers.go` (BulkSafe/BulkUnsafe/BulkDelete), `internal/admin/api.go` (registered paths), and the updated `web/dashboard/static/js/requests.js` + `web/dashboard/templates/requests.html`.
- Replay/testing script: `scripts/replay_dvwa_hits.sh` — automates login + exercising DVWA endpoints.

3) Admin API endpoints (full list)
- GET `/api/admin/requests/count`
  - Returns: `{ "count": <int> }` — current pending requests count.
- GET `/api/admin/requests`
  - Returns: `[{ "request_id": "<id>" }, ...]` — lightweight list for display.
- GET `/api/admin/requests/{id}`
  - Returns: full pending request object as stored in DB (headers, body, parsed fields, ai_response_json maybe null).
- POST `/api/admin/requests/{id}/safe`
  - Label a single request as `safe` and remove from `pending_requests`.
  - No body required.
- POST `/api/admin/requests/{id}/unsafe`
  - Body: `{ "vector_name": "X", "code": <int> }` — label single request as an attack vector and remove it.
- POST `/api/admin/requests/bulk/safe`
  - Body: `{ "ids": ["id1","id2"] }` — labels multiple requests as `safe` and removes them.
- POST `/api/admin/requests/bulk/unsafe`
  - Body: `{ "items": [{"id":"id1","vector_name":"X","code":123}, ...] }` — bulk-unsafe labeling.
- POST `/api/admin/requests/bulk/delete`
  - Body: `{ "ids": [...] }` — remove multiple pending requests without labeling.
- GET/POST `/api/admin/vectors`
  - GET returns map of `name -> code` for attack vectors.
  - POST creates a new vector: `{ "category": "x", "name": "Name", "code": <int?> }` (server will assign code if 0).
- GET `/api/admin/blocked`
  - Returns: `[{ "request_id": "<id>", "timestamp": <unix>, "path": "...", "method": "GET", "ai_response": {...}, "decision_summary": "...", "confidence_label": "..." }, ...]`
  - Purpose: list recent requests that were automatically blocked by the AI (saved into `audit_logs` as `event_type = 'blocked'`). Useful to see what the AI prevented from reaching the origin.

4) Request lifecycle (detailed step-by-step)
1. Client makes HTTP request to the WAF (this could be a browser, an automated test, or `scripts/replay_dvwa_hits.sh`). The target path may point at the DVWA service behind the WAF.
2. `internal/proxy/handler.go` receives the `http.Request` and performs quick parsing (`parser.go`) to extract method, path, headers, body, and other interesting fields.
3. Static detectors (`static_detector.go`) run to catch high-confidence patterns immediately (e.g., certain payloads). If a static detector decides to block, the WAF returns the blocking response immediately and may log to audit.
4. The handler checks AI engine health via `internal/ai/health.go` (GET /health to AI engine). If AI engine is healthy, it calls the `POST /detect` endpoint with a compact representation of the request to get a detection result.
   - If AI is down/unhealthy and the policy is configured to fail-open, then `internal/engine/failopen.go` will persist a pending request (with `ai_response_json` null) and the request is allowed through (or handled per policy). This ensures operators see the failed checks in the dashboard.
5. The AI response (or fail-open) plus policy decision logic (`internal/engine/decision.go` and `policy.go`) produce a final decision: `allow` or `block`. Low-confidence responses (below configured threshold) are typically recorded in `pending_requests` for operator review instead of being blocked outright.
6. If the decision is to allow the request, the proxy forwards the request to the origin (DVWA) and returns the origin's response back to the client. This is what you see in the "Website output" end.
7. If the decision is to block, the proxy returns an immediate blocking response to the client (and records the event in audit and possibly pending lists depending on config).

5) DB (SQLite) tables & important columns
- `pending_requests` (how requests are shown in the dashboard)
  - `id` (internal auto id)
  - `request_id` (GUID used in UI)
  - `method`, `path`, `headers`, `body` (serialized)
  - `created_at`
  - `ai_response_json` (nullable) — null for fail-open events
  - `metadata` — any additional parsed fields
- `labeled_data` (what operators create when they label a request)
  - `id`, `vector_name`, `code`, `text` (the encoded BERT string or representation saved via `ToBERTString(req)`), `created_at`
- `attack_vectors`
  - mapping of user-friendly vector name -> numeric code and category.
- The repository implementation is in `internal/storage/sqlite.go`. Use the repository methods:
  - `SavePendingRequest(req, aiResponse)`
  - `GetPendingRequests()` / `GetPendingRequestByID(id)`
  - `DeletePendingRequest(id)`
  - `SaveLabeledData(text, vector, code)`
  - `GetAttackVectors()` / `SaveAttackVector(name, code, category)`

6) How the UI shows and interacts with requests
- Template: `web/dashboard/templates/requests.html` renders the page container and includes `requests.js` and `review.js`.
- `web/dashboard/static/js/requests.js` responsibilities:
  - Polls `/api/admin/requests/count` every 3s and refreshes list on change.
  - Fetches `/api/admin/requests` to build the list of rows.
  - Renders each row as an `<li>` with a checkbox (`.request-checkbox`) and a clickable label that opens the review modal.
  - Provides a master `Select All` checkbox (`#select-all-cb`) that toggles all visible checkboxes.
  - Implements bulk actions (safe / unsafe / delete) by POSTing to bulk endpoints with the appropriate JSON payloads.
- `web/dashboard/static/js/review.js` responsibilities:
  - `openReview(id)` fetches `/api/admin/requests/{id}` and `/api/admin/vectors` and populates the review dialog (`<dialog id="review-modal">`).
  - Single-item `Safe` action calls `POST /api/admin/requests/{id}/safe` (no body).
  - Single-item `Unsafe` action calls `POST /api/admin/requests/{id}/unsafe` with the chosen vector JSON.
  - The review modal can create new vectors via `POST /api/admin/vectors`.

7) Bulk action details & formats (examples)
- Bulk safe (client): POST `/api/admin/requests/bulk/safe`
  - Body: `{ "ids": ["req-uuid-1", "req-uuid-2"] }`
  - Response: `{"status":"ok"}` or partial `{"status":"partial","errors":[...]}` with HTTP status `207 Multi-Status` on partial errors.
- Bulk unsafe (client): POST `/api/admin/requests/bulk/unsafe`
  - Body: `{ "items": [{"id":"req-id","vector_name":"SQLi","code":101}, ...] }`
- Bulk delete (client): POST `/api/admin/requests/bulk/delete`
  - Body: `{ "ids": [ ... ] }`

8) Example curl usages
- Get list and count

```bash
curl -s http://localhost:9090/api/admin/requests | jq .
curl -s http://localhost:9090/api/admin/requests/count | jq .
```

- Bulk mark safe

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"ids":["req-123","req-456"]}' \
  http://localhost:9090/api/admin/requests/bulk/safe
```

- Bulk mark unsafe

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"items":[{"id":"req-123","vector_name":"SQLi","code":101}]}' \
  http://localhost:9090/api/admin/requests/bulk/unsafe
```

- Delete bulk

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"ids":["req-123"]}' \
  http://localhost:9090/api/admin/requests/bulk/delete
```

9) How requests appear "one by one" in Website output end (DVWA interaction)
- The Website output end simply receives whatever the WAF forwarded. When running DVWA behind the WAF (Docker Compose), each proxied request will reach DVWA and produce a response.
- Sequence examples (common cause of 302s noticed earlier):
  - Unauthenticated test requests to DVWA endpoints often get `302 -> login.php` because DVWA enforces session-based login and CSRF protections. To exercise DVWA payloads as the same user, the replay script performs an authenticated session bootstrap: login, set security to low, then replay payloads.
  - A correct per-request sequence for a test case that should show up in the dashboard as a pending request often looks like:
    1. Client (script/browser) sends POST /vulnerable.php with payload X to WAF.
    2. WAF records and/or forwards the request per policy (AI health/detect result).
    3. DVWA receives the request and returns a page (possibly 302 to login if not authenticated).
    4. The script follows redirects and logs the result; the operator sees the request in the dashboard (if it was saved to `pending_requests`).
- If you see many `302 -> login.php` results in `response.txt`, ensure the replay uses the login flow and retains cookies for subsequent payload requests.

10) How AI integration affects what shows up
- When AI engine returns a clear malicious label and a decision is to block, the request may never reach DVWA (because WAF blocks it) — it will still be recorded in audit/labeled data depending on config.
- When AI is down or unhealthy, a fail-open path is taken: the request is saved to `pending_requests` with `ai_response_json = null` and the request is forwarded to the origin. The dashboard now shows that event so an operator can triage missed checks.

11) Testing & reproduction steps (DVWA + local WAF)
1. Start DVWA service via Docker Compose (repository includes `deploy/docker/docker-compose.yml` that defines `dvwa` and `ai-engine` in tests):

```bash
cd deploy/docker
docker-compose up -d
```

2. Start the local server (proxy + dashboard):

```bash
# from repo root
go run ./cmd/waf
# or use the provided make target
make run
```

3. Bootstrap an authenticated DVWA session (the repo has `scripts/replay_dvwa_hits.sh` which performs login + sets security low). To run it:

```bash
./scripts/replay_dvwa_hits.sh
# or run portions manually: login, set security, and then replay payloads
```

4. Open the dashboard pending view:
- URL: `http://localhost:9090/requests`
- Use the `Select All` checkbox to pick all rows, then click `Mark Selected Safe` or `Mark Selected Unsafe`.

5. Verify DB changes with sqlite3 (if desired):

```bash
sqlite3 data/waf.db "select count(*) from pending_requests;"
sqlite3 data/waf.db "select * from labeled_data order by created_at desc limit 10;"
```

12) Troubleshooting tips
- No requests in dashboard: Ensure `SavePendingRequest` is called in codepaths you expect. Fail-open events were persisted by `internal/engine/failopen.go` in the recent patch — confirm AI health checks are hitting and failing if you expected fail-open.
- Many `302 -> login.php`: Replay script must login and persist cookies. Use the included script or open the application in a browser and log in to DVWA before sending test payloads.
- Bulk API returning 207/partial: check the `errors` array in the JSON to see which IDs failed and why.
- Unknown vector on bulk-unsafe: call `GET /api/admin/vectors` to see available names and codes, or create a new vector via `POST /api/admin/vectors`.

13) Security and permissions
- The dashboard runs in the same binary and uses the same HTTP server; in production you should protect admin endpoints with authentication middleware. The project repo includes `internal/auth` with middleware helpers — wire them into the admin routes as needed.
- Bulk endpoints run the same repository operations as single-item endpoints; they currently do not enforce CSRF tokens. If you expose this admin UI to untrusted networks, add CSRF and authentication.

14) Extending the UI (recommended improvements)
- Replace the prompt-based vector selection in bulk-unsafe with a modal that shows a searchable list of `GET /api/admin/vectors` and allows selecting a vector per item or one vector for all selected items.
- Add a progress bar / spinner for large bulk operations and incremental feedback from the server.
- Add filtering and pagination to `/api/admin/requests` (server currently returns all pending requests; will need offset/limit hooks).

15) Implementation notes & recent patches
- I added bulk handlers to `internal/admin/handlers.go` (`BulkSafe`, `BulkUnsafe`, `BulkDelete`) and registered them in `internal/admin/api.go` under `/api/admin/requests/bulk/*`.
- I updated the UI templates and JS:
  - `web/dashboard/templates/requests.html` — added `Select All` and bulk action buttons.
  - `web/dashboard/static/js/requests.js` — renders checkboxes, preserves select-all state, posts to bulk endpoints.
  - `web/dashboard/static/js/review.js` — still supports single-item review + vector creation.
- The code compiles (`go build ./...` completed successfully during the change).

- I added a blocked-events path and persistence:
  - `internal/proxy/handler.go` now calls `SaveBlockedEvent` when the AI blocks a request so operators can inspect what the AI prevented from reaching the origin.
  - `internal/admin/handlers.go` exposes `GET /api/admin/blocked` which lists those blocked events (stored as `event_type = 'blocked'` in `audit_logs`).

Appendix: Quick checklist for reproducing a single request end-to-end
- Start DVWA + AI engine (docker-compose) and the WAF server.
- Login to DVWA (browser or script) and set security to low.
- Send a single crafted request through the WAF (curl or browser).
- Observe the WAF logs (stdout) to see AI health/detect and decision.
- Check the dashboard: `/requests` and open the request.
- Label it Safe/Unsafe or use bulk actions if doing many.

-- End of guide
