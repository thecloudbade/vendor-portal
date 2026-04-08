/** GET /platform/organizations list row — metrics shape varies by API version */
export interface PlatformOrgMetrics {
  purchaseOrderCount?: number;
  vendorCount?: number;
  vendorUserCount?: number;
  submissionCount?: number;
  poByStatus?: Record<string, number>;
  [key: string]: unknown;
}

export interface PlatformOrgListItem {
  id: string;
  name: string;
  status?: string;
  timezone?: string;
  address?: string;
  createdAt?: string;
  metrics?: PlatformOrgMetrics;
}

export interface PlatformOrgDetail extends PlatformOrgListItem {
  updatedAt?: string;
  metrics?: PlatformOrgMetrics;
}

export interface PlatformOrganizationsResult {
  data: PlatformOrgListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}

export interface CreatePlatformOrganizationPayload {
  name: string;
  timezone?: string;
  address?: string;
}

export interface InviteOrgAdminPayload {
  email: string;
}

export interface InviteOrgAdminResult {
  invitationId?: string;
  email?: string;
  status?: string;
  /** Rare: only if API returns plaintext token for dev */
  token?: string;
  signupUrl?: string;
}
