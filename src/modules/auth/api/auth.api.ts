import { http } from '@/services/http/client';
import { memoryTokenStore } from '@/services/storage/memoryTokenStore';
import type { AuthResponse } from '@/modules/common/types/api';
import type { RequestOtpPayload, VerifyOtpPayload } from '@/modules/auth/types';

export async function requestOtp(payload: RequestOtpPayload): Promise<{ success: boolean; message?: string }> {
  return http.post('/auth/request-otp', payload, { skipAuth: true, skipCsrf: true });
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>('/auth/verify-otp', payload, {
    skipAuth: true,
  });
  if (res.accessToken) {
    memoryTokenStore.set(res.accessToken);
  }
  return res;
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout', undefined, { skipCsrf: false });
  } finally {
    memoryTokenStore.clear();
  }
}
