import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { putOrgProfile } from '../api/org.api';
import type { OrgMe, OrgProfilePutPayload } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  timezone: z.string().min(1, 'Timezone is required').max(120),
  line1: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  region: z.string().max(200).optional(),
  postalCode: z.string().max(40).optional(),
  country: z.string().max(120).optional(),
});

export type OrgProfileFormValues = z.infer<typeof profileSchema>;

function valuesFromOrg(org: OrgMe | undefined): OrgProfileFormValues {
  const raw = org?.address;
  const a =
    typeof raw === 'string'
      ? { line1: raw }
      : raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw
        : {};
  return {
    name: org?.name ?? '',
    timezone: org?.timezone ?? 'UTC',
    line1: 'line1' in a && a.line1 != null ? String(a.line1) : '',
    city: 'city' in a && a.city != null ? String(a.city) : '',
    region: 'region' in a && a.region != null ? String(a.region) : '',
    postalCode: 'postalCode' in a && a.postalCode != null ? String(a.postalCode) : '',
    country: 'country' in a && a.country != null ? String(a.country) : '',
  };
}

function toPayload(values: OrgProfileFormValues): OrgProfilePutPayload {
  const address: OrgProfilePutPayload['address'] = {
    line1: values.line1?.trim() || undefined,
    city: values.city?.trim() || undefined,
    region: values.region?.trim() || undefined,
    postalCode: values.postalCode?.trim() || undefined,
    country: values.country?.trim() || undefined,
  };
  const hasAddr = Object.values(address).some(Boolean);
  return {
    name: values.name.trim(),
    timezone: values.timezone.trim(),
    ...(hasAddr ? { address } : {}),
  };
}

interface OrgProfileFormProps {
  org: OrgMe | undefined;
}

export function OrgProfileForm({ org }: OrgProfileFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (payload: OrgProfilePutPayload) => putOrgProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'onboarding-checklist'] });
      toast({ title: 'Organization profile saved' });
    },
    onError: (e: Error) => {
      toast({ title: 'Could not save profile', description: e.message, variant: 'destructive' });
    },
  });

  const form = useForm<OrgProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: valuesFromOrg(undefined),
    values: valuesFromOrg(org),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((vals) => mutation.mutate(toPayload(vals)))}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="org-name">Organization name</Label>
          <Input id="org-name" autoComplete="organization" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="org-tz">Timezone</Label>
          <Input id="org-tz" placeholder="e.g. America/New_York" {...form.register('timezone')} />
          {form.formState.errors.timezone && (
            <p className="text-sm text-destructive">{form.formState.errors.timezone.message}</p>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 pt-4">
        <p className="mb-3 text-sm font-medium text-foreground">Address (optional)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-line1">Line 1</Label>
            <Input id="org-line1" {...form.register('line1')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-city">City</Label>
            <Input id="org-city" {...form.register('city')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-region">Region / state</Label>
            <Input id="org-region" {...form.register('region')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-postal">Postal code</Label>
            <Input id="org-postal" {...form.register('postalCode')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-country">Country</Label>
            <Input id="org-country" {...form.register('country')} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={mutation.isPending || !form.formState.isDirty}>
        {mutation.isPending ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
