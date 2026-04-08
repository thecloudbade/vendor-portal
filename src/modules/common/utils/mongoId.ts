/** MongoDB ObjectId is 24 hex chars (12 bytes). */
export function isMongoObjectIdString(value: string | undefined | null): boolean {
  if (value == null || typeof value !== 'string') return false;
  return /^[a-f0-9]{24}$/i.test(value.trim());
}
