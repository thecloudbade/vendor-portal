import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();

export const otpSchema = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must be 6 digits');

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_PL_CI_TYPES = ['text/csv', 'application/csv', 'text/plain'];
export const ALLOWED_COO_TYPES = ['application/pdf'];

export const fileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size <= MAX_FILE_SIZE, `File must be under ${MAX_FILE_SIZE / 1024 / 1024} MB`),
});

export function validateFileType(
  file: File,
  allowedTypes: string[],
  allowedExtensions: string[]
): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!allowedExtensions.includes(ext)) return false;
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some((t) => file.type === t || file.type.startsWith(t.split('/')[0] + '/'));
}
