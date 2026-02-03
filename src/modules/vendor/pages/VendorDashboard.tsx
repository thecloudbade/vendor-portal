import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorPOs, getVendorUploads } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { FileText, Upload, Bell, Search } from 'lucide-react';

export function VendorDashboard() {
  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['vendor', 'pos', { status: 'pending' }],
    queryFn: () => getVendorPOs({ status: 'pending', pageSize: 5 }),
  });
  const { data: uploadsData, isLoading: uploadsLoading } = useQuery({
    queryKey: ['vendor', 'uploads'],
    queryFn: () => getVendorUploads({ pageSize: 5 }),
  });

  const pendingPOs = posData?.data ?? [];
  const recentUploads = uploadsData?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Pending POs, upload status, and notifications"
        actions={
          <Button asChild>
            <Link to={ROUTES.VENDOR.PO_SEARCH}>
              <Search className="mr-2 h-4 w-4" />
              Search PO
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <Link to={ROUTES.VENDOR.PO_SEARCH}>View all</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent uploads</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {uploadsLoading ? (
              <div className="h-10 animate-pulse rounded bg-muted" />
            ) : (
              <>
                <p className="text-2xl font-bold">{recentUploads.length}</p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <Link to={ROUTES.VENDOR.UPLOADS}>View history</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardDescription>Mismatch alerts and status updates appear here.</CardDescription>
            <p className="text-sm text-muted-foreground mt-2">No new notifications</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending POs</CardTitle>
          <CardDescription>POs awaiting documents</CardDescription>
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
                      to={ROUTES.VENDOR.PO_DETAIL(po.id)}
                      className="font-medium hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">{formatDateTime(po.createdAt)}</p>
                  </div>
                  <Button asChild size="sm">
                    <Link to={ROUTES.VENDOR.UPLOAD(po.id)}>Upload</Link>
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
