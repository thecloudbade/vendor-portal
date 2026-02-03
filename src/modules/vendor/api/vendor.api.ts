import { http } from '@/services/http/client';
import { withRefreshRetry } from '@/services/http/interceptors';
import type { ApiListResponse } from '@/modules/common/types/api';
import type { POListItem, PODetail, UploadRecord, UploadValidationResult } from '../types';

const base = '/vendor';

export async function getVendorPOs(params: {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  return withRefreshRetry(() =>
    http.get<ApiListResponse<POListItem>>(`${base}/pos`, { params })
  );
}

export async function getVendorPODetail(poId: string) {
  return withRefreshRetry(() => http.get<PODetail>(`${base}/pos/${poId}`));
}

export async function getVendorUploads(params?: { poId?: string; page?: number; pageSize?: number }) {
  return withRefreshRetry(() =>
    http.get<ApiListResponse<UploadRecord>>(`${base}/uploads`, { params })
  );
}

export function getPLTemplateUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${baseUrl}${base}/templates/pl`;
}

export function getCITemplateUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${baseUrl}${base}/templates/ci`;
}

export async function uploadDocuments(
  poId: string,
  files: { file: File; type: 'pl' | 'ci' | 'coo' }[]
): Promise<UploadValidationResult> {
  const form = new FormData();
  files.forEach(({ file, type }) => {
    form.append(type, file);
  });
  return withRefreshRetry(() =>
    http.post<UploadValidationResult>(`${base}/pos/${poId}/uploads`, form, {
      skipCsrf: false,
    })
  );
}
