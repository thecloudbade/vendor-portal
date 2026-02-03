import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLog } from '../api/org.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { DataTable } from '@/modules/common/components/DataTable';
import type { AuditEntry } from '../types';
import type { Column } from '@/modules/common/components/DataTable';
import { formatDateTime } from '@/modules/common/utils/format';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['org', 'audit', { page, pageSize }],
    queryFn: () => getAuditLog({ page, pageSize }),
  });

  const columns: Column<AuditEntry>[] = [
    { id: 'createdAt', header: 'When', cell: (row) => formatDateTime(row.createdAt) },
    { id: 'action', header: 'Action', cell: (row) => row.action },
    { id: 'actor', header: 'Who', cell: (row) => row.actorEmail ?? row.actorId },
    { id: 'resourceType', header: 'Resource', cell: (row) => `${row.resourceType}${row.resourceId ? ` #${row.resourceId}` : ''}` },
    { id: 'details', header: 'Details', cell: (row) => row.details ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit / Activity"
        description="Who uploaded what, when; login history"
      />

      <DataTable<AuditEntry>
        data={data?.data ?? []}
        columns={columns}
        keyExtractor={(row) => row.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No audit entries"
      />
    </div>
  );
}
