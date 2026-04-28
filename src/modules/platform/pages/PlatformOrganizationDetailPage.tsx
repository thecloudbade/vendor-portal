import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPlatformOrganization } from '../api/platform.api';
import { PlatformOrgMetricsDashboard } from '../components/PlatformOrgMetricsDashboard';
import { PlatformNetSuiteRestletTypesForm } from '../components/PlatformNetSuiteRestletTypesForm';
import {
  PlatformOrgTenantPurchaseOrdersPanel,
  PlatformOrgTenantVendorsPanel,
} from '../components/PlatformTenantOpsSection';
import { PlatformSessionsPanel } from '../components/PlatformSessionsPanel';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import {
  ArrowLeft,
  Building2,
  FileText,
  LayoutDashboard,
  Plug,
  Radio,
  Users,
} from 'lucide-react';

export function PlatformOrganizationDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const id = orgId ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'organization', id],
    queryFn: () => getPlatformOrganization(id),
    enabled: Boolean(id),
  });

  if (!id) {
    return <p className="text-sm text-muted-foreground">Missing organization id.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link to={ROUTES.PLATFORM.ORGANIZATIONS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to organizations
          </Link>
        </Button>
        <p className="text-sm text-destructive">Could not load organization.</p>
      </div>
    );
  }

  const orgLabel = data.name ?? data.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link to={ROUTES.PLATFORM.ORGANIZATIONS}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Organizations
          </Link>
        </Button>
      </div>

      <PageHeader title={orgLabel} description={`Organization id: ${data.id}`} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-2 flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/60 p-1.5 sm:inline-flex sm:w-auto sm:max-w-none">
          <TabsTrigger value="overview" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <FileText className="h-4 w-4 shrink-0" />
            Purchase orders
          </TabsTrigger>
          <TabsTrigger value="vendors" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Users className="h-4 w-4 shrink-0" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Radio className="h-4 w-4 shrink-0" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 px-4 py-2 data-[state=active]:shadow-sm">
            <Plug className="h-4 w-4 shrink-0" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-8 focus-visible:ring-0 focus-visible:ring-offset-0">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Usage &amp; activity</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  KPI cards from the organization metrics snapshot (aggregate counts).
                </p>
              </div>
            </div>
            <PlatformOrgMetricsDashboard metrics={data.metrics} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight">Company profile</h2>
            </div>
            <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Registered details</CardTitle>
                <CardDescription>Status, timezone, and address</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{data.status ?? '—'}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">Timezone</p>
                  <p className="font-medium">{data.timezone ?? '—'}</p>
                </div>
                <div className="space-y-1 text-sm sm:col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">{data.address ?? '—'}</p>
                </div>
                {data.createdAt && (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-mono text-xs font-medium">{data.createdAt}</p>
                  </div>
                )}
                {data.updatedAt && (
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-mono text-xs font-medium">{data.updatedAt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        <TabsContent value="purchase-orders" className="mt-6 focus-visible:ring-0 focus-visible:ring-offset-0">
          <PlatformOrgTenantPurchaseOrdersPanel orgId={data.id} orgName={orgLabel} metrics={data.metrics} />
        </TabsContent>

        <TabsContent value="vendors" className="mt-6 focus-visible:ring-0 focus-visible:ring-offset-0">
          <PlatformOrgTenantVendorsPanel orgId={data.id} orgName={orgLabel} />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6 focus-visible:ring-0 focus-visible:ring-offset-0">
          <PlatformSessionsPanel organizationId={data.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-4 focus-visible:ring-0 focus-visible:ring-offset-0">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">NetSuite RESTlet routing</h2>
            <p className="text-sm text-muted-foreground">
              Configure how this tenant&apos;s integrations resolve NetSuite RESTlet scripts (SUPERADMIN).
            </p>
            <PlatformNetSuiteRestletTypesForm orgId={data.id} detail={data} />
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
