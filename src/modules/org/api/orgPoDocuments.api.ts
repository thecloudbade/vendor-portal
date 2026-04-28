/**
 * Org admin (ORG_ADMIN) mirrors vendor template + submission routes for a given PO (`/org/pos/:poId`).
 * Server must implement the same contract as `/vendor/pos/:poId/templates/*` and `.../uploads`.
 */
import { http, getApiBaseUrl } from '@/services/http/client';
import { parseFilenameFromContentDisposition } from '@/modules/common/utils/parseContentDisposition';
import { mapNetsuiteDocumentPushFromApi } from '@/modules/common/utils/mapNetsuiteDocumentPush';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { withRefreshRetry } from '@/services/http/interceptors';
import type { UploadValidationResult } from '@/modules/vendor/types';

const base = '/org/pos';

function defaultExtensionFromContentType(ct: string | null): string {
  if (!ct) return '.csv';
  if (ct.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return '.xlsx';
  if (ct.includes('text/csv') || ct.includes('application/csv')) return '.csv';
  return '.bin';
}

/**
 * GET …/templates/pl.csv|ci.csv?format=csv
 */
export async function downloadOrgPOTemplate(poId: string, kind: 'pl' | 'ci'): Promise<void> {
  const token = memoryTokenStore.get();
  const path = kind === 'pl' ? 'pl.csv' : 'ci.csv';
  const root = getApiBaseUrl().replace(/\/$/, '');
  const templateUrl = `${root}${base}/${encodeURIComponent(poId)}/templates/${path}?format=csv`;
  const res = await fetch(templateUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error(kind === 'pl' ? 'Packing list template download failed' : 'Commercial invoice template download failed');
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

const typeMap = { pl: 'PL', ci: 'CI', coo: 'COO' } as const;

function docLabel(type: 'pl' | 'ci' | 'coo'): string {
  if (type === 'pl') return 'Packing list';
  if (type === 'ci') return 'Commercial invoice';
  return 'COO';
}

type UploadApiRow = UploadValidationResult & { debug?: Record<string, unknown> };

/** POST /org/pos/:poId/uploads — same multipart + query params as vendor route. */
export async function uploadOrgPODocuments(
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
        http.post<UploadApiRow>(`${base}/${encodeURIComponent(poId)}/uploads`, form, {
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
      http.post<UploadValidationResult & { netsuiteDocumentPush?: unknown }>(
        `${base}/${encodeURIComponent(poId)}/uploads`,
        form,
        { skipCsrf: false, params: { type: t } }
      )
    );
    if (!last.success) return last;
    const ns = mapNetsuiteDocumentPushFromApi(last);
    if (ns) last = { ...last, netsuiteDocumentPush: ns };
  }
  return last;
}

export async function validateOrgPODocuments(
  poId: string,
  files: { file: File; type: 'pl' | 'ci' | 'coo' }[],
  options?: { validationDebug?: boolean }
): Promise<UploadValidationResult> {
  return uploadOrgPODocuments(poId, files, { validateOnly: true, validationDebug: options?.validationDebug === true });
}
