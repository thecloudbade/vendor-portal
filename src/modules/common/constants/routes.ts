import type { UserType } from '@/modules/common/types/api';

/** Default landing path after login for each portal user type */
export function portalHomeForUserType(userType: UserType): string {
  if (userType === 'platform') return ROUTES.PLATFORM.DASHBOARD;
  if (userType === 'org') return ROUTES.ORG.DASHBOARD;
  return ROUTES.VENDOR.DASHBOARD;
}

export const ROUTES = {
  LOGIN: '/auth/login',
  VERIFY_OTP: '/auth/verify-otp',

  /** Platform superadmin (SUPERADMIN) — OTP on dedicated routes */
  PLATFORM: {
    LOGIN: '/auth/platform/login',
    VERIFY_OTP: '/auth/platform/verify-otp',
    /** System overview — rollups, org picker, sessions when API supports */
    DASHBOARD: '/platform',
    /** Paginated organization directory */
    ORGANIZATIONS: '/platform/organizations',
    ORG_DETAIL: (id: string) => `/platform/organizations/${encodeURIComponent(id)}`,
    /** Session / audit listing for SUPERADMIN when API supports */
    SESSIONS: '/platform/sessions',
  },

  /** Public org-admin invite completion (query: token) */
  ORG_ADMIN_SIGNUP: '/org-admin/signup',

  ORG: {
    DASHBOARD: '/org/dashboard',
    VENDORS: '/org/vendors',
    VENDOR_DETAIL: (id: string) => `/org/vendors/${id}`,
    POS: '/org/pos',
    /** Pre-filter PO list by portal vendor id */
    POS_FOR_VENDOR: (vendorId: string) => `/org/pos?vendor=${encodeURIComponent(vendorId)}`,
    /**
     * One list request on this route, then redirect to PO detail (or pick from matches).
     * Query: vendorId (portal id), optional q (PO #), transId (NetSuite internal id).
     */
    PO_OPEN: (vendorId: string, opts: { q?: string; transId: string }) => {
      const sp = new URLSearchParams();
      sp.set('vendorId', vendorId);
      const q = opts.q?.trim();
      if (q) sp.set('q', q);
      sp.set('transId', opts.transId);
      return `/org/pos/open?${sp.toString()}`;
    },
    PO_DETAIL: (id: string) => `/org/pos/${id}`,
    /**
     * NetSuite PO (purchaseorders RESTlet) — portal vendor id + NetSuite `po_id` (internal id).
     * Detail page calls `POST .../netsuite/fetch` with `type: purchaseorders`.
     */
    NETSUITE_PO_DETAIL: (vendorId: string, netsuitePoId: string) =>
      `/org/netsuite-po/${encodeURIComponent(vendorId)}/${encodeURIComponent(netsuitePoId)}`,
    SETTINGS: '/org/settings',
    /** Single synced classification list — records table + slide-over detail */
    CLASSIFICATION_DETAIL: (classificationKey: string) =>
      `/org/settings/classifications/${encodeURIComponent(classificationKey)}`,
    AUDIT: '/org/audit',
    /** Paginated list of all vendor document submissions (GET /org/uploads). */
    UPLOADS: '/org/uploads',
  },

  VENDOR: {
    DASHBOARD: '/vendor/dashboard',
    PROFILE: '/vendor/profile',
    PO_SEARCH: '/vendor/po-search',
    /** Portal PO id (MongoDB) — line data comes from GET /vendor/pos/:id only. */
    PO_DETAIL: (id: string) => `/vendor/po/${encodeURIComponent(id)}`,
    UPLOAD: (poId: string) => `/vendor/upload/${poId}`,
    UPLOADS: '/vendor/uploads',
  },
} as const;

export const AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.VERIFY_OTP] as const;
export const PLATFORM_AUTH_ROUTES = [ROUTES.PLATFORM.LOGIN, ROUTES.PLATFORM.VERIFY_OTP] as const;
export const ORG_BASE = '/org';
export const VENDOR_BASE = '/vendor';
export const PLATFORM_BASE = '/platform';
