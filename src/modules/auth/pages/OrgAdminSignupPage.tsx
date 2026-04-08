import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { completeOrgAdminSignup, getOrgAdminInvitePreview } from '../api/orgAdminSignup.api';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '@/modules/common/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AuthPageShell } from '../components/AuthPageShell';
import { Building2, Loader2 } from 'lucide-react';

const schema = z.object({
  name: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

export function OrgAdminSignupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { toast } = useToast();
  const token = searchParams.get('token') ?? '';

  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!token) {
      setPreviewLoading(false);
      setPreviewError('Missing invitation token. Open the link from your email.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const p = await getOrgAdminInvitePreview(token);
        if (!cancelled) {
          setOrgName(p.orgName);
        }
      } catch (e) {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : 'Invalid or expired invitation.');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    try {
      const res = await completeOrgAdminSignup({
        token,
        name: values.name?.trim() || undefined,
      });
      if (res?.user) {
        setUser(res.user);
        toast({ title: 'Welcome', description: 'Your org admin account is ready.' });
        navigate(ROUTES.ORG.DASHBOARD, { replace: true });
      } else {
        toast({
          title: 'Signup complete',
          description: 'You can sign in with the org portal using your email.',
        });
        navigate(ROUTES.LOGIN, { replace: true });
      }
    } catch (e) {
      toast({
        title: 'Could not complete signup',
        description: e instanceof Error ? e.message : 'Try again or request a new invite.',
        variant: 'destructive',
      });
    }
  };

  if (!token && !previewLoading) {
    return (
      <AuthPageShell>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>{previewError}</CardDescription>
          </CardHeader>
        </Card>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-lg">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Complete org admin signup</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accept your invitation to become an organization admin.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invitation</CardTitle>
            <CardDescription>
              {previewLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </span>
              ) : previewError ? (
                <span className="text-destructive">{previewError}</span>
              ) : (
                <>
                  <span className="font-medium text-foreground">{orgName ?? 'Organization'}</span>
                  {orgName ? ' — you’re joining this organization as an admin.' : null}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!previewLoading && !previewError && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name (optional)</Label>
                  <Input id="display-name" placeholder="Your name" {...form.register('name')} />
                </div>
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Completing…' : 'Accept and continue'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthPageShell>
  );
}
