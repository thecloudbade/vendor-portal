export const ROUTES = {
  LOGIN: '/auth/login',
  VERIFY_OTP: '/auth/verify-otp',

  ORG: {
    DASHBOARD: '/org/dashboard',
    VENDORS: '/org/vendors',
    VENDOR_DETAIL: (id: string) => `/org/vendors/${id}`,
    POS: '/org/pos',
    PO_DETAIL: (id: string) => `/org/pos/${id}`,
    SETTINGS: '/org/settings',
    AUDIT: '/org/audit',
  },

  VENDOR: {
    DASHBOARD: '/vendor/dashboard',
    PO_SEARCH: '/vendor/po-search',
    PO_DETAIL: (id: string) => `/vendor/po/${id}`,
    UPLOAD: (poId: string) => `/vendor/upload/${poId}`,
    UPLOADS: '/vendor/uploads',
  },
} as const;

export const AUTH_ROUTES = [ROUTES.LOGIN, ROUTES.VERIFY_OTP] as const;
export const ORG_BASE = '/org';
export const VENDOR_BASE = '/vendor';
