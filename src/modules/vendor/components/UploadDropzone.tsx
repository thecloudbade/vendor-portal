import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';
import { MAX_FILE_SIZE } from '@/modules/common/utils/validators';

export type UploadFileType = 'pl' | 'ci' | 'coo' | 'asn';

const ACCEPT: Record<UploadFileType, Record<string, string[]>> = {
  pl: { 'text/csv': ['.csv'], 'text/plain': ['.csv'], 'application/csv': ['.csv'] },
  ci: { 'text/csv': ['.csv'], 'text/plain': ['.csv'], 'application/csv': ['.csv'] },
  coo: { 'application/pdf': ['.pdf'] },
  asn: { 'text/csv': ['.csv'], 'text/plain': ['.csv'], 'application/csv': ['.csv'] },
};

interface UploadDropzoneProps {
  type: UploadFileType;
  value?: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string;
}

export function UploadDropzone({
  type,
  value,
  onChange,
  disabled,
  error,
}: UploadDropzoneProps) {
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], fileRejections: FileRejection[]) => {
      setRejectReason(null);
      if (fileRejections.length > 0 && fileRejections[0].errors?.length) {
        setRejectReason(fileRejections[0].errors.map((e) => e.message).join(', '));
        onChange(null);
        return;
      }
      onChange(accepted[0] ?? null);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT[type],
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    disabled,
    onDropRejected: (rejected) => {
      const msg = rejected[0]?.errors?.map((e) => e.message).join(', ');
      setRejectReason(msg ?? 'Invalid file');
    },
  });

  const label =
    type === 'coo'
      ? 'COO (PDF)'
      : type === 'asn'
        ? 'ASN — advance shipping notice (CSV)'
        : type.toUpperCase() + ' (CSV)';

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <div
        {...getRootProps()}
        className={cn(
          'flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors',
          isDragActive && 'border-primary bg-muted/50',
          value && 'border-primary/50 bg-muted/30',
          error || rejectReason ? 'border-destructive' : 'border-muted-foreground/25',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input {...getInputProps()} aria-label={label} />
        {value ? (
          <p className="text-sm font-medium">{value.name}</p>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              Drag & drop or click. Max {MAX_FILE_SIZE / 1024 / 1024} MB
            </p>
          </>
        )}
      </div>
      {(error || rejectReason) && (
        <p className="text-sm text-destructive">{error ?? rejectReason}</p>
      )}
    </div>
  );
}
