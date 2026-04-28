import { ApiError, http } from '@/services/http/client';
import { withRefreshRetry } from '@/services/http/interceptors';
import type {
  CreatePlatformOrganizationPayload,
  InviteOrgAdminPayload,
  InviteOrgAdminResult,
  PlatformNetsuiteRestletTypesPayload,
  PlatformOrgDetail,
  PlatformOrgListItem,
  PlatformOrganizationsResult,
  PlatformPaginatedRows,
  PlatformSessionRow,
  PlatformTenantPurchaseOrderRow,
  PlatformTenantVendorRow,
} from '../types';

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function mapOrgRow(raw: Record<string, unknown>): PlatformOrgListItem {
  const metricsRaw = raw.metrics;
  const addr = raw.address;
  const addressStr =
    typeof addr === 'string'
      ? addr
      : addr && typeof addr === 'object' && !Array.isArray(addr)
        ? JSON.stringify(addr)
        : addr != null
          ? String(addr)
          : undefined;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: raw.status != null ? String(raw.status) : undefined,
    timezone: raw.timezone != null ? String(raw.timezone) : undefined,
    address: addressStr,
    createdAt: raw.createdAt != null ? String(raw.createdAt) : undefined,
    metrics:
      metricsRaw && typeof metricsRaw === 'object' && !Array.isArray(metricsRaw)
        ? (metricsRaw as PlatformOrgListItem['metrics'])
        : undefined,
  };
}

function normalizeOrgListPayload(raw: unknown): PlatformOrganizationsResult {
  const o = asRecord(raw);
  const itemsRaw = Array.isArray(o.items)
    ? o.items
    : Array.isArray(o.data)
      ? o.data
      : [];
  const data = itemsRaw.map((row) =>
    mapOrgRow(typeof row === 'object' && row ? (row as Record<string, unknown>) : {})
  );
  const total = typeof o.total === 'number' ? o.total : data.length;
  const page = typeof o.page === 'number' ? o.page : 1;
  const pageSize = typeof o.pageSize === 'number' ? o.pageSize : data.length || 20;
  const totalPages = typeof o.totalPages === 'number' ? o.totalPages : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return { data, total, page, pageSize, totalPages };
}

export async function getPlatformOrganizations(params?: { page?: number; pageSize?: number }) {
  return withRefreshRetry(() =>
    http.get<unknown>('/platform/organizations', { params }).then(normalizeOrgListPayload)
  );
}

export async function createPlatformOrganization(payload: CreatePlatformOrganizationPayload) {
  return withRefreshRetry(() =>
    http.post<unknown>('/platform/organizations', payload).then((raw) => {
      const o = asRecord(raw);
      const inner = o.data && typeof o.data === 'object' ? asRecord(o.data) : o;
      return mapOrgRow(inner);
    })
  );
}

export async function getPlatformOrganization(orgId: string) {
  return withRefreshRetry(() =>
    http.get<unknown>(`/platform/organizations/${encodeURIComponent(orgId)}`).then((raw) => {
      const o = asRecord(raw);
      const inner = o.data && typeof o.data === 'object' ? asRecord(o.data) : o;
      const base = mapOrgRow(inner);
      const pns = inner.platformNetsuiteRestletTypes;
      const platformNetsuiteRestletTypes =
        pns && typeof pns === 'object' && !Array.isArray(pns)
          ? (pns as PlatformNetsuiteRestletTypesPayload)
          : null;
      const detail: PlatformOrgDetail = {
        ...base,
        updatedAt: inner.updatedAt != null ? String(inner.updatedAt) : undefined,
        platformNetsuiteRestletTypes,
      };
      return detail;
    })
  );
}

export async function inviteOrgAdmin(orgId: string, payload: InviteOrgAdminPayload) {
  return withRefreshRetry(() =>
    http
      .post<unknown>(`/platform/organizations/${encodeURIComponent(orgId)}/invitations`, payload)
      .then((raw) => {
        const o = asRecord(raw);
        const inner = o.data && typeof o.data === 'object' ? asRecord(o.data) : o;
        const result: InviteOrgAdminResult = {
          invitationId: inner.invitationId != null ? String(inner.invitationId) : inner.id != null ? String(inner.id) : undefined,
          email: inner.email != null ? String(inner.email) : undefined,
          status: inner.status != null ? String(inner.status) : undefined,
          token: inner.token != null ? String(inner.token) : undefined,
          signupUrl: inner.signupUrl != null ? String(inner.signupUrl) : undefined,
        };
        return result;
      })
  );
}

/** PUT /platform/organizations/:orgId/netsuite-restlet-types — SUPERADMIN */
export async function putPlatformOrganizationNetSuiteRestletTypes(
  orgId: string,
  payload: PlatformNetsuiteRestletTypesPayload
) {
  return withRefreshRetry(() =>
    http
      .put<unknown>(`/platform/organizations/${encodeURIComponent(orgId)}/netsuite-restlet-types`, payload)
      .then((raw) => {
        const o = asRecord(raw);
        const inner = o.data && typeof o.data === 'object' ? asRecord(o.data) : o;
        const base = mapOrgRow(inner);
        const pns = inner.platformNetsuiteRestletTypes;
        const platformNetsuiteRestletTypes =
          pns && typeof pns === 'object' && !Array.isArray(pns)
            ? (pns as PlatformNetsuiteRestletTypesPayload)
            : null;
        const detail: PlatformOrgDetail = {
          ...base,
          updatedAt: inner.updatedAt != null ? String(inner.updatedAt) : undefined,
          platformNetsuiteRestletTypes,
        };
        return detail;
      })
  );
}

/** First non-empty string among camel/snake/API variants (session rows vary by backend). */
function coalesceStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    if (s !== '') return s;
  }
  return undefined;
}

function normalizePaginatedRows<T>(
  raw: unknown,
  mapRow: (r: Record<string, unknown>) => T | null
): PlatformPaginatedRows<T> {
  const o = asRecord(raw);
  const inner =
    o.data && typeof o.data === 'object' && !Array.isArray(o.data)
      ? asRecord(o.data as object)
      : o;
  const itemsRaw = Array.isArray(inner.items)
    ? inner.items
    : Array.isArray(inner.data)
      ? inner.data
      : [];
  const data = itemsRaw
    .map((row) =>
      row && typeof row === 'object' && !Array.isArray(row)
        ? mapRow(row as Record<string, unknown>)
        : null
    )
    .filter((x): x is T => x != null);
  const total = typeof inner.total === 'number' ? inner.total : typeof o.total === 'number' ? o.total : data.length;
  const page = typeof inner.page === 'number' ? inner.page : typeof o.page === 'number' ? o.page : 1;
  const pageSize =
    typeof inner.pageSize === 'number'
      ? inner.pageSize
      : typeof o.pageSize === 'number'
        ? o.pageSize
        : data.length || 20;
  const totalPages =
    typeof inner.totalPages === 'number'
      ? inner.totalPages
      : typeof o.totalPages === 'number'
        ? o.totalPages
        : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return { data, total, page, pageSize, totalPages };
}

function mapSessionRow(r: Record<string, unknown>): PlatformSessionRow | null {
  const userNested =
    r.user && typeof r.user === 'object' && !Array.isArray(r.user)
      ? (r.user as Record<string, unknown>)
      : undefined;
  const orgNested =
    r.organization && typeof r.organization === 'object' && !Array.isArray(r.organization)
      ? (r.organization as Record<string, unknown>)
      : undefined;

  const sessionKey =
    coalesceStr(r, ['sessionId', 'session_id']) ??
    coalesceStr(r, ['id', '_id']);

  const email =
    coalesceStr(r, ['email', 'userEmail', 'user_email']) ??
    (userNested ? coalesceStr(userNested, ['email']) : undefined);

  const userId =
    coalesceStr(r, ['userId', 'user_id']) ??
    (userNested ? coalesceStr(userNested, ['id', 'userId', 'user_id']) : undefined);

  if (!sessionKey && !email && !userId) return null;

  const userType =
    coalesceStr(r, ['userType', 'user_type', 'principalType', 'principal_type', 'type']) ??
    (userNested ? coalesceStr(userNested, ['userType', 'user_type', 'type', 'role']) : undefined);

  const organizationId =
    coalesceStr(r, ['organizationId', 'organization_id', 'orgId', 'org_id']) ??
    (orgNested ? coalesceStr(orgNested, ['id', 'organizationId', 'organization_id']) : undefined);

  const organizationName =
    coalesceStr(r, ['organizationName', 'organization_name', 'orgName', 'org_name']) ??
    (orgNested ? coalesceStr(orgNested, ['name', 'organizationName']) : undefined);

  const ip = coalesceStr(r, [
    'ip',
    'ipAddress',
    'ip_address',
    'clientIp',
    'client_ip',
    'remoteAddr',
    'remote_addr',
    'remoteAddress',
  ]);

  const userAgent = coalesceStr(r, [
    'userAgent',
    'user_agent',
    'client',
    'browser',
    'clientAgent',
    'client_agent',
  ]);

  const role =
    coalesceStr(r, ['role']) ??
    (userNested ? coalesceStr(userNested, ['role']) : undefined);

  const createdAt = coalesceStr(r, ['createdAt', 'created_at']);
  const expiresAt = coalesceStr(r, ['expiresAt', 'expires_at']);
  const lastActiveAt = coalesceStr(r, [
    'lastActiveAt',
    'last_active_at',
    'updatedAt',
    'updated_at',
    'lastSeenAt',
    'last_seen_at',
  ]);

  const id = sessionKey ?? userId ?? email ?? '';

  const row: PlatformSessionRow = {
    ...r,
    id,
    sessionId: sessionKey ?? undefined,
    userId,
    email,
    userType,
    organizationId,
    organizationName,
    role,
    createdAt,
    expiresAt,
    lastActiveAt,
    ip,
    userAgent,
  };
  return row;
}

function mapTenantPoRow(r: Record<string, unknown>): PlatformTenantPurchaseOrderRow | null {
  const id = String(r.id ?? r.poId ?? r._id ?? '').trim();
  if (!id) return null;
  return {
    id,
    poNumber:
      r.poNumber != null
        ? String(r.poNumber)
        : r.po_num != null
          ? String(r.po_num)
          : r.number != null
            ? String(r.number)
            : undefined,
    status: r.status != null ? String(r.status) : undefined,
    vendorId: r.vendorId != null ? String(r.vendorId) : r.vendor_id != null ? String(r.vendor_id) : undefined,
    vendorName:
      r.vendorName != null ? String(r.vendorName) : r.vendor_name != null ? String(r.vendor_name) : undefined,
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
    createdAt: r.createdAt != null ? String(r.createdAt) : undefined,
  };
}

function mapTenantVendorRow(r: Record<string, unknown>): PlatformTenantVendorRow | null {
  const id = String(r.id ?? r._id ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: r.name != null ? String(r.name) : r.vendorName != null ? String(r.vendorName) : undefined,
    email: r.email != null ? String(r.email) : undefined,
    status: r.status != null ? String(r.status) : undefined,
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : undefined,
  };
}

const OVERVIEW_PAGE_SIZE = 100;
const OVERVIEW_MAX_PAGES = 50;

/** Loads every organization page so dashboard rollups match directory totals (respects API pagination). */
export async function fetchOrganizationsRollupPages(): Promise<{
  organizations: PlatformOrgListItem[];
  apiReportedTotalOrgs: number;
  truncated: boolean;
}> {
  const organizations: PlatformOrgListItem[] = [];
  let apiReportedTotalOrgs = 0;
  let page = 1;
  while (page <= OVERVIEW_MAX_PAGES) {
    const res = await getPlatformOrganizations({ page, pageSize: OVERVIEW_PAGE_SIZE });
    organizations.push(...res.data);
    apiReportedTotalOrgs = Math.max(apiReportedTotalOrgs, res.total);
    const totalPages =
      res.totalPages ?? Math.max(1, Math.ceil(res.total / Math.max(1, OVERVIEW_PAGE_SIZE)));
    if (page >= totalPages || res.data.length === 0) break;
    page += 1;
  }
  const truncated = organizations.length < apiReportedTotalOrgs;
  return { organizations, apiReportedTotalOrgs, truncated };
}

/** GET /platform/sessions — optional telemetry (404 if df-vendor does not expose yet). Optional `organizationId` filter when backend supports it. */
export async function getPlatformSessions(params?: {
  page?: number;
  pageSize?: number;
  organizationId?: string;
}) {
  try {
    return await withRefreshRetry(() =>
      http.get<unknown>('/platform/sessions', { params }).then((raw) => normalizePaginatedRows(raw, mapSessionRow))
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** GET /platform/organizations/:orgId/purchase-orders — optional tenant PO listing */
export async function getPlatformOrganizationPurchaseOrders(
  orgId: string,
  params?: { page?: number; pageSize?: number }
) {
  try {
    return await withRefreshRetry(() =>
      http
        .get<unknown>(`/platform/organizations/${encodeURIComponent(orgId)}/purchase-orders`, { params })
        .then((raw) => normalizePaginatedRows(raw, mapTenantPoRow))
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/**
 * GET /platform/organizations/:orgId/vendors — tenant vendor listing.
 * df-vendor returns `{ success, data: Vendor[] }` which unwraps to a plain array; `normalizePaginatedRows`
 * only understands objects with `items` / nested `data`, so we map arrays here and paginate client-side
 * until the API returns a paginated envelope.
 */
export async function getPlatformOrganizationVendors(
  orgId: string,
  params?: { page?: number; pageSize?: number }
) {
  try {
    return await withRefreshRetry(() =>
      http
        .get<unknown>(`/platform/organizations/${encodeURIComponent(orgId)}/vendors`, { params })
        .then((raw) => {
          const page = Math.max(1, params?.page ?? 1);
          const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20));
          if (Array.isArray(raw)) {
            const mapped = (raw as unknown[])
              .map((row) =>
                row && typeof row === 'object' && !Array.isArray(row)
                  ? mapTenantVendorRow(row as Record<string, unknown>)
                  : null
              )
              .filter((x): x is PlatformTenantVendorRow => x != null);
            const total = mapped.length;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const start = (page - 1) * pageSize;
            const data = mapped.slice(start, start + pageSize);
            return { data, total, page, pageSize, totalPages };
          }
          return normalizePaginatedRows(raw, mapTenantVendorRow);
        })
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}
