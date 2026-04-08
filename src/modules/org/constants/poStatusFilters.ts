/**
 * Query values for GET /org/pos?status=… — must match backend validation (not upload statuses).
 * POs from NetSuite sync often use OPEN / CLOSED / etc.
 */
export const ORG_PO_LIST_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'PACKING_PENDING', label: 'Packing pending' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

/** Dashboard “open work” POs — adjust if your API uses a different flag */
export const ORG_DASHBOARD_PO_STATUS_OPEN = 'OPEN';
