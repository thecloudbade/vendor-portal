import { http } from '@/services/http/client';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { refreshTokenStore } from '@/services/storage/refreshTokenStore';
import type { AuthResponse } from '@/modules/common/types/api';
import { mapApiUser } from '@/modules/auth/utils/mapApiUser';
import type { VerifyOtpData } from './auth.api';

export interface OrgAdminInvitePreview {
  orgName?: string;
  email?: string;
  expiresAt?: string;
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export async function getOrgAdminInvitePreview(token: string) {
  return http.get<unknown>('/auth/org-admin/invite-preview', {
    params: { token },
    skipAuth: true,
    skipCsrf: true,
  }).then((raw) => {
    const o = asRecord(raw);
    const inner = o.data && typeof o.data === 'object' ? asRecord(o.data) : o;
    return {
      orgName: inner.orgName != null ? String(inner.orgName) : inner.name != null ? String(inner.name) : undefined,
      email: inner.email != null ? String(inner.email) : undefined,
      expiresAt: inner.expiresAt != null ? String(inner.expiresAt) : undefined,
    } satisfies OrgAdminInvitePreview;
  });
}

export interface CompleteOrgAdminSignupPayload {
  token: string;
  name?: string;
}

export async function completeOrgAdminSignup(payload: CompleteOrgAdminSignupPayload): Promise<AuthResponse | null> {
  const data = await http.post<VerifyOtpData>(
    '/auth/org-admin/complete-signup',
    { token: payload.token, name: payload.name },
    { skipAuth: true }
  );
  const accessToken = data.accessToken;
  const userRaw = data.user;
  if (!userRaw || typeof userRaw !== 'object') {
    return null;
  }
  const user = mapApiUser(userRaw as Record<string, unknown>);
  if (accessToken) {
    memoryTokenStore.set(accessToken);
  }
  if (data.refreshToken) {
    refreshTokenStore.set(data.refreshToken);
  }
  return { accessToken, user };
}
