import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

interface PreferencesFormProps {
  form: UseFormReturn<{
    requiredDocs?: string;
    maxSizeMb?: number;
    mismatchAlertsTo?: string;
  }>;
  onSubmit: (data: { requiredDocs?: string; maxSizeMb?: number; mismatchAlertsTo?: string }) => void;
  isSubmitting: boolean;
}

export function PreferencesForm({ form, onSubmit, isSubmitting }: PreferencesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Upload & email rules
        </CardTitle>
        <CardDescription>
          Required docs (comma-separated), max size (MB), who gets mismatch alerts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="requiredDocs">Required documents (e.g. pl, ci, coo)</Label>
            <Input
              id="requiredDocs"
              {...form.register('requiredDocs')}
              placeholder="pl, ci, coo"
              className="mt-1"
            />
            {form.formState.errors.requiredDocs && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.requiredDocs.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="maxSizeMb">Max file size (MB)</Label>
            <Input
              id="maxSizeMb"
              type="number"
              min={1}
              max={50}
              {...form.register('maxSizeMb', { valueAsNumber: true })}
              className="mt-1"
            />
            {form.formState.errors.maxSizeMb && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.maxSizeMb.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="mismatchAlertsTo">Mismatch alert emails (comma-separated)</Label>
            <Input
              id="mismatchAlertsTo"
              {...form.register('mismatchAlertsTo')}
              placeholder="ops@org.com"
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
