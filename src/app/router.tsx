import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '@/modules/common/components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { OrgLayout } from './layouts/OrgLayout';
import { VendorLayout } from './layouts/VendorLayout';
import { ErrorLayout } from './layouts/ErrorLayout';
import { ROUTES } from '@/modules/common/constants/routes';

const LoginPage = lazy(() =>
  import('@/modules/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const OtpVerifyPage = lazy(() =>
  import('@/modules/auth/pages/OtpVerifyPage').then((m) => ({ default: m.OtpVerifyPage }))
);

const OrgDashboard = lazy(() =>
  import('@/modules/org/pages/OrgDashboard').then((m) => ({ default: m.OrgDashboard }))
);
const VendorsPage = lazy(() =>
  import('@/modules/org/pages/VendorsPage').then((m) => ({ default: m.VendorsPage }))
);
const VendorDetailsPage = lazy(() =>
  import('@/modules/org/pages/VendorDetailsPage').then((m) => ({ default: m.VendorDetailsPage }))
);
const OrgPOListPage = lazy(() =>
  import('@/modules/org/pages/POListPage').then((m) => ({ default: m.POListPage }))
);
const OrgPODetailsPage = lazy(() =>
  import('@/modules/org/pages/PODetailsPage').then((m) => ({ default: m.PODetailsPage }))
);
const SettingsPage = lazy(() =>
  import('@/modules/org/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const AuditPage = lazy(() =>
  import('@/modules/org/pages/AuditPage').then((m) => ({ default: m.AuditPage }))
);

const VendorDashboard = lazy(() =>
  import('@/modules/vendor/pages/VendorDashboard').then((m) => ({ default: m.VendorDashboard }))
);
const POSearchPage = lazy(() =>
  import('@/modules/vendor/pages/POSearchPage').then((m) => ({ default: m.POSearchPage }))
);
const VendorPODetailsPage = lazy(() =>
  import('@/modules/vendor/pages/PODetailsPage').then((m) => ({ default: m.PODetailsPage }))
);
const UploadPage = lazy(() =>
  import('@/modules/vendor/pages/UploadPage').then((m) => ({ default: m.UploadPage }))
);
const UploadHistoryPage = lazy(() =>
  import('@/modules/vendor/pages/UploadHistoryPage').then((m) => ({ default: m.UploadHistoryPage }))
);

function SuspenseFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Outlet />,
      errorElement: <ErrorLayout />,
      children: [
        { index: true, element: <Navigate to={ROUTES.LOGIN} replace /> },
        {
          element: <AuthLayout />,
          children: [
            { path: 'auth/login', element: <LoginPage /> },
            { path: 'auth/verify-otp', element: <OtpVerifyPage /> },
          ],
        },
        {
          path: 'org',
          element: (
            <ProtectedRoute allowedUserType="org">
              <OrgLayout />
            </ProtectedRoute>
          ),
          children: [
            { index: true, element: <Navigate to={ROUTES.ORG.DASHBOARD} replace /> },
            { path: 'dashboard', element: <Suspense fallback={<SuspenseFallback />}><OrgDashboard /></Suspense> },
            { path: 'vendors', element: <Suspense fallback={<SuspenseFallback />}><VendorsPage /></Suspense> },
            { path: 'vendors/:vendorId', element: <Suspense fallback={<SuspenseFallback />}><VendorDetailsPage /></Suspense> },
            { path: 'pos', element: <Suspense fallback={<SuspenseFallback />}><OrgPOListPage /></Suspense> },
            { path: 'pos/:poId', element: <Suspense fallback={<SuspenseFallback />}><OrgPODetailsPage /></Suspense> },
            { path: 'settings', element: <Suspense fallback={<SuspenseFallback />}><SettingsPage /></Suspense> },
            { path: 'audit', element: <Suspense fallback={<SuspenseFallback />}><AuditPage /></Suspense> },
          ],
        },
        {
          path: 'vendor',
          element: (
            <ProtectedRoute allowedUserType="vendor">
              <VendorLayout />
            </ProtectedRoute>
          ),
          children: [
            { index: true, element: <Navigate to={ROUTES.VENDOR.DASHBOARD} replace /> },
            { path: 'dashboard', element: <Suspense fallback={<SuspenseFallback />}><VendorDashboard /></Suspense> },
            { path: 'po-search', element: <Suspense fallback={<SuspenseFallback />}><POSearchPage /></Suspense> },
            { path: 'po/:poId', element: <Suspense fallback={<SuspenseFallback />}><VendorPODetailsPage /></Suspense> },
            { path: 'upload/:poId', element: <Suspense fallback={<SuspenseFallback />}><UploadPage /></Suspense> },
            { path: 'uploads', element: <Suspense fallback={<SuspenseFallback />}><UploadHistoryPage /></Suspense> },
          ],
        },
        { path: 'auth', element: <Navigate to={ROUTES.LOGIN} replace /> },
        { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
    ],
  },
  ],
  { future: { v7_startTransition: true } }
);

export function AppRouter() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
