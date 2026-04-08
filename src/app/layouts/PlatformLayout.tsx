import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { logout } from '@/modules/auth/api/auth.api';
import { ROUTES, PLATFORM_BASE } from '@/modules/common/constants/routes';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [{ to: ROUTES.PLATFORM.DASHBOARD, label: 'Organizations', icon: LayoutDashboard }];

function isOrgNavActive(pathname: string) {
  return pathname === ROUTES.PLATFORM.DASHBOARD || pathname.startsWith(`${PLATFORM_BASE}/organizations`);
}

export function PlatformLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      <aside className="fixed bottom-0 left-0 top-0 z-50 flex w-[min(17rem,88vw)] flex-col border-r border-slate-800 bg-slate-950 p-4 text-slate-200 md:w-[17.5rem]">
        <div className="mb-8 flex items-center gap-2 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-600/25">
            VP
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">Vendor Portal</p>
            <span className="mt-0.5 inline-flex rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200 ring-1 ring-violet-400/20">
              Platform
            </span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => {
            const active = isOrgNavActive(location.pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/[0.12] text-white shadow-sm'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-white/10 pt-4">
          <p className="truncate px-1 text-xs text-white/50">{user?.email}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start gap-2 rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => logout().then(() => navigate(ROUTES.PLATFORM.LOGIN))}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-w-0 pl-0 md:pl-[17.5rem]">
        <main className="min-h-screen px-4 pb-10 pt-6 md:px-8 md:pb-12 md:pt-8 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
