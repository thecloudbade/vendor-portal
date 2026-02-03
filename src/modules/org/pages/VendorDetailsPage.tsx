import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVendorDetail } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { VendorInviteDialog } from '../components/VendorInviteDialog';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { canInviteVendorUsers } from '@/modules/common/constants/roles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/modules/common/utils/format';
import { ROLE_LABELS } from '@/modules/common/constants/roles';
import { UserPlus } from 'lucide-react';

export function VendorDetailsPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ['org', 'vendor', vendorId],
    queryFn: () => getVendorDetail(vendorId!),
    enabled: !!vendorId,
  });

  if (!vendorId) return null;
  if (error) return <div className="text-destructive">Failed to load vendor</div>;
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  if (!vendor) return <div>Vendor not found</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.name}
        description={vendor.email ? `Primary: ${vendor.email}` : undefined}
        actions={
          <PermissionGate permission={canInviteVendorUsers}>
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite user
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><span className="text-muted-foreground">Status:</span> {vendor.status}</p>
          <p><span className="text-muted-foreground">Created:</span> {formatDateTime(vendor.createdAt)}</p>
        </CardContent>
      </Card>

      {vendor.users && vendor.users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vendor users</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {vendor.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-sm text-muted-foreground">{ROLE_LABELS[u.role] ?? u.role} · {u.status}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Resend invite
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <VendorInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        vendorId={vendorId}
        mode="invite"
        onSuccess={() => setInviteOpen(false)}
      />
    </div>
  );
}
