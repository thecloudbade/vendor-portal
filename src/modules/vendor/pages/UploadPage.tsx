import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVendorPODetail, uploadDocuments, getPLTemplateUrl, getCITemplateUrl } from '../api/vendor.api';
import { PageHeader } from '@/modules/common/components/PageHeader';
import { UploadDropzone, type UploadFileType } from '../components/UploadDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/modules/common/constants/routes';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, Loader2 } from 'lucide-react';

type FileState = { pl: File | null; ci: File | null; coo: File | null };

export function UploadPage() {
  const { poId } = useParams<{ poId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileState>({ pl: null, ci: null, coo: null });
  const [uploadProgress, setUploadProgress] = useState(false);

  const { data: po, isLoading: poLoading } = useQuery({
    queryKey: ['vendor', 'po', poId],
    queryFn: () => getVendorPODetail(poId!),
    enabled: !!poId,
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      const list: { file: File; type: 'pl' | 'ci' | 'coo' }[] = [];
      if (files.pl) list.push({ file: files.pl, type: 'pl' });
      if (files.ci) list.push({ file: files.ci, type: 'ci' });
      if (files.coo) list.push({ file: files.coo, type: 'coo' });
      if (list.length === 0) return Promise.reject(new Error('Select at least one file'));
      return uploadDocuments(poId!, list);
    },
    onMutate: () => setUploadProgress(true),
    onSettled: () => setUploadProgress(false),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'uploads'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'po', poId] });
      if (result.success) {
        toast({ title: 'Upload successful', description: result.uploadId ? 'Documents received.' : undefined });
        setFiles({ pl: null, ci: null, coo: null });
      } else {
        toast({
          title: 'Validation issues',
          description: result.errors?.join(', '),
          variant: 'destructive',
        });
      }
    },
    onError: (e: Error) => {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => uploadMutation.mutate();
  const hasAny = files.pl || files.ci || files.coo;

  if (!poId) return null;
  if (poLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Upload documents`}
        description={po ? `PO: ${po.poNumber}` : undefined}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.VENDOR.PO_DETAIL(poId)}>View PO</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Download CSV templates for Packing List and Commercial Invoice</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="outline" asChild>
            <a href={getPLTemplateUrl()} download="packing-list-template.csv">
              <Download className="mr-2 h-4 w-4" />
              PL Template (CSV)
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={getCITemplateUrl()} download="commercial-invoice-template.csv">
              <Download className="mr-2 h-4 w-4" />
              CI Template (CSV)
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload documents</CardTitle>
          <CardDescription>PL (CSV), CI (CSV), COO (PDF). File type and size limits apply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['pl', 'ci', 'coo'] as const).map((type) => (
            <UploadDropzone
              key={type}
              type={type as UploadFileType}
              value={files[type]}
              onChange={(file) => setFiles((prev) => ({ ...prev, [type]: file }))}
              disabled={uploadProgress}
            />
          ))}
          <Button
            onClick={handleSubmit}
            disabled={!hasAny || uploadProgress}
          >
            {uploadProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
