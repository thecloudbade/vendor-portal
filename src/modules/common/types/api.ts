export type UserType = 'org' | 'vendor';

export type OrgRole = 'admin' | 'ops' | 'viewer';
export type VendorRole = 'admin' | 'operator';

export type Role = OrgRole | VendorRole;

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
  tenantId: string;
  orgId: string;
  vendorId?: string;
  name?: string;
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
