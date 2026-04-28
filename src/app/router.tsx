import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '@/modules/common/components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { PlatformAuthLayout } from './layouts/PlatformAuthLayout';
import { PlatformLayout } from './layouts/PlatformLayout';
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
const PlatformLoginPage = lazy(() =>
  import('@/modules/auth/pages/PlatformLoginPage').then((m) => ({ default: m.PlatformLoginPage }))
);
const PlatformOtpVerifyPage = lazy(() =>
  import('@/modules/auth/pages/PlatformOtpVerifyPage').then((m) => ({ default: m.PlatformOtpVerifyPage }))
);
const OrgAdminSignupPage = lazy(() =>
  import('@/modules/auth/pages/OrgAdminSignupPage').then((m) => ({ default: m.OrgAdminSignupPage }))
);

const PlatformOverviewPage = lazy(() =>
  import('@/modules/platform/pages/PlatformOverviewPage').then((m) => ({
    default: m.PlatformOverviewPage,
  }))
);
const PlatformOrganizationsPage = lazy(() =>
  import('@/modules/platform/pages/PlatformOrganizationsPage').then((m) => ({
    default: m.PlatformOrganizationsPage,
  }))
);
const PlatformOrganizationDetailPage = lazy(() =>
  import('@/modules/platform/pages/PlatformOrganizationDetailPage').then((m) => ({
    default: m.PlatformOrganizationDetailPage,
  }))
);
const PlatformSessionsPage = lazy(() =>
  import('@/modules/platform/pages/PlatformSessionsPage').then((m) => ({
    default: m.PlatformSessionsPage,
  }))
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
const OrgPoOpenPage = lazy(() =>
  import('@/modules/org/pages/OrgPoOpenPage').then((m) => ({ default: m.OrgPoOpenPage }))
);
const OrgNetSuitePODetailPage = lazy(() =>
  import('@/modules/org/pages/OrgNetSuitePODetailPage').then((m) => ({ default: m.OrgNetSuitePODetailPage }))
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
const OrgRecentUploadsPage = lazy(() =>
  import('@/modules/org/pages/OrgRecentUploadsPage').then((m) => ({ default: m.OrgRecentUploadsPage }))
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
const VendorProfilePage = lazy(() =>
  import('@/modules/vendor/pages/VendorProfilePage').then((m) => ({ default: m.VendorProfilePage }))
);

function SuspenseFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
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
          element: <PlatformAuthLayout />,
          children: [
            {
              path: 'auth/platform/login',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformLoginPage />
                </Suspense>
              ),
            },
            {
              path: 'auth/platform/verify-otp',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformOtpVerifyPage />
                </Suspense>
              ),
            },
          ],
        },
        {
          path: 'org-admin/signup',
          element: (
            <Suspense fallback={<SuspenseFallback />}>
              <OrgAdminSignupPage />
            </Suspense>
          ),
        },
        {
          path: 'platform',
          element: (
            <ProtectedRoute allowedUserType="platform">
              <PlatformLayout />
            </ProtectedRoute>
          ),
          children: [
            {
              index: true,
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformOverviewPage />
                </Suspense>
              ),
            },
            {
              path: 'organizations',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformOrganizationsPage />
                </Suspense>
              ),
            },
            {
              path: 'organizations/:orgId',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformOrganizationDetailPage />
                </Suspense>
              ),
            },
            {
              path: 'sessions',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <PlatformSessionsPage />
                </Suspense>
              ),
            },
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
            {
              path: 'netsuite-po/:vendorId/:netsuitePoId',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <OrgNetSuitePODetailPage />
                </Suspense>
              ),
            },
            { path: 'pos/open', element: <Suspense fallback={<SuspenseFallback />}><OrgPoOpenPage /></Suspense> },
            { path: 'pos', element: <Suspense fallback={<SuspenseFallback />}><OrgPOListPage /></Suspense> },
            { path: 'pos/:poId', element: <Suspense fallback={<SuspenseFallback />}><OrgPODetailsPage /></Suspense> },
            { path: 'settings', element: <Suspense fallback={<SuspenseFallback />}><SettingsPage /></Suspense> },
            { path: 'audit', element: <Suspense fallback={<SuspenseFallback />}><AuditPage /></Suspense> },
            {
              path: 'uploads',
              element: (
                <Suspense fallback={<SuspenseFallback />}>
                  <OrgRecentUploadsPage />
                </Suspense>
              ),
            },
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
            { path: 'profile', element: <Suspense fallback={<SuspenseFallback />}><VendorProfilePage /></Suspense> },
          ],
        },
        { path: 'auth', element: <Navigate to={ROUTES.LOGIN} replace /> },
        { path: '*', element: <Navigate to={ROUTES.LOGIN} replace /> },
    ],
  },
  ]
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
