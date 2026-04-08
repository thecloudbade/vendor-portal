import { Fragment, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutGrid, LogOut, Menu, User, X } from 'lucide-react';

type PermissionFn = (role: string, userType: string) => boolean;

export interface ShellNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  match?: 'exact' | 'prefix';
  isActive?: (pathname: string) => boolean;
  permission?: PermissionFn;
}

const variants = {
  org: {
    sidebar: 'border-slate-800 bg-slate-950 text-slate-200',
    logoMark: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
    badge: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20',
    navActive: 'bg-white/[0.12] text-white shadow-sm',
    navInactive: 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
    fab: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700',
  },
  vendor: {
    sidebar: 'border-teal-900/70 bg-[#0c4d47] text-teal-50',
    logoMark: 'bg-emerald-400 text-teal-950 shadow-lg shadow-emerald-900/30',
    badge: 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/25',
    navActive: 'bg-white/15 text-white shadow-sm',
    navInactive: 'text-teal-200/80 hover:bg-white/10 hover:text-white',
    fab: 'bg-teal-600 text-white shadow-lg shadow-teal-800/25 hover:bg-teal-700',
  },
} as const;

const SIDEBAR_COLLAPSED_KEY = 'vendor-portal-sidebar-collapsed';
/** @deprecated migrated to SIDEBAR_COLLAPSED_KEY */
const LEGACY_LAYOUT_KEY = 'vendor-portal-sidebar-layout';

function readSidebarCollapsed(): boolean {
  try {
    const next = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (next === 'true') return true;
    if (next === 'false') return false;
    const legacy = localStorage.getItem(LEGACY_LAYOUT_KEY);
    if (legacy === 'icons') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function persistSidebarCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
    localStorage.removeItem(LEGACY_LAYOUT_KEY);
  } catch {
    /* ignore */
  }
}

const EXPANDED = {
  aside: 'md:w-[17.5rem]',
  mainPad: 'md:pl-[17.5rem]',
  innerPad: 'md:p-3',
} as const;

/** Narrow sidebar: icon on top, label below (stacked nav) */
const COLLAPSED = {
  aside: 'md:w-[6.5rem]',
  mainPad: 'md:pl-[6.5rem]',
  innerPad: 'md:p-2',
} as const;

function isNavActive(pathname: string, item: ShellNavItem): boolean {
  if (item.isActive) return item.isActive(pathname);
  if (item.match === 'exact') {
    return pathname === item.to || pathname === `${item.to}/`;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

interface DashboardShellProps {
  variant: keyof typeof variants;
  homePath: string;
  brandTitle: string;
  brandBadge: string;
  navItems: ShellNavItem[];
  /** Fixed viewport corner (e.g. org setup FAB) — does not reserve space in the main column */
  floatingSlot?: ReactNode;
  /** Optional profile route (e.g. vendor account details). */
  profilePath?: string;
}

export function DashboardShell({
  variant,
  homePath,
  brandTitle,
  brandBadge,
  navItems,
  floatingSlot,
  profilePath,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  const v = variants[variant];

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    persistSidebarCollapsed(collapsed);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  /** Desktop collapsed = narrow rail with big icon + text underneath */
  const narrowSidebar = isDesktop && sidebarCollapsed;
  const dims = narrowSidebar ? COLLAPSED : EXPANDED;

  function renderNavLink(item: ShellNavItem, active: boolean) {
    if (narrowSidebar) {
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={closeMobile}
          title={item.label}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2.5 text-center text-[10px] font-medium leading-snug transition-colors',
            active ? v.navActive : v.navInactive
          )}
        >
          <item.icon className="h-5 w-5 shrink-0 opacity-95" strokeWidth={1.5} aria-hidden />
          <span className="line-clamp-4 w-full break-words hyphens-auto">{item.label}</span>
        </Link>
      );
    }

    const icon = <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={closeMobile}
        className={cn(
          'flex min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          active ? v.navActive : v.navInactive
        )}
      >
        {icon}
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    );
  }

  const NavBody = (
    <>
      {/* Header: expanded = logo + brand + toggle; narrow = stacked logo + widen control */}
      {narrowSidebar ? (
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="relative flex w-full justify-center pt-1">
            <Link to={homePath} className="flex shrink-0" onClick={closeMobile}>
              <span
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold',
                  v.logoMark
                )}
              >
                VP
              </span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -right-0.5 -top-0.5 h-7 w-7 shrink-0 text-white/70 hover:bg-white/10 hover:text-white"
              title="Widen sidebar"
              aria-label="Widen sidebar"
              aria-expanded={false}
              onClick={() => setCollapsed(false)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-row items-start gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Link to={homePath} className="flex shrink-0" onClick={closeMobile}>
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold',
                  v.logoMark
                )}
              >
                VP
              </span>
            </Link>
            <div className="min-w-0 flex-1 pr-0.5">
              <p className="truncate text-sm font-semibold tracking-tight text-white">{brandTitle}</p>
              <span
                className={cn(
                  'mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  v.badge
                )}
              >
                {brandBadge}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 shrink-0 self-center text-white/70 hover:bg-white/10 hover:text-white md:inline-flex"
            title="Narrow sidebar"
            aria-label="Narrow sidebar"
            aria-expanded={!sidebarCollapsed}
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      <nav
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden',
          narrowSidebar ? 'mt-4' : 'mt-6 md:mt-8'
        )}
      >
        {navItems.map((item) => {
          const active = isNavActive(location.pathname, item);
          const link = renderNavLink(item, active);
          return item.permission ? (
            <PermissionGate key={item.to} permission={item.permission}>
              {link}
            </PermissionGate>
          ) : (
            <Fragment key={item.to}>{link}</Fragment>
          );
        })}
      </nav>

      <div
        className={cn(
          'mt-auto shrink-0 border-t border-white/10 pt-4',
          narrowSidebar && 'flex flex-col items-center'
        )}
      >
        {!narrowSidebar && <p className="truncate px-1 text-xs text-white/50">{user?.email}</p>}
        {narrowSidebar && (
          <p className="mb-2 line-clamp-2 w-full px-0.5 text-center text-[9px] leading-tight text-white/45">
            {user?.email}
          </p>
        )}
        {profilePath ? (
          <Button
            variant="ghost"
            className={cn(
              'rounded-xl text-white/80 hover:bg-white/10 hover:text-white',
              narrowSidebar
                ? 'flex h-auto w-full flex-col items-center gap-1.5 py-3'
                : 'mt-2 w-full justify-start gap-2'
            )}
            title={narrowSidebar ? 'Profile' : undefined}
            asChild
          >
            <Link to={profilePath} onClick={closeMobile}>
              <User className={cn('shrink-0', narrowSidebar ? 'h-5 w-5' : 'h-4 w-4')} />
              <span className={cn(narrowSidebar ? 'text-center text-[10px] font-medium leading-tight' : 'truncate')}>
                Profile
              </span>
            </Link>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className={cn(
            'rounded-xl text-white/80 hover:bg-white/10 hover:text-white',
            narrowSidebar
              ? 'flex h-auto w-full flex-col items-center gap-1.5 py-3'
              : profilePath ? 'mt-1 w-full justify-start gap-2' : 'mt-2 w-full justify-start gap-2'
          )}
          title={narrowSidebar ? 'Sign out' : undefined}
          onClick={() => logout().then(() => navigate('/auth/login'))}
        >
          <LogOut className={cn('shrink-0', narrowSidebar ? 'h-5 w-5' : 'h-4 w-4')} />
          <span className={cn(narrowSidebar ? 'text-center text-[10px] font-medium leading-tight' : 'truncate')}>
            Sign out
          </span>
        </Button>
      </div>
    </>
  );

  function renderMobileNavPopoverLink(item: ShellNavItem) {
    const active = isNavActive(location.pathname, item);
    const link = (
      <Link
        to={item.to}
        onClick={() => setMobileNavOpen(false)}
        className={cn(
          'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-muted'
        )}
      >
        {item.label}
      </Link>
    );
    return item.permission ? (
      <PermissionGate key={item.to} permission={item.permission}>
        {link}
      </PermissionGate>
    ) : (
      <Fragment key={item.to}>{link}</Fragment>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(210_20%_97%)]">
      {floatingSlot ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-end p-4 max-md:pt-[4.5rem] md:p-6">
          <div className="pointer-events-auto max-md:mr-14">{floatingSlot}</div>
        </div>
      ) : null}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          'fixed bottom-0 left-0 top-0 z-50 flex min-h-0 flex-col border-r transition-[width,transform] duration-200 ease-in-out md:translate-x-0',
          'box-border w-[min(17.5rem,88vw)]',
          dims.aside,
          dims.innerPad,
          v.sidebar,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'overflow-x-hidden'
        )}
      >
        {NavBody}
      </aside>

      <div
        className={cn(
          'min-w-0 transition-[padding] duration-200 ease-in-out',
          dims.mainPad
        )}
      >
        <main className="min-h-screen px-4 pb-10 pt-4 md:px-8 md:pb-12 md:pt-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-4 flex items-center justify-between gap-3 md:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full border border-border/80 bg-background p-0 shadow-sm"
                  onClick={() => setMobileOpen((o) => !o)}
                  aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
              <Popover open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    className={cn(
                      'h-10 w-10 shrink-0 rounded-full border-0 p-0 shadow-md',
                      'ring-2 ring-border/60',
                      v.fab
                    )}
                    aria-label="Jump to a section"
                  >
                    <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={8}
                  className="z-[100] w-[min(18rem,calc(100vw-2rem))] p-2"
                >
                  <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Jump to
                  </p>
                  <nav className="flex flex-col gap-0.5" aria-label="Sections">
                    {navItems.map((item) => renderMobileNavPopoverLink(item))}
                  </nav>
                </PopoverContent>
              </Popover>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
