import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';

export interface PreferencesFormValues {
  requireCOO: boolean;
  allowReupload: boolean;
  maxReuploadAttempts: number;
  /** 0–100: max allowed % deviation vs PO ordered qty (packing list CSV `packedQty`). */
  packingListQtyTolerancePct: number;
  /** 0–100: max allowed % deviation vs PO ordered qty (invoice CSV `shippedQty`). */
  commercialInvoiceQtyTolerancePct: number;
  /** When true (default), vendors cannot submit PL/CI when reported qty exceeds tolerance. */
  blockSubmitOnQtyToleranceExceeded: boolean;
  mismatchRecipients: string;
  reuploadRecipients: string;
}

interface PreferencesFormProps {
  form: UseFormReturn<PreferencesFormValues>;
  onSubmit: (data: PreferencesFormValues) => void;
  isSubmitting: boolean;
}

export function PreferencesForm({ form, onSubmit, isSubmitting }: PreferencesFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Organization preferences
        </CardTitle>
        <CardDescription>Rules and notification recipients.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="requireCOO" {...form.register('requireCOO')} className="h-4 w-4" />
            <Label htmlFor="requireCOO">Require COO</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="allowReupload" {...form.register('allowReupload')} className="h-4 w-4" />
            <Label htmlFor="allowReupload">Allow reupload</Label>
          </div>
          <div>
            <Label htmlFor="maxReuploadAttempts">Max reupload attempts</Label>
            <Input
              id="maxReuploadAttempts"
              type="number"
              min={1}
              max={10}
              {...form.register('maxReuploadAttempts', { valueAsNumber: true })}
              className="mt-1"
            />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Upload quantity validation</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compares reported quantities on uploads to ordered quantities on each line. Thresholds below control what counts as a mismatch.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="packingListQtyTolerancePct">Packing list (%)</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Compares PO ordered qty to <span className="font-medium">packedQty</span> on the packing list CSV.
                </p>
                <Input
                  id="packingListQtyTolerancePct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  {...form.register('packingListQtyTolerancePct', { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="commercialInvoiceQtyTolerancePct">Commercial invoice (%)</Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Compares PO ordered qty to <span className="font-medium">shippedQty</span> (or invoice qty) on the
                  invoice CSV.
                </p>
                <Input
                  id="commercialInvoiceQtyTolerancePct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  {...form.register('commercialInvoiceQtyTolerancePct', { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2">
              <input
                type="checkbox"
                id="blockSubmitOnQtyToleranceExceeded"
                className="mt-1 h-4 w-4"
                {...form.register('blockSubmitOnQtyToleranceExceeded')}
              />
              <div>
                <Label htmlFor="blockSubmitOnQtyToleranceExceeded" className="font-medium">
                  Block vendor submit when quantities exceed tolerance
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  When enabled, vendors must correct packing list or invoice quantities before the upload is accepted.
                  When disabled, they still see warnings but may submit.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="mismatchRecipients">Mismatch alert emails (comma-separated)</Label>
            <Input
              id="mismatchRecipients"
              {...form.register('mismatchRecipients')}
              placeholder="ops@org.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reuploadRecipients">Reupload notification emails (comma-separated)</Label>
            <Input
              id="reuploadRecipients"
              {...form.register('reuploadRecipients')}
              className="mt-1"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            Save preferences
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
