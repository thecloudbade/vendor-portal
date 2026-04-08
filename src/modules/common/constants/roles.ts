import type { OrgRole, VendorRole } from '../types/api';

export const ORG_ROLES: OrgRole[] = ['admin', 'ops', 'viewer'];
export const VENDOR_ROLES: VendorRole[] = ['admin', 'operator'];

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ops: 'Ops / Buyer',
  viewer: 'Viewer',
  operator: 'Operator',
};

export function isOrgRole(role: string): role is OrgRole {
  return ORG_ROLES.includes(role as OrgRole);
}

export function isVendorRole(role: string): role is VendorRole {
  return VENDOR_ROLES.includes(role as VendorRole);
}

export function canManageVendors(role: string): boolean {
  return role === 'admin';
}

export function canManageSettings(role: string): boolean {
  return role === 'admin';
}

export function canInviteVendorUsers(role: string): boolean {
  return role === 'admin' || role === 'ops';
}

export function canViewAudit(role: string): boolean {
  return role === 'admin' || role === 'ops';
}

/** NetSuite → MongoDB PO sync (POST …/integrations/netsuite/sync/purchase-orders) — org admin only; vendors never sync. */
export function canSyncNetSuitePurchaseOrders(role: string): boolean {
  return role === 'admin';
}

/** PUT …/integrations/netsuite/field-config — org admin only (server-enforced). */
export function canManageNetSuiteFieldConfig(role: string): boolean {
  return role === 'admin';
}

/** GET …/integrations/netsuite/field-config — org admin, ops, viewer (server-enforced). PUT remains admin-only. */
export function canReadNetSuiteFieldConfig(role: string): boolean {
  return role === 'admin' || role === 'ops' || role === 'viewer';
}

/** POST …/record-types/list, …/metadata/fetch — ORG_ADMIN or ORG_USER (server-enforced). */
export function canFetchNetSuiteCatalog(role: string): boolean {
  return role === 'admin' || role === 'ops';
}
