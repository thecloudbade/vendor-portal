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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Building2, Package } from 'lucide-react';

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
    <div className="min-h-screen flex">
      {/* Left: branding / illustration area */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Vendor Portal</h2>
          <p className="text-primary-foreground/80 text-sm mt-1">Procurement & document exchange</p>
        </div>
        <div className="space-y-6">
          <p className="text-lg font-medium max-w-sm">
            Sign in with your work email. We’ll send you a one-time code—no password needed.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/80">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </span>
            <span className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Vendor
            </span>
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">Secure access for buyers and suppliers.</p>
      </div>

      {/* Right: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden mb-8">
            <h2 className="text-xl font-semibold text-foreground">Vendor Portal</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to continue</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-8 shadow-card">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
                <p className="text-sm text-muted-foreground">Enter your email to receive a code</p>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-foreground font-medium">I am a</Label>
                <Select
                  value={userType}
                  onValueChange={(v) => setValue('userType', v as 'org' | 'vendor')}
                >
                  <SelectTrigger id="userType" className="h-11 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Organization (Buyer)</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-11 bg-muted/50"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-medium"
                disabled={isSubmitting || cooldown > 0}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send one-time code'}
              </Button>
            </form>
            {cooldown > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-5 pt-5 border-t border-border">
                Check your inbox for the one-time code. It may take a minute to arrive.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
