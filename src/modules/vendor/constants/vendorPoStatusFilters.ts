/**
 * GET /vendor/pos?status=… — must match df-vendor `po.routes.js` vendor query validation.
 */
export const VENDOR_PO_LIST_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'PACKING_PENDING', label: 'Packing pending' },
  { value: 'PACKING_SUBMITTED', label: 'Packing submitted' },
  { value: 'SHIPPING_SUBMITTED', label: 'Shipping submitted' },
  { value: 'CLOSED', label: 'Closed' },
] as const;
