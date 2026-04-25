import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MFA_TOKEN_STORAGE_KEY,
  requestOtp,
  resendMfaOtp,
  verifyOtp,
} from '../api/auth.api';
import { shouldShowOtpInClientUi, takeOtpFromResponseForClientUi } from '../utils/otpDisplayPolicy';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, portalHomeForUserType } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { OtpInput } from '../components/OtpInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { VendorFlowLogo } from '../components/VendorFlowLogo';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';

const schema = z.object({
  otp: z.string().length(6, 'Enter 6 digits').regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

type FormValues = z.infer<typeof schema>;

export function OtpVerifyPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const email = searchParams.get('email') ?? '';

  const [otpValue, setOtpValue] = useState('');
  const [resendBusy, setResendBusy] = useState(false);

  const {
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: '' },
  });

  useEffect(() => {
    setValue('otp', otpValue);
  }, [otpValue, setValue]);

  useEffect(() => {
    if (!email) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [email, navigate]);

  const onSubmit = async (data: FormValues) => {
    try {
      let mfaToken: string | undefined;
      try {
        mfaToken = sessionStorage.getItem(MFA_TOKEN_STORAGE_KEY) || undefined;
      } catch {
        mfaToken = undefined;
      }
      const res = await verifyOtp({ email, otp: data.otp, mfaToken });
      try {
        sessionStorage.removeItem(MFA_TOKEN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setUser(res.user);
      const returnUrl = validateReturnUrl(searchParams.get('returnUrl'));
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate(portalHomeForUserType(res.user.userType), { replace: true });
      }
    } catch {
      setError('otp', { message: 'Invalid or expired OTP' });
      toast({
        title: 'Verification failed',
        description: 'Invalid or expired OTP. Request a new code.',
        variant: 'destructive',
      });
    }
  };

  const devOtp =
    shouldShowOtpInClientUi() && location.state && typeof location.state === 'object' && location.state !== null
      ? (location.state as { devOtp?: string }).devOtp
      : undefined;

  const handleResend = async () => {
    let mfaToken: string | null = null;
    try {
      mfaToken = sessionStorage.getItem(MFA_TOKEN_STORAGE_KEY);
    } catch {
      mfaToken = null;
    }
    setResendBusy(true);
    try {
      if (mfaToken) {
        const r = await resendMfaOtp(mfaToken);
        const reveal = takeOtpFromResponseForClientUi(r);
        if (reveal) {
          toast({ title: 'Code sent (preview)', description: `OTP: ${reveal}` });
        } else {
          toast({ title: 'Code sent', description: 'Check your email for a new code.' });
        }
      } else {
        const r = await requestOtp({ email });
        const reveal = takeOtpFromResponseForClientUi(r);
        if (reveal) {
          toast({ title: 'Code sent (preview)', description: `OTP: ${reveal}` });
        } else {
          toast({ title: 'Code sent', description: 'Check your email for a new code.' });
        }
      }
    } catch (e) {
      toast({
        title: 'Could not resend',
        description: e instanceof Error ? e.message : 'Try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setResendBusy(false);
    }
  };

  if (!email) return null;

  const backHref = `${ROUTES.LOGIN}${
    searchParams.get('returnUrl') ? `?returnUrl=${encodeURIComponent(searchParams.get('returnUrl') ?? '')}` : ''
  }`;

  return (
    <AuthPageShell pageTitle="Verify code">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 flex flex-col items-center text-center">
          <VendorFlowLogo size="md" className="mb-6" />

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90 dark:text-primary/80">
            Almost there
          </p>
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-[2rem] sm:leading-tight">
            Check your email
          </h1>
          <p className="mt-3 flex max-w-[340px] flex-wrap items-center justify-center gap-x-1.5 text-[15px] leading-relaxed text-muted-foreground">
            <span>We sent a 6-digit code to</span>
            <span className="inline-flex max-w-full items-center gap-1 break-all rounded-md bg-muted/60 px-2 py-0.5 text-left font-medium text-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {email}
            </span>
          </p>
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
                One-time code
              </CardTitle>
              <CardDescription className="text-[13px] leading-relaxed text-muted-foreground">Enter the code from your email.</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 pt-4 sm:px-9 sm:pb-9">
              {devOtp ? (
                <div
                  className="mb-6 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-3 text-center dark:bg-amber-500/15"
                  role="status"
                  aria-label="One-time code preview"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    Code preview
                  </p>
                  <p className="mt-1.5 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                    Shown when the server returns the code (local dev, or VITE_SHOW_OTP_IN_UI).
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.35em] text-foreground">{devOtp}</p>
                </div>
              ) : null}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <OtpInput
                    value={otpValue}
                    onChange={setOtpValue}
                    error={!!errors.otp}
                    disabled={isSubmitting}
                  />
                  {errors.otp && (
                    <p className="mt-3 text-center text-xs font-medium text-destructive">{errors.otp.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="group relative h-12 w-full overflow-hidden rounded-xl text-[15px] font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/25"
                  disabled={isSubmitting || otpValue.length !== 6}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      'Verifying…'
                    ) : (
                      <>
                        Verify and continue
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </>
                    )}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-[13px] text-muted-foreground"
                  disabled={resendBusy}
                  onClick={() => void handleResend()}
                >
                  {resendBusy ? 'Sending…' : 'Resend code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Button
          variant="ghost"
          className="mt-8 w-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={() => navigate(backHref)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Use a different email
        </Button>

        <p className="mx-auto mt-6 max-w-[320px] text-center text-[10px] leading-relaxed text-muted-foreground/85 sm:text-[11px]">
          Didn&apos;t receive a code? Check spam or use another email above.
        </p>
      </div>
    </AuthPageShell>
  );
}
