import type { AuthUser } from '@/modules/common/types/api';

/** Map API user (ORG_ADMIN, SUPERADMIN, etc.) to portal AuthUser shape — used after verify and for /auth/me */
export function mapApiUser(apiUser: Record<string, unknown>): AuthUser {
  const roleRaw = String(apiUser.role ?? '');
  const userTypeRaw = String(apiUser.userType ?? '').toLowerCase();

  if (roleRaw === 'SUPERADMIN' || userTypeRaw === 'platform') {
    return {
      id: String(apiUser.id ?? ''),
      email: String(apiUser.email ?? ''),
      userType: 'platform',
      role: 'SUPERADMIN',
      tenantId: '',
      orgId: '',
      name: apiUser.name ? String(apiUser.name) : undefined,
    };
  }

  const mappedRole =
    roleRaw === 'ORG_ADMIN'
      ? 'admin'
      : roleRaw === 'ORG_USER'
        ? 'ops'
        : roleRaw === 'VENDOR_USER'
          ? 'operator'
          : (roleRaw as AuthUser['role']);

  return {
    id: String(apiUser.id ?? ''),
    email: String(apiUser.email ?? ''),
    userType: apiUser.vendorId ? 'vendor' : 'org',
    role: mappedRole as AuthUser['role'],
    tenantId: String(apiUser.orgId ?? apiUser.tenantId ?? ''),
    orgId: String(apiUser.orgId ?? ''),
    vendorId: apiUser.vendorId ? String(apiUser.vendorId) : undefined,
    name: apiUser.name ? String(apiUser.name) : undefined,
    orgName: apiUser.orgName ? String(apiUser.orgName) : undefined,
  };
}

/**
 * GET /auth/me — API may return either:
 * - `{ success, data: { id, email, role, orgId, orgName, ... } }` → unwrapped to user fields at root
 * - `{ success, data: { user: { ... } } }` → unwrapped to `{ user: ... }`
 */
export function parseAuthMeResponse(body: unknown): AuthUser | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if ('user' in o && o.user && typeof o.user === 'object') {
    return mapApiUser(o.user as Record<string, unknown>);
  }
  if (typeof o.id === 'string' && typeof o.email === 'string') {
    return mapApiUser(o);
  }
  return null;
}
