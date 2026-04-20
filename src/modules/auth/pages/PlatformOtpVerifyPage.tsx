import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { verifyPlatformOtp } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { OtpInput } from '../components/OtpInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { ArrowLeft, ArrowRight, KeyRound, Mail } from 'lucide-react';

const schema = z.object({
  otp: z.string().length(6, 'Enter 6 digits').regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

type FormValues = z.infer<typeof schema>;

export function PlatformOtpVerifyPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const email = searchParams.get('email') ?? '';

  const [otpValue, setOtpValue] = useState('');

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
      navigate(ROUTES.PLATFORM.LOGIN, { replace: true });
    }
  }, [email, navigate]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await verifyPlatformOtp({ email, otp: data.otp });
      setUser(res.user);
      const returnUrl = validateReturnUrl(searchParams.get('returnUrl'));
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else {
        navigate(ROUTES.PLATFORM.DASHBOARD, { replace: true });
      }
    } catch {
      setError('otp', { message: 'Invalid or expired OTP' });
      toast({
        title: 'Verification failed',
        description: 'Invalid or expired code. Request a new one from the platform login page.',
        variant: 'destructive',
      });
    }
  };

  if (!email) return null;

  const devOtp =
    import.meta.env.DEV && location.state && typeof location.state === 'object' && location.state !== null
      ? (location.state as { devOtp?: string }).devOtp
      : undefined;

  const backHref = `${ROUTES.PLATFORM.LOGIN}${
    searchParams.get('returnUrl') ? `?returnUrl=${encodeURIComponent(searchParams.get('returnUrl') ?? '')}` : ''
  }`;

  return (
    <AuthPageShell>
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-card shadow-lg">
              <KeyRound className="relative h-8 w-8 text-violet-600" strokeWidth={1.6} aria-hidden />
            </div>
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600">
            Platform operator
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem] sm:leading-tight">
            Check your email
          </h1>
          <p className="mt-3 flex max-w-[340px] flex-wrap items-center justify-center gap-x-1.5 text-[15px] leading-relaxed text-muted-foreground">
            <span>Code sent to</span>
            <span className="inline-flex max-w-full items-center gap-1 break-all rounded-md bg-muted/60 px-2 py-0.5 font-medium text-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {email}
            </span>
          </p>
        </div>

        <Card className="overflow-hidden rounded-2xl border shadow-xl">
          <CardHeader className="px-7 pt-8 sm:px-9 sm:pt-9">
            <CardTitle className="text-[15px]">One-time code</CardTitle>
            <CardDescription className="text-[13px]">Enter the 6-digit code to open the platform console.</CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-8 pt-4 sm:px-9 sm:pb-9">
            {import.meta.env.DEV && devOtp ? (
              <div
                className="mb-6 rounded-xl border border-dashed border-violet-500/50 bg-violet-500/10 px-4 py-3 text-center dark:bg-violet-500/15"
                role="status"
                aria-label="Development OTP"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-900 dark:text-violet-200">
                  Dev — OTP
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.35em] text-foreground">{devOtp}</p>
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
                className="h-12 w-full rounded-xl text-[15px] font-semibold"
                disabled={isSubmitting || otpValue.length !== 6}
              >
                {isSubmitting ? 'Verifying…' : (
                  <>
                    Verify and continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="mt-8 w-full text-muted-foreground hover:bg-muted/60"
          onClick={() => navigate(backHref)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Use a different email
        </Button>
      </div>
    </AuthPageShell>
  );
}
