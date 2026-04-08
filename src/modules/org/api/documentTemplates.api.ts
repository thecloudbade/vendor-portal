import { getApiBaseUrl, ApiError, http } from '@/services/http/client';
import { withRefreshRetry } from '@/services/http/interceptors';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { getCsrfHeaders } from '@/services/security/csrf';
import { parseFilenameFromContentDisposition } from '@/modules/common/utils/parseContentDisposition';
import type {
  CsvPackingListLayout,
  DetectedTemplateField,
  DetectionMeta,
  DocumentTemplateKind,
  DocumentTemplateMasterFormat,
  ExcelStructureSnapshot,
  MappingTarget,
  MappableFieldsCatalog,
  OrgDocumentTemplate,
  PackingListLayout,
} from '../types';
import { normalizeCsvPackingListLayoutFromApi } from '../utils/csvPackingListLayout';
import { normalizePackingListLayout } from '../utils/packingListLayout';

function normId(raw: Record<string, unknown>): string {
  return String(raw._id ?? raw.id ?? '');
}

function mapDetectionMeta(raw: unknown): DetectionMeta | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  return {
    truncated: typeof o.truncated === 'boolean' ? o.truncated : undefined,
    totalFields: typeof o.totalFields === 'number' ? o.totalFields : undefined,
    namedRangeCount: typeof o.namedRangeCount === 'number' ? o.namedRangeCount : undefined,
  };
}

function mapDetectedTemplateField(raw: unknown): DetectedTemplateField | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const fieldId = String(o.fieldId ?? o.id ?? '').trim();
  if (!fieldId) return null;
  const nestedTarget = o.target != null ? mapMappingTarget(o.target) : null;
  return {
    fieldId,
    kind: String(o.kind ?? 'cell'),
    defaultBinding: o.defaultBinding != null ? String(o.defaultBinding) : undefined,
    target: nestedTarget ?? undefined,
    sheet: o.sheet != null ? String(o.sheet) : undefined,
    ref: o.ref != null ? String(o.ref) : undefined,
    previewValue: o.previewValue != null ? String(o.previewValue) : undefined,
    sampleType: o.sampleType != null ? String(o.sampleType) : undefined,
  };
}

function mapExcelStructure(raw: unknown): ExcelStructureSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const sheetsRaw = Array.isArray(o.sheets) ? o.sheets : [];
  const definedNamesRaw = Array.isArray(o.definedNames) ? o.definedNames : [];
  const detectedRaw = Array.isArray(o.detectedTemplateFields) ? o.detectedTemplateFields : [];
  const detected = detectedRaw.map(mapDetectedTemplateField).filter((x): x is DetectedTemplateField => x != null);
  const detectionMeta = mapDetectionMeta(o.detectionMeta);
  const formatRaw = o.format;
  const format: DocumentTemplateMasterFormat | undefined =
    formatRaw === 'CSV' || formatRaw === 'XLSX' ? formatRaw : undefined;
  return {
    sheets: sheetsRaw.map((s) => {
      const r = s && typeof s === 'object' ? (s as Record<string, unknown>) : {};
      return {
        name: String(r.name ?? ''),
        rowCount: typeof r.rowCount === 'number' ? r.rowCount : undefined,
        columnCount: typeof r.columnCount === 'number' ? r.columnCount : undefined,
      };
    }),
    definedNames: definedNamesRaw.map((d) => {
      const r = d && typeof d === 'object' ? (d as Record<string, unknown>) : {};
      return {
        name: String(r.name ?? ''),
        sheetName: r.sheetName != null ? String(r.sheetName) : undefined,
        address: r.address != null ? String(r.address) : undefined,
      };
    }),
    ...(detected.length > 0 ? { detectedTemplateFields: detected } : {}),
    ...(detectionMeta && Object.keys(detectionMeta).length > 0 ? { detectionMeta } : {}),
    ...(format ? { format } : {}),
  };
}

/**
 * Upload responses may nest `sheets` under `excelStructureSnapshot` but put
 * `detectedTemplateFields` / `detectionMeta` on the parent — merge detection onto the inner snapshot.
 */
function mapExcelStructureMergedResponse(raw: unknown): ExcelStructureSnapshot {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const inner = mapExcelStructure(o.excelStructureSnapshot);
  const top = mapExcelStructure(o);
  const empty: ExcelStructureSnapshot = { sheets: [], definedNames: [] };

  if (inner && inner.sheets.length > 0 && top) {
    return {
      ...inner,
      ...(top.format ? { format: top.format } : {}),
      ...(top.detectedTemplateFields?.length ? { detectedTemplateFields: top.detectedTemplateFields } : {}),
      ...(top.detectionMeta != null ? { detectionMeta: top.detectionMeta } : {}),
    };
  }
  return top ?? inner ?? empty;
}

function mapMappingTarget(raw: unknown): MappingTarget | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind;
  if (kind === 'cell') {
    return { kind: 'cell', sheet: String(o.sheet ?? ''), ref: String(o.ref ?? '') };
  }
  if (kind === 'namedRange') {
    return { kind: 'namedRange', name: String(o.name ?? '') };
  }
  if (kind === 'lineColumn') {
    return {
      kind: 'lineColumn',
      sheet: String(o.sheet ?? ''),
      startRow: Number(o.startRow ?? 1) || 1,
      column: Number(o.column ?? 1) || 1,
    };
  }
  return null;
}

export function mapOrgDocumentTemplate(raw: unknown): OrgDocumentTemplate {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const packingListLayout = normalizePackingListLayout(o.packingListLayout);
  const csvPackingListLayout = normalizeCsvPackingListLayoutFromApi(o.csvPackingListLayout);
  const mf = o.masterFormat;
  const masterFormat: DocumentTemplateMasterFormat | undefined =
    mf === 'CSV' || mf === 'XLSX' ? mf : undefined;
  return {
    id: normId(o),
    orgId: o.orgId != null ? String(o.orgId) : undefined,
    kind: (o.kind as DocumentTemplateKind) ?? 'PACKING_LIST',
    status: (o.status as OrgDocumentTemplate['status']) ?? 'DRAFT',
    masterFormat,
    masterFileId: o.masterFileId != null && o.masterFileId !== '' ? String(o.masterFileId) : null,
    excelStructureSnapshot: mapExcelStructureMergedResponse(o),
    packingListLayout,
    csvPackingListLayout,
    createdAt: String(o.createdAt ?? ''),
    updatedAt: String(o.updatedAt ?? ''),
  };
}

function mapMappableFieldsCatalog(raw: unknown): MappableFieldsCatalog {
  const empty: MappableFieldsCatalog = {
    organization: [],
    purchaseOrder: [],
    vendor: [],
    line: [],
  };
  if (!raw || typeof raw !== 'object') return empty;
  const o = raw as Record<string, unknown>;
  const pick = (k: keyof MappableFieldsCatalog) => {
    const arr = Array.isArray(o[k]) ? o[k] : [];
    return arr
      .map((row) => {
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
        return {
          path: String(r.path ?? ''),
          label: String(r.label ?? r.path ?? ''),
          type: String(r.type ?? 'string'),
        };
      })
      .filter((e) => e.path.length > 0);
  };
  return {
    organization: pick('organization'),
    purchaseOrder: pick('purchaseOrder'),
    vendor: pick('vendor'),
    line: pick('line'),
  };
}

/** GET /org/document-templates/mappable-fields */
export async function getDocumentTemplateMappableFields() {
  return withRefreshRetry(() =>
    http.get<unknown>('/org/document-templates/mappable-fields').then((raw) => mapMappableFieldsCatalog(raw))
  );
}

/** POST /org/document-templates */
export async function createDocumentTemplate(body: { kind: DocumentTemplateKind }) {
  return withRefreshRetry(() =>
    http.post<unknown>('/org/document-templates', body).then(mapOrgDocumentTemplate)
  );
}

/** GET /org/document-templates */
export async function listDocumentTemplates() {
  return withRefreshRetry(() =>
    http.get<unknown>('/org/document-templates').then((raw) => {
      const arr = Array.isArray(raw) ? raw : asArrayUnknown(raw);
      return arr.map(mapOrgDocumentTemplate);
    })
  );
}

function asArrayUnknown(raw: unknown): unknown[] {
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)) {
    return (raw as { data: unknown[] }).data;
  }
  return [];
}

/** GET /org/document-templates/:templateId */
export async function getDocumentTemplate(templateId: string) {
  return withRefreshRetry(() =>
    http.get<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}`).then(mapOrgDocumentTemplate)
  );
}

/** POST /org/document-templates/:templateId/upload — multipart field `file` */
export async function uploadDocumentTemplateMaster(templateId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return withRefreshRetry(() =>
    http.post<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}/upload`, form).then(mapOrgDocumentTemplate)
  );
}

/** GET /org/document-templates/:templateId/excel-structure */
export async function getDocumentTemplateExcelStructure(templateId: string) {
  return withRefreshRetry(() =>
    http
      .get<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}/excel-structure`)
      .then((raw) => mapExcelStructureMergedResponse(raw))
  );
}

/** PUT /org/document-templates/:templateId/mapping — Excel: `packingListLayout`; CSV master: `csvPackingListLayout` (use `null` to clear). */
export async function putDocumentTemplateMapping(
  templateId: string,
  body:
    | { packingListLayout: PackingListLayout | null }
    | { csvPackingListLayout: CsvPackingListLayout | null }
) {
  return withRefreshRetry(() =>
    http
      .put<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}/mapping`, body)
      .then(mapOrgDocumentTemplate)
  );
}

/** POST /org/document-templates/:templateId/preview — binary .xlsx */
export async function previewDocumentTemplate(templateId: string, poId: string): Promise<{ blob: Blob; filename?: string }> {
  return withRefreshRetry(async () => {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const url = `${base}/org/document-templates/${encodeURIComponent(templateId)}/preview`;
    const token = memoryTokenStore.get();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    Object.entries(getCsrfHeaders()).forEach(([k, v]) => headers.set(k, v));
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ poId }),
    });
    if (!res.ok) {
      const text = await res.text();
      let message = res.statusText;
      try {
        const j = JSON.parse(text) as { error?: { message?: string } };
        if (j?.error?.message) message = j.error.message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message, text);
    }
    const blob = await res.blob();
    const filename = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'));
    return { blob, filename };
  });
}

/** POST /org/document-templates/:templateId/activate */
export async function activateDocumentTemplate(templateId: string) {
  return withRefreshRetry(() =>
    http.post<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}/activate`).then(mapOrgDocumentTemplate)
  );
}

/** POST /org/document-templates/:templateId/archive — deactivates (sets ARCHIVED); vendors may have no file until another is activated */
export async function archiveDocumentTemplate(templateId: string) {
  return withRefreshRetry(() =>
    http.post<unknown>(`/org/document-templates/${encodeURIComponent(templateId)}/archive`).then(mapOrgDocumentTemplate)
  );
}

/** DELETE /org/document-templates/:templateId */
export async function deleteDocumentTemplate(templateId: string) {
  return withRefreshRetry(() => http.delete(`/org/document-templates/${encodeURIComponent(templateId)}`));
}
