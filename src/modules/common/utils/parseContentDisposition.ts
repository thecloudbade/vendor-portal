/** Parse RFC 5987 / simple `filename="..."` from Content-Disposition. */
export function parseFilenameFromContentDisposition(header: string | null): string | undefined {
  if (!header) return undefined;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"(.*)"$/, '$1'));
    } catch {
      return star[1].trim().replace(/^"(.*)"$/, '$1');
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain) return plain[1].replace(/^"(.*)"$/, '$1');
  return undefined;
}
