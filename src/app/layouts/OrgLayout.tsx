import { Fragment } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { canManageVendors, canManageSettings, canViewAudit } from '@/modules/common/constants/roles';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, FileText, Settings, History, LogOut } from 'lucide-react';

const nav = [
  { to: ROUTES.ORG.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.ORG.VENDORS, label: 'Vendors', icon: Building2, permission: canManageVendors },
  { to: ROUTES.ORG.POS, label: 'POs', icon: FileText },
  { to: ROUTES.ORG.SETTINGS, label: 'Settings', icon: Settings, permission: canManageSettings },
  { to: ROUTES.ORG.AUDIT, label: 'Audit', icon: History, permission: canViewAudit },
];

function NavLink({
  to,
  label,
  icon: Icon,
  active,
}: { to: string; label: string; icon: typeof LayoutDashboard; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function OrgLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-8 px-4 md:px-8">
          <Link
            to={ROUTES.ORG.DASHBOARD}
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <span>Vendor Portal</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Org</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {nav.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Fragment key={item.to}>
                  {item.permission ? (
                    <PermissionGate permission={item.permission}>
                      <NavLink to={item.to} label={item.label} icon={item.icon} active={active} />
                    </PermissionGate>
                  ) : (
                    <NavLink to={item.to} label={item.label} icon={item.icon} active={active} />
                  )}
                </Fragment>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => logout().then(() => navigate(ROUTES.LOGIN))}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
