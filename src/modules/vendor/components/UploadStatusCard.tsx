import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/modules/common/utils/format';
import type { UploadRecord } from '../types';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  received: { label: 'Received', icon: Clock, className: 'text-muted-foreground' },
  validated: { label: 'Validated', icon: CheckCircle, className: 'text-blue-600' },
  accepted: { label: 'Accepted', icon: CheckCircle, className: 'text-green-600' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'text-destructive' },
};

interface UploadStatusCardProps {
  record: UploadRecord;
  isScanning?: boolean;
}

export function UploadStatusCard({ record, isScanning }: UploadStatusCardProps) {
  const config = statusConfig[record.status] ?? statusConfig.received;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.className)} />
          {record.poNumber ?? record.poId}
          {isScanning && (
            <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Scanning…
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          {config.label} · {formatDateTime(record.uploadedAt)}
        </p>
        {record.uploadedBy && (
          <p className="text-muted-foreground">By {record.uploadedBy}</p>
        )}
        {record.validationErrors && record.validationErrors.length > 0 && (
          <ul className="list-disc list-inside text-destructive text-xs">
            {record.validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
