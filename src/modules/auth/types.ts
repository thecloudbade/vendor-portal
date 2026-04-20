import type { AuthUser } from '@/modules/common/types/api';

export interface RequestOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
  /** Present after password step (POST /auth/mfa/password); required when the account has a password. */
  mfaToken?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
}
