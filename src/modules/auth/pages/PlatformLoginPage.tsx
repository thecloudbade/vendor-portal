import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestPlatformOtp } from '../api/auth.api';
import { ROUTES } from '@/modules/common/constants/routes';
import { validateReturnUrl } from '@/services/security/sanitize';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { ArrowRight, Lock, Mail, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
  email: z.string().email('Enter a valid email').toLowerCase().trim(),
});

type FormValues = z.infer<typeof schema>;

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await requestPlatformOtp({ email: data.email });
      const returnUrl = validateReturnUrl(new URLSearchParams(location.search).get('returnUrl'));
      const devOtp =
        import.meta.env.DEV && res.otp != null && String(res.otp).trim() !== ''
          ? String(res.otp).trim()
          : undefined;
      navigate(
        `${ROUTES.PLATFORM.VERIFY_OTP}?email=${encodeURIComponent(data.email)}${
          returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
        }`,
        { replace: true, state: devOtp ? { devOtp } : undefined }
      );
    } catch (e) {
      toast({
        title: 'Couldn’t send code',
        description: e instanceof Error ? e.message : 'Use the platform operator email from your deployment.',
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
              className="absolute -inset-3 rounded-[1.35rem] bg-gradient-to-br from-violet-500/25 via-violet-500/5 to-transparent opacity-80 blur-xl"
              aria-hidden
            />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-card to-card/80 shadow-lg ring-1 ring-black/[0.04]">
              <Shield className="relative h-8 w-8 text-violet-600 dark:text-violet-400" strokeWidth={1.6} aria-hidden />
            </div>
          </div>

          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Platform operator
          </p>
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-muted-foreground/90 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-[2rem] sm:leading-tight">
            Superadmin sign-in
          </h1>
          <p className="mt-3 max-w-[340px] text-[15px] leading-relaxed text-muted-foreground">
            OTP is sent only to your seeded platform account. Do not use org or vendor login here.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet-500/35 via-primary/[0.08] to-border/40 p-px"
            aria-hidden
          />
          <Card className="relative overflow-hidden rounded-2xl border-0 bg-card/85 shadow-xl backdrop-blur-xl">
            <CardHeader className="space-y-1.5 px-7 pb-1 pt-8 sm:px-9 sm:pt-9">
              <CardTitle className="text-[15px] font-semibold tracking-tight">Platform email</CardTitle>
              <CardDescription className="text-[13px] leading-relaxed">
                Same OTP flow as the rest of the app, on isolated routes for PlatformUser records.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 pt-4 sm:px-9 sm:pb-9">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="platform-email" className="sr-only">
                    Email
                  </label>
                  <div className="group relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
                      aria-hidden
                    />
                    <Input
                      id="platform-email"
                      type="email"
                      autoComplete="email"
                      placeholder="platform@yourcompany.com"
                      className={cn(
                        'h-12 rounded-xl border-border/80 bg-muted/40 pl-11 text-[15px]',
                        errors.email && 'border-destructive/80'
                      )}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full rounded-xl text-[15px] font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending code…' : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Platform-only session
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Org / vendor sign-in
          </Link>
        </div>
      </div>
    </AuthPageShell>
  );
}
