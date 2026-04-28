import { useQuery } from '@tanstack/react-query';
import { getPlatformSessions } from '../api/platform.api';
import type { PlatformSessionRow } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function formatCell(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/** Reads camel/snake variants left on the row after mapping (handles API drift). */
function sessionStr(row: PlatformSessionRow, keys: string[]): string {
  const o = row as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== '') return formatCell(v);
  }
  return '—';
}

export function PlatformSessionsPanel(props?: { organizationId?: string }) {
  const organizationId = props?.organizationId;
  const { data, isLoading, error } = useQuery({
    queryKey: ['platform', 'sessions', { page: 1, pageSize: 50, organizationId: organizationId ?? null }],
    queryFn: () =>
      getPlatformSessions({
        page: 1,
        pageSize: 50,
        ...(organizationId ? { organizationId } : {}),
      }),
    staleTime: 30_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-border/80 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">User sessions</CardTitle>
          <CardDescription>
            {organizationId
              ? 'Sessions for this organization when the API supports filtering by organization.'
              : 'Active portal sessions visible to platform operators'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading sessions…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-destructive/30 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">User sessions</CardTitle>
          <CardDescription>Could not load sessions</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-destructive">
          {(error as Error).message ?? 'Request failed'}
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="rounded-2xl border-dashed border-border/80 bg-muted/20 shadow-card">
        <CardHeader>
          <CardTitle className="text-base">User sessions</CardTitle>
          <CardDescription>
            Backend endpoint not enabled yet — expose{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">GET /platform/sessions</code>
            {organizationId ? ' (with optional organization filter)' : ''} on df-vendor to list active JWT sessions or audit rows.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows = data.data ?? [];

  return (
    <Card className="rounded-2xl border-border/80 shadow-card">
      <CardHeader className="border-b border-border/60 bg-muted/25">
        <CardTitle className="text-base">User sessions</CardTitle>
        <CardDescription>
          {data.total} session{data.total === 1 ? '' : 's'} reported · page {data.page} of {data.totalPages ?? 1}
          {organizationId ? ' · filtered to this organization when supported by the API' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">No sessions returned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">User type</th>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Last active</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((s: PlatformSessionRow, i: number) => {
                  const email = sessionStr(s, ['email', 'userEmail', 'user_email']);
                  const uid = sessionStr(s, ['userId', 'user_id']);
                  const primaryUser = email !== '—' ? email : uid;
                  const showUidSubtitle = email !== '—' && uid !== '—';

                  const userTypeDisp = sessionStr(s, [
                    'userType',
                    'user_type',
                    'principalType',
                    'principal_type',
                    'role',
                  ]);
                  const orgName = sessionStr(s, ['organizationName', 'organization_name', 'orgName']);
                  const orgIdDisp = sessionStr(s, ['organizationId', 'organization_id', 'orgId']);
                  const ipDisp = sessionStr(s, [
                    'ip',
                    'ipAddress',
                    'ip_address',
                    'clientIp',
                    'client_ip',
                  ]);
                  const uaDisp = sessionStr(s, [
                    'userAgent',
                    'user_agent',
                    'client',
                    'browser',
                    'clientAgent',
                  ]);
                  const lastActiveDisp = sessionStr(s, [
                    'lastActiveAt',
                    'last_active_at',
                    'updatedAt',
                    'updated_at',
                    'createdAt',
                  ]);
                  return (
                    <tr key={String(s.id ?? s.sessionId ?? s.email ?? i)} className="bg-card hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{primaryUser}</span>
                        {showUidSubtitle ? (
                          <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">{uid}</span>
                        ) : null}
                      </td>
                      <td className="max-w-[140px] px-4 py-3 text-muted-foreground">{userTypeDisp}</td>
                      <td className="max-w-[220px] px-4 py-3">
                        <span className="font-medium text-foreground">
                          {orgName !== '—' ? orgName : orgIdDisp}
                        </span>
                        {orgName !== '—' && orgIdDisp !== '—' ? (
                          <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground" title={orgIdDisp}>
                            {orgIdDisp}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{lastActiveDisp}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{ipDisp}</td>
                      <td className="max-w-[min(280px,28vw)] truncate px-4 py-3 text-xs text-muted-foreground" title={uaDisp}>
                        {uaDisp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
