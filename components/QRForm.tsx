'use client';

import * as React from 'react';

export type QrSize = 256 | 512 | 1024;

export type QRFormIcon = {
  /**
   * A data URL for the icon image:
   *   data:image/png;base64,...
   * or data:image/jpeg;base64,...
   */
  base64DataUrl: string;

  /**
   * Icon size relative to QR size (0..1). Default ~0.22.
   */
  scale: number;

  /**
   * Reserved for future use. (Server currently does NOT apply white padding.)
   */
  paddingScale: number;
};

export type QRFormValues = {
  text: string;
  size: QrSize;

  /**
   * Optional center icon overlay settings.
   * If provided, the API will compose the icon into the QR code.
   */
  icon?: QRFormIcon | null;
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read icon file.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        reject(new Error('Icon file must be an image.'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
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

  if (values.icon) {
    if (!values.icon.base64DataUrl.startsWith('data:image/')) {
      return { ok: false, message: 'Icon must be an image.' };
    }
    if (!Number.isFinite(values.icon.scale) || values.icon.scale <= 0 || values.icon.scale >= 1) {
      return { ok: false, message: 'Icon size must be between 0 and 1.' };
    }
    if (
      !Number.isFinite(values.icon.paddingScale) ||
      values.icon.paddingScale < 0 ||
      values.icon.paddingScale >= 1
    ) {
      return { ok: false, message: 'Icon padding must be between 0 and 1.' };
    }
  }

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

  const [useIcon, setUseIcon] = React.useState<boolean>(Boolean(initialValues?.icon));
  const [iconDataUrl, setIconDataUrl] = React.useState<string>(
    initialValues?.icon && typeof initialValues.icon === 'object' && 'base64DataUrl' in initialValues.icon
      ? (initialValues.icon as QRFormIcon).base64DataUrl
      : ''
  );
  const [iconScale, setIconScale] = React.useState<number>(
    initialValues?.icon && typeof initialValues.icon === 'object' && 'scale' in initialValues.icon
      ? clamp(Number((initialValues.icon as QRFormIcon).scale) || 0.22, 0.1, 0.3)
      : 0.22
  );
  const [iconPaddingScale] = React.useState<number>(
    initialValues?.icon && typeof initialValues.icon === 'object' && 'paddingScale' in initialValues.icon
      ? clamp(Number((initialValues.icon as QRFormIcon).paddingScale) || 0.035, 0, 0.08)
      : 0.035
  );

  const [isSubmittingInternal, setIsSubmittingInternal] = React.useState(false);
  const [clientError, setClientError] = React.useState<string | null>(null);

  const disabled = disabledProp ?? isSubmittingInternal;

  const valuesForChange = React.useMemo<QRFormValues>(() => {
    const icon =
      useIcon && iconDataUrl
        ? {
            base64DataUrl: iconDataUrl,
            scale: iconScale,
            paddingScale: iconPaddingScale,
          }
        : null;

    return { text, size, icon };
  }, [text, size, useIcon, iconDataUrl, iconScale, iconPaddingScale]);

  React.useEffect(() => {
    onChange?.(valuesForChange);
  }, [valuesForChange, onChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Reset local error on submit attempt
    setClientError(null);

    const normalizedText = normalizeText(text);

    const submitValues: QRFormValues = {
      text: normalizedText,
      size,
      icon:
        useIcon && iconDataUrl
          ? {
              base64DataUrl: iconDataUrl,
              scale: iconScale,
              paddingScale: iconPaddingScale,
            }
          : null,
    };

    const result = validate(submitValues);
    if (!result.ok) {
      setClientError(result.message);
      return;
    }

    try {
      setIsSubmittingInternal(true);
      await onGenerate(submitValues);
    } catch (err) {
      // Parent may also pass externalError, but this covers uncaught errors.
      const message = err instanceof Error ? err.message : 'Failed to generate QR code.';
      setClientError(message);
    } finally {
      setIsSubmittingInternal(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5">
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

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Center Icon</p>
            <p className="text-xs text-muted-foreground">
              Upload an image to place it at the center of the QR (recommended for logos).
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useIcon}
              onChange={(e) => setUseIcon(e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 rounded border-border"
            />
            Enable
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="qr-icon" className="block text-sm font-medium text-foreground">
              Upload Icon (optional)
            </label>

            <input
              id="qr-icon"
              type="file"
              accept="image/*"
              disabled={disabled || !useIcon}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  setClientError(null);
                  const dataUrl = await readFileAsDataUrl(file);
                  setIconDataUrl(dataUrl);
                } catch (err) {
                  setIconDataUrl('');
                  setClientError(err instanceof Error ? err.message : 'Failed to load icon image.');
                }
              }}
              className={[
                'block w-full text-sm',
                'file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground',
                'disabled:cursor-not-allowed disabled:opacity-60',
              ].join(' ')}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={disabled || !useIcon || !iconDataUrl}
                onClick={() => setIconDataUrl('')}
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>

              <p className="text-xs text-muted-foreground">
                PNG/SVG/JPG supported (server converts to PNG).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="block text-sm font-medium text-foreground">Icon Preview</p>
            <div className="flex items-center gap-3">
              <div className="grid h-20 w-20 place-items-center rounded-lg border border-border bg-card">
                {useIcon && iconDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconDataUrl} alt="Icon preview" className="h-16 w-16 object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">No icon</span>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="space-y-1">
                  <label htmlFor="icon-scale" className="block text-xs font-medium text-foreground">
                    Icon size ({Math.round(iconScale * 100)}%)
                  </label>
                  <input
                    id="icon-scale"
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={Math.round(iconScale * 100)}
                    disabled={disabled || !useIcon}
                    onChange={(e) => setIconScale(clamp(Number(e.target.value) / 100, 0.1, 0.3))}
                    className="w-full"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  With an icon enabled, the server uses error correction level “H” for better scanning.
                </p>
              </div>
            </div>
          </div>
        </div>
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