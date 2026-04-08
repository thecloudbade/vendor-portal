import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { getOrgMe, updateOrgPreferences } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { PreferencesForm, type PreferencesFormValues } from '../components/PreferencesForm';
import { NetSuiteIntegrationCard } from '../components/NetSuiteIntegrationCard';
import { NetSuiteRecordCachePanel } from '../components/NetSuiteRecordCachePanel';
import { DocumentTemplatesPanel } from '../components/DocumentTemplatesPanel';
import { OrgProfileForm } from '../components/OrgProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Database, FileSpreadsheet, Key, LayoutGrid, Plug, Settings } from 'lucide-react';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { canFetchNetSuiteCatalog, canManageSettings } from '@/modules/common/constants/roles';
import type { OrgPreferencesPayload } from '../types';

const SETTINGS_TABS = ['general', 'preferences', 'netsuite', 'netsuite-data', 'templates'] as const;
export type SettingsTabId = (typeof SETTINGS_TABS)[number];

function isSettingsTab(s: string | null): s is SettingsTabId {
  return SETTINGS_TABS.includes(s as SettingsTabId);
}

const prefsSchema = z.object({
  requireCOO: z.boolean(),
  allowReupload: z.boolean(),
  maxReuploadAttempts: z.number().min(1).max(10),
  packingListQtyTolerancePct: z.coerce.number().min(0).max(100),
  commercialInvoiceQtyTolerancePct: z.coerce.number().min(0).max(100),
  blockSubmitOnQtyToleranceExceeded: z.boolean(),
  mismatchRecipients: z.string(),
  reuploadRecipients: z.string(),
});

function prefsFromOrg(p: OrgPreferencesPayload | undefined): PreferencesFormValues {
  return {
    requireCOO: p?.rules?.requireCOO ?? true,
    allowReupload: p?.rules?.allowReupload ?? true,
    maxReuploadAttempts: p?.rules?.maxReuploadAttempts ?? 3,
    packingListQtyTolerancePct: p?.rules?.packingListQtyTolerancePct ?? 5,
    commercialInvoiceQtyTolerancePct: p?.rules?.commercialInvoiceQtyTolerancePct ?? 5,
    blockSubmitOnQtyToleranceExceeded: p?.rules?.blockSubmitOnQtyToleranceExceeded !== false,
    mismatchRecipients: p?.notifications?.mismatchRecipients?.join(', ') ?? '',
    reuploadRecipients: p?.notifications?.reuploadRecipients?.join(', ') ?? '',
  };
}

function toApiPayload(
  form: PreferencesFormValues,
  existing: OrgPreferencesPayload | undefined
): OrgPreferencesPayload {
  return {
    poSource: existing?.poSource ?? { mode: 'MANUAL', apiTokens: [] },
    rules: {
      requireCOO: form.requireCOO,
      allowReupload: form.allowReupload,
      maxReuploadAttempts: form.maxReuploadAttempts,
      packingListQtyTolerancePct: form.packingListQtyTolerancePct,
      commercialInvoiceQtyTolerancePct: form.commercialInvoiceQtyTolerancePct,
      blockSubmitOnQtyToleranceExceeded: form.blockSubmitOnQtyToleranceExceeded,
    },
    notifications: {
      mismatchRecipients: form.mismatchRecipients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      reuploadRecipients: form.reuploadRecipients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    },
  };
}

function AdminOnlyNotice() {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        Only an organization admin (ORG_ADMIN) can change these settings.
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isOrgUser = user?.userType === 'org';
  const isOrgAdmin = isOrgUser && canManageSettings(user.role);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = useMemo((): SettingsTabId => {
    const raw = searchParams.get('tab');
    return isSettingsTab(raw) ? raw : 'general';
  }, [searchParams]);

  useEffect(() => {
    if (!searchParams.get('tab')) return;
    const raw = searchParams.get('tab');
    if (!isSettingsTab(raw)) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'general');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: org, isLoading } = useQuery({
    queryKey: ['org', 'me'],
    queryFn: () => getOrgMe(),
  });

  const updateMutation = useMutation({
    mutationFn: (form: PreferencesFormValues) =>
      updateOrgPreferences(toApiPayload(form, org?.preferences)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'me'] });
      toast({ title: 'Preferences saved' });
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(prefsSchema),
    defaultValues: prefsFromOrg(undefined),
    values: org ? prefsFromOrg(org.preferences) : undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(searchParams);
          if (v && isSettingsTab(v)) next.set('tab', v);
          else next.set('tab', 'general');
          setSearchParams(next, { replace: true });
        }}
        className="w-full"
      >
        <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1.5 sm:inline-flex sm:w-auto sm:max-w-none">
          <TabsTrigger value="general" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <LayoutGrid className="h-4 w-4 shrink-0" />
            General
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Settings className="h-4 w-4 shrink-0" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="netsuite" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Plug className="h-4 w-4 shrink-0" />
            NetSuite
          </TabsTrigger>
          <TabsTrigger value="netsuite-data" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Database className="h-4 w-4 shrink-0" />
            NetSuite data
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            Document templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 focus-visible:ring-0 focus-visible:ring-offset-0">
          {isOrgAdmin && org ? (
            <Card>
              <CardHeader>
                <CardTitle>Organization profile</CardTitle>
                <CardDescription>Name, timezone, and address.</CardDescription>
              </CardHeader>
              <CardContent>
                <OrgProfileForm org={org} />
              </CardContent>
            </Card>
          ) : org ? (
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Organization details</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span> {org.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Timezone:</span> {org.timezone}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span> {org.status}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API tokens
              </CardTitle>
              <CardDescription>Integration tokens</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
              <Button variant="outline" size="sm" className="mt-2" disabled>
                Manage tokens (soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 focus-visible:ring-0 focus-visible:ring-offset-0">
          {isOrgAdmin ? (
            <PreferencesForm
              form={form}
              onSubmit={updateMutation.mutate}
              isSubmitting={updateMutation.isPending}
            />
          ) : (
            <AdminOnlyNotice />
          )}
        </TabsContent>

        <TabsContent value="netsuite" className="space-y-4 overflow-visible focus-visible:ring-0 focus-visible:ring-offset-0">
          {isOrgAdmin ? <NetSuiteIntegrationCard /> : <AdminOnlyNotice />}
        </TabsContent>

        <TabsContent value="netsuite-data" className="space-y-4 overflow-visible focus-visible:ring-0 focus-visible:ring-offset-0">
          {isOrgUser ? (
            <NetSuiteRecordCachePanel
              isOrgAdmin={isOrgAdmin}
              canFetchNetSuiteCatalog={canFetchNetSuiteCatalog(user.role)}
            />
          ) : (
            <AdminOnlyNotice />
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 overflow-visible focus-visible:ring-0 focus-visible:ring-offset-0">
          {isOrgAdmin ? <DocumentTemplatesPanel /> : <AdminOnlyNotice />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
