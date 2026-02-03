import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVendors } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import { VendorInviteDialog } from '../components/VendorInviteDialog';
import { PermissionGate } from '@/modules/common/components/PermissionGate';
import { canManageVendors } from '@/modules/common/constants/roles';
import type { VendorListItem } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { ROUTES } from '@/modules/common/constants/routes';
import { formatDateTime } from '@/modules/common/utils/format';
import { Button } from '@/components/ui/button';

export function VendorsPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'vendors'],
    queryFn: () => getVendors(),
  });

  const vendors = data?.data ?? [];

  const columns: Column<VendorListItem>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (row) => (
        <Link to={ROUTES.ORG.VENDOR_DETAIL(row.id)} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { id: 'email', header: 'Email', cell: (row) => row.email ?? '—' },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{row.status}</span>
      ),
    },
    { id: 'createdAt', header: 'Created', cell: (row) => formatDateTime(row.createdAt) },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <PermissionGate permission={canManageVendors}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedVendorId(row.id);
              setInviteOpen(true);
            }}
          >
            Invite user
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Create vendors and invite vendor users"
        actions={
          <PermissionGate permission={canManageVendors}>
            <Button onClick={() => { setSelectedVendorId(null); setInviteOpen(true); }}>Create vendor</Button>
          </PermissionGate>
        }
      />

      <DataTable<VendorListItem>
        data={vendors}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={vendors.length}
        isLoading={isLoading}
        emptyMessage="No vendors yet"
      />

      <VendorInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        vendorId={selectedVendorId}
        mode={selectedVendorId ? 'invite' : 'create'}
        onSuccess={() => {
          setInviteOpen(false);
          setSelectedVendorId(null);
        }}
      />
    </div>
  );
}
