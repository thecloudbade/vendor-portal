import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatFileSize } from './format';

describe('formatDate', () => {
  it('formats a date string', () => {
    expect(formatDate('2025-02-01')).toMatch(/2025/);
    expect(formatDate('2025-02-01')).not.toBe('—');
  });
  it('returns — for null/undefined', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formats a date string with time', () => {
    expect(formatDateTime('2025-02-01T12:00:00Z')).toMatch(/Feb.*2025/);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });
});
