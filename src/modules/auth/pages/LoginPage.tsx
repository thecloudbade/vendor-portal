import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MFA_TOKEN_STORAGE_KEY,
  loginOrgVendorPassword,
  requestOtp,
} from '../api/auth.api';
import { ROUTES } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const otpOnlySchema = z.object({
  email: z.string().email('Enter a valid work email').toLowerCase().trim(),
});

const mfaSchema = z.object({
  email: z.string().email('Enter a valid work email').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

type OtpOnlyValues = z.infer<typeof otpOnlySchema>;
type MfaValues = z.infer<typeof mfaSchema>;

type SignInMode = 'mfa' | 'otp-only';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<SignInMode>('mfa');

  const otpForm = useForm<OtpOnlyValues>({
    resolver: zodResolver(otpOnlySchema),
    defaultValues: { email: '' },
  });

  const mfaForm = useForm<MfaValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { email: '', password: '' },
  });

  const goVerify = (email: string, devOtp?: string) => {
    const returnUrl = validateReturnUrl(new URLSearchParams(location.search).get('returnUrl'));
    navigate(
      `${ROUTES.VERIFY_OTP}?email=${encodeURIComponent(email)}${
        returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
      }`,
      { replace: true, state: devOtp ? { devOtp } : undefined }
    );
  };

  const onOtpOnly = async (data: OtpOnlyValues) => {
    try {
      try {
        sessionStorage.removeItem(MFA_TOKEN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const res = await requestOtp({ email: data.email });
      const devOtp =
        import.meta.env.DEV && res.otp != null && String(res.otp).trim() !== ''
          ? String(res.otp).trim()
          : undefined;
      goVerify(data.email, devOtp);
    } catch (e) {
      toast({
        title: 'Couldn’t send code',
        description: e instanceof Error ? e.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const onMfa = async (data: MfaValues) => {
    try {
      const res = await loginOrgVendorPassword({ email: data.email, password: data.password });
      try {
        sessionStorage.setItem(MFA_TOKEN_STORAGE_KEY, res.mfaToken);
      } catch {
        /* ignore */
      }
      const devOtp =
        import.meta.env.DEV && res.otp != null && String(res.otp).trim() !== ''
          ? String(res.otp).trim()
          : undefined;
      goVerify(data.email, devOtp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      toast({
        title: 'Sign-in failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthPageShell>
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div
              className="absolute -inset-3 rounded-[1.35rem] bg-gradient-to-br from-primary/25 via-primary/5 to-transparent opacity-80 blur-xl dark:from-primary/35 dark:via-primary/10"
              aria-hidden
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-gradient-to-br from-card to-card/80 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.35),0_0_0_1px_hsl(var(--primary)/0.08)] ring-1 ring-black/[0.04] dark:from-card dark:to-card/90 dark:ring-white/[0.06]">
              <div className="absolute inset-[1px] rounded-[0.9rem] bg-gradient-to-br from-primary/[0.12] to-transparent dark:from-primary/20" />
              <Lock className="relative h-8 w-8 text-primary" strokeWidth={1.6} aria-hidden />
            </div>
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 dark:text-primary/80">
            Welcome back
          </p>
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-[2rem] sm:leading-tight">
            Sign in to your account
          </h1>
          <p className="mt-3 max-w-[340px] text-[15px] leading-relaxed text-muted-foreground">
            {mode === 'mfa'
              ? 'Enter your work email and password, then verify the one-time code we email you.'
              : 'We’ll email you a one-time code no password required.'}
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-border/80 bg-muted/30 p-1 text-[13px] font-medium">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-lg py-2 transition-colors',
              mode === 'mfa' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('mfa')}
          >
            Password + code
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-lg py-2 transition-colors',
              mode === 'otp-only' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('otp-only')}
          >
            Email code only
          </button>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/35 via-primary/[0.08] to-border/40 p-px dark:from-primary/40 dark:via-primary/15 dark:to-border/30"
            aria-hidden
          />
          <Card className="relative overflow-hidden rounded-2xl border-0 bg-card/85 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.04)] backdrop-blur-xl dark:bg-card/75 dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent dark:via-primary/35"
              aria-hidden
            />
            <CardHeader className="space-y-1.5 px-7 pb-1 pt-8 sm:px-9 sm:pt-9">
              <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">
                {mode === 'mfa' ? 'Work email & password' : 'Work email'}
              </CardTitle>
              <CardDescription className="text-[13px] leading-relaxed text-muted-foreground">
                {mode === 'mfa'
                  ? 'After password, you’ll enter a 6-digit code from email.'
                  : 'For accounts without a password, or when your org uses codes only.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 pt-4 sm:px-9 sm:pb-9">
              {mode === 'otp-only' ? (
                <form onSubmit={otpForm.handleSubmit(onOtpOnly)} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email-otp" className="sr-only">
                      Work email
                    </label>
                    <div className="group relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="email-otp"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className={cn(
                          'h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-[15px]',
                          otpForm.formState.errors.email && 'border-destructive/80'
                        )}
                        {...otpForm.register('email')}
                      />
                    </div>
                    {otpForm.formState.errors.email && (
                      <p className="text-xs font-medium text-destructive">{otpForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full rounded-xl text-[15px] font-semibold"
                    disabled={otpForm.formState.isSubmitting}
                  >
                    {otpForm.formState.isSubmitting ? 'Sending code…' : 'Continue'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={mfaForm.handleSubmit(onMfa)} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="email-mfa" className="sr-only">
                      Work email
                    </label>
                    <div className="group relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="email-mfa"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className="h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-[15px]"
                        {...mfaForm.register('email')}
                      />
                    </div>
                    {mfaForm.formState.errors.email && (
                      <p className="text-xs font-medium text-destructive">{mfaForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password-mfa" className="sr-only">
                      Password
                    </label>
                    <div className="group relative">
                      <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="password-mfa"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Password"
                        className="h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-[15px]"
                        {...mfaForm.register('password')}
                      />
                    </div>
                    {mfaForm.formState.errors.password && (
                      <p className="text-xs font-medium text-destructive">{mfaForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="group relative h-12 w-full overflow-hidden rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20"
                    disabled={mfaForm.formState.isSubmitting}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {mfaForm.formState.isSubmitting ? (
                        'Signing in…'
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            Password + MFA when enabled
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" aria-hidden />
            OTP verification
          </span>
        </div>

        <p className="mx-auto mt-6 max-w-[320px] text-center text-[10px] leading-relaxed text-muted-foreground/85 sm:text-[11px]">
          By continuing you agree to secure authentication practices. Codes expire shortly for your protection.
        </p>
      </div>
    </AuthPageShell>
  );
}
