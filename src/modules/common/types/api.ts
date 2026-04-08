export type UserType = 'org' | 'vendor' | 'platform';

export type OrgRole = 'admin' | 'ops' | 'viewer';
export type VendorRole = 'admin' | 'operator';
export type PlatformRole = 'SUPERADMIN';

export type Role = OrgRole | VendorRole | PlatformRole;

export interface TenantContext {
  tenantId: string;
  orgId: string;
  vendorId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  userType: UserType;
  role: Role;
  /** Empty for platform superadmin (no org scope) */
  tenantId: string;
  /** Empty for platform superadmin */
  orgId: string;
  vendorId?: string;
  name?: string;
  /** From GET /auth/me when API includes org context */
  orgName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface ApiErrorBody {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}
