import type { NetsuiteDocumentPushSummary } from '@/modules/common/types/netsuiteDocumentPush';
import { mapNetsuiteDocumentPushFromApi } from '@/modules/common/utils/mapNetsuiteDocumentPush';

/** Shared shape for org + vendor PO detail `uploads[]`. */
export interface PoUploadListEntry {
  id: string;
  status: string;
  uploadedAt: string;
  type?: string;
  fileName?: string;
  version?: number;
  fileFormat?: string;
  hasQtyMismatch?: boolean;
  mismatchCount?: number;
  fileId?: string;
  mismatches?: Record<string, unknown>[];
  netsuiteDocumentPush?: NetsuiteDocumentPushSummary;
}

export function mapPoUploadFromApi(raw: unknown): PoUploadListEntry {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const uploadedAt = String(
    r.uploadedAt ?? r.uploaded_at ?? r.createdAt ?? r.created_at ?? ''
  );
  const ver = r.version;
  const mc = r.mismatchCount;
  const hm = r.hasQtyMismatch;
  const ns = mapNetsuiteDocumentPushFromApi(r);
  return {
    id: String(r.id ?? ''),
    status: String(r.status ?? ''),
    uploadedAt,
    type: r.type != null ? String(r.type) : r.docType != null ? String(r.docType) : undefined,
    fileName:
      r.fileName != null
        ? String(r.fileName)
        : r.filename != null
          ? String(r.filename)
          : r.originalName != null
            ? String(r.originalName)
            : undefined,
    version: (() => {
      if (ver == null) return undefined;
      const n = typeof ver === 'number' ? ver : Number(ver);
      return Number.isFinite(n) ? n : undefined;
    })(),
    fileFormat: r.fileFormat != null ? String(r.fileFormat) : undefined,
    hasQtyMismatch: typeof hm === 'boolean' ? hm : undefined,
    mismatchCount:
      typeof mc === 'number' && Number.isFinite(mc)
        ? mc
        : mc != null
          ? Number(mc)
          : undefined,
    fileId:
      r.fileId != null && String(r.fileId).trim() !== ''
        ? String(r.fileId)
        : r.file_id != null && String(r.file_id).trim() !== ''
          ? String(r.file_id)
          : undefined,
    mismatches: Array.isArray(r.mismatches)
      ? (r.mismatches as Record<string, unknown>[]).filter((row) => row && typeof row === 'object')
      : undefined,
    ...(ns ? { netsuiteDocumentPush: ns } : {}),
  };
}
