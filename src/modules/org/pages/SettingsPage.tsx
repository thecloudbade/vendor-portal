import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getOrgSettings, updateOrgSettings } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { PreferencesForm } from '../components/PreferencesForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Key } from 'lucide-react';

const settingsSchema = z.object({
  requiredDocs: z.string().optional(),
  maxSizeMb: z.number().min(1).max(50).optional(),
  mismatchAlertsTo: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['org', 'settings'],
    queryFn: () => getOrgSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: SettingsFormValues) => {
      const uploadRules = {
        requiredDocs: payload.requiredDocs?.split(',').map((s) => s.trim()).filter(Boolean),
        maxSizeMb: payload.maxSizeMb,
      };
      const emailRules = payload.mismatchAlertsTo
        ? { mismatchAlertsTo: payload.mismatchAlertsTo.split(',').map((s) => s.trim()).filter(Boolean) }
        : undefined;
      return updateOrgSettings({ uploadRules, emailRules });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'settings'] });
      toast({ title: 'Settings saved' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      requiredDocs: settings?.uploadRules?.requiredDocs?.join(', ') ?? 'pl, ci, coo',
      maxSizeMb: settings?.uploadRules?.maxSizeMb ?? 10,
      mismatchAlertsTo: settings?.emailRules?.mismatchAlertsTo?.join(', ') ?? '',
    },
    values: settings
      ? {
          requiredDocs: settings.uploadRules?.requiredDocs?.join(', ') ?? 'pl, ci, coo',
          maxSizeMb: settings.uploadRules?.maxSizeMb ?? 10,
          mismatchAlertsTo: settings.emailRules?.mismatchAlertsTo?.join(', ') ?? '',
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Upload rules, API tokens, email rules, pending PO logic"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API tokens
          </CardTitle>
          <CardDescription>View and regenerate API tokens for integrations.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Configure in backend. Tokens are never shown in full.</p>
          <Button variant="outline" size="sm" className="mt-2" disabled>
            Regenerate
          </Button>
        </CardContent>
      </Card>

      <PreferencesForm
        form={form}
        onSubmit={updateMutation.mutate}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
