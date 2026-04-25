/**
 * Whether a vendor user may open the document upload flow for a PO.
 * Honours org settings (reupload / max attempts), optional API override, and org “reset” flows.
 */
export type VendorDocumentUploadAccess = {
  allowed: boolean;
  /** Shown when allowed is false */
  reason?: string;
};

type Rules = {
  allowReupload?: boolean;
  maxReuploadAttempts?: number;
} | null;

export function getVendorDocumentUploadAccess(po: {
  uploads?: unknown[] | null;
  uploadRules?: Rules;
  /** When set by API, overrides derived rules (e.g. after org reset). */
  documentUploadsAllowed?: boolean | null;
}): VendorDocumentUploadAccess {
  if (po.documentUploadsAllowed === true) {
    return { allowed: true };
  }
  if (po.documentUploadsAllowed === false) {
    return {
      allowed: false,
      reason:
        'Document uploads are closed for this order until your buyer resets it in the portal (NetSuite packing list / invoice lines are cleared for a new submission).',
    };
  }

  const submissionCount = Array.isArray(po.uploads) ? po.uploads.length : 0;
  if (submissionCount === 0) {
    return { allowed: true };
  }

  const allowReupload = po.uploadRules?.allowReupload !== false;
  const rawMax = po.uploadRules?.maxReuploadAttempts;
  const maxAttempts =
    rawMax != null && Number.isFinite(Number(rawMax)) ? Math.max(1, Math.floor(Number(rawMax))) : 3;

  if (!allowReupload) {
    return {
      allowed: false,
      reason:
        'Your buyer has turned off reuploads. They can reset this purchase order so you can submit documents again.',
    };
  }

  if (submissionCount >= maxAttempts) {
    return {
      allowed: false,
      reason: `This order already has ${submissionCount} submission(s) (limit ${maxAttempts}). Ask your buyer to reset the order to upload again.`,
    };
  }

  return { allowed: true };
}
