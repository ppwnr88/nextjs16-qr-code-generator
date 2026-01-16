'use client';

import * as React from 'react';

export type QrSize = 256 | 512 | 1024;

export type QRFormValues = {
  text: string;
  size: QrSize;
};

type QRFormProps = {
  /**
   * Called when the form is submitted and passes basic client validation.
   * The parent can trigger the API call and manage the generated QR state.
   */
  onGenerate: (values: QRFormValues) => Promise<void> | void;

  /**
   * Optional preset values (e.g., restore from history/localStorage).
   */
  initialValues?: Partial<QRFormValues>;

  /**
   * Disable inputs/buttons externally (e.g., while generating).
   * If omitted, the component manages its own loading state.
   */
  disabled?: boolean;

  /**
   * Optional error message from parent (e.g., API error).
   * It will be displayed under the form.
   */
  externalError?: string | null;

  /**
   * Called whenever input values change (useful for history/localStorage).
   */
  onChange?: (values: QRFormValues) => void;
};

const SIZE_OPTIONS: readonly QrSize[] = [256, 512, 1024] as const;

function isValidSize(value: unknown): value is QrSize {
  return value === 256 || value === 512 || value === 1024;
}

function normalizeText(raw: string): string {
  // Keep it simple: trim whitespace but preserve internal spacing/newlines.
  return raw.trim();
}

function validate(values: QRFormValues): { ok: true } | { ok: false; message: string } {
  const text = normalizeText(values.text);

  if (!text) return { ok: false, message: 'Please enter some text or a URL.' };

  // Basic "invalid input" protection: reject extremely large input to avoid accidental abuse.
  // (Server should also validate.)
  if (text.length > 4096) {
    return { ok: false, message: 'Input is too long. Please keep it under 4096 characters.' };
  }

  if (!isValidSize(values.size)) return { ok: false, message: 'Please select a valid QR size.' };

  return { ok: true };
}

export default function QRForm(props: QRFormProps) {
  const {
    onGenerate,
    initialValues,
    disabled: disabledProp,
    externalError,
    onChange,
  } = props;

  const [text, setText] = React.useState<string>(initialValues?.text ?? '');
  const [size, setSize] = React.useState<QrSize>(
    isValidSize(initialValues?.size) ? initialValues.size : 512
  );

  const [isSubmittingInternal, setIsSubmittingInternal] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);

  const disabled = disabledProp ?? isSubmittingInternal;

  React.useEffect(() => {
    onChange?.({ text, size });
  }, [text, size, onChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Reset local error on submit attempt
    setClientError(null);

    const values: QRFormValues = { text, size };
    const result = validate(values);
    if (!result.ok) {
      setClientError(result.message);
      return;
    }

    const normalized: QRFormValues = { text: normalizeText(values.text), size: values.size };

    try {
      setIsSubmittingInternal(true);
      await onGenerate(normalized);
    } catch (err) {
      // Parent may also pass externalError, but this covers uncaught errors.
      const message = err instanceof Error ? err.message : 'Failed to generate QR code.';
      setClientError(message);
    } finally {
      setIsSubmittingInternal(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      <div className="space-y-2">
        <label htmlFor="qr-text" className="block text-sm font-medium text-foreground">
          Text or URL
        </label>

        <textarea
          id="qr-text"
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com or any text…"
          rows={4}
          disabled={disabled}
          aria-invalid={Boolean(clientError || externalError)}
          className={[
            'w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60',
          ].join(' ')}
        />

        <p className="text-xs text-muted-foreground">
          Tip: URLs work best with fully qualified links (e.g. <span className="font-mono">https://…</span>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
        <div className="space-y-2">
          <label htmlFor="qr-size" className="block text-sm font-medium text-foreground">
            Size
          </label>

          <select
            id="qr-size"
            name="size"
            value={size}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isValidSize(next)) setSize(next);
            }}
            disabled={disabled}
            className={[
              'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-60',
            ].join(' ')}
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt} × {opt}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={disabled}
          className={[
            'inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft',
            'hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-60',
          ].join(' ')}
        >
          {disabled ? 'Generating…' : 'Generate QR'}
        </button>
      </div>

      {(clientError || externalError) && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {clientError ?? externalError}
        </div>
      )}
    </form>
  );
}