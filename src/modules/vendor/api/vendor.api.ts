import { http, getApiBaseUrl } from '@/services/http/client';
import { parseFilenameFromContentDisposition } from '@/modules/common/utils/parseContentDisposition';
import { mapPortalPoLineItem } from '@/modules/common/utils/portalPoLineItem';
import { withRefreshRetry } from '@/services/http/interceptors';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import type { ApiListResponse } from '@/modules/common/types/api';
import { mapNetsuiteDocumentPushFromApi } from '@/modules/common/utils/mapNetsuiteDocumentPush';
import { mapPoUploadFromApi } from '@/modules/common/utils/mapPoUploadFromApi';
import type { POListItem, PODetail, UploadRecord, UploadValidationResult, VendorUploadRules } from '../types';

const base = '/vendor';

function mapVendorDbRowToPOListItem(row: Record<string, unknown>): POListItem {
  const summary =
    row.summary && typeof row.summary === 'object' && !Array.isArray(row.summary)
      ? (row.summary as Record<string, unknown>)
      : {};
  const nsRaw =
    summary.netsuiteTransId ??
    summary.trans_id ??
    row.netsuiteTransId ??
    row.trans_id ??
    row.externalId;
  const updatedAt =
    row.updatedAt != null
      ? String(row.updatedAt)
      : row.updated_at != null
        ? String(row.updated_at)
        : undefined;

  return {
    id: String(row.id ?? ''),
    poNumber: String(row.poNumber ?? ''),
    status: String(row.status ?? ''),
    vendorId: String(row.vendorId ?? ''),
    vendorName: row.vendorName != null ? String(row.vendorName) : undefined,
    createdAt: row.createdAt != null ? String(row.createdAt) : '',
    ...(updatedAt ? { updatedAt } : {}),
    netsuiteTransId: nsRaw != null && String(nsRaw).trim() !== '' ? String(nsRaw) : undefined,
  };
}

/**
 * GET /vendor/pos returns MongoDB POs — `data` is either an array or `{ items, total, page, pageSize }`.
 */
function normalizeVendorPOListFromDb(raw: unknown): ApiListResponse<POListItem> {
  if (raw == null) return { data: [], total: 0 };
  if (Array.isArray(raw)) {
    const data = raw.map((r) => mapVendorDbRowToPOListItem(r as Record<string, unknown>));
    return { data, total: data.length };
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      const data = o.items.map((r) => mapVendorDbRowToPOListItem(r as Record<string, unknown>));
      const total = typeof o.total === 'number' ? o.total : data.length;
      return {
        data,
        total,
        page: typeof o.page === 'number' ? o.page : undefined,
        pageSize: typeof o.pageSize === 'number' ? o.pageSize : undefined,
      };
    }
    if (Array.isArray(o.data)) {
      const data = o.data.map((r) => mapVendorDbRowToPOListItem(r as Record<string, unknown>));
      const total = typeof o.total === 'number' ? o.total : data.length;
      return { data, total };
    }
  }
  return { data: [], total: 0 };
}

/**
 * GET /vendor/pos — portal purchase orders from MongoDB (vendor-scoped by auth).
 * Query: optional `query` (PO # / external id), `status`, `from`, `to`, `page`, `pageSize` (max 100).
 */
export async function getVendorPOs(params: {
  status?: string;
  /** Search PO number / external id */
  query?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const { query, ...rest } = params;
  return withRefreshRetry(() =>
    http.get<unknown>(`${base}/pos`, { params: { ...rest, query } }).then(normalizeVendorPOListFromDb)
  );
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

/** Same nesting patterns as org GET /org/pos/:id. */
function unwrapVendorPoDetailPayload(raw: unknown): Record<string, unknown> {
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

function mixedRecord(raw: unknown): Record<string, unknown> | undefined {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return undefined;
}

function coerceVendorPoDetail(raw: Record<string, unknown>): PODetail {
  const itemsUnknown =
    raw.items ??
    raw.lines ??
    raw.lineItems ??
    raw.purchaseOrderLines ??
    raw.poLines;
  const items = Array.isArray(itemsUnknown)
    ? itemsUnknown.map((row, i) => mapPortalPoLineItem(row, i))
    : [];
  const rd = raw.requiredDocs ?? raw.required_docs;
  const requiredDocs = Array.isArray(rd) ? (rd as string[]) : [];

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
  let uploadRules: VendorUploadRules | undefined;
  if (urRaw && typeof urRaw === 'object' && !Array.isArray(urRaw)) {
    const u = urRaw as Record<string, unknown>;
    const pl = u.packingListQtyTolerancePct;
    const ci = u.commercialInvoiceQtyTolerancePct;
    const block = u.blockSubmitOnQtyToleranceExceeded;
    uploadRules = {
      packingListQtyTolerancePct:
        typeof pl === 'number' && Number.isFinite(pl) ? pl : Number(pl) || 5,
      commercialInvoiceQtyTolerancePct:
        typeof ci === 'number' && Number.isFinite(ci) ? ci : Number(ci) || 5,
      blockSubmitOnQtyToleranceExceeded: block !== false,
    };
  }

  const uploadsRaw = raw.uploads;
  const uploads = Array.isArray(uploadsRaw) ? uploadsRaw.map((u) => mapPoUploadFromApi(u)) : undefined;

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
    ...(uploadRules ? { uploadRules } : {}),
    ...(uploads?.length ? { uploads } : {}),
    createdAt: String(raw.createdAt ?? raw.created_at ?? ''),
    updatedAt: raw.updatedAt != null ? String(raw.updatedAt) : raw.updated_at != null ? String(raw.updated_at) : undefined,
    netsuiteTransId:
      raw.netsuiteTransId != null
        ? String(raw.netsuiteTransId)
        : raw.netsuite_trans_id != null
          ? String(raw.netsuite_trans_id)
          : undefined,
  };
}

export async function getVendorPODetail(poId: string) {
  return withRefreshRetry(() =>
    http.get<unknown>(`${base}/pos/${poId}`).then((raw) => {
      const unwrapped = unwrapVendorPoDetailPayload(raw);
      const coerced = coerceVendorPoDetail(unwrapped);
      return mapPODetailNetsuiteId(coerced);
    })
  );
}

function mapVendorUploadRow(row: Record<string, unknown>): UploadRecord {
  const id = String(row.id ?? row._id ?? row.submissionId ?? '');
  const poId = String(row.poId ?? row.po_id ?? row.purchaseOrderId ?? row.po ?? '');
  const poNumber =
    row.poNumber != null
      ? String(row.poNumber)
      : row.po_number != null
        ? String(row.po_number)
        : row.tranid != null
          ? String(row.tranid)
          : undefined;
  const statusRaw = String(row.status ?? 'received').toLowerCase();
  const status = (
    ['received', 'validated', 'accepted', 'rejected'].includes(statusRaw) ? statusRaw : 'received'
  ) as UploadRecord['status'];
  const uploadedAt = String(
    row.uploadedAt ?? row.uploaded_at ?? row.createdAt ?? row.created_at ?? row.submittedAt ?? ''
  );
  const uploadedBy =
    row.uploadedBy != null
      ? String(row.uploadedBy)
      : row.uploaded_by != null
        ? String(row.uploaded_by)
        : row.userEmail != null
          ? String(row.userEmail)
          : undefined;
  return { id, poId, poNumber, status, uploadedAt, uploadedBy };
}

/**
 * GET /vendor/uploads — normalize `{ data }`, `{ items }`, or array; unwrap totals for dashboard/history.
 */
function normalizeVendorUploadsList(raw: unknown): ApiListResponse<UploadRecord> {
  if (raw == null) return { data: [], total: 0 };
  if (Array.isArray(raw)) {
    const data = raw.map((r) => mapVendorUploadRow((r && typeof r === 'object' ? r : {}) as Record<string, unknown>));
    return { data, total: data.length };
  }
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as Record<string, unknown>;
    const list = Array.isArray(o.items)
      ? o.items
      : Array.isArray(o.data)
        ? o.data
        : Array.isArray(o.submissions)
          ? o.submissions
          : Array.isArray(o.uploads)
            ? o.uploads
            : [];
    const data = list.map((r) =>
      mapVendorUploadRow((r && typeof r === 'object' ? r : {}) as Record<string, unknown>)
    );
    const total = typeof o.total === 'number' ? o.total : typeof o.count === 'number' ? o.count : data.length;
    return {
      data,
      total,
      page: typeof o.page === 'number' ? o.page : undefined,
      pageSize: typeof o.pageSize === 'number' ? o.pageSize : undefined,
    };
  }
  return { data: [], total: 0 };
}

export async function getVendorUploads(params?: { poId?: string; page?: number; pageSize?: number; status?: string }) {
  return withRefreshRetry(() =>
    http.get<unknown>(`${base}/uploads`, { params }).then(normalizeVendorUploadsList)
  );
}

function defaultExtensionFromContentType(ct: string | null): string {
  if (!ct) return '.csv';
  if (ct.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return '.xlsx';
  if (ct.includes('text/csv') || ct.includes('application/csv')) return '.csv';
  return '.bin';
}

async function downloadTemplate(poId: string, kind: 'pl' | 'ci') {
  const token = memoryTokenStore.get();
  const path = kind === 'pl' ? 'pl.csv' : 'ci.csv';
  const templateUrl = `${getApiBaseUrl()}${base}/pos/${poId}/templates/${path}?format=csv`;
  const res = await fetch(templateUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Template download failed');
  const blob = await res.blob();
  const fromHeader = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'));
  const ext = defaultExtensionFromContentType(res.headers.get('Content-Type'));
  const fallback =
    kind === 'pl'
      ? `packing-list-${String(poId).slice(0, 8)}${ext}`
      : `commercial-invoice-${String(poId).slice(0, 8)}${ext}`;
  const filename = fromHeader ?? fallback;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * `GET /vendor/pos/:poId/templates/pl.csv?format=csv` — vendor UI requests CSV (skips filled xlsx when org has an active Excel template).
 */
export function downloadPLTemplate(poId: string) {
  return downloadTemplate(poId, 'pl');
}

export function downloadCITemplate(poId: string) {
  return downloadTemplate(poId, 'ci');
}

const typeMap = { pl: 'PL', ci: 'CI', coo: 'COO' } as const;

function docLabel(type: 'pl' | 'ci' | 'coo'): string {
  if (type === 'pl') return 'Packing list';
  if (type === 'ci') return 'Commercial invoice';
  return 'COO';
}

type UploadApiRow = UploadValidationResult & { debug?: Record<string, unknown> };

/** POST /vendor/pos/:poId/uploads?type=PL|CI|COO — one file per request. Use validateOnly to check qty without persisting. */
export async function uploadDocuments(
  poId: string,
  files: { file: File; type: 'pl' | 'ci' | 'coo' }[],
  options?: { validateOnly?: boolean; validationDebug?: boolean }
): Promise<UploadValidationResult> {
  const validateOnly = options?.validateOnly === true;
  const validationDebug = options?.validationDebug === true;
  if (validateOnly) {
    const merged: UploadValidationResult = {
      success: true,
      errors: [],
      warnings: [],
      mismatches: [],
    };
    for (const { file, type } of files) {
      const form = new FormData();
      form.append('file', file);
      const t = typeMap[type];
      const r = await withRefreshRetry(() =>
        http.post<UploadApiRow>(`${base}/pos/${poId}/uploads`, form, {
          skipCsrf: false,
          params: {
            type: t,
            validateOnly: true,
            ...(validationDebug ? { validationDebug: true } : {}),
          },
        })
      );
      merged.success = merged.success && r.success;
      if (r.errors?.length) {
        merged.errors = [...(merged.errors ?? []), ...r.errors.map((e) => `${docLabel(type)}: ${e}`)];
      }
      if (r.warnings?.length) merged.warnings = [...(merged.warnings ?? []), ...r.warnings];
      if (r.mismatches?.length) {
        const docType: 'pl' | 'ci' | undefined = type === 'pl' ? 'pl' : type === 'ci' ? 'ci' : undefined;
        merged.mismatches = [
          ...(merged.mismatches ?? []),
          ...r.mismatches.map((m) => (docType ? { ...m, docType } : m)),
        ];
      }
      if (validationDebug && r.debug && typeof r.debug === 'object') {
        if (!merged.debugByDoc) merged.debugByDoc = {};
        merged.debugByDoc[type] = r.debug;
      }
    }
    return merged;
  }

  let last: UploadValidationResult = { success: true };
  for (const { file, type } of files) {
    const form = new FormData();
    form.append('file', file);
    const t = typeMap[type];
    last = await withRefreshRetry(() =>
      http.post<UploadValidationResult & { netsuiteDocumentPush?: unknown }>(`${base}/pos/${poId}/uploads`, form, {
        skipCsrf: false,
        params: { type: t },
      })
    );
    if (!last.success) return last;
    const ns = mapNetsuiteDocumentPushFromApi(last);
    if (ns) last = { ...last, netsuiteDocumentPush: ns };
  }
  return last;
}

/** Validate selected files against PO qty rules without persisting (same as uploadDocuments with validateOnly). */
export function validateUploadDocuments(
  poId: string,
  files: { file: File; type: 'pl' | 'ci' | 'coo' }[],
  options?: { validationDebug?: boolean }
) {
  return uploadDocuments(poId, files, { validateOnly: true, validationDebug: options?.validationDebug === true });
}
