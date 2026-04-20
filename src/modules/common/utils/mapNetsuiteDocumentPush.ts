import type { NetsuiteDocumentPushStatus, NetsuiteDocumentPushSummary } from '@/modules/common/types/netsuiteDocumentPush';

const STATUSES = new Set<NetsuiteDocumentPushStatus>(['PENDING', 'SENT', 'FAILED', 'SKIPPED']);

export function mapNetsuiteDocumentPushFromApi(row: unknown): NetsuiteDocumentPushSummary | undefined {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return undefined;
  const r = row as Record<string, unknown>;
  const p = r.netsuiteDocumentPush ?? r.netsuite_document_push;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return undefined;
  const o = p as Record<string, unknown>;
  const status = o.status;
  if (typeof status !== 'string' || !STATUSES.has(status as NetsuiteDocumentPushStatus)) return undefined;
  const out: NetsuiteDocumentPushSummary = {
    status: status as NetsuiteDocumentPushStatus,
  };
  if (o.queuedAt != null) out.queuedAt = String(o.queuedAt);
  if (o.completedAt != null) out.completedAt = String(o.completedAt);
  if (o.message != null && String(o.message).trim() !== '') out.message = String(o.message);
  if (o.skipReason != null && String(o.skipReason).trim() !== '') out.skipReason = String(o.skipReason);
  if (typeof o.httpStatus === 'number' && Number.isFinite(o.httpStatus)) out.httpStatus = o.httpStatus;
  if (typeof o.sentFileName === 'string' && o.sentFileName.trim() !== '') out.sentFileName = o.sentFileName.trim();
  if (typeof o.netSuiteExternalId === 'string' && o.netSuiteExternalId.trim() !== '')
    out.netSuiteExternalId = o.netSuiteExternalId.trim();
  if (typeof o.netSuitePdfFileId === 'string' && o.netSuitePdfFileId.trim() !== '')
    out.netSuitePdfFileId = o.netSuitePdfFileId.trim();
  if (typeof o.netSuitePdfDownloadPath === 'string' && o.netSuitePdfDownloadPath.trim() !== '')
    out.netSuitePdfDownloadPath = o.netSuitePdfDownloadPath.trim();
  return out;
}
