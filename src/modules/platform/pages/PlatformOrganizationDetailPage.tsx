import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPlatformOrganization } from '../api/platform.api';
import { PlatformOrgMetricsDashboard } from '../components/PlatformOrgMetricsDashboard';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { ArrowLeft } from 'lucide-react';

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
          <Link to={ROUTES.PLATFORM.DASHBOARD}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
        <p className="text-sm text-destructive">Could not load organization.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" className="w-fit" asChild>
          <Link to={ROUTES.PLATFORM.DASHBOARD}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Organizations
          </Link>
        </Button>
      </div>

      <PageHeader
        title={data.name}
        description={`Organization id: ${data.id}`}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Tenant profile</h2>
        <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
          <CardHeader className="border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Registered organization fields</CardDescription>
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Usage &amp; activity</h2>
        <PlatformOrgMetricsDashboard metrics={data.metrics} />
      </section>
    </div>
  );
}
