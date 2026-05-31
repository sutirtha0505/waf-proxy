# Next.js Frontend Guide for Smart WAF

This document is the implementation guide for rebuilding the current dashboard and operator workflow in Next.js App Router with shadcn/ui latest.

The goal is not to change the backend contract first. The goal is to wrap the existing WAF admin API, SSE stream, and traffic endpoint in a modern frontend that keeps the same behavior while giving us a clean component system, server/client separation, and better maintainability.

## 1. What this frontend must cover

The project currently exposes these user-facing facilities:

- Pending request queue with pagination, filters, and row drill-down.
- Single-request review with safe and unsafe labeling.
- Bulk actions for safe, unsafe, and delete.
- Attack vector selection and creation.
- Live updates for queue changes.
- Blocked-request visibility.
- Traffic analytics for charts.
- Authenticated dashboard shell.

The Next.js app should expose all of those facilities in a production-oriented layout while preserving the backend API contract documented in [docs/api.md](docs/api.md) and [web-endpoint-guide.md](web-endpoint-guide.md).

## 2. Recommended stack

Use:

- Next.js App Router.
- TypeScript.
- shadcn/ui latest.
- Tailwind CSS.
- Lucide icons.
- Recharts for traffic charts if you want richer chart controls beyond the shadcn chart wrapper.
- React Server Components for initial data fetches.
- Client components only where interactivity is required.

Suggested setup commands:

```bash
npx create-next-app@latest smart-waf-frontend --ts --app --tailwind --eslint
cd smart-waf-frontend
npx shadcn@latest init
```

Recommended shadcn/ui additions:

- button
- card
- dialog
- dropdown-menu
- input
- badge
- table
- tabs
- select
- separator
- sheet
- skeleton
- toast
- tooltip
- scroll-area
- textarea
- alert-dialog

If you use the chart components from shadcn/ui, add the chart package as well. If you prefer more control, use Recharts directly and keep shadcn for layout, controls, and dialogs.

## 3. App Router structure

Keep the app route tree explicit and feature-based:

```text
app/
	layout.tsx
	page.tsx
	login/
		page.tsx
	dashboard/
		page.tsx
	requests/
		page.tsx
	analytics/
		page.tsx
	settings/
		page.tsx
	blocked/
		page.tsx
	api/
		admin/
			requests/
			vectors/
			blocked/
			traffic/
			stream/
```

Use route handlers under app/api only if you want a Next.js backend-for-frontend layer. That is the preferred pattern here because it keeps the Go API isolated behind a single frontend origin and makes auth/session handling easier.

## 4. Data flow model

The recommended flow is:

1. Browser loads a Next.js page.
2. Server component fetches initial data from the Go admin API or from a Next.js route handler proxy.
3. Interactive client components hydrate on top of the server-rendered content.
4. Live changes arrive through SSE from /api/admin/stream and trigger client refreshes.
5. Mutations such as safe, unsafe, delete, and vector creation go through route handlers or direct API calls.

Use this separation:

- Server components for initial queue, blocked list, and metrics.
- Client components for selection, modals, pagination controls, SSE subscriptions, and chart range switching.
- Route handlers for centralized auth headers, request forwarding, and CORS avoidance.

## 5. Backend contract to preserve

The frontend should consume the existing endpoints exactly as they are documented.

Key endpoints:

- GET /api/admin/requests/count
- GET /api/admin/requests?limit=&offset=&q=&vector=&status=
- GET /api/admin/requests/{id}
- POST /api/admin/requests/{id}/safe
- POST /api/admin/requests/{id}/unsafe
- POST /api/admin/requests/bulk/safe
- POST /api/admin/requests/bulk/unsafe
- POST /api/admin/requests/bulk/delete
- GET /api/admin/vectors
- POST /api/admin/vectors
- GET /api/admin/blocked
- GET /api/admin/stream
- GET /api/admin/traffic?from=&to=&interval=

The current backend already returns X-Total-Count for paginated request listings and emits SSE update events with pending_count and blocked_count. The Next.js frontend should consume those directly instead of re-creating polling.

## 6. Page-by-page guide

### 6.1 Login page

Route: /login

Purpose:

- Authenticate the operator.
- Redirect into the dashboard shell.

shadcn/ui building blocks:

- card
- input
- button
- toast

Behavior:

- Show a compact, deliberate login form.
- Keep the layout visually distinct from the queue and analytics pages.
- Use a server action or route handler if the backend exposes session-based auth.

### 6.2 Dashboard page

Route: /dashboard

Purpose:

- Show queue count.
- Surface traffic analytics.
- Show blocked-by-vector breakdown.

shadcn/ui building blocks:

- card
- select
- badge
- separator
- skeleton

Behavior:

- Fetch /api/admin/traffic on load.
- Show blocked and pending metrics.
- Render a line or area chart for blocked vs pending over time.
- Include a range picker such as 15m, 1h, 6h, and 24h.
- Show top vectors in a compact list or segmented bar view.

### 6.3 Requests page

Route: /requests

Purpose:

- List pending requests.
- Paginate through the queue.
- Support filters and bulk actions.
- Open single-request review.

shadcn/ui building blocks:

- table or card list
- checkbox
- button
- input
- badge
- select
- dropdown-menu
- dialog
- alert-dialog
- separator
- skeleton

Behavior:

- Use limit and offset for the list endpoint.
- Read X-Total-Count from the response headers.
- Keep selection state stable across refreshes.
- Update the queue live via SSE.
- Render blocked requests above or alongside pending items, depending on layout preference.

Important interaction details:

- The Select All checkbox should apply only to the current visible page.
- Bulk safe should POST ids.
- Bulk unsafe should POST items with vector_name and code.
- Bulk delete should confirm destructive action with alert-dialog.
- Clicking a request row opens the review drawer or modal.

### 6.4 Review modal or drawer

Purpose:

- Inspect a single request in full.
- Label it safe or unsafe.
- Add a new attack vector if needed.

shadcn/ui building blocks:

- dialog or drawer sheet
- select
- button
- badge
- scroll-area
- textarea or pre-style container

Behavior:

- Fetch request JSON and vectors on open.
- Show request metadata, decision state, confidence, and raw payload.
- Allow safe and unsafe labeling from the same modal.
- Keep the vector selector searchable if the vector list grows.

### 6.5 Analytics page

Route: /analytics

Purpose:

- Show more detailed charts than the dashboard card.
- Let operators inspect trends over time.

shadcn/ui building blocks:

- tabs
- card
- select
- chart components or Recharts
- badge

Behavior:

- Use the traffic endpoint with interval bucketing.
- Offer blocked, pending, and by-vector views.
- Add time range controls and maybe preset tabs.

### 6.6 Blocked page

Route: /blocked

Purpose:

- Inspect requests blocked by AI.
- Compare blocked traffic to pending review items.

shadcn/ui building blocks:

- table
- badge
- dialog
- scroll-area

Behavior:

- Consume GET /api/admin/blocked.
- Surface decision_summary and confidence_label prominently.
- Let users open the same review modal if they want to inspect the original request.

### 6.7 Settings page

Route: /settings

Purpose:

- Hold WAF configuration surfaces.
- Reserve space for threshold, mode, and blocklist controls.

shadcn/ui building blocks:

- card
- input
- select
- switch
- slider
- textarea

Behavior:

- Even if the current backend does not yet expose full settings endpoints, design the page now so future config APIs drop in cleanly.

## 7. Component architecture

Build the frontend with a small number of reusable components:

- AppShell
- SidebarNav
- TopBar
- PendingQueueTable
- RequestRow
- RequestReviewDialog
- BulkActionBar
- TrafficChartCard
- VectorBreakdownCard
- StatusBadge
- EmptyState
- LoadingSkeleton

Suggested component ownership:

- app layout owns shell and navigation.
- requests page owns pagination, selection, and bulk actions.
- review dialog owns single-request fetch and label mutations.
- dashboard page owns metrics and chart range state.
- analytics page owns large chart visualizations.

## 8. Server handlers and proxying

Use Next.js route handlers if you want a clean frontend API layer.

Good reasons to proxy through Next.js:

- Centralize auth cookies or bearer tokens.
- Avoid CORS configuration on the Go service.
- Normalize headers like X-Total-Count.
- Hide backend URLs from the browser.

Pattern:

- Browser calls /api/frontend/requests.
- Next.js route handler calls the Go backend.
- Route handler forwards JSON and response headers.

If you do not need a proxy layer, direct browser fetches to the Go API are acceptable for local development, but the proxy approach scales better.

## 9. Live updates

The current Go admin service already exposes SSE at /api/admin/stream.

Frontend behavior:

- Subscribe on dashboard and requests pages.
- On update events, refresh queue counts and request pages.
- If SSE disconnects, retry after a short backoff.
- Keep refresh logic idempotent so repeated events do not duplicate rows.

Use EventSource in a client component. Do not put SSE logic in a server component.

## 10. Pagination and filtering rules

Requests page should:

- Send limit and offset on every fetch.
- Read X-Total-Count from the response header.
- Recompute total pages after every mutation.
- Reset or clamp the page index after delete or bulk label operations.

Recommended filter state:

- q for text match.
- vector for attack vector name.
- status for request lifecycle status.

Keep the filter state in the URL if possible so operators can share deep links.

## 11. Visual direction with shadcn/ui

The design should feel like an operations console rather than a generic SaaS dashboard.

Use:

- Dense but breathable cards.
- Clear hierarchy with one strong accent color and restrained neutrals.
- Small caps or uppercase metadata labels.
- Focused modal surfaces for request review.
- Real spacing discipline so the queue reads quickly.

Avoid:

- Overly soft marketing gradients.
- Inconsistent card styles.
- Dense tables without row affordances.
- Hidden actions that force too much clicking.

## 12. File layout I would use

```text
src/
	app/
		layout.tsx
		page.tsx
		login/page.tsx
		dashboard/page.tsx
		requests/page.tsx
		analytics/page.tsx
		blocked/page.tsx
		settings/page.tsx
		api/
			admin/
				requests/route.ts
				requests/[id]/route.ts
				requests/[id]/safe/route.ts
				requests/[id]/unsafe/route.ts
				requests/bulk/safe/route.ts
				requests/bulk/unsafe/route.ts
				requests/bulk/delete/route.ts
				vectors/route.ts
				blocked/route.ts
				traffic/route.ts
				stream/route.ts
	components/
		shell/
		requests/
		dashboard/
		analytics/
		ui/
	lib/
		api.ts
		auth.ts
		stream.ts
		types.ts
		utils.ts
```

## 13. Data types to define early

Create shared TypeScript types before building UI details:

- PendingRequestSummary
- PendingRequestDetails
- AttackVectorMap
- BlockedRequestSummary
- TrafficPoint
- TrafficPayload
- StreamUpdateEvent

This reduces the chance that the review dialog, queue page, and dashboard diverge in how they interpret the backend response.

## 14. Implementation phases

### Phase 1

- Scaffold Next.js App Router.
- Install shadcn/ui latest.
- Build layout, login, dashboard, and requests pages.
- Wire queue pagination and review modal.

### Phase 2

- Add SSE-driven refresh.
- Add bulk actions.
- Add blocked list page.
- Add traffic analytics page.

### Phase 3

- Add route-handler proxy layer.
- Add auth/session integration.
- Add URL-synced filters.
- Add tests and accessibility checks.

## 15. Acceptance criteria

The Next.js frontend is complete when:

- The queue page paginates with limit and offset and respects X-Total-Count.
- The review modal can safe-label, unsafe-label, and create attack vectors.
- Bulk safe, bulk unsafe, and bulk delete work from the UI.
- SSE updates refresh the queue without page reloads.
- The dashboard shows traffic trends from /api/admin/traffic.
- The blocked list is visible and actionable.
- The UI uses shadcn/ui consistently across pages.

## 16. Suggested next step

After this guide, the next implementation step should be to scaffold the Next.js App Router project and create the shared API/types layer before building the pages.

