import type { AuthUser } from '@/modules/common/types/api';

export interface RequestOtpPayload {
  email: string;
  userType: 'org' | 'vendor';
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
}
