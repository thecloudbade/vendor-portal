import { http } from '@/services/http/client';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import { refreshTokenStore } from '@/services/storage/refreshTokenStore';
import type { AuthResponse } from '@/modules/common/types/api';
import type { RequestOtpPayload, VerifyOtpPayload } from '@/modules/auth/types';
import { mapApiUser } from '@/modules/auth/utils/mapApiUser';

export { mapApiUser } from '@/modules/auth/utils/mapApiUser';

/** POST /auth/otp/request — in dev, API may include `otp` for local testing. */
export type OtpRequestResult = { success: boolean; message?: string; otp?: string };

export const MFA_TOKEN_STORAGE_KEY = 'vp_mfa_token';

export async function requestOtp(payload: RequestOtpPayload): Promise<OtpRequestResult> {
  return http.post('/auth/otp/request', { email: payload.email }, {
    skipAuth: true,
    skipCsrf: true,
  });
}

/** Org/vendor step 1: password → sends OTP; store returned mfaToken (see MFA_TOKEN_STORAGE_KEY) for verify + resend. */
export type LoginMfaPasswordResult = {
  mfaToken: string;
  mfaExpiresIn?: string;
  otp?: string;
};

export async function loginOrgVendorPassword(payload: {
  email: string;
  password: string;
}): Promise<LoginMfaPasswordResult> {
  return http.post<LoginMfaPasswordResult>('/auth/mfa/password', payload, {
    skipAuth: true,
    skipCsrf: true,
  });
}

export async function resendMfaOtp(mfaToken: string): Promise<{ success?: boolean; otp?: string }> {
  return http.post('/auth/mfa/resend', { mfaToken }, {
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
    {
      email: payload.email,
      otp: payload.otp,
      ...(payload.mfaToken ? { mfaToken: payload.mfaToken } : {}),
    },
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
export async function requestPlatformOtp(payload: RequestOtpPayload): Promise<OtpRequestResult> {
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
