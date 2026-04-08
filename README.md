# Vendor Portal (React Frontend)

Modern React app for the Vendor Portal: org (buyer) and vendor users, OTP auth, PO search, document uploads, templates, and org settings.

## Stack

- **React 18** + **TypeScript**
- **Vite** (build)
- **React Router** (route-level lazy loading)
- **TanStack Query** (API caching, retries)
- **Zod** + **React Hook Form** (validation)
- **Radix UI** + **Tailwind CSS** (shadcn-style components)
- **Vitest** + **React Testing Library** (testing)

## Setup

```bash
npm install
cp .env.example .env
# Optional: VITE_API_BASE_URL (default in dev: http://localhost:8080/api/v1)
npm run dev
```

- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Lint:** `npm run lint`
- **Test:** `npm run test` / `npm run test:run`

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | e.g. `http://localhost:8080/api/v1`. Responses use `{ success, data }` — unwrapped in the HTTP client. |

## Security (frontend)

- **Access token:** in-memory only (never `localStorage`).
- **Refresh token:** httpOnly cookie (set by backend).
- **CSRF:** `X-CSRF-Token` header from cookie/meta for state-changing requests.
- **Anti-clickjacking:** app blocks when loaded in iframe; backend should send `X-Frame-Options: DENY`.
- **Return URL:** validated to same origin to prevent open redirects.
- **Sanitization:** minimal HTML sanitization for previews; no `dangerouslySetInnerHTML` with user input.

## Authentication (account types and OTP)

| Account type | Request OTP | Verify OTP |
|--------------|-------------|------------|
| Org admin / org user / vendor user | `POST /api/v1/auth/otp/request` | `POST /api/v1/auth/otp/verify` |
| SaaS superadmin (platform) | `POST /api/v1/auth/platform/otp/request` | `POST /api/v1/auth/platform/otp/verify` |

The **platform superadmin** UI is **not linked** from the public org/vendor login screen. Operators reach it by navigating directly to the routes below (bookmark or internal runbook only).

| Private route | Purpose |
|----------------|---------|
| `/auth/platform/login` | Request platform OTP (seeded `PlatformUser` email) |
| `/auth/platform/verify-otp` | Verify platform OTP (query: `email`, optional `returnUrl`) |
| `/platform` | Platform console (requires `SUPERADMIN` session) |
| `/org-admin/signup` | Org admin invite completion (`?token=`) |

## Route structure

| Path | Description |
|------|-------------|
| `/auth/login` | Email → request OTP (passwordless) |
| `/auth/verify-otp` | OTP verification |
| `/org/dashboard` | Org dashboard (pending POs, vendors, exceptions) |
| `/org/vendors` | Vendor list, create vendor, invite user |
| `/org/vendors/:vendorId` | Vendor detail, invite users |
| `/org/pos` | PO list (org) |
| `/org/pos/:poId` | PO detail (org), linked uploads |
| `/org/settings` | Upload rules, API tokens, email rules |
| `/org/audit` | Audit / activity log |
| `/vendor/dashboard` | Vendor dashboard (pending POs, uploads, notifications) |
| `/vendor/po-search` | PO search (vendor) |
| `/vendor/po/:poId` | PO detail (vendor) |
| `/vendor/upload/:poId` | Upload PL/CI/COO for a PO (optional **Include parse debug** on Continue → `validationDebug=true` → collapsible JSON with `plCsvUpload` grid + detected rows) |
| `/vendor/uploads` | Upload history |

## API contracts (frontend expects)

Base path is typically `/api/v1` (see `VITE_API_BASE_URL`). Backend should implement at least:

- **Auth (org/vendor):** `POST /auth/otp/request`, `POST /auth/otp/verify` → `{ user, accessToken }` + refresh cookie, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` → `{ user }`
- **Auth (platform superadmin only):** `POST /auth/platform/otp/request`, `POST /auth/platform/otp/verify` — same response shape; JWTs are for `/platform/*` only. Not linked from the main login UI; use private routes in the table above.
- **Org vendors (ORG_ADMIN, ORG_USER):**
  - `GET /vendors` — list vendors
  - `POST /vendors` — create vendor
  - `GET /vendors/:vendorId` — vendor detail
  - `GET /vendors/:vendorId/users` — portal users + pending invitations for that vendor (404 if vendor not in org). Response `data`:
    ```json
    {
      "vendorId": "...",
      "users": [
        {
          "id": "...",
          "email": "a@b.com",
          "name": "Name",
          "status": "ACTIVE",
          "lastLoginAt": "...",
          "createdAt": "...",
          "updatedAt": "..."
        }
      ],
      "pendingInvitations": [
        {
          "id": "...",
          "email": "c@d.com",
          "status": "SENT",
          "expiresAt": "...",
          "createdAt": "..."
        }
      ]
    }
    ```
  - `POST /vendors/:vendorId/invite` — body `{ "email": "..." }`. Response `data`:
    ```json
    {
      "invitationId": "...",
      "email": "...",
      "status": "SENT",
      "expiresAt": "..."
    }
    ```
- **Org:** `GET /org/pos`, `GET /org/pos/:poId`, org preferences, NetSuite routes as implemented in `org.api.ts`
- **Org audit (admin):** `GET /org/audit?page=&pageSize=` — response `data`: `{ items: [{ id, orgId, vendorId, poId, actorType, actorId, vendorUserId, eventType, payload, createdAt }], total, page, pageSize, totalPages }`
- **Org NetSuite:** `POST /org/integrations/netsuite/fetch` with `type: "purchaseorders"` / `"purchaseLineData"`. Org list: `query.vendor_id` (portal vendor) and optional `transactionId` (PO # filter). Line detail: same `vendor_id` + `trans_id` (NetSuite PO internal id; aliases normalized on server). Pagination keys stripped server-side for these fetches.
- **Org NetSuite field config (ORG_ADMIN):** `GET` / `PUT /org/integrations/netsuite/field-config` — persists **`item_fields`** for **purchase order line** outbound calls only (`purchase_order_line` in the normalized client shape). `PUT` body `{ "item_fields": string[] }` (tokens `[a-zA-Z0-9_]{1,128}`, max 50). **404** if NetSuite not configured. **UI flow (Settings → NetSuite data):** `POST …/record-types/list` → choose record type → `POST …/metadata/fetch` with required **`recordType`** → sublist/line field ids are the default suggestions for `item_fields` (optional checkbox to include header/body fields) → `PUT …/field-config`. `POST …/record-types/list`, `…/metadata/fetch`, and `…/field-config/fetch` are **ORG_ADMIN** or **ORG_USER**; **GET/PUT field-config** is **ORG_ADMIN** only. Document template **`packingListLayout`** line paths (`line.netsuiteFields.*`) are informed by synced line blobs and this config — not legacy `mappingRules`.
- **Org document templates (ORG_ADMIN):** Packing list and commercial invoice masters use **`packingListLayout`** (not legacy `mappingRules`). `GET /org/document-templates/mappable-fields` drives field dropdowns (static paths plus dynamic `*.netsuiteFields.*` keys from synced data / cache / field-config). Client validation matches the API: `purchaseOrder.summary.<subKey>`, and NetSuite key segments `[a-zA-Z0-9_.-]`. `GET /org/document-templates/:id` returns `packingListLayout` on the template. `PUT /org/document-templates/:id/mapping` body: `{ "packingListLayout": { "sheetName"?, "itemsStartRow", "headerMap", "itemsColMap", "totalsMap", "staticCells"? } }` or `{ "packingListLayout": null }` to clear. Preview and activation require a saved layout; vendor downloads (`GET .../templates/pl.csv` / `ci.csv`) may return **xlsx** when an active template exists — the client uses **Content-Type** to pick `.xlsx` vs `.csv`.
- **Vendor NetSuite:** `POST /vendor/integrations/netsuite/fetch` — `type: "purchaseorders"` with optional `query.transactionId` (PO # search); `type: "purchaseLineData"` with `query.trans_id` only (vendor scope from auth; no `vendorId` in query). `GET /vendor/pos/:poId`, templates, uploads as before.

Tenant context is derived from the token (backend); frontend does not trust client for tenant.

## Deliverables checklist

- Route guards + permission gates (org/vendor, RBAC)
- Token handling (in-memory access + refresh cookie)
- OTP flow on login / verify pages
- Centralized HTTP client with interceptors and safe error handling
- Secure upload UI (accept list, size limits)
- Audit UI and “who did what” display
- Build: env separation, CSP-compatible, no secret leakage
