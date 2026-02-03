import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrgPODetail } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { FileText } from 'lucide-react';

export function PODetailsPage() {
  const { poId } = useParams<{ poId: string }>();
  const { data: po, isLoading, error } = useQuery({
    queryKey: ['org', 'po', poId],
    queryFn: () => getOrgPODetail(poId!),
    enabled: !!poId,
  });

  if (!poId) return null;
  if (error) return <div className="text-destructive">Failed to load PO</div>;
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (!po) return <div>PO not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={`Status: ${po.status} · Created ${formatDateTime(po.createdAt)}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Vendor:</span>{' '}
              <Link to={ROUTES.ORG.VENDOR_DETAIL(po.vendorId)} className="hover:underline">
                {po.vendorName ?? po.vendorId}
              </Link>
            </p>
            {po.shipTo && (
              <p><span className="text-muted-foreground">Ship to:</span> {po.shipTo}</p>
            )}
            <p><span className="text-muted-foreground">Required docs:</span> {po.requiredDocs?.join(', ') ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">SKU / Description</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2">{item.sku ?? item.description ?? '—'}</td>
                      <td className="p-2 text-right">{item.expectedQty}</td>
                      <td className="p-2">{item.unit ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {po.uploads && po.uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {po.uploads.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded border p-3">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{u.status}</span>
                  <span className="text-sm text-muted-foreground">{formatDateTime(u.uploadedAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
