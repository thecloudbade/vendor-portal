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
# Edit .env: set VITE_API_BASE_URL to your backend (e.g. http://localhost:3000)
npm run dev
```

- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Lint:** `npm run lint`
- **Test:** `npm run test` / `npm run test:run`

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | API base URL (no trailing slash). **No secrets** – public config only. |

## Security (frontend)

- **Access token:** in-memory only (never `localStorage`).
- **Refresh token:** httpOnly cookie (set by backend).
- **CSRF:** `X-CSRF-Token` header from cookie/meta for state-changing requests.
- **Anti-clickjacking:** app blocks when loaded in iframe; backend should send `X-Frame-Options: DENY`.
- **Return URL:** validated to same origin to prevent open redirects.
- **Sanitization:** minimal HTML sanitization for previews; no `dangerouslySetInnerHTML` with user input.

## Route structure

| Path | Description |
|------|-------------|
| `/auth/login` | Email + user type (org/vendor) → request OTP |
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
| `/vendor/upload/:poId` | Upload PL/CI/COO for a PO |
| `/vendor/uploads` | Upload history |

## API contracts (frontend expects)

Backend should implement at least:

- **Auth:** `POST /auth/request-otp`, `POST /auth/verify-otp` → `{ user, accessToken }` + refresh cookie, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` → `{ user }`
- **Org:** `GET/POST /org/vendors`, `POST /org/vendors/:vendorId/invite`, `GET /org/pos`, `GET /org/pos/:poId`, `GET/PUT /org/settings`, `GET /org/audit`
- **Vendor:** `GET /vendor/pos`, `GET /vendor/pos/:poId`, `GET /vendor/templates/pl`, `GET /vendor/templates/ci`, `POST /vendor/pos/:poId/uploads` (multipart), `GET /vendor/uploads`

Tenant context is derived from the token (backend); frontend does not trust client for tenant.

## Deliverables checklist

- Route guards + permission gates (org/vendor, RBAC)
- Token handling (in-memory access + refresh cookie)
- OTP cooldown UI (resend countdown)
- Centralized HTTP client with interceptors and safe error handling
- Secure upload UI (accept list, size limits)
- Audit UI and “who did what” display
- Build: env separation, CSP-compatible, no secret leakage
