import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';

/**
 * Layout for login / verify-otp. Redirects to correct portal if already logged in.
 */
export function AuthLayout() {
  const { user, isInitialized, isLoading } = useAuth();

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    const to = user.userType === 'org' ? ROUTES.ORG.DASHBOARD : ROUTES.VENDOR.DASHBOARD;
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}
