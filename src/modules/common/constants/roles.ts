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
