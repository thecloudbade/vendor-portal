import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrgPOs, getVendors } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { FileText, Building2, Upload, AlertTriangle } from 'lucide-react';

export function OrgDashboard() {
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['org', 'pos', { status: 'pending' }],
    queryFn: () => getOrgPOs({ status: 'pending', pageSize: 10 }),
  });
  const { data: vendorsData } = useQuery({
    queryKey: ['org', 'vendors'],
    queryFn: () => getVendors(),
  });

  const pendingPOs = posData?.data ?? [];
  const vendors = vendorsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Pending POs across vendors, exceptions, latest uploads"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {posLoading ? (
              <div className="h-10 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <p className="text-2xl font-bold">{pendingPOs.length}</p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <Link to={ROUTES.ORG.POS}>View all</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendors.length}</p>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link to={ROUTES.ORG.VENDORS}>Manage</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>Mismatch alerts</CardDescription>
            <p className="text-sm text-muted-foreground mt-2">No active exceptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latest uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>Recent vendor uploads</CardDescription>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link to={ROUTES.ORG.POS}>View POs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending POs</CardTitle>
          <CardDescription>POs awaiting vendor documents</CardDescription>
        </CardHeader>
        <CardContent>
          {posLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : pendingPOs.length === 0 ? (
            <p className="text-muted-foreground">No pending POs</p>
          ) : (
            <ul className="space-y-2">
              {pendingPOs.map((po) => (
                <li key={po.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <Link
                      to={ROUTES.ORG.PO_DETAIL(po.id)}
                      className="font-medium hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {po.vendorName ?? po.vendorId} · {formatDateTime(po.createdAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={ROUTES.ORG.PO_DETAIL(po.id)}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
