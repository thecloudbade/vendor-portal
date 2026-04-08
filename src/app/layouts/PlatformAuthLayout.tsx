import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { ROUTES, portalHomeForUserType } from '@/modules/common/constants/routes';

/**
 * Layout for platform superadmin login / verify-otp.
 * Redirects platform users to the platform dashboard; org/vendor users to their portals.
 */
export function PlatformAuthLayout() {
  const { user, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    if (user.userType === 'platform') {
      return <Navigate to={ROUTES.PLATFORM.DASHBOARD} replace />;
    }
    return <Navigate to={portalHomeForUserType(user.userType)} replace />;
  }

  return <Outlet />;
}
