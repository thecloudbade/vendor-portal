import { http } from '@/services/http/client';
import { withRefreshRetry } from '@/services/http/interceptors';
import type { ApiListResponse } from '@/modules/common/types/api';
import type {
  VendorListItem,
  VendorDetail,
  POListItem,
  PODetail,
  OrgSettings,
  AuditEntry,
} from '../types';

const base = '/org';

export async function getVendors() {
  return withRefreshRetry(() =>
    http.get<ApiListResponse<VendorListItem>>(`${base}/vendors`)
  );
}

export async function createVendor(payload: { name: string; email?: string }) {
  return withRefreshRetry(() =>
    http.post<VendorDetail>(`${base}/vendors`, payload)
  );
}

export async function getVendorDetail(vendorId: string) {
  return withRefreshRetry(() =>
    http.get<VendorDetail>(`${base}/vendors/${vendorId}`)
  );
}

export async function inviteVendorUser(vendorId: string, payload: { email: string; role?: string }) {
  return withRefreshRetry(() =>
    http.post<{ success: boolean }>(`${base}/vendors/${vendorId}/invite`, payload)
  );
}

export async function getOrgPOs(params: {
  status?: string;
  vendorId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  return withRefreshRetry(() =>
    http.get<ApiListResponse<POListItem>>(`${base}/pos`, { params })
  );
}

export async function getOrgPODetail(poId: string) {
  return withRefreshRetry(() =>
    http.get<PODetail>(`${base}/pos/${poId}`)
  );
}

export async function getOrgSettings() {
  return withRefreshRetry(() =>
    http.get<OrgSettings>(`${base}/settings`)
  );
}

export async function updateOrgSettings(payload: Partial<OrgSettings>) {
  return withRefreshRetry(() =>
    http.put<OrgSettings>(`${base}/settings`, payload)
  );
}

export async function getAuditLog(params?: { page?: number; pageSize?: number }) {
  return withRefreshRetry(() =>
    http.get<ApiListResponse<AuditEntry>>(`${base}/audit`, { params })
  );
}
