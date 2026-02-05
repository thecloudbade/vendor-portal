import { useRef, useCallback, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

const DIGITS = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  'data-testid'?: string;
}

export function OtpInput({
  value,
  onChange,
  disabled,
  error,
  'data-testid': testId = 'otp-input',
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setValue = useCallback(
    (newVal: string) => {
      const digits = newVal.replace(/\D/g, '').slice(0, DIGITS);
      onChange(digits);
    },
    [onChange]
  );

  const handleChange = (index: number, digit: string) => {
    const num = digit.replace(/\D/g, '').slice(-1);
    const arr = value.split('');
    arr[index] = num;
    const next = arr.join('');
    setValue(next);
    if (num && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGITS);
    setValue(pasted);
    const nextIdx = Math.min(pasted.length, DIGITS - 1);
    inputRefs.current[nextIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" data-testid={testId}>
      {Array.from({ length: DIGITS }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          disabled={disabled}
          className={cn(
            'h-12 w-11 rounded-xl border-2 bg-muted/30 text-center text-lg font-semibold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            error
              ? 'border-destructive focus:ring-destructive focus:border-destructive'
              : 'border-input focus:ring-ring focus:border-primary',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          aria-label={`Digit ${i + 1} of ${DIGITS}`}
        />
      ))}
    </div>
  );
}
