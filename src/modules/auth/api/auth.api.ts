import { http } from '@/services/http/client';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { refreshTokenStore } from '@/services/storage/refreshTokenStore';
import type { AuthResponse } from '@/modules/common/types/api';
import type { RequestOtpPayload, VerifyOtpPayload } from '@/modules/auth/types';
import { mapApiUser } from '@/modules/auth/utils/mapApiUser';

export { mapApiUser } from '@/modules/auth/utils/mapApiUser';

export async function requestOtp(
  payload: RequestOtpPayload
): Promise<{ success: boolean; message?: string }> {
  return http.post('/auth/otp/request', { email: payload.email }, {
    skipAuth: true,
    skipCsrf: true,
  });
}

/** Verify OTP response: accessToken, refreshToken, expiresIn, user */
export interface VerifyOtpData {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: Record<string, unknown>;
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
  const data = await http.post<VerifyOtpData>(
    '/auth/otp/verify',
    { email: payload.email, otp: payload.otp },
    { skipAuth: true }
  );
  const accessToken = data.accessToken;
  const user = mapApiUser(data.user);
  if (accessToken) {
    memoryTokenStore.set(accessToken);
  }
  if (data.refreshToken) {
    refreshTokenStore.set(data.refreshToken);
  }
  return { accessToken, user };
}

/** Platform superadmin only — POST /auth/platform/otp/request */
export async function requestPlatformOtp(
  payload: RequestOtpPayload
): Promise<{ success: boolean; message?: string }> {
  return http.post('/auth/platform/otp/request', { email: payload.email }, {
    skipAuth: true,
    skipCsrf: true,
  });
}

/** Platform superadmin only — POST /auth/platform/otp/verify */
export async function verifyPlatformOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
  const data = await http.post<VerifyOtpData>(
    '/auth/platform/otp/verify',
    { email: payload.email, otp: payload.otp },
    { skipAuth: true }
  );
  const accessToken = data.accessToken;
  const user = mapApiUser(data.user);
  if (accessToken) {
    memoryTokenStore.set(accessToken);
  }
  if (data.refreshToken) {
    refreshTokenStore.set(data.refreshToken);
  }
  return { accessToken, user };
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout', undefined, { skipCsrf: false });
  } finally {
    memoryTokenStore.clear();
    refreshTokenStore.clear();
  }
}
