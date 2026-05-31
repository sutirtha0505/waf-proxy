## SmartWAF — Project Summary

This repository contains a React + Vite single-page dashboard called SmartWAF: a UI for an AI-assisted Web Application Firewall. The frontend is a polished admin interface with mock data and client-side interactions that demonstrate the expected behavior of a complete SmartWAF product.

The UI focuses on three main flows:
- Real-time monitoring and charts (traffic, blocked/allowed counts)
- A human-in-the-loop review workflow (requests queue, mark safe / unsafe, label attack vectors)
- Product configuration (WAF mode, AI threshold, IP blocklist)

Below is a breakdown of what exists, how it works, and what is expected to be provided by the backend or additional work to make this production-ready.

## How the project is organized (key files)

- `frontend/src/App.jsx` — router and basic auth-state gating. The app holds a simple `authed` state and routes: `/login`, `/` (MainLayout), `/requests`, `/analytics`, `/settings`.
- `frontend/src/main.jsx` — React entry that mounts `App`.
- `frontend/src/index.css` — global styles and Tailwind setup plus UI utility classes used across components.

Pages (routes):
- `pages/LoginPage.jsx` — marketing-style login UI; calls back to the parent via `onLogin()` (no real auth). The app uses the `authed` state in `App.jsx` to protect routes.
- `pages/DashboardPage.jsx` — main dashboard showing stat cards, traffic charts, global threat map (3D globe), recent activity table, and a request review modal.
- `pages/RequestsPage.jsx` — paginated/list view for requests; poll-simulated new incoming requests (client-side interval). Supports filtering by status and viewing a request detail modal where the user can mark safe/unsafe.
- `pages/AnalyticsPage.jsx` — charts and analytics (area chart, bar chart, pie charts) driven by mock traffic data.
- `pages/SettingsPage.jsx` — controls for WAF mode, AI threshold slider, IP blocklist manager, and protected application metadata.

Layout & shared UI:
- `layouts/MainLayout.jsx` — app shell: desktop sidebar, mobile drawer, and main content outlet.
- `components/Sidebar.jsx` — navigation, theme toggle, collapsed / expanded states, pending count badge.
- `components/StatCard.jsx` — animated stat number, trend text.
- `components/GlobeCanvas.jsx` — 3D globe using three.js and three-globe. It fetches world topo data from `unpkg` and renders hex polygons and glow.
- `components/RequestModal.jsx` — request details viewer with JSON-like visualization, actions to mark safe/unsafe, and integration with `AttackVectorModal` for unsafe labeling.
- `components/AttackVectorModal.jsx` & `components/AddVectorModal.jsx` — vector selection and creation UI. Vectors are read from `data/attackVectors.js` by default and may be extended at runtime.
- `components/Toast.jsx` — small transient message UI.

Context & hooks:
- `context/ThemeContext.jsx` + `hooks/useTheme.js` — theme provider and persistence to localStorage; toggles `document.documentElement.classList` to switch dark mode.

Mock data and utilities:
- `data/mockRequests.js` — a seeded list of request objects used throughout the UI. Each request contains many fields (request_id, timestamp, source_ip, method, path, attack_vector, confidence_score, status, etc.). The Requests page simulates new incoming requests by periodically prepending items to the list.
- `data/mockTraffic.js` — traffic timeseries, attack breakdown, top IPs, and bucketed confidence distributions used in charts.
- `data/attackVectors.js` — canonical mapping of attack categories → vectors with numeric codes (used by `AttackVectorModal` and add-vector flow).

Dependencies (frontend):
- The top-level `package.json` shows a few graphic-related dependencies used by the globe: `three-globe`, `topojson-client`, and `world-atlas`. The app is a Vite React project (README references React + Vite template).

## Runtime / dev notes
- Running locally (frontend): standard Vite app flow — install dependencies and run the dev server. The exact scripts live in `frontend/package.json` (not included verbatim here), but typical commands are:

  - npm install (in `frontend/`)
  - npm run dev

- No backend server is present in this repository. All data and AI behavior are mocked client-side.
- The app fetches `world-atlas` JSON at runtime from unpkg for the globe; ensure network access during development.

## UX & Functional highlights (what the app currently implements)

- Login gating: a simple login form that triggers in-memory `authed` and redirects to the dashboard.
- Theme support: persistent light/dark with transition-friendly CSS and a theme toggle in the sidebar.
- Dashboard: stat cards with animated counters, request traffic charts (area chart), pie/bar charts for attack breakdown, a globe with hex polygons, and a recent suspicious activity table.
- Requests review workflow: view request details in a modal, mark as Safe (status -> `safe`) or Unsafe. When marking Unsafe the user chooses an attack vector (from `attackVectors`) and the request status updates to `unsafe`.
- Attack vector management: users can search, pick, collapse categories, and add new vectors (client-only update persisted in React state during runtime).
- Settings: WAF operating modes, configurable AI confidence threshold slider (50–99%), and an IP blocklist manager with add/remove UI.
- Live-feel interactions: simulated polling and animations (Framer Motion) across many elements.

## Expected features (what a production SmartWAF would need)

The frontend provides a complete UI and mock flows, but production behavior requires several missing pieces (backend, storage, models, policies). Expected features with brief rationale:

1. Backend API for requests and actions
	- Endpoints: GET /requests, GET /requests/:id, POST /requests/:id/label, POST /vectors, GET /vectors, PUT/DELETE blocklist, GET /traffic
	- Rationale: persist user labels, allow multiple reviewers, serve real traffic, and avoid storing sensitive data in client bundles.

2. Persistent storage / database
	- Store requests, labels, attack vectors, blocklist, WAF configuration, and audit logs.

3. Real-time ingestion & streaming
	- WebSockets or server-sent events to push new requests / updates to clients (instead of client-side timers).

4. AI model integration
	- A model service (BERT/transformer-based classifier, or API to SAAS ML) that scores requests and returns attack vector + confidence. The UI currently displays confidence but the score is mocked.

5. Authentication & RBAC
	- Proper login, session management, roles (reviewer, admin) and permissions around actions (block/unblock, label, change settings).

6. Enforcement plane (WAF runtime)
	- A runtime that can apply configured policies (blocking, allowlisting, rate limits) — this may run as an HTTP reverse proxy, sidecar, or cloud function.

7. Telemetry, metrics, and auditing
	- Store and export logs, enable metrics (Prometheus), and allow forensic drill-down.

8. CI, tests and deployment manifests
	- Unit tests for React components, integration tests for APIs, and deployment infra (Dockerfiles, k8s manifests or serverless config).

9. Privacy / security considerations
	- PII redaction in UI, secure storage of logs, rate limits on label actions, and protections for the model API.

## Low-risk, high-value follow-ups / quick wins

1. Add a small Node/Express or Fastify backend stub that provides the requests and vectors endpoints and persists to a lightweight DB (SQLite / JSON file) so labels survive reloads.
2. Replace polling with a WebSocket endpoint to stream new request events into the frontend.
3. Add unit tests for critical components (RequestModal, AttackVectorModal) and a couple of smoke tests for routing.
4. Add feature flags to turn off mock polling for demos.

## Files of interest (quick mapping)
- `frontend/src/pages/*` — main UX flows and pages.
- `frontend/src/components/*` — UI primitives and modals used across pages (RequestModal, AttackVectorModal, GlobeCanvas, Sidebar, StatCard, Toast).
- `frontend/src/data/*` — mockRequests, mockTraffic, attackVectors (source of all sample data shown in the UI).
- `frontend/src/context/*`, `frontend/src/hooks/*` — theme persistence and context.

## Final notes
- The repository contains a fully-designed frontend that demonstrates the complete product UX for monitoring, reviewing, and labeling suspicious requests. To go from prototype to production you will need a backend to ingest real traffic, persist labels, secure the UI, and provide real-time updates. The UI code is modular and ready to be wired to APIs: components call local state and callbacks that are straightforward to replace by network requests.

If you want, I can:
- scaffold a minimal backend (Express/Fastify) with the essential endpoints and a small JSON/SQLite store so the UI persists labels and vectors, or
- add unit tests for critical components and a small E2E test to validate the review flow, or
- wire the frontend to that stub backend and demo the full round-trip.

Tell me which of those you'd like next and I'll implement it.