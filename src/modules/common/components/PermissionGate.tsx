import { type ReactNode } from 'react';
import { useAuth } from '@/modules/auth/hooks/useAuth';

type PermissionCheck = (role: string, userType: string) => boolean;

interface PermissionGateProps {
  children: ReactNode;
  permission: PermissionCheck | string[];
  fallback?: ReactNode;
}

/**
 * Component-level permission guard: hide UI when permission is missing.
 * Backend still enforces; this is UX only.
 */
export function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
  const { user } = useAuth();
  if (!user) return <>{fallback}</>;

  let allowed: boolean;
  if (typeof permission === 'function') {
    allowed = permission(user.role, user.userType);
  } else {
    allowed = permission.some((p) => p === user.role || p === user.userType);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
