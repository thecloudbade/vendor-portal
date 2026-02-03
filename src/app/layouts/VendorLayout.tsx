import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Search, History, LogOut } from 'lucide-react';

const nav = [
  { to: ROUTES.VENDOR.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
  { to: ROUTES.VENDOR.PO_SEARCH, label: 'PO Search', icon: Search },
  { to: ROUTES.VENDOR.UPLOADS, label: 'Uploads', icon: History },
];

export function VendorLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-16 items-center gap-8 px-4 md:px-8">
          <Link
            to={ROUTES.VENDOR.DASHBOARD}
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            Vendor Portal
          </Link>
          <nav className="flex flex-1 items-center gap-1">
            {nav.map((item) => {
              const active =
                item.to === ROUTES.VENDOR.DASHBOARD
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
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
