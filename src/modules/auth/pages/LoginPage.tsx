import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
import { takeOtpFromResponseForClientUi } from '../utils/otpDisplayPolicy';
import { APP_NAME } from '@/modules/common/constants/branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { VendorFlowLogo } from '../components/VendorFlowLogo';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiBusinessError } from '@/services/http/client';

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

const inputClass =
  'h-10 rounded-lg border-border/80 bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground/80';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<SignInMode>('mfa');
  const [needsPlatformLogin, setNeedsPlatformLogin] = useState(false);

  useEffect(() => {
    setNeedsPlatformLogin(false);
  }, [mode]);

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
      setNeedsPlatformLogin(false);
      try {
        sessionStorage.removeItem(MFA_TOKEN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      const res = await requestOtp({ email: data.email });
      const devOtp = takeOtpFromResponseForClientUi(res);
      goVerify(data.email, devOtp);
    } catch (e) {
      if (e instanceof ApiBusinessError && e.code === 'USE_PLATFORM_OTP') {
        setNeedsPlatformLogin(true);
        toast({
          title: 'Use platform sign-in',
          description: 'This email uses the platform administrator login.',
        });
        return;
      }
      toast({
        title: 'Couldn’t send code',
        description: e instanceof Error ? e.message : 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const onMfa = async (data: MfaValues) => {
    try {
      setNeedsPlatformLogin(false);
      const res = await loginOrgVendorPassword({ email: data.email, password: data.password });
      try {
        sessionStorage.setItem(MFA_TOKEN_STORAGE_KEY, res.mfaToken);
      } catch {
        /* ignore */
      }
      const devOtp = takeOtpFromResponseForClientUi(res);
      goVerify(data.email, devOtp);
    } catch (e) {
      if (e instanceof ApiBusinessError && e.code === 'USE_PLATFORM_OTP') {
        setNeedsPlatformLogin(true);
        toast({
          title: 'Use platform sign-in',
          description: 'This email uses the platform administrator login.',
        });
        return;
      }
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      toast({
        title: 'Sign-in failed',
        description: msg,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthPageShell pageTitle="Sign in">
      <div className="w-full max-w-[380px] shrink-0 animate-in fade-in duration-300">
        <div className="mb-4 flex flex-col items-center text-center">
          <VendorFlowLogo size="xs" className="mb-3" />
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{APP_NAME}</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Sign in to your workspace</p>
        </div>

        <div className="mb-3 flex rounded-lg border border-border/70 bg-muted/35 p-0.5 text-xs font-medium">
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md py-1.5 transition-colors',
              mode === 'mfa' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('mfa')}
          >
            Password + code
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 rounded-md py-1.5 transition-colors',
              mode === 'otp-only' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => setMode('otp-only')}
          >
            Email only
          </button>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/30 via-primary/[0.06] to-border/30 p-px dark:from-primary/35 dark:via-primary/10"
            aria-hidden
          />
          <Card className="relative overflow-hidden rounded-2xl border-0 bg-card/90 shadow-md backdrop-blur-sm dark:bg-card/85">
            <CardHeader className="space-y-0.5 px-4 pb-0 pt-4">
              <CardTitle className="text-sm font-semibold text-foreground">
                {mode === 'mfa' ? 'Work email & password' : 'Work email'}
              </CardTitle>
              <CardDescription className="text-[12px] leading-snug text-muted-foreground">
                {mode === 'mfa' ? 'Then enter the 6-digit code from email.' : 'We’ll email you a one-time code.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-3">
              {mode === 'otp-only' ? (
                <form onSubmit={otpForm.handleSubmit(onOtpOnly)} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="email-otp" className="sr-only">
                      Work email
                    </label>
                    <div className="group relative">
                      <Mail
                        className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="email-otp"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className={cn(
                          inputClass,
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
                    className="h-10 w-full rounded-lg text-sm font-semibold"
                    disabled={otpForm.formState.isSubmitting}
                  >
                    {otpForm.formState.isSubmitting ? 'Sending…' : 'Continue'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={mfaForm.handleSubmit(onMfa)} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="email-mfa" className="sr-only">
                      Work email
                    </label>
                    <div className="group relative">
                      <Mail
                        className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="email-mfa"
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        className={inputClass}
                        {...mfaForm.register('email')}
                      />
                    </div>
                    {mfaForm.formState.errors.email && (
                      <p className="text-xs font-medium text-destructive">{mfaForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="password-mfa" className="sr-only">
                      Password
                    </label>
                    <div className="group relative">
                      <Lock
                        className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary"
                        aria-hidden
                      />
                      <Input
                        id="password-mfa"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Password"
                        className={inputClass}
                        {...mfaForm.register('password')}
                      />
                    </div>
                    {mfaForm.formState.errors.password && (
                      <p className="text-xs font-medium text-destructive">{mfaForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    className="group h-10 w-full rounded-lg text-sm font-semibold shadow-sm shadow-primary/15"
                    disabled={mfaForm.formState.isSubmitting}
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      {mfaForm.formState.isSubmitting ? (
                        'Signing in…'
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {needsPlatformLogin ? (
          <div className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-4 py-3 text-center dark:bg-violet-500/10">
            <p className="text-sm font-medium text-foreground">Platform administrator</p>
            <p className="mt-1 text-xs text-muted-foreground">Continue on the platform sign-in page.</p>
            <Button className="mt-3 h-10 w-full rounded-lg text-sm font-semibold" variant="secondary" asChild>
              <Link to={ROUTES.PLATFORM.LOGIN}>Platform sign-in</Link>
            </Button>
          </div>
        ) : null}

        <p className="mt-3 text-center text-[10px] leading-tight text-muted-foreground/90">
          Secure sign-in · MFA and email codes
        </p>
      </div>
    </AuthPageShell>
  );
}
