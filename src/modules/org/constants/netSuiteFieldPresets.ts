/**
 * Suggested NetSuite field ids for REST/SuiteQL-style pulls (vendor & purchase order).
 * Users can still add any custom id (e.g. custentity_*, customfield_*) via "Custom field".
 */
export const NETSUITE_VENDOR_FIELD_PRESETS: readonly string[] = [
  'entityid',
  'companyname',
  'legalname',
  'subsidiary',
  'email',
  'phone',
  'fax',
  'url',
  'currency',
  'isinactive',
  'category',
  'externalid',
  'defaultbillingaddress',
  'defaultshippingaddress',
  'balance',
  'balanceprimary',
];

export const NETSUITE_PURCHASE_ORDER_FIELD_PRESETS: readonly string[] = [
  'tranid',
  'trandate',
  'duedate',
  'status',
  'memo',
  'entity',
  'subsidiary',
  'currency',
  'total',
  'location',
  'shipaddress',
  'billaddress',
  'shipmethod',
  'incoterm',
  'firmed',
  'closed',
  'approvalstatus',
];
