import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendorPODetail } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Upload, FileText } from 'lucide-react';

export function PODetailsPage() {
  const { poId } = useParams<{ poId: string }>();
  const { data: po, isLoading, error } = useQuery({
    queryKey: ['vendor', 'po', poId],
    queryFn: () => getVendorPODetail(poId!),
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
        actions={
          <Button asChild>
            <Link to={ROUTES.VENDOR.UPLOAD(po.id)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload documents
            </Link>
          </Button>
        }
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
            <p><span className="text-muted-foreground">Vendor:</span> {po.vendorName ?? po.vendorId}</p>
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
    </div>
  );
}
