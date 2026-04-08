import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPlatformOrganization,
  getPlatformOrganizations,
  inviteOrgAdmin,
} from '../api/platform.api';
import type { PlatformOrgListItem } from '../types';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable, type Column } from '@/modules/common/components/DataTable/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { ROUTES } from '@/modules/common/constants/routes';
import { Building2, Mail, Plus } from 'lucide-react';
import { parseListPageParam } from '@/modules/common/utils/listUrlParams';

function metricsSummary(row: PlatformOrgListItem): string {
  const m = row.metrics;
  if (!m || typeof m !== 'object') return '—';
  const parts: string[] = [];
  if (typeof m.purchaseOrderCount === 'number') parts.push(`POs: ${m.purchaseOrderCount}`);
  if (typeof m.vendorCount === 'number') parts.push(`Vendors: ${m.vendorCount}`);
  if (typeof m.vendorUserCount === 'number') parts.push(`Users: ${m.vendorUserCount}`);
  return parts.length ? parts.join(' · ') : '—';
}

export function PlatformOrganizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseListPageParam(searchParams.get('page'));
  const pageSize = 20;
  const { toast } = useToast();

  const setPage = (p: number) => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (p <= 1) n.delete('page');
        else n.set('page', String(p));
        return n;
      },
      { replace: true }
    );
  };
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTz, setCreateTz] = useState('');
  const [createAddr, setCreateAddr] = useState('');

  const [inviteOrgId, setInviteOrgId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['platform', 'organizations', { page, pageSize }],
    queryFn: () => getPlatformOrganizations({ page, pageSize }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPlatformOrganization({
        name: createName.trim(),
        timezone: createTz.trim() || undefined,
        address: createAddr.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'organizations'] });
      toast({ title: 'Organization created' });
      setCreateOpen(false);
      setCreateName('');
      setCreateTz('');
      setCreateAddr('');
    },
    onError: (e: Error) => {
      toast({ title: 'Create failed', description: e.message, variant: 'destructive' });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => {
      if (!inviteOrgId) throw new Error('No organization');
      return inviteOrgAdmin(inviteOrgId, { email: inviteEmail.trim().toLowerCase() });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'organizations'] });
      const share =
        result?.signupUrl ??
        (result?.token
          ? `${window.location.origin}${ROUTES.ORG_ADMIN_SIGNUP}?token=${encodeURIComponent(result.token)}`
          : undefined);
      toast({
        title: 'Invitation sent',
        description: share
          ? `Share: ${share}`
          : 'The first org admin will receive an email with a signup link.',
      });
      setInviteOrgId(null);
      setInviteEmail('');
    },
    onError: (e: Error) => {
      toast({ title: 'Invite failed', description: e.message, variant: 'destructive' });
    },
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns: Column<PlatformOrgListItem>[] = [
    {
      id: 'name',
      header: 'Organization',
      cell: (row) => (
        <div>
          <Link
            to={ROUTES.PLATFORM.ORG_DETAIL(row.id)}
            className="font-semibold text-foreground hover:text-primary hover:underline"
          >
            {row.name || row.id}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{row.id}</p>
        </div>
      ),
    },
    {
      id: 'metrics',
      header: 'Metrics',
      cell: (row) => <span className="text-sm text-muted-foreground">{metricsSummary(row)}</span>,
    },
    {
      id: 'actions',
      header: '',
      className: 'w-[1%] whitespace-nowrap',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" asChild>
            <Link to={ROUTES.PLATFORM.ORG_DETAIL(row.id)}>View</Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-lg"
            onClick={() => {
              setInviteOrgId(row.id);
              setInviteEmail('');
            }}
          >
            <Mail className="mr-1 h-3.5 w-3.5" />
            Invite admin
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Organizations"
          description="Create organizations and invite admins."
        />
        <Button className="shrink-0 rounded-xl" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New organization
        </Button>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(r) => r.id}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyTitle="No organizations yet"
        emptyMessage="Create an organization to onboard a tenant."
        emptyIcon={Building2}
        countLabelSingular="organization"
        countLabelPlural="organizations"
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              POST /platform/organizations — name required; timezone and address optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="co-name">Name</Label>
              <Input
                id="co-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-tz">Timezone</Label>
              <Input
                id="co-tz"
                value={createTz}
                onChange={(e) => setCreateTz(e.target.value)}
                placeholder="America/New_York"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-addr">Address</Label>
              <Input
                id="co-addr"
                value={createAddr}
                onChange={(e) => setCreateAddr(e.target.value)}
                placeholder="Optional mailing address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOrgId != null} onOpenChange={(o) => !o && setInviteOrgId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite org admin</DialogTitle>
            <DialogDescription>
              Sends an email with a link to {ROUTES.ORG_ADMIN_SIGNUP}?token=…
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="inv-email">Email</Label>
            <Input
              id="inv-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="admin@tenant.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOrgId(null)}>
              Cancel
            </Button>
            <Button
              disabled={!inviteEmail.includes('@') || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
