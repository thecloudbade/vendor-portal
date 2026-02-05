import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestOtp } from '../api/auth.api';
import { ROUTES } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Building2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim(),
  userType: z.enum(['org', 'vendor']),
});

type FormValues = z.infer<typeof schema>;

const OTP_RESEND_COOLDOWN_SEC = 60;

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', userType: 'vendor' },
  });

  const userType = watch('userType');

  const onSubmit = async (data: FormValues) => {
    try {
      await requestOtp({ email: data.email, userType: data.userType });
      setCooldown(OTP_RESEND_COOLDOWN_SEC);
      const returnUrl = validateReturnUrl(new URLSearchParams(location.search).get('returnUrl'));
      navigate(
        `${ROUTES.VERIFY_OTP}?email=${encodeURIComponent(data.email)}&userType=${data.userType}${
          returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
        }`,
        { replace: true }
      );
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to send OTP',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="auth-page">
      {/* Left: branding */}
      <div className="auth-panel-left p-10 xl:p-14 text-white">
        <div className="relative z-10">
          <h2 className="text-xl font-semibold tracking-tight">Vendor Portal</h2>
          <p className="text-white/80 text-sm mt-1">Procurement & document exchange</p>
        </div>
        <div className="relative z-10 space-y-6 max-w-sm">
          <p className="text-lg font-medium text-white/95 leading-relaxed">
            Sign in with your work email. We’ll send you a one-time code—no password needed.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              Organization
            </span>
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5 shrink-0" />
              Vendor
            </span>
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/60">Secure access for buyers and suppliers.</p>
      </div>

      {/* Right: form */}
      <div className="auth-panel-right">
        <div className="w-full">
          <div className="lg:hidden mb-8">
            <h2 className="text-xl font-semibold text-foreground">Vendor Portal</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
          </div>
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <h1 className="form-card-title">Sign in</h1>
                <p className="form-card-desc">Enter your email to receive a one-time code</p>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="form-group">
                <label className="form-label block">I am a</label>
                <div className="grid grid-cols-2 gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setValue('userType', 'org')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                      userType === 'org'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                    Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('userType', 'vendor')}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                      userType === 'vendor'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
                    )}
                  >
                    <Package className="h-4 w-4" />
                    Vendor
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="email" className="form-label block">Email</label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className={cn('form-input h-11', errors.email && 'form-input-error')}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="form-error mt-1">{errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="form-submit"
                disabled={isSubmitting || cooldown > 0}
              >
                {isSubmitting ? 'Sending…' : cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send one-time code'}
              </Button>
            </form>
            {cooldown > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-6 pt-5 border-t border-border">
                Check your inbox for the one-time code. It may take a minute to arrive.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
