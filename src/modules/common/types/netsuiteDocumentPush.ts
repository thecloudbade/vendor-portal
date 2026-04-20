/** Mirrors df-vendor `VendorSubmission.netsuiteDocumentPush` (public fields only). */
export type NetsuiteDocumentPushStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NetsuiteDocumentPushSummary {
  status: NetsuiteDocumentPushStatus;
  queuedAt?: string;
  completedAt?: string;
  message?: string;
  skipReason?: string;
  httpStatus?: number;
  /** PDF filename sent to NetSuite (when applicable). */
  sentFileName?: string;
  /** Idempotency key sent to NetSuite (VP-…). */
  netSuiteExternalId?: string;
  /** File id for the PDF bytes sent / stored (CSV/XLSX→PDF copy). */
  netSuitePdfFileId?: string;
  /** API-relative download path (same auth as other file downloads). */
  netSuitePdfDownloadPath?: string;
}
