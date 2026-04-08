import { http } from '@/services/http/client';
import { withRefreshRetry } from '@/services/http/interceptors';
import type {
  CreatePlatformOrganizationPayload,
  InviteOrgAdminPayload,
  InviteOrgAdminResult,
  PlatformOrgDetail,
  PlatformOrgListItem,
  PlatformOrganizationsResult,
} from '../types';

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function mapOrgRow(raw: Record<string, unknown>): PlatformOrgListItem {
  const metricsRaw = raw.metrics;
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: raw.status != null ? String(raw.status) : undefined,
    timezone: raw.timezone != null ? String(raw.timezone) : undefined,
    address: raw.address != null ? String(raw.address) : undefined,
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
      const detail: PlatformOrgDetail = {
        ...base,
        updatedAt: inner.updatedAt != null ? String(inner.updatedAt) : undefined,
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
