import { http, ApiError, getApiBaseUrl } from '@/services/http/client';
import { parseFilenameFromContentDisposition } from '@/modules/common/utils/parseContentDisposition';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { withRefreshRetry } from '@/services/http/interceptors';
import { mapPortalPoLineItem } from '@/modules/common/utils/portalPoLineItem';
import { mapPoUploadFromApi } from '@/modules/common/utils/mapPoUploadFromApi';
import type { ApiListResponse } from '@/modules/common/types/api';
import type {
  VendorListItem,
  VendorDetail,
  VendorUsersPayload,
  InviteVendorUserResult,
  POListItem,
  PODetail,
  PODetailLineItem,
  OrgPOUpdatePayload,
  OrgMe,
  OrgPreferencesPayload,
  NetSuiteIntegrationStatus,
  NetSuiteIntegrationPutPayload,
  NetSuiteSyncSchedulePutPayload,
  NetSuiteFieldConfigData,
  NetSuiteFieldConfigPutPayload,
  NetSuiteRecordTypeOption,
  NetSuiteMetadataFieldRow,
  NetSuiteMetadataFetchResult,
  NetSuiteTestResult,
  NetSuiteVendorSyncResult,
  NetSuiteFetchResult,
  NetSuitePOSyncResult,
  NetSuiteRecordCacheType,
  NetSuiteRecordCacheView,
  NetSuiteRecordCacheSyncResult,
  AuditLogEntry,
  OrgRecentUploadItem,
  OnboardingChecklistData,
  OnboardingTask,
  OrgProfilePutPayload,
  OrgPOResetPackingListPayload,
  OrgPOResetPackingListResult,
} from '../types';

function asArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

function mapVendorRow(v: Record<string, unknown>): VendorListItem {
  const emails = v.authorizedEmails as string[] | undefined;
  return {
    id: String(v.id ?? ''),
    name: String(v.vendorName ?? v.name ?? ''),
    vendorName: v.vendorName ? String(v.vendorName) : undefined,
    vendorCode: v.vendorCode ? String(v.vendorCode) : undefined,
    email: emails?.[0] ?? (v.email ? String(v.email) : undefined),
    status: String(v.status ?? ''),
    category: v.category ? String(v.category) : undefined,
    categoryId: v.categoryId ? String(v.categoryId) : undefined,
    inactive: v.inactive === true ? true : v.inactive === false ? false : undefined,
    createdAt: String(v.createdAt ?? ''),
    updatedAt: v.updatedAt ? String(v.updatedAt) : undefined,
  };
}

function mapVendorDetail(v: Record<string, unknown>): VendorDetail {
  const emails = v.authorizedEmails as string[] | undefined;
  const approvedRaw = v.approved;
  return {
    id: String(v.id ?? ''),
    name: String(v.vendorName ?? v.name ?? ''),
    vendorName: v.vendorName ? String(v.vendorName) : undefined,
    vendorCode: v.vendorCode ? String(v.vendorCode) : undefined,
    email: emails?.[0],
    authorizedEmails: emails,
    status: String(v.status ?? ''),
    approved: typeof approvedRaw === 'boolean' ? approvedRaw : undefined,
    inactive: v.inactive === true,
    category: v.category ? String(v.category) : undefined,
    users: v.users as VendorDetail['users'],
    createdAt: String(v.createdAt ?? ''),
    updatedAt: v.updatedAt ? String(v.updatedAt) : undefined,
  };
}

/** GET /vendors — org users only. Optional: q, category, categoryId, inactive */
export async function getVendors(params?: {
  q?: string;
  category?: string;
  categoryId?: string;
  inactive?: boolean;
}) {
  return withRefreshRetry(async () => {
    const raw = await http.get<unknown>('/vendors', { params });
    const rows = asArray<Record<string, unknown>>(raw);
    const data = rows.map(mapVendorRow);
    return { data, total: data.length } satisfies ApiListResponse<VendorListItem>;
  });
}

/** POST /vendors */
export async function createVendor(payload: {
  vendorCode: string;
  vendorName: string;
  authorizedEmails: string[];
}) {
  return withRefreshRetry(() =>
    http.post<VendorDetail>('/vendors', payload).then((r) => mapVendorDetail(r as unknown as Record<string, unknown>))
  );
}

export async function getVendorDetail(vendorId: string) {
  return withRefreshRetry(() =>
    http
      .get<Record<string, unknown>>(`/vendors/${vendorId}`)
      .then((r) => mapVendorDetail(r as Record<string, unknown>))
  );
}

function mapVendorPortalUser(u: Record<string, unknown>) {
  return {
    id: String(u.id ?? ''),
    email: String(u.email ?? ''),
    name: u.name != null ? String(u.name) : '',
    status: String(u.status ?? ''),
    lastLoginAt: u.lastLoginAt != null ? String(u.lastLoginAt) : undefined,
    createdAt: String(u.createdAt ?? ''),
    updatedAt: String(u.updatedAt ?? ''),
  };
}

function mapPendingInvitation(inv: Record<string, unknown>) {
  return {
    id: String(inv.id ?? ''),
    email: String(inv.email ?? ''),
    status: String(inv.status ?? ''),
    expiresAt: String(inv.expiresAt ?? ''),
    createdAt: String(inv.createdAt ?? ''),
  };
}

function mapVendorUsersPayload(raw: Record<string, unknown>): VendorUsersPayload {
  const usersRaw = Array.isArray(raw.users) ? raw.users : [];
  const pendingRaw = Array.isArray(raw.pendingInvitations) ? raw.pendingInvitations : [];
  return {
    vendorId: String(raw.vendorId ?? ''),
    users: usersRaw.map((u) => mapVendorPortalUser(u as Record<string, unknown>)),
    pendingInvitations: pendingRaw.map((i) => mapPendingInvitation(i as Record<string, unknown>)),
  };
}

/** GET /vendors/:vendorId/users — ORG_ADMIN / ORG_USER */
export async function getVendorUsers(vendorId: string) {
  return withRefreshRetry(() =>
    http.get<Record<string, unknown>>(`/vendors/${vendorId}/users`).then((r) => mapVendorUsersPayload(r as Record<string, unknown>))
  );
}

function mapInviteVendorUserResult(raw: Record<string, unknown>): InviteVendorUserResult {
  return {
    invitationId: String(raw.invitationId ?? raw.id ?? ''),
    email: String(raw.email ?? ''),
    status: String(raw.status ?? 'SENT'),
    expiresAt: String(raw.expiresAt ?? ''),
  };
}

/** POST /vendors/:vendorId/invite */
export async function inviteVendorUser(
  vendorId: string,
  payload: { email: string }
): Promise<InviteVendorUserResult> {
  return withRefreshRetry(() =>
    http
      .post<Record<string, unknown>>(`/vendors/${vendorId}/invite`, payload)
      .then((r) => mapInviteVendorUserResult((r ?? {}) as Record<string, unknown>))
  );
}

/** PATCH /vendors/:vendorId/status */
export async function patchVendorStatus(vendorId: string, payload: { status: string }) {
  return withRefreshRetry(() => http.patch(`/vendors/${vendorId}/status`, payload));
}

/** Approve vendor (uses PATCH status — adjust body if your API differs). */
export async function approveVendor(vendorId: string) {
  return patchVendorStatus(vendorId, { status: 'approved' });
}

function mapPOListItemNetsuiteId(raw: POListItem): POListItem {
  const r = raw as unknown as Record<string, unknown>;
  const pick =
    r.netsuiteTransId ??
    r.netsuite_trans_id ??
    r.trans_id ??
    r.netsuitePoId ??
    r.netsuite_po_id ??
    r.po_id;
  const updatedAt =
    r.updatedAt != null
      ? String(r.updatedAt)
      : r.updated_at != null
        ? String(r.updated_at)
        : undefined;
  return {
    ...raw,
    ...(pick != null && String(pick).trim() !== '' ? { netsuiteTransId: String(pick) } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

/**
 * GET /org/pos may return `{ data: T[] }` or paginated `{ items: T[], total? }` inside `success.data`.
 */
function normalizeOrgPOListPayload(raw: unknown): ApiListResponse<POListItem> {
  if (raw == null) {
    return { data: [], total: 0 };
  }
  if (Array.isArray(raw)) {
    const data = raw as POListItem[];
    return { data, total: data.length };
  }
  if (typeof raw !== 'object') {
    return { data: [], total: 0 };
  }
  const o = raw as Record<string, unknown>;
  const meta = o.meta && typeof o.meta === 'object' ? (o.meta as Record<string, unknown>) : null;

  if (Array.isArray(o.data)) {
    const data = o.data as POListItem[];
    const total =
      typeof o.total === 'number'
        ? o.total
        : typeof o.totalCount === 'number'
          ? o.totalCount
          : typeof meta?.total === 'number'
            ? (meta.total as number)
            : data.length;
    return {
      data,
      total,
      page: typeof o.page === 'number' ? o.page : undefined,
      pageSize: typeof o.pageSize === 'number' ? o.pageSize : undefined,
    };
  }

  if (Array.isArray(o.items)) {
    const data = o.items as POListItem[];
    const total =
      typeof o.total === 'number'
        ? o.total
        : typeof o.totalCount === 'number'
          ? o.totalCount
          : typeof meta?.total === 'number'
            ? (meta.total as number)
            : data.length;
    return {
      data,
      total,
      page: typeof o.page === 'number' ? o.page : undefined,
      pageSize: typeof o.pageSize === 'number' ? o.pageSize : undefined,
    };
  }

  return { data: [], total: 0 };
}

export async function getOrgPOs(params: {
  status?: string;
  vendorId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  return withRefreshRetry(() => {
    const { q, ...rest } = params;
    return http.get<unknown>('/org/pos', { params: { ...rest, query: q } }).then((raw) => {
      const result = normalizeOrgPOListPayload(raw);
      const data = result.data.map(mapPOListItemNetsuiteId);
      return { ...result, data, total: result.total ?? data.length };
    });
  });
}

function mapPODetailNetsuiteId(raw: PODetail): PODetail {
  const r = raw as unknown as Record<string, unknown>;
  const pick =
    r.netsuiteTransId ??
    r.netsuite_trans_id ??
    r.trans_id ??
    r.netsuitePoId ??
    r.po_id;
  if (pick == null || pick === '') return raw;
  return { ...raw, netsuiteTransId: String(pick) };
}

/** Some APIs nest the document under data / purchaseOrder / po. */
function unwrapOrgPODetailPayload(raw: unknown): Record<string, unknown> {
  if (raw == null || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  if (o.purchaseOrder && typeof o.purchaseOrder === 'object') {
    return o.purchaseOrder as Record<string, unknown>;
  }
  if (o.po && typeof o.po === 'object') {
    return o.po as Record<string, unknown>;
  }
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    const d = o.data as Record<string, unknown>;
    if (d.purchaseOrder && typeof d.purchaseOrder === 'object') {
      return d.purchaseOrder as Record<string, unknown>;
    }
    if (d.poNumber != null || d.id != null || d.vendorId != null) {
      return d;
    }
  }
  return o;
}

function mapPOUpload(raw: unknown): NonNullable<PODetail['uploads']>[number] {
  return mapPoUploadFromApi(raw);
}

function mixedRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return undefined;
}

function coerceOrgPODetail(raw: Record<string, unknown>): PODetail {
  const itemsUnknown =
    raw.items ??
    raw.lines ??
    raw.lineItems ??
    raw.purchaseOrderLines ??
    raw.poLines;
  const items: PODetailLineItem[] = Array.isArray(itemsUnknown)
    ? itemsUnknown.map((row, i) => mapPortalPoLineItem(row, i))
    : [];

  const rd = raw.requiredDocs ?? raw.required_docs;
  const requiredDocs = Array.isArray(rd) ? (rd as string[]) : [];

  const uploadsRaw = raw.uploads;
  const uploads = Array.isArray(uploadsRaw) ? uploadsRaw.map(mapPOUpload) : undefined;

  const nls = raw.netsuiteLineFieldLabels ?? raw.netsuite_line_field_labels;
  const netsuiteLineFieldLabels =
    nls && typeof nls === 'object' && !Array.isArray(nls)
      ? Object.fromEntries(
          Object.entries(nls as Record<string, unknown>)
            .filter(([, v]) => v != null && String(v).trim() !== '')
            .map(([k, v]) => [String(k), String(v)])
        )
      : undefined;

  const urRaw = raw.uploadRules ?? raw.upload_rules;
  let uploadRules: PODetail['uploadRules'];
  if (urRaw && typeof urRaw === 'object' && !Array.isArray(urRaw)) {
    const u = urRaw as Record<string, unknown>;
    const pl = u.packingListQtyTolerancePct;
    const ci = u.commercialInvoiceQtyTolerancePct;
    const block = u.blockSubmitOnQtyToleranceExceeded;
    const ar = u.allowReupload;
    const mar = u.maxReuploadAttempts;
    uploadRules = {
      packingListQtyTolerancePct:
        typeof pl === 'number' && Number.isFinite(pl) ? pl : Number(pl) || 5,
      commercialInvoiceQtyTolerancePct:
        typeof ci === 'number' && Number.isFinite(ci) ? ci : Number(ci) || 5,
      blockSubmitOnQtyToleranceExceeded: block !== false,
      ...(typeof ar === 'boolean' ? { allowReupload: ar } : {}),
      ...(mar != null && Number.isFinite(Number(mar)) ? { maxReuploadAttempts: Number(mar) } : {}),
    };
  }

  const dua = raw.documentUploadsAllowed ?? raw.document_uploads_allowed;
  const documentUploadsAllowed =
    typeof dua === 'boolean' ? dua : dua === 'true' ? true : dua === 'false' ? false : undefined;

  return {
    id: String(raw.id ?? ''),
    poNumber: String(raw.poNumber ?? raw.po_number ?? ''),
    status: String(raw.status ?? ''),
    vendorId: String(raw.vendorId ?? raw.vendor_id ?? ''),
    vendorName: raw.vendorName != null ? String(raw.vendorName) : raw.vendor_name != null ? String(raw.vendor_name) : undefined,
    shipTo: raw.shipTo != null ? String(raw.shipTo) : raw.ship_to != null ? String(raw.ship_to) : undefined,
    summary: mixedRecord(raw.summary),
    netsuiteFields: mixedRecord(raw.netsuiteFields),
    ...(netsuiteLineFieldLabels && Object.keys(netsuiteLineFieldLabels).length
      ? { netsuiteLineFieldLabels }
      : {}),
    items,
    requiredDocs,
    uploads,
    ...(uploadRules ? { uploadRules } : {}),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : raw.updated_at != null ? String(raw.updated_at) : undefined,
    netsuiteTransId:
      raw.netsuiteTransId != null
        ? String(raw.netsuiteTransId)
        : raw.netsuite_trans_id != null
          ? String(raw.netsuite_trans_id)
          : undefined,
    ...(documentUploadsAllowed !== undefined ? { documentUploadsAllowed } : {}),
  };
}

export async function getOrgPODetail(poId: string) {
  return withRefreshRetry(() =>
    http.get<unknown>(`/org/pos/${poId}`).then((raw) => {
      const unwrapped = unwrapOrgPODetailPayload(raw);
      const coerced = coerceOrgPODetail(unwrapped);
      return mapPODetailNetsuiteId(coerced);
    })
  );
}

/**
 * POST /org/pos/:poId/reset-packing — clear NetSuite packing list / commercial invoice qty lines
 * and reopen vendor uploads (when the API also sets `documentUploadsAllowed` / clears portal state).
 */
export async function postOrgPOResetPackingList(poId: string, body: OrgPOResetPackingListPayload) {
  return withRefreshRetry(() =>
    http
      .post<OrgPOResetPackingListResult | Record<string, unknown>>(
        `/org/pos/${encodeURIComponent(poId)}/reset-packing`,
        body
      )
      .then((raw) => (raw && typeof raw === 'object' ? (raw as OrgPOResetPackingListResult) : {}))
  );
}

/**
 * GET /files/:fileId — download a persisted submission file (ORG_ADMIN / ORG_USER / VENDOR_USER).
 * Uses Bearer token + cookies; response is `Content-Disposition` attachment.
 */
export async function downloadOrgFile(fileId: string, fallbackFileName?: string): Promise<void> {
  const token = memoryTokenStore.get();
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/files/${encodeURIComponent(fileId)}`;
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = res.statusText || 'Download failed';
    try {
      const text = await res.text();
      if (text) {
        const j = JSON.parse(text) as { error?: { message?: string } };
        if (j?.error?.message) message = j.error.message;
        else if (text.length < 200) message = text;
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const fromHeader = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'));
  const name = fromHeader ?? fallbackFileName ?? `file-${fileId.slice(0, 8)}`;
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

/** PUT /org/pos/:id — update / sync PO (status, NetSuite fields, lines) */
export async function putOrgPO(poId: string, payload: OrgPOUpdatePayload) {
  return withRefreshRetry(() =>
    http.put<unknown>(`/org/pos/${poId}`, payload).then((raw) => {
      const unwrapped = unwrapOrgPODetailPayload(raw);
      const coerced = coerceOrgPODetail(unwrapped);
      return mapPODetailNetsuiteId(coerced);
    })
  );
}

/** POST /org/pos */
export async function createOrgPO(payload: {
  vendorId: string;
  poNumber: string;
  poDate: string;
  lines: { lineNo: number; sku: string; description: string; orderedQty: number; uom: string }[];
}) {
  return withRefreshRetry(() => http.post<PODetail>('/org/pos', payload));
}

/** POST /org/pos/sync */
export async function syncOrgPOsFromErp(payload: {
  system: string;
  token: string;
  vendorId: string;
  fromDate: string;
  toDate: string;
}) {
  return withRefreshRetry(() =>
    http.post<{
      success: boolean;
      logId: string;
      count: number;
      pos: unknown[];
    }>('/org/pos/sync', payload)
  );
}

/** GET /org/pos/sync/logs */
export async function getOrgPOSyncLogs(params?: {
  system?: string;
  status?: string;
  limit?: number;
}) {
  return withRefreshRetry(() => http.get<unknown[]>('/org/pos/sync/logs', { params }));
}

/** GET /org/me */
export async function getOrgMe() {
  return withRefreshRetry(() => http.get<OrgMe>('/org/me'));
}

function mapOnboardingTaskRow(raw: Record<string, unknown>): OnboardingTask {
  const id = String(
    raw.id ?? raw.taskId ?? raw.key ?? raw.slug ?? raw.code ?? ''
  ).trim();
  const title = String(
    raw.title ?? raw.label ?? raw.name ?? raw.taskName ?? id
  ).trim();
  const description = String(
    raw.description ?? raw.detail ?? raw.helpText ?? raw.summary ?? ''
  ).trim();
  const completed =
    raw.completed === true ||
    raw.done === true ||
    raw.isComplete === true ||
    raw.status === 'complete' ||
    raw.status === 'completed';
  const sortOrder =
    typeof raw.sortOrder === 'number'
      ? raw.sortOrder
      : typeof raw.order === 'number'
        ? raw.order
        : typeof raw.index === 'number'
          ? raw.index
          : 0;
  return { id: id || 'unknown', title: title || id, description, completed, sortOrder };
}

function mapOnboardingChecklist(raw: unknown): OnboardingChecklistData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const tasksRaw = Array.isArray(o.tasks)
    ? o.tasks
    : Array.isArray(o.items)
      ? o.items
      : Array.isArray(o.checklist)
        ? o.checklist
        : [];
  const tasks = tasksRaw
    .map((t) => mapOnboardingTaskRow(typeof t === 'object' && t ? (t as Record<string, unknown>) : {}))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  const pct = o.completionPercentage ?? o.completion_percent ?? o.percentComplete ?? o.progress;
  const completionPercentage =
    typeof pct === 'number' && Number.isFinite(pct)
      ? Math.min(100, Math.max(0, Math.round(pct)))
      : undefined;
  return { tasks, completionPercentage };
}

/**
 * GET /org/onboarding-checklist — ORG_ADMIN.
 * Returns null on 403/404 so UI can hide when endpoint is missing or forbidden.
 */
export async function getOnboardingChecklist(): Promise<OnboardingChecklistData | null> {
  return withRefreshRetry(async () => {
    try {
      const raw = await http.get<unknown>('/org/onboarding-checklist');
      return mapOnboardingChecklist(raw);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        return null;
      }
      throw e;
    }
  });
}

/** PUT /org/profile — ORG_ADMIN */
export async function putOrgProfile(payload: OrgProfilePutPayload) {
  return withRefreshRetry(() => http.put<OrgMe>('/org/profile', payload));
}

/** PUT /org/preferences (ORG_ADMIN) */
export async function updateOrgPreferences(payload: OrgPreferencesPayload) {
  return withRefreshRetry(() => http.put<OrgMe>('/org/preferences', payload));
}

/** NetSuite — under /api/v1/org — ORG_ADMIN */
export async function getNetSuiteIntegration() {
  return withRefreshRetry(() => http.get<NetSuiteIntegrationStatus>('/org/integrations/netsuite'));
}

export async function putNetSuiteIntegration(payload: NetSuiteIntegrationPutPayload) {
  return withRefreshRetry(() => http.put<NetSuiteIntegrationStatus>('/org/integrations/netsuite', payload));
}

export interface NetSuiteFolderListEnvelope {
  netsuiteHttpStatus: number;
  body: unknown;
  urlRedacted?: string;
  netsuiteErrorSnippet?: string | null;
}

/** POST /org/integrations/netsuite/folders/list — signed GET `type=getfoldersdata` */
export async function postNetSuiteFoldersList(body?: { page?: number; limit?: number }) {
  return withRefreshRetry(() =>
    http.post<NetSuiteFolderListEnvelope>('/org/integrations/netsuite/folders/list', body ?? {})
  );
}

/** POST /org/integrations/netsuite/folders/create — RESTlet POST with `type: createnewfolder` in JSON body */
export async function postNetSuiteFoldersCreate(body: {
  parentfolderId: number;
  folderName: string;
  description?: string;
}) {
  return withRefreshRetry(() =>
    http.post<NetSuiteFolderListEnvelope>('/org/integrations/netsuite/folders/create', body)
  );
}

/** PUT /org/integrations/netsuite/sync-schedule — ORG_ADMIN; scheduled sync preferences only */
export async function putNetSuiteSyncSchedule(payload: NetSuiteSyncSchedulePutPayload) {
  return withRefreshRetry(() =>
    http.put<NetSuiteIntegrationStatus>('/org/integrations/netsuite/sync-schedule', payload)
  );
}

/** POST /org/integrations/netsuite/test — optional { type, query } */
export async function postNetSuiteTest(body?: { type?: string; query?: Record<string, string> }) {
  return withRefreshRetry(() =>
    http.post<NetSuiteTestResult>('/org/integrations/netsuite/test', body ?? {})
  );
}

/** NetSuite RESTlet routing: PO-scoped fetches use this `recordType`. */
const NETSUITE_FETCH_RECORD_TYPE_PO = 'PURCHASEORDER';

/** POST /org/integrations/netsuite/fetch — debug proxy; type required */
export async function postNetSuiteFetch(body: {
  type: string;
  /** Mirrors `type` when the server expects `recordtypes` as well. */
  recordtypes?: string;
  recordType?: string;
  query?: Record<string, string>;
}) {
  return withRefreshRetry(() =>
    http.post<NetSuiteFetchResult>('/org/integrations/netsuite/fetch', body)
  );
}

/**
 * Fetch vendor-scoped PO metadata from NetSuite via org proxy.
 * ORG_ADMIN / ORG_USER (server-enforced).
 */
export async function postNetSuiteFetchPurchaseOrdersForVendor(params: {
  vendorId: string;
  transactionId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { vendorId, transactionId, page, pageSize } = params;
  const query: Record<string, string> = { vendor_id: vendorId };
  if (transactionId?.trim()) query.transactionId = transactionId.trim();
  if (typeof page === 'number') query.page = String(page);
  if (typeof pageSize === 'number') query.pageSize = String(pageSize);

  return postNetSuiteFetch({
    type: 'purchaseorders',
    recordtypes: 'purchaseorders',
    recordType: NETSUITE_FETCH_RECORD_TYPE_PO,
    query,
  });
}

/**
 * Fetch PO line/detail data via org NetSuite proxy.
 * `transId` is the NetSuite PO internal id (sent on the RESTlet as `trans_id`).
 * ORG_ADMIN / ORG_USER (server-enforced). Aliases on server: tran_id, transactionId, transId.
 */
export async function postNetSuiteFetchPurchaseLineDataForVendor(params: {
  vendorId: string;
  transId: string;
}) {
  const vid = params.vendorId.trim();
  const tid = params.transId.trim();
  if (!vid) throw new Error('vendor_id is required for purchase line data');
  if (!tid) throw new Error('trans_id is required for purchase line data');
  /** df-vendor `postNetSuiteFetch` reads only `{ type, query }` — matches admin POST body shape. */
  return postNetSuiteFetch({
    type: 'purchaseLineData',
    query: {
      vendor_id: vid,
      trans_id: tid,
    },
  });
}

/** Vendor sync — upserts Vendor externalSource NETSUITE */
export async function postNetSuiteSyncVendors() {
  return withRefreshRetry(() =>
    http.post<NetSuiteVendorSyncResult>('/org/integrations/netsuite/sync')
  );
}

/**
 * POST /api/v1/org/integrations/netsuite/sync/purchase-orders
 * (HTTP client base URL includes `/api/v1`.) Calls server `syncPurchaseOrdersFromNetSuite`.
 * Optional body `{ vendorId }` limits sync to one portal vendor; omit per integration defaults.
 */
export async function postNetSuiteSyncPurchaseOrders(body?: { vendorId?: string }) {
  return withRefreshRetry(() =>
    http.post<NetSuitePOSyncResult>('/org/integrations/netsuite/sync/purchase-orders', body ?? {})
  );
}

export async function deleteNetSuiteIntegration() {
  return withRefreshRetry(() => http.delete('/org/integrations/netsuite'));
}

function mapNetSuiteRecordCacheGet(raw: unknown): NetSuiteRecordCacheView {
  let o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  // Some APIs nest the row under `data` after unwrap; support both shapes.
  const inner = o.data;
  if (
    inner &&
    typeof inner === 'object' &&
    !Array.isArray(inner) &&
    ('cached' in (inner as object) || 'payload' in (inner as object) || 'fetchStatus' in (inner as object))
  ) {
    o = inner as Record<string, unknown>;
  }

  const lastQ = o.lastQuery;

  let payload: unknown = o.payload ?? o.record ?? o.body;
  if (payload === undefined && o.data !== undefined && typeof o.data !== 'string' && !Array.isArray(o.data)) {
    payload = o.data;
  }
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      payload = undefined;
    }
  }

  const hasPayload =
    payload != null &&
    (typeof payload !== 'object' ||
      Array.isArray(payload) ||
      Object.keys(payload as Record<string, unknown>).length > 0);

  const cachedExplicit = o.cached === true || o.cached === 'true';
  const cached = cachedExplicit || (hasPayload && o.cached !== false && o.cached !== 'false');

  return {
    cached,
    recordType: o.recordType as NetSuiteRecordCacheView['recordType'],
    payload: hasPayload ? payload : undefined,
    netsuiteHttpStatus: typeof o.netsuiteHttpStatus === 'number' ? o.netsuiteHttpStatus : undefined,
    fetchStatus: o.fetchStatus === 'OK' || o.fetchStatus === 'ERROR' ? o.fetchStatus : undefined,
    errorSnippet: o.errorSnippet != null ? String(o.errorSnippet) : null,
    fetchedAt: o.fetchedAt != null ? String(o.fetchedAt) : null,
    lastQuery:
      lastQ && typeof lastQ === 'object' && !Array.isArray(lastQ)
        ? (lastQ as Record<string, string>)
        : null,
  };
}

function mapNetSuiteRecordCacheSync(raw: unknown): NetSuiteRecordCacheSyncResult {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    success: o.success === true,
    payload: 'payload' in o ? o.payload : undefined,
    netsuiteHttpStatus: typeof o.netsuiteHttpStatus === 'number' ? o.netsuiteHttpStatus : undefined,
    fetchStatus: o.fetchStatus === 'OK' || o.fetchStatus === 'ERROR' ? o.fetchStatus : undefined,
    fetchedAt: o.fetchedAt != null ? String(o.fetchedAt) : null,
    urlRedacted: o.urlRedacted != null ? String(o.urlRedacted) : undefined,
    errorSnippet: o.errorSnippet != null ? String(o.errorSnippet) : null,
  };
}

/** GET /org/integrations/netsuite/record-cache — ORG_ADMIN, ORG_USER */
export async function getNetSuiteRecordCache(recordType: NetSuiteRecordCacheType) {
  return withRefreshRetry(() =>
    http
      .get<unknown>('/org/integrations/netsuite/record-cache', { params: { recordType } })
      .then(mapNetSuiteRecordCacheGet)
  );
}

/**
 * POST /org/integrations/netsuite/record-cache/sync — ORG_ADMIN only.
 * Purchase orders: `{ recordType: "PURCHASEORDER", query: { vendor_id: "<MongoDB Vendor _id>" } }`.
 * `vendor_id` is the portal Vendor document id (24 hex chars), not NetSuite internal vendor number.
 */
export async function postNetSuiteRecordCacheSync(body: {
  recordType: NetSuiteRecordCacheType;
  query?: Record<string, string>;
}) {
  return withRefreshRetry(() =>
    http
      .post<unknown>('/org/integrations/netsuite/record-cache/sync', body)
      .then(mapNetSuiteRecordCacheSync)
  );
}

function pickItemFieldsRecord(rec: unknown): string[] {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return [];
  const r = rec as Record<string, unknown>;
  const arr = r.item_fields ?? r.itemFields;
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x));
}

function pickItemFieldLabelsRecord(rec: unknown): Record<string, string> {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
  const r = rec as Record<string, unknown>;
  const raw = r.item_field_labels ?? r.itemFieldLabels;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || String(v).trim() === '') continue;
    out[String(k)] = String(v);
  }
  return out;
}

function pruneLabelsToItemFields(
  labels: Record<string, string>,
  itemFields: string[]
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const id of itemFields) {
    const v = labels[id];
    if (v != null && String(v).trim() !== '') out[id] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function pickNestedRecord(o: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  }
  return null;
}

/**
 * GET/PUT field-config — only `purchase_order_line` (legacy: map from purchase_order if line block missing).
 * Some backends return flat `{ item_fields: [...] }` (same shape as PUT) with no nested `purchase_order_line` object;
 * in that case `polRec` is null and we must read `item_fields` from the root (or `data`).
 */
function mapNetSuiteFieldConfigData(raw: unknown): NetSuiteFieldConfigData {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const polRec =
    pickNestedRecord(o, [
      'purchase_order_line',
      'purchaseorderline',
      'PURCHASEORDERLINE',
      'purchaseOrderLine',
    ]) ?? pickNestedRecord(o, ['purchase_order', 'PURCHASEORDER', 'purchaseOrder']);
  let item_fields: string[];
  let item_field_labels: Record<string, string>;
  if (polRec) {
    item_fields = pickItemFieldsRecord(polRec);
    item_field_labels = pickItemFieldLabelsRecord(polRec);
  } else {
    item_fields = pickItemFieldsRecord(o);
    item_field_labels = pickItemFieldLabelsRecord(o);
    if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
      const d = o.data as Record<string, unknown>;
      if (item_fields.length === 0) item_fields = pickItemFieldsRecord(d);
      if (Object.keys(item_field_labels).length === 0) item_field_labels = pickItemFieldLabelsRecord(d);
    }
  }
  const labelsPruned = pruneLabelsToItemFields(item_field_labels, item_fields);
  return {
    purchase_order_line: {
      item_fields,
      ...(labelsPruned ? { item_field_labels: labelsPruned } : {}),
    },
  };
}

/** Dedicated routes (`record-types/list`, `metadata/fetch`, `field-config/fetch`) may be absent on older df-vendor builds; use `POST .../netsuite/fetch` instead. */
function isNetSuiteDedicatedRouteMissing(e: unknown): boolean {
  if (e instanceof ApiError && e.status === 404) return true;
  if (e instanceof Error && /route\s+post\s+\S+\s+not found|not found/i.test(e.message)) return true;
  return false;
}

function unwrapNetSuiteIntegrationData(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  if ('data' in o && o.data !== undefined) return o.data;
  return raw;
}

/**
 * df-vendor `POST .../record-types/list` and `.../metadata/fetch` return (after unwrapApiBody)
 * `{ netsuiteHttpStatus, urlRedacted, body, netsuiteErrorSnippet, ... }` — NetSuite JSON is in `body`.
 */
function unwrapNetSuiteProxyEnvelope(raw: unknown): unknown {
  if (raw == null || typeof raw !== 'object') return raw;
  const o = raw as Record<string, unknown>;
  const hasEnvelope =
    ('netsuiteHttpStatus' in o && o.netsuiteHttpStatus !== undefined) ||
    ('urlRedacted' in o && o.urlRedacted !== undefined) ||
    ('netsuiteErrorSnippet' in o && o.netsuiteErrorSnippet !== undefined);
  if (hasEnvelope && 'body' in o && o.body !== undefined) {
    return o.body;
  }
  return raw;
}

/** SuiteScript `{ status: "success", data: { ... } }` inside `body`. */
function peelRestletSuccessData(o: Record<string, unknown>): Record<string, unknown> {
  const st = o.status;
  if (
    typeof st === 'string' &&
    st.toLowerCase() === 'success' &&
    o.data != null &&
    typeof o.data === 'object' &&
    !Array.isArray(o.data)
  ) {
    return o.data as Record<string, unknown>;
  }
  return o;
}

function normalizeRecordTypesList(raw: unknown): NetSuiteRecordTypeOption[] {
  const inner = unwrapNetSuiteProxyEnvelope(unwrapNetSuiteIntegrationData(raw));
  if (Array.isArray(inner)) {
    return inner
      .map((x): NetSuiteRecordTypeOption | null => {
        if (typeof x === 'string') return { id: x, name: x };
        if (x && typeof x === 'object') {
          const r = x as Record<string, unknown>;
          const id = String(r.id ?? r.scriptId ?? r.scriptid ?? r.recordType ?? r.recordtype ?? '').trim();
          if (!id) return null;
          return {
            id,
            name: r.name != null ? String(r.name) : r.label != null ? String(r.label) : undefined,
            scriptId:
              r.scriptId != null
                ? String(r.scriptId)
                : r.scriptid != null
                  ? String(r.scriptid)
                  : undefined,
          };
        }
        return null;
      })
      .filter((x): x is NetSuiteRecordTypeOption => x != null);
  }
  if (inner && typeof inner === 'object') {
    const ob = peelRestletSuccessData(inner as Record<string, unknown>);
    const arr = ob.recordTypes ?? ob.types ?? ob.items ?? (Array.isArray(ob.data) ? ob.data : undefined);
    if (Array.isArray(arr)) return normalizeRecordTypesList(arr);
  }
  return [];
}

function extractMetadataFieldRows(raw: unknown): NetSuiteMetadataFieldRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x): NetSuiteMetadataFieldRow | null => {
      if (typeof x === 'string') return { id: x, name: x };
      if (x && typeof x === 'object') {
        const r = x as Record<string, unknown>;
        const id = String(
          r.id ?? r.name ?? r.fieldId ?? r.field_id ?? r.column ?? r.scriptid ?? ''
        ).trim();
        if (!id) return null;
        return {
          id,
          name: r.name != null ? String(r.name) : undefined,
          label: r.label != null ? String(r.label) : undefined,
          type: r.type != null ? String(r.type) : r.fieldType != null ? String(r.fieldType) : undefined,
        };
      }
      return null;
    })
    .filter((x): x is NetSuiteMetadataFieldRow => x != null);
}

function extractSublistsFromMetadata(raw: unknown): NetSuiteMetadataFetchResult['sublists'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s): NetSuiteMetadataFetchResult['sublists'][0] | null => {
      if (!s || typeof s !== 'object') return null;
      const r = s as Record<string, unknown>;
      const id = String(r.id ?? r.scriptId ?? r.sublistId ?? r.scriptid ?? '').trim();
      if (!id) return null;
      const fields = extractMetadataFieldRows(r.fields ?? r.columns ?? r.items ?? r.fieldRows ?? []);
      return {
        id,
        name: r.name != null ? String(r.name) : r.label != null ? String(r.label) : undefined,
        fields,
      };
    })
    .filter((x): x is NetSuiteMetadataFetchResult['sublists'][0] => x != null);
}

/**
 * SuiteScript metadata contract: `data.sublistFields` is an object keyed by sublist id (e.g. `item`, `recmach…`).
 * @see vendor-portal API doc — POST …/metadata/fetch
 */
function sublistsFromSublistFieldsRecord(rec: Record<string, unknown>): NetSuiteMetadataFetchResult['sublists'] {
  const out: NetSuiteMetadataFetchResult['sublists'] = [];
  for (const [subId, arr] of Object.entries(rec)) {
    if (!Array.isArray(arr)) continue;
    const fields = extractMetadataFieldRows(arr);
    out.push({
      id: subId,
      name: subId,
      fields,
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * NetSuite RESTlets expect canonical script ids (e.g. `PURCHASEORDER`) in `recordtype` / `recordType`.
 * Record-type pickers often use internal ids; prefer `scriptId` via {@link recordTypeForMetadataRequest}.
 */
export function normalizeMetadataRecordTypeForQuery(recordType: string): string {
  const s = String(recordType ?? '').trim();
  if (!s) return s;
  const u = s.toUpperCase().replace(/-/g, '_');
  if (u === 'VENDOR' || s === 'vendor') return 'VENDOR';
  if (u === 'PURCHASEORDER' || s === 'purchase_order' || u === 'PURCHASE_ORDER') return 'PURCHASEORDER';
  return s;
}

/** Prefer script id (e.g. PURCHASEORDER) when the list item includes it; otherwise normalize `id`. */
export function recordTypeForMetadataRequest(rt: NetSuiteRecordTypeOption | undefined): string {
  if (!rt) return '';
  const sid = rt.scriptId?.trim();
  if (sid) {
    const n = normalizeMetadataRecordTypeForQuery(sid);
    if (n === 'VENDOR' || n === 'PURCHASEORDER') return n;
    return sid;
  }
  return normalizeMetadataRecordTypeForQuery(rt.id);
}

/** POST …/field-config/fetch only allows VENDOR | PURCHASEORDER; map from effective metadata record type. */
export function resolveFieldConfigFetchRecordType(recordType: string): 'VENDOR' | 'PURCHASEORDER' {
  return normalizeMetadataRecordTypeForQuery(recordType) === 'VENDOR' ? 'VENDOR' : 'PURCHASEORDER';
}

function metadataBodyFieldsFromKeyList(keys: string[]): NetSuiteMetadataFieldRow[] {
  return keys.map((id) => ({ id, name: id }));
}

function normalizeMetadataFetch(raw: unknown): NetSuiteMetadataFetchResult {
  const inner = unwrapNetSuiteProxyEnvelope(unwrapNetSuiteIntegrationData(raw));
  if (!inner || typeof inner !== 'object') {
    return { bodyFields: [], sublists: [] };
  }
  const innerObj = inner as Record<string, unknown>;
  const o = peelRestletSuccessData(innerObj);

  // Common RESTlet contract: { header: FieldRow[], sublistFields: { item: FieldRow[], ... } }
  const sublistFieldsRaw = o.sublistFields;
  if (sublistFieldsRaw && typeof sublistFieldsRaw === 'object' && !Array.isArray(sublistFieldsRaw)) {
    const sublists = sublistsFromSublistFieldsRecord(sublistFieldsRaw as Record<string, unknown>);
    const bodyFields = extractMetadataFieldRows(Array.isArray(o.header) ? o.header : []);
    if (sublists.length > 0 || bodyFields.length > 0) {
      return { bodyFields, sublists };
    }
  }

  // peelRestletSuccessData only unwraps `data` when it is a non-array object; array `data` stays on `o`.
  if (Array.isArray(o.data)) {
    const fromFieldRows = extractMetadataFieldRows(o.data);
    if (fromFieldRows.length > 0) return { bodyFields: fromFieldRows, sublists: [] };
    const keysFromRows = extractNetSuiteFieldFetchList(o.data);
    if (keysFromRows.length > 0) {
      return { bodyFields: metadataBodyFieldsFromKeyList(keysFromRows), sublists: [] };
    }
  }

  const bodyFields = extractMetadataFieldRows(
    o.header ?? o.fields ?? o.metadata ?? o.bodyFields ?? o.columns ?? o.recordFields
  );
  const sublistArraySource =
    o.sublists ??
    (Array.isArray(o.sublistFields) ? o.sublistFields : undefined) ??
    o.subrecords ??
    o.subLists ??
    [];
  const sublists = extractSublistsFromMetadata(Array.isArray(sublistArraySource) ? sublistArraySource : []);
  if (bodyFields.length === 0 && sublists.length === 0 && Array.isArray(inner)) {
    return { bodyFields: extractMetadataFieldRows(inner), sublists: [] };
  }
  if (bodyFields.length === 0 && sublists.length === 0) {
    // Same envelope/shape as field-config/fetch (record rows → key union) or SuiteScript list of ids
    const keys = extractNetSuiteFieldFetchList(inner);
    if (keys.length > 0) {
      return { bodyFields: metadataBodyFieldsFromKeyList(keys), sublists: [] };
    }
  }
  return { bodyFields, sublists };
}

/** POST .../record-types/list — df-vendor: optional `query` only; server uses RESTlet type recordtypes. */
export type NetSuiteRecordTypesListBody = {
  query?: Record<string, string>;
};

export async function postNetSuiteRecordTypesList(body: NetSuiteRecordTypesListBody = {}) {
  const payload: Record<string, unknown> = {};
  if (body.query != null && Object.keys(body.query).length > 0) {
    payload.query = body.query;
  }

  const primary = () =>
    http.post<unknown>('/org/integrations/netsuite/record-types/list', payload).then(normalizeRecordTypesList);

  const fallback = () =>
    http
      .post<unknown>('/org/integrations/netsuite/fetch', {
        type: 'recordtypes',
        ...(Object.keys(payload).length ? { query: payload.query as Record<string, string> } : {}),
      })
      .then(normalizeRecordTypesList);

  try {
    return await withRefreshRetry(primary);
  } catch (e) {
    if (!isNetSuiteDedicatedRouteMissing(e)) throw e;
    return await withRefreshRetry(fallback);
  }
}

/**
 * POST .../metadata/fetch — df-vendor: `recordType` + optional `query` (server merges recordType into query).
 */
export type NetSuiteMetadataFetchBody = {
  recordType?: string;
  query?: Record<string, string>;
};

export async function postNetSuiteMetadataFetch(body: NetSuiteMetadataFetchBody) {
  const payload: Record<string, unknown> = {};
  const query: Record<string, string> = { ...(body.query ?? {}) };
  if (body.recordType != null && body.recordType !== '') {
    const rt = normalizeMetadataRecordTypeForQuery(body.recordType);
    payload.recordType = rt;
    if (query.recordType == null || String(query.recordType).trim() === '') {
      query.recordType = rt;
    }
    if (query.recordtype == null || String(query.recordtype).trim() === '') {
      query.recordtype = rt;
    }
  }
  if (query.recordType != null && String(query.recordType).trim() !== '') {
    query.recordType = normalizeMetadataRecordTypeForQuery(String(query.recordType));
  }
  if (query.recordtype != null && String(query.recordtype).trim() !== '') {
    query.recordtype = normalizeMetadataRecordTypeForQuery(String(query.recordtype));
  }
  if (Object.keys(query).length > 0) {
    payload.query = query;
  }

  const primary = () =>
    http.post<unknown>('/org/integrations/netsuite/metadata/fetch', payload).then(normalizeMetadataFetch);

  const fallback = () =>
    http
      .post<unknown>('/org/integrations/netsuite/fetch', {
        type: 'metadata',
        ...(Object.keys(query).length > 0 ? { query } : {}),
      })
      .then(normalizeMetadataFetch);

  try {
    return await withRefreshRetry(primary);
  } catch (e) {
    if (!isNetSuiteDedicatedRouteMissing(e)) throw e;
    return await withRefreshRetry(fallback);
  }
}

/** GET /org/integrations/netsuite/field-config — 404 if NetSuite not configured */
export async function getNetSuiteFieldConfig() {
  return withRefreshRetry(() =>
    http.get<unknown>('/org/integrations/netsuite/field-config').then(mapNetSuiteFieldConfigData)
  );
}

/** PUT /org/integrations/netsuite/field-config — ORG_ADMIN; 404 if NetSuite not configured */
export async function putNetSuiteFieldConfig(payload: NetSuiteFieldConfigPutPayload) {
  return withRefreshRetry(() =>
    http.put<unknown>('/org/integrations/netsuite/field-config', payload).then(mapNetSuiteFieldConfigData)
  );
}

function fieldNameFromFetchRow(x: unknown): string {
  if (typeof x === 'string') return x.trim();
  if (!x || typeof x !== 'object') return '';
  const r = x as Record<string, unknown>;
  const s = r.name ?? r.id ?? r.fieldId ?? r.field_id ?? r.field ?? r.label ?? r.value;
  return typeof s === 'string' ? s.trim() : '';
}

function uniqueSortedFieldNames(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Keys from sample NetSuite rows (RESTlet returns records; field ids match object keys). */
function extractFieldKeysFromRecordRows(rows: unknown[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      for (const k of Object.keys(row as Record<string, unknown>)) {
        if (/^[a-zA-Z0-9_]+$/.test(k)) keys.add(k);
      }
    }
  }
  return uniqueSortedFieldNames([...keys]);
}

/**
 * NetSuite sometimes returns a **catalog** array (many rows, same few columns), e.g. custom record types with
 * `recordtype` + `name` per row. Key-union alone would only yield `internalid`, `recordtype`, `name` — plus presets
 * that looks like “~20 fields” in the UI. Pull script-like ids from each row so every catalog entry can be chosen.
 */
function extractCatalogStyleFieldIdsFromRows(rows: unknown[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const candidates = [r.recordtype, r.recordType, r.scriptid, r.scriptId];
    for (const c of candidates) {
      if (typeof c !== 'string') continue;
      const t = c.trim();
      if (t && /^[a-zA-Z0-9_]+$/.test(t)) ids.add(t);
    }
  }
  return uniqueSortedFieldNames([...ids]);
}

function extractFieldListFromArray(raw: unknown[]): string[] {
  if (raw.length === 0) return [];
  const allObjects = raw.every((x) => x && typeof x === 'object' && !Array.isArray(x));
  if (allObjects) {
    const keys = extractFieldKeysFromRecordRows(raw);
    const catalogLike = raw.length >= 20 && keys.length <= 10;
    if (catalogLike) {
      const extras = extractCatalogStyleFieldIdsFromRows(raw);
      if (extras.length > 0) return uniqueSortedFieldNames([...keys, ...extras]);
    }
    return keys;
  }
  return uniqueSortedFieldNames(raw.map(fieldNameFromFetchRow));
}

function restletStatusIsError(o: Record<string, unknown>): boolean {
  const s = o.status;
  return typeof s === 'string' && s.toLowerCase() === 'error';
}

function restletStatusIsSuccess(o: Record<string, unknown>): boolean {
  const s = o.status;
  if (typeof s === 'string') return s.toLowerCase() === 'success';
  return false;
}

/** Common RESTlet / SuiteScript shapes for PO, lines, search results. */
const ROW_ARRAY_KEYS = [
  'data',
  'fields',
  'fieldIds',
  'field_ids',
  'fieldNames',
  'items',
  'names',
  'records',
  'rows',
  'results',
  'purchaseOrders',
  'orders',
  'lines',
  'lineItems',
] as const;

function extractKeysFromNestedDataObject(data: Record<string, unknown>): string[] {
  for (const k of ROW_ARRAY_KEYS) {
    if (k === 'data') continue;
    const v = data[k];
    if (Array.isArray(v) && v.length > 0) {
      const out = extractFieldListFromArray(v);
      if (out.length > 0) return out;
    }
  }
  return [];
}

/**
 * Normalize POST /org/integrations/netsuite/field-config/fetch response to field id strings.
 * Unwraps `body` from the proxy response (SuiteScript payload). Also accepts string[], { fields }, etc.
 */
export function extractNetSuiteFieldFetchList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return extractFieldListFromArray(raw);
  }
  if (typeof raw !== 'object') return [];
  const o = raw as Record<string, unknown>;

  // Signed RESTlet response: { body, netsuiteHttpStatus?, ... } — SuiteScript JSON in body
  if ('body' in o && o.body !== undefined) {
    const fromBody = extractNetSuiteFieldFetchList(o.body);
    if (fromBody.length > 0) return fromBody;
  }

  if (restletStatusIsError(o)) {
    return [];
  }

  // { status: "success" | "Success", data: [...] }
  if (restletStatusIsSuccess(o) && Array.isArray(o.data)) {
    const fromRows = extractFieldListFromArray(o.data);
    if (fromRows.length > 0) return fromRows;
  }

  // { status: "success", data: { lines: [...] } } — purchase orders / line data
  if (restletStatusIsSuccess(o) && o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    const nested = extractKeysFromNestedDataObject(o.data as Record<string, unknown>);
    if (nested.length > 0) return nested;
  }

  const arrays: unknown[] = [];
  for (const k of ROW_ARRAY_KEYS) {
    arrays.push(o[k]);
  }
  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      const out = extractFieldListFromArray(arr);
      if (out.length > 0) return out;
    }
  }

  const nested = o.data;
  if (Array.isArray(nested)) {
    return extractNetSuiteFieldFetchList(nested);
  }
  if (nested && typeof nested === 'object') {
    const fromNested = extractKeysFromNestedDataObject(nested as Record<string, unknown>);
    if (fromNested.length > 0) return fromNested;
    return extractNetSuiteFieldFetchList(nested);
  }
  return [];
}

/**
 * POST .../field-config/fetch — df-vendor: **`recordType`** must be `VENDOR` | `PURCHASEORDER` (or legacy aliases).
 * Optional **`query`** (e.g. `vendor_id`). Server maps to RESTlet `type=recordtypes` + `recordtype`; does not merge saved `item_fields`.
 */
export type NetSuiteFieldConfigFetchBody = {
  recordType?: 'VENDOR' | 'PURCHASEORDER' | 'vendor' | 'purchase_order';
  query?: Record<string, string>;
};

export async function postNetSuiteFieldConfigFetch(body: NetSuiteFieldConfigFetchBody = {}) {
  const recordType = body.recordType ?? 'PURCHASEORDER';
  const payload: Record<string, unknown> = { recordType };
  if (body.query != null && Object.keys(body.query).length > 0) {
    payload.query = body.query;
  }

  const mergedQuery: Record<string, string> = { ...(body.query ?? {}) };
  if (!mergedQuery.recordtype?.trim()) mergedQuery.recordtype = recordType;
  if (!mergedQuery.recordType?.trim()) mergedQuery.recordType = recordType;

  const primary = () =>
    http.post<unknown>('/org/integrations/netsuite/field-config/fetch', payload).then(extractNetSuiteFieldFetchList);

  const fallback = () =>
    http
      .post<unknown>('/org/integrations/netsuite/fetch', {
        type: 'recordtypes',
        query: mergedQuery,
      })
      .then(extractNetSuiteFieldFetchList);

  try {
    return await withRefreshRetry(primary);
  } catch (e) {
    if (!isNetSuiteDedicatedRouteMissing(e)) throw e;
    return await withRefreshRetry(fallback);
  }
}

function mapAuditLogEntry(raw: Record<string, unknown>): AuditLogEntry {
  const payloadRaw = raw.payload;
  const payload =
    payloadRaw && typeof payloadRaw === 'object' && !Array.isArray(payloadRaw)
      ? (payloadRaw as Record<string, unknown>)
      : {};
  return {
    id: String(raw.id ?? ''),
    orgId: String(raw.orgId ?? ''),
    vendorId: raw.vendorId != null && raw.vendorId !== '' ? String(raw.vendorId) : null,
    poId: raw.poId != null && raw.poId !== '' ? String(raw.poId) : null,
    actorType: String(raw.actorType ?? ''),
    actorId: raw.actorId != null && raw.actorId !== '' ? String(raw.actorId) : null,
    vendorUserId: raw.vendorUserId != null && raw.vendorUserId !== '' ? String(raw.vendorUserId) : null,
    eventType: String(raw.eventType ?? ''),
    payload,
    createdAt: String(raw.createdAt ?? ''),
  };
}

function mapOrgRecentUpload(raw: Record<string, unknown>): OrgRecentUploadItem {
  return {
    id: String(raw.id ?? ''),
    poId: String(raw.poId ?? ''),
    poNumber: raw.poNumber != null ? String(raw.poNumber) : null,
    vendorId: String(raw.vendorId ?? ''),
    vendorName: raw.vendorName != null ? String(raw.vendorName) : null,
    type: String(raw.type ?? ''),
    status: String(raw.status ?? ''),
    fileName: String(raw.fileName ?? ''),
    fileFormat: raw.fileFormat != null ? String(raw.fileFormat) : undefined,
    uploadedAt: String(raw.uploadedAt ?? raw.createdAt ?? ''),
  };
}

/** GET /org/uploads — recent submissions (all vendors in org), newest first. */
export async function getOrgRecentUploads(params?: { page?: number; pageSize?: number }) {
  return withRefreshRetry(() =>
    http.get<unknown>('/org/uploads', { params }).then((raw) => {
      if (!raw || typeof raw !== 'object') {
        return { items: [] as OrgRecentUploadItem[], total: 0, page: 1, pageSize: params?.pageSize ?? 10 };
      }
      const o = raw as Record<string, unknown>;
      const itemsRaw = Array.isArray(o.items)
        ? o.items
        : Array.isArray(o.data)
          ? o.data
          : [];
      const items = itemsRaw.map((row) =>
        mapOrgRecentUpload(typeof row === 'object' && row ? (row as Record<string, unknown>) : {})
      );
      const total = typeof o.total === 'number' ? o.total : items.length;
      const pageSize = typeof o.pageSize === 'number' ? o.pageSize : params?.pageSize ?? 10;
      const page = typeof o.page === 'number' ? o.page : 1;
      return { items, total, page, pageSize };
    })
  );
}

/** GET /org/audit — expects `{ items, total, page, pageSize, totalPages }` after unwrap (legacy `{ data: [] }` still supported). */
export async function getAuditLog(params?: {
  page?: number;
  pageSize?: number;
  eventType?: string;
  vendorId?: string;
  poId?: string;
  /** Inclusive start date (ISO date `YYYY-MM-DD`); backend may map to `createdAt` range. */
  from?: string;
  /** Inclusive end date (ISO date `YYYY-MM-DD`). */
  to?: string;
  actorType?: string;
}) {
  return withRefreshRetry(() =>
    http.get<unknown>('/org/audit', { params }).then((raw) => {
      if (!raw || typeof raw !== 'object') {
        return { data: [] as AuditLogEntry[], total: 0, page: 1, pageSize: params?.pageSize ?? 20, totalPages: 0 };
      }
      const o = raw as Record<string, unknown>;
      const itemsRaw = Array.isArray(o.items)
        ? o.items
        : Array.isArray(o.data)
          ? o.data
          : [];
      const data = itemsRaw.map((row) =>
        mapAuditLogEntry(typeof row === 'object' && row ? (row as Record<string, unknown>) : {})
      );
      const total = typeof o.total === 'number' ? o.total : data.length;
      const pageSize = typeof o.pageSize === 'number' ? o.pageSize : params?.pageSize ?? 20;
      const page = typeof o.page === 'number' ? o.page : 1;
      const totalPages =
        typeof o.totalPages === 'number' ? o.totalPages : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
      return { data, total, page, pageSize, totalPages };
    })
  );
}
