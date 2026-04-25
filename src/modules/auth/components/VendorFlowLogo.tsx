import { cn } from '@/lib/utils';

const LOCAL_MARK = '/brand/vendor-flow-mark.svg';

/** Optional remote logo (SaaS-style hero). Set `VITE_AUTH_LOGO_URL` in the build. */
function logoSrcFromEnv(): string | undefined {
  const u = import.meta.env.VITE_AUTH_LOGO_URL;
  if (u == null || String(u).trim() === '') return undefined;
  return String(u).trim();
}

const sizeClass: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'h-10 w-10',
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-20 w-20',
  xl: 'h-24 w-24 sm:h-28 sm:w-28',
};

type VendorFlowLogoProps = {
  size?: keyof typeof sizeClass;
  className?: string;
  /** Extra wrapper for glow / platform tint */
  variant?: 'default' | 'platform';
};

/**
 * Mark + wordmark for auth screens. Uses `VITE_AUTH_LOGO_URL` when set, otherwise
 * the bundled `public/brand/vendor-flow-mark.svg` (or replace that file with your own).
 */
export function VendorFlowLogo({ size = 'lg', className, variant = 'default' }: VendorFlowLogoProps) {
  const remote = logoSrcFromEnv();
  const isPlatform = variant === 'platform';

  return (
    <div
      className={cn(
        'flex flex-col items-center',
        isPlatform
          ? 'drop-shadow-[0_8px_28px_rgba(124,58,237,0.2)]'
          : 'drop-shadow-[0_8px_28px_hsl(var(--primary)/0.2)]',
        className
      )}
    >
      <div className="relative">
        <div
          className={cn(
            'absolute rounded-2xl opacity-75',
            size === 'xs' || size === 'sm' ? '-inset-2 blur-lg' : '-inset-3 blur-2xl',
            isPlatform
              ? 'bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-transparent'
              : 'bg-gradient-to-br from-primary/22 via-sky-500/10 to-transparent'
          )}
          aria-hidden
        />
        <div
          className={cn(
            'relative overflow-hidden border bg-card/90 shadow-md ring-1',
            size === 'xs' || size === 'sm' ? 'rounded-xl' : 'rounded-2xl shadow-lg',
            isPlatform ? 'border-violet-500/20 ring-violet-500/10' : 'border-border/50 ring-black/[0.04] dark:ring-white/[0.06]'
          )}
        >
          <img
            src={remote ?? LOCAL_MARK}
            alt=""
            className={cn('object-contain p-0.5', sizeClass[size])}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
