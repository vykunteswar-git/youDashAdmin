# UI → Backend Integration Notes (`ui_modification_integrated`)

Branched from `ui_modification`. Goal: keep the new shadcn UI but make every page hit the
real backend, using `zone_setup`'s service layer (`src/services/apiService.js`,
`src/services/adminSocketService.js`) as the source of truth. No faked successes.

## Fakes removed / fixed
| Area | Before (ui_modification) | After |
| --- | --- | --- |
| Order → Notify customer | `POST /orders/{id}/notify` was a no-op (`noopAdapter`) | Routes to real `POST /admin/orders/{id}/notify-user` |
| User → Ban | `POST /users/{id}/ban` no-op + fake "Banned" toast | Removed (no backend endpoint exists — see Backend gaps). Real `hard-delete` kept |
| Hub → Slots save | `PUT /hubs/{id}/slots` no-op + fake "Saved" toast | Save now shows an honest error (no slots endpoint — see Backend gaps) |
| Banners create/update | Sent JSON `imageUrl` | Sent as multipart `FormData` (matches the real multipart `/admin/banners`), supports `imageFile` |
| Dashboard range tabs | Today/Week/Month buttons were dead | Wired to `range` (`TODAY`/`THIS_WEEK`/`THIS_MONTH`) and refetch summary/order-volume |

## New integrations added
- **Live order updates (websocket):** Ported `adminSocketService` (STOMP/SockJS on `/topic/admin/orders`).
  `Orders` page subscribes and live-refreshes the list/grouped view (throttled to 1s). Added a "Live"
  indicator. Vite dev proxy now forwards `/ws` to the backend.
- **Notifications page reworked to the real contract:**
  - Target directory via `GET /admin/notifications/targets` (`{cities, zones, users, riders}`),
    surfaced through `/notifications/targets`.
  - Real `targetType` payload (`ALL_USERS`, `ALL_RIDERS`, `CITY_USERS`, `CITY_RIDERS`, `ZONE_USERS`,
    `ZONE_RIDERS`) + `city`/`zoneId` + JSON `data` + `saveDraft`, posted to `/admin/notifications/broadcast`.
  - Paginated logs from `GET /admin/notifications/logs?page&size` (handles `content[]`/`logs[]`,
    `totalPages`), with Prev/Next.

## Already real (verified against apiService.js) — unchanged
Orders list/detail/status/assign, Riders approve/reject/available, Vehicles, Zones, Hubs,
Pricing zone-routes/hub-routes, App Config, App Version, Transactions, Withdrawals, Wallet COD settle,
Commission, Incentives (create + toggle), COD Handover, Categories, Coupons. The `src/lib/api.js`
shim translates the UI's clean paths to the real `/admin/...` endpoints.

## Hub Delivery SLAs (replaced the fake "slots")
- The fake per-hub slot editor was replaced with a real **Hub Corridor SLA** editor wired to
  `/admin/hub-corridor-sla` (list by `hubId`, create, update). DTO:
  `{ hubId, destinationZoneId, deliveryType: NEXT_DAY|HOURS, cutoffTime: "HH:mm", deliveredWithinHours, priority, isActive }`.
  The Hubs row action is now labelled **"SLA"**.
- Shim also exposes `/zone-route-sla` and `/hub-route-sla` (mapped to `/admin/zone-route-sla` and
  `/admin/hub-route-sla`) for future Pricing-side SLA editing.

## Completed CRUD (endpoints now fully wired)
- **Incentives:** added Edit (PUT) + Delete (`/admin/incentives/peak-campaigns/{id}`) alongside the
  existing create + active toggle.
- **Categories:** added Edit (PUT) + per-row active toggle alongside create + delete.

## Backend gaps (NOT faked — need a real endpoint or a decision)
1. **User ban** — no endpoint exists (only `hard-delete`). Ban action removed from UI. Add
   `POST /admin/users/{id}/ban` server-side to restore it.
2. **Audit Logs** — no audit endpoint anywhere. The page still synthesizes a feed from notifications +
   transactions (real data, relabeled). Needs a real `/admin/audit-logs` endpoint to be truthful.
3. **Pricing Resolver** — no backend resolver. Still computed client-side
   (hub-route → zone-route → default ₹9/km). Add `/admin/pricing/resolve` to make it authoritative.
4. **Coupons delete** — backend exposes create/update only; no delete endpoint.
5. **Incentive active toggle** — sends a full peak-campaign body through the shim (PATCH→PUT). If the
   backend PUT is a full replace (not a merge), confirm the toggle preserves schedule/slabs server-side.

## Notes
- Token storage key is `youdash_admin_token`; `getAuthToken()` migrates legacy `token` / `accessToken`
  from zone_setup on read. All requests use `Authorization: Bearer …` via `withAuthHeaders()`.
- Vite dev proxy must **not** include `/orders` (that path is the React route; proxying it returned
  raw `401 Authorization token is missing` JSON instead of the SPA).
- Google Maps (Add/Edit Zone) still needs `VITE_GOOGLE_MAPS_API_KEY`.
- **Vehicle images** upload from the browser to Cloudinary (unsigned preset). Build with
  `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` (see `.env.production.example`).
  **Banners** send `imageFile` multipart to the Spring API — Cloudinary must be configured on the
  backend (`YouDashParcel`), not only in the admin `.env`.
- **Production deploy:** set `VITE_BACKEND_URL=https://youdashexpress.com` at build time. Without it, the
  app defaults to that URL in production builds. Do not POST `/admin/login` to `admin.youdashexpress.com`
  (static nginx → 405); API calls must go to `youdashexpress.com`.
