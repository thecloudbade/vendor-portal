import type { PoUploadListEntry } from '@/modules/common/utils/mapPoUploadFromApi';
import type { NetsuiteDocumentPushSummary } from '@/modules/common/types/netsuiteDocumentPush';
import type { PortalPOLineItem } from '@/modules/common/utils/portalPoLineItem';

export type { NetsuiteDocumentPushSummary };
export type VendorPoUploadEntry = PoUploadListEntry;

export interface POListItem {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  createdAt: string;
  updatedAt?: string;
  /** NetSuite internal id when stored on the PO (informational; vendor UI reads lines from Mongo only). */
  netsuiteTransId?: string;
  requiredDocs?: string[];
}

/** Qty rules for vendor upload UI (from GET /vendor/pos/:id). */
export interface VendorUploadRules {
  packingListQtyTolerancePct: number;
  commercialInvoiceQtyTolerancePct: number;
  /** Default true when omitted. */
  blockSubmitOnQtyToleranceExceeded: boolean;
  /** When false, no new submissions after existing uploads (until org reset in portal / NetSuite). */
  allowReupload?: boolean;
  /** Max submissions per PO when reuploads are allowed; default 3 when omitted. */
  maxReuploadAttempts?: number;
}

export interface PODetail {
  id: string;
  poNumber: string;
  status: string;
  vendorId: string;
  vendorName?: string;
  shipTo?: string;
  summary?: Record<string, unknown>;
  netsuiteFields?: Record<string, unknown>;
  /** Buyer-configured display names for NetSuite line field ids on this org. */
  netsuiteLineFieldLabels?: Record<string, string>;
  items: POItem[];
  requiredDocs: string[];
  /** Present when API includes org upload validation rules on PO detail. */
  uploadRules?: VendorUploadRules;
  /** Submissions on this PO (same shape as org PO detail when API includes `uploads`). */
  uploads?: VendorPoUploadEntry[];
  createdAt: string;
  updatedAt?: string;
  netsuiteTransId?: string;
  /**
   * When false, vendor cannot use the document upload flow until an org admin resets the PO in the portal.
   * When true/omitted, use `getVendorDocumentUploadAccess` with `uploadRules` and `uploads`.
   */
  documentUploadsAllowed?: boolean;
}

/** Line items from GET /vendor/pos/:id (Mongo / synced from NetSuite). */
export type POItem = PortalPOLineItem;

export interface UploadRecord {
  id: string;
  poId: string;
  poNumber?: string;
  status: 'received' | 'validated' | 'accepted' | 'rejected';
  uploadedAt: string;
  uploadedBy?: string;
  files?: { name: string; type: string; status?: string }[];
  validationErrors?: string[];
}

/** Line-level qty mismatch from PL/CI validation (API). */
export interface QtyMismatchLine {
  lineNo: number;
  sku?: string;
  orderedQty: number;
  packedQty?: number;
  shippedQty?: number;
  tolerancePct?: number;
  deviationPct?: number | null;
  /** Set when merging validate-only results for multiple doc types. */
  docType?: 'pl' | 'ci' | 'asn';
}

/** `data.debug` from POST validate-only when `validationDebug=true` (PL: includes `plCsvUpload`). */
export type VendorUploadValidationDebug = Record<string, unknown>;

export interface UploadValidationResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  uploadId?: string;
  id?: string;
  /** Present after successful PL/CI save when PO is linked to NetSuite (async push). */
  netsuiteDocumentPush?: NetsuiteDocumentPushSummary;
  mismatches?: QtyMismatchLine[];
  /**
   * When validate-only ran with `validationDebug`, one entry per doc type validated in the batch.
   * Use `debug.plCsvUpload` for parsed grid + detected rows (PL CSV + active template).
   */
  debugByDoc?: Partial<Record<'pl' | 'ci' | 'coo' | 'asn', VendorUploadValidationDebug>>;
}
