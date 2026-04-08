import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { ROUTES, ORG_BASE, VENDOR_BASE, PLATFORM_BASE } from '../constants/routes';
import type { UserType } from '../types/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedUserType: UserType;
}

/**
 * Route guard: only allow access for the given user type (org or vendor).
 * Redirects to login if unauthenticated, or to the correct portal if wrong tenant type.
 */
export function ProtectedRoute({ children, allowedUserType }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${ROUTES.LOGIN}?returnUrl=${returnUrl}`} replace />;
  }

  if (user.userType !== allowedUserType) {
    const base =
      user.userType === 'platform'
        ? PLATFORM_BASE
        : user.userType === 'org'
          ? ORG_BASE
          : VENDOR_BASE;
    return <Navigate to={base} replace />;
  }

  return <>{children}</>;
}
