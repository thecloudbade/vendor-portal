import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { putPlatformOrganizationNetSuiteRestletTypes } from '../api/platform.api';
import type { PlatformNetsuiteRestletTypesPayload, PlatformOrgDetail } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plug } from 'lucide-react';

const DEFAULTS = {
  restletTypeVendors: 'vendors',
  restletTypePurchaseOrders: 'purchaseorders',
  restletTypePurchaseLineData: 'purchaseorderlines',
  restletTypeRecordTypes: 'recordtypes',
  restletTypeMetadata: 'metadata',
  restletTypeDocumentUpload: 'vendorfilesupload',
  restletTypeLineUpdate: '',
} as const;

function mergeFromDetail(d: PlatformOrgDetail | undefined): Record<string, string> {
  const p = d?.platformNetsuiteRestletTypes;
  const src = p && typeof p === 'object' ? p : {};
  return {
    restletTypeVendors: String(src.restletTypeVendors ?? DEFAULTS.restletTypeVendors),
    restletTypePurchaseOrders: String(src.restletTypePurchaseOrders ?? DEFAULTS.restletTypePurchaseOrders),
    restletTypePurchaseLineData: String(src.restletTypePurchaseLineData ?? DEFAULTS.restletTypePurchaseLineData),
    restletTypeRecordTypes: String(src.restletTypeRecordTypes ?? DEFAULTS.restletTypeRecordTypes),
    restletTypeMetadata: String(src.restletTypeMetadata ?? DEFAULTS.restletTypeMetadata),
    restletTypeDocumentUpload: String(src.restletTypeDocumentUpload ?? DEFAULTS.restletTypeDocumentUpload),
    restletTypeLineUpdate:
      src.restletTypeLineUpdate != null && String(src.restletTypeLineUpdate).trim() !== ''
        ? String(src.restletTypeLineUpdate)
        : '',
  };
}

type Props = { orgId: string; detail: PlatformOrgDetail };

export function PlatformNetSuiteRestletTypesForm({ orgId, detail }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => mergeFromDetail(detail));

  const platformKey = JSON.stringify(detail.platformNetsuiteRestletTypes ?? null);
  useEffect(() => {
    setForm(mergeFromDetail(detail));
  }, [detail.id, platformKey]);

  const mutation = useMutation({
    mutationFn: (payload: PlatformNetsuiteRestletTypesPayload) =>
      putPlatformOrganizationNetSuiteRestletTypes(orgId, payload),
    onSuccess: (next) => {
      queryClient.setQueryData(['platform', 'organization', orgId], next);
      toast({ title: 'NetSuite RESTlet types saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const row = (key: keyof typeof DEFAULTS, label: string, hint?: string) => (
    <div key={key}>
      <Label htmlFor={`pns-${key}`}>{label}</Label>
      <Input
        id={`pns-${key}`}
        className="mt-1"
        value={form[key]}
        onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
      />
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );

  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-card">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" />
          NetSuite RESTlet types
        </CardTitle>
        <CardDescription>
          Per-tenant <code className="text-xs rounded bg-muted px-1">type=</code> branch names for this organization
          (overrides stored integration defaults when set).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          {row('restletTypeVendors', 'Vendors sync')}
          {row('restletTypePurchaseOrders', 'Purchase orders')}
          {row('restletTypePurchaseLineData', 'Purchase line data')}
          {row('restletTypeRecordTypes', 'Record types list')}
          {row('restletTypeMetadata', 'Metadata fetch')}
          {row('restletTypeDocumentUpload', 'Vendor file upload POST')}
          {row(
            'restletTypeLineUpdate',
            'Line quantity update POST',
            'Leave empty to use packinglistupdate.'
          )}
        </div>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate({
              restletTypeVendors: form.restletTypeVendors.trim() || null,
              restletTypePurchaseOrders: form.restletTypePurchaseOrders.trim() || null,
              restletTypePurchaseLineData: form.restletTypePurchaseLineData.trim() || null,
              restletTypeRecordTypes: form.restletTypeRecordTypes.trim() || null,
              restletTypeMetadata: form.restletTypeMetadata.trim() || null,
              restletTypeDocumentUpload: form.restletTypeDocumentUpload.trim() || null,
              restletTypeLineUpdate: form.restletTypeLineUpdate.trim() || null,
            })
          }
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save RESTlet types
        </Button>
      </CardContent>
    </Card>
  );
}
