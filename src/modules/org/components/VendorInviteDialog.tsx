import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { emailSchema } from '@/modules/common/utils/validators';

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email().optional().or(z.literal('')),
});

const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'operator']).optional(),
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
  const [role, setRole] = useState<string>('operator');

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; email?: string }) => createVendor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      toast({ title: 'Vendor created', description: 'Invite sent by email if provided.' });
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (payload: { email: string; role?: string }) =>
      inviteVendorUser(vendorId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['org', 'vendor', vendorId] });
      toast({ title: 'Invite sent', description: 'Vendor user will receive an email.' });
      onSuccess?.();
    },
    onError: (e: Error) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '' },
  });

  const inviteForm = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'operator' },
  });

  const onCreate = (data: CreateValues) => {
    createMutation.mutate({
      name: data.name,
      email: data.email || undefined,
    });
  };

  const onInvite = (data: InviteValues) => {
    inviteMutation.mutate({ email: data.email, role: data.role ?? role });
  };

  if (mode === 'create') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create vendor</DialogTitle>
            <DialogDescription>Create a vendor and optionally send an invite by email.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
            <div>
              <Label htmlFor="name">Vendor name</Label>
              <Input id="name" {...createForm.register('name')} className="mt-1" />
              {createForm.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Invite email (optional)</Label>
              <Input id="email" type="email" {...createForm.register('email')} className="mt-1" />
              {createForm.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
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
          <DialogDescription>Send an invite by email. User will sign up with OTP.</DialogDescription>
        </DialogHeader>
        <form onSubmit={inviteForm.handleSubmit(onInvite)} className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" {...inviteForm.register('email')} className="mt-1" />
            {inviteForm.formState.errors.email && (
              <p className="text-sm text-destructive mt-1">{inviteForm.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Vendor Admin</SelectItem>
                <SelectItem value="operator">Vendor Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
