import { DashboardShell, type ShellNavItem } from './DashboardShell';
import { APP_NAME } from '@/modules/common/constants/branding';
import { ROUTES } from '@/modules/common/constants/routes';
import { LayoutDashboard, Search, History } from 'lucide-react';

const nav: ShellNavItem[] = [
  { to: ROUTES.VENDOR.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
  {
    to: ROUTES.VENDOR.PO_SEARCH,
    label: 'PO search',
    icon: Search,
    isActive: (p) =>
      p.startsWith('/vendor/po-search') || p.startsWith('/vendor/po/') || p.startsWith('/vendor/upload/'),
  },
  { to: ROUTES.VENDOR.UPLOADS, label: 'Upload history', icon: History },
];

export function VendorLayout() {
  return (
    <DashboardShell
      variant="vendor"
      homePath={ROUTES.VENDOR.DASHBOARD}
      brandTitle={APP_NAME}
      brandBadge="Supplier"
      navItems={nav}
      profilePath={ROUTES.VENDOR.PROFILE}
    />
  );
}
