/** Mirrors df-vendor `VendorSubmission.netsuiteDocumentPush` (public fields only). */
export type NetsuiteDocumentPushStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface NetsuiteDocumentPushSummary {
  status: NetsuiteDocumentPushStatus;
  queuedAt?: string;
  completedAt?: string;
  message?: string;
  skipReason?: string;
  httpStatus?: number;
  /** HTTP status from the optional NetSuite line-quantity POST (when run). */
  lineUpdateHttpStatus?: number;
  lineUpdateResponseSnippet?: string;
  /** PDF filename sent to NetSuite (when applicable). */
  sentFileName?: string;
  /** External id on the file entry sent to NetSuite (e.g. PLPDF-… / CIPDF-…). */
  netSuiteExternalId?: string;
  /** File id for the PDF bytes sent / stored (CSV/XLSX→PDF copy). */
  netSuitePdfFileId?: string;
  /** API-relative download path (same auth as other file downloads). */
  netSuitePdfDownloadPath?: string;
}
