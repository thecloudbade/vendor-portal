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

/** PUT /platform/organizations/:orgId/netsuite-restlet-types — per-tenant RESTlet `type=` overrides */
export interface PlatformNetsuiteRestletTypesPayload {
  restletTypeVendors?: string | null;
  restletTypePurchaseOrders?: string | null;
  restletTypePurchaseLineData?: string | null;
  restletTypeRecordTypes?: string | null;
  restletTypeMetadata?: string | null;
  restletTypeClassification?: string | null;
  restletTypeDocumentUpload?: string | null;
  restletTypeLineUpdate?: string | null;
}

export interface PlatformOrgDetail extends PlatformOrgListItem {
  updatedAt?: string;
  metrics?: PlatformOrgMetrics;
  platformNetsuiteRestletTypes?: PlatformNetsuiteRestletTypesPayload | null;
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

/** GET /platform/sessions — optional; SUPERADMIN audit of active tokens / sessions */
export interface PlatformSessionRow {
  id?: string;
  sessionId?: string;
  userId?: string;
  email?: string;
  userType?: string;
  organizationId?: string;
  organizationName?: string;
  role?: string;
  createdAt?: string;
  expiresAt?: string;
  lastActiveAt?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/** GET /platform/organizations/:orgId/purchase-orders — optional tenant-scoped PO listing */
export interface PlatformTenantPurchaseOrderRow {
  id: string;
  poNumber?: string;
  status?: string;
  vendorId?: string;
  vendorName?: string;
  updatedAt?: string;
  createdAt?: string;
}

/** GET /platform/organizations/:orgId/vendors — optional tenant vendor listing */
export interface PlatformTenantVendorRow {
  id: string;
  name?: string;
  email?: string;
  status?: string;
  updatedAt?: string;
}

export interface PlatformPaginatedRows<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
}
