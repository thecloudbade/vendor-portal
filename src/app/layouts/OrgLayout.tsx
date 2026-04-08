import { DashboardShell, type ShellNavItem } from './DashboardShell';
import { ROUTES } from '@/modules/common/constants/routes';
import { canInviteVendorUsers, canManageSettings, canViewAudit } from '@/modules/common/constants/roles';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { OrgOnboardingProvider, OrgOnboardingFloatingTrigger } from '@/modules/org/components/OrgOnboarding';
import { LayoutDashboard, Building2, FileText, Settings, History } from 'lucide-react';

const nav: ShellNavItem[] = [
  { to: ROUTES.ORG.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
  { to: ROUTES.ORG.VENDORS, label: 'Vendors', icon: Building2, permission: canInviteVendorUsers },
  { to: ROUTES.ORG.POS, label: 'Purchase orders', icon: FileText },
  { to: ROUTES.ORG.SETTINGS, label: 'Settings', icon: Settings, permission: canManageSettings },
  { to: ROUTES.ORG.AUDIT, label: 'Audit log', icon: History, permission: canViewAudit },
];

export function OrgLayout() {
  const { user } = useAuth();
  const showOnboarding = user?.userType === 'org' && canManageSettings(user.role);

  return (
    <OrgOnboardingProvider enabled={!!showOnboarding}>
      <DashboardShell
        variant="org"
        homePath={ROUTES.ORG.DASHBOARD}
        brandTitle="Vendor Portal"
        brandBadge="Organization"
        navItems={nav}
        floatingSlot={showOnboarding ? <OrgOnboardingFloatingTrigger /> : undefined}
      />
    </OrgOnboardingProvider>
  );
}
