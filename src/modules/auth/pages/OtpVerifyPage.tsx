import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { verifyOtp } from '../api/auth.api';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { OtpInput } from '../components/OtpInput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, ArrowLeft } from 'lucide-react';

const schema = z.object({
  otp: z.string().length(6, 'Enter 6 digits').regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

type FormValues = z.infer<typeof schema>;

export function OtpVerifyPage() {
  const [searchParams] = useSearchParams();
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
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [email, navigate]);

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await verifyOtp({ email, otp: data.otp });
      setUser(res.user);
      const returnUrl = validateReturnUrl(searchParams.get('returnUrl'));
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else if (res.user.userType === 'org') {
        navigate(ROUTES.ORG.DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.VENDOR.DASHBOARD, { replace: true });
      }
    } catch (e) {
      setError('otp', { message: 'Invalid or expired OTP' });
      toast({
        title: 'Verification failed',
        description: 'Invalid or expired OTP. Request a new code.',
        variant: 'destructive',
      });
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-10 bg-background">
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border border-border bg-card p-8 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <strong className="text-foreground font-medium">{email}</strong>
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <OtpInput
                value={otpValue}
                onChange={setOtpValue}
                error={!!errors.otp}
                disabled={isSubmitting}
              />
              {errors.otp && (
                <p className="text-sm text-destructive text-center mt-3">{errors.otp.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={isSubmitting || otpValue.length !== 6}
            >
              Verify and continue
            </Button>
          </form>
          <Button
            variant="ghost"
            className="w-full mt-5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`${ROUTES.LOGIN}?returnUrl=${encodeURIComponent(searchParams.get('returnUrl') ?? '')}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Use a different email
          </Button>
        </div>
      </div>
    </div>
  );
}
