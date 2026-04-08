import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createVendor, inviteVendorUser } from '../api/org.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { formatDateTime } from '@/modules/common/utils/format';
import { emailSchema } from '@/modules/common/utils/validators';
import { Loader2, PlusCircle, Send } from 'lucide-react';

const createSchema = z.object({
  vendorCode: z.string().min(1, 'Vendor code required'),
  vendorName: z.string().min(1, 'Vendor name required'),
  authorizedEmails: z.string().min(1, 'At least one email'),
});

const inviteSchema = z.object({
  email: emailSchema,
});

type CreateValues = z.infer<typeof createSchema>;
type InviteValues = z.infer<typeof inviteSchema>;

interface VendorInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string | null;
  mode: 'create' | 'invite';
  onSuccess?: () => void;
}

export function VendorInviteDialog({
  open,
  onOpenChange,
  vendorId,
  mode,
  onSuccess,
}: VendorInviteDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (payload: { vendorCode: string; vendorName: string; authorizedEmails: string[] }) =>
      createVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      toast({ title: 'Vendor created' });
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string }) => inviteVendorUser(vendorId!, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['org', 'vendor', vendorId, 'users'] });
      const expires =
        result.expiresAt && result.expiresAt.trim() !== ''
          ? formatDateTime(result.expiresAt)
          : null;
      toast({
        title: 'Invite sent',
        description: expires
          ? `Invitation expires ${expires}. They’ll receive an email with next steps.`
          : 'Vendor user will receive an email with next steps.',
      });
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { vendorCode: '', vendorName: '', authorizedEmails: '' },
  });

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const onCreate = (data: CreateValues) => {
    const emails = data.authorizedEmails
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    createMutation.mutate({
      vendorCode: data.vendorCode.trim(),
      vendorName: data.vendorName.trim(),
      authorizedEmails: emails,
    });
  };

  const onInvite = (data: InviteValues) => {
    inviteMutation.mutate({ email: data.email });
  };

  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create vendor</DialogTitle>
            <DialogDescription>POST /vendors — vendor code, name, authorized emails.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div>
              <Label htmlFor="vendorCode">Vendor code</Label>
              <Input id="vendorCode" {...createForm.register('vendorCode')} className="mt-1" placeholder="V001" />
              {createForm.formState.errors.vendorCode && (
                <p className="text-sm text-destructive mt-1">{createForm.formState.errors.vendorCode.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="vendorName">Vendor name</Label>
              <Input id="vendorName" {...createForm.register('vendorName')} className="mt-1" />
              {createForm.formState.errors.vendorName && (
                <p className="text-sm text-destructive mt-1">{createForm.formState.errors.vendorName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="authorizedEmails">Authorized emails (comma-separated)</Label>
              <Input
                id="authorizedEmails"
                type="text"
                {...createForm.register('authorizedEmails')}
                className="mt-1"
                placeholder="vendor@example.com"
              />
              {createForm.formState.errors.authorizedEmails && (
                <p className="text-sm text-destructive mt-1">
                  {createForm.formState.errors.authorizedEmails.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="h-4 w-4" />
                )}
                Create vendor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite vendor user</DialogTitle>
          <DialogDescription>POST /vendors/:id/invite — email only.</DialogDescription>
        </DialogHeader>
        <form onSubmit={inviteForm.handleSubmit(onInvite)} className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" {...inviteForm.register('email')} className="mt-1" />
            {inviteForm.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{inviteForm.formState.errors.email.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending} className="gap-2">
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
