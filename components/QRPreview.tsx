'use client';

import * as React from 'react';

type QRPreviewProps = {
  /**
   * A `data:image/png;base64,...` URL returned by the API.
   * If null/undefined/empty, the preview will show an empty state.
   */
  dataUrl?: string | null;

  /**
   * Used as the default downloaded filename (without extension).
   */
  filenameBase?: string;

  /**
   * When true, disables actions (download/copy) and shows loading affordances.
   */
  isLoading?: boolean;

  /**
   * Optional error message to render under the card.
   */
  errorMessage?: string | null;

  /**
   * Optional size (px) used for the on-page preview box.
   * This does not change the QR image itself; it's just UI sizing.
   */
  previewSize?: number;
};

function sanitizeFilenameBase(input: string): string {
  const trimmed = input.trim() || 'qr-code';
  // Keep safe characters for most filesystems.
  return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  if (!header || !base64) {
    throw new Error('Invalid data URL');
  }

  const mimeMatch = header.match(/data:([^;]+);base64/);
  const mime = mimeMatch?.[1] ?? 'image/png';

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mime });
}

async function copyPngToClipboard(dataUrl: string): Promise<void> {
  const blob = dataUrlToBlob(dataUrl);

  // ClipboardItem is not available on all browsers. We guard and provide a fallback elsewhere.
  const ClipboardItemCtor = (globalThis as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  if (!ClipboardItemCtor || !navigator.clipboard?.write) {
    throw new Error('Clipboard image copy is not supported in this browser.');
  }

  await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard is not available in this browser.');
  }
  await navigator.clipboard.writeText(text);
}

export default function QRPreview(props: QRPreviewProps) {
  const {
    dataUrl,
    filenameBase = 'qr-code',
    isLoading = false,
    errorMessage,
    previewSize = 320,
  } = props;

  const hasQr = Boolean(dataUrl);

  const [status, setStatus] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'info' | 'success' | 'error'>('info');

  const safeBase = React.useMemo(() => sanitizeFilenameBase(filenameBase), [filenameBase]);

  const onDownload = React.useCallback(() => {
    if (!dataUrl) return;

    // Use an anchor download to avoid filesystem usage.
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${safeBase}.png`;
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setStatusTone('success');
    setStatus('Downloaded PNG.');
    window.setTimeout(() => setStatus(null), 2500);
  }, [dataUrl, safeBase]);

  const onCopyImage = React.useCallback(async () => {
    if (!dataUrl) return;

    try {
      await copyPngToClipboard(dataUrl);
      setStatusTone('success');
      setStatus('Copied image to clipboard.');
      window.setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      // Fallback: copy the data URL so the user can paste it somewhere.
      try {
        await copyTextToClipboard(dataUrl);
        setStatusTone('info');
        setStatus('Image copy not supported here — copied data URL instead.');
        window.setTimeout(() => setStatus(null), 3500);
      } catch {
        setStatusTone('error');
        setStatus(e instanceof Error ? e.message : 'Failed to copy.');
        window.setTimeout(() => setStatus(null), 3500);
      }
    }
  }, [dataUrl]);

  const onCopyDataUrl = React.useCallback(async () => {
    if (!dataUrl) return;

    try {
      await copyTextToClipboard(dataUrl);
      setStatusTone('success');
      setStatus('Copied data URL.');
      window.setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatusTone('error');
      setStatus(e instanceof Error ? e.message : 'Failed to copy.');
      window.setTimeout(() => setStatus(null), 3500);
    }
  }, [dataUrl]);

  return (
    <section className="w-full">
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-soft">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Preview</h2>
            <p className="text-sm text-muted-foreground">
              {hasQr ? 'Your generated QR code is ready.' : 'Generate a QR code to preview it here.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownload}
              disabled={!hasQr || isLoading}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Download PNG
            </button>

            <button
              type="button"
              onClick={onCopyImage}
              disabled={!hasQr || isLoading}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              title="Copies the PNG image to clipboard (supported browsers only)."
            >
              Copy Image
            </button>

            <button
              type="button"
              onClick={onCopyDataUrl}
              disabled={!hasQr || isLoading}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              title="Copies the data URL (base64) to clipboard."
            >
              Copy Data URL
            </button>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="flex w-full flex-col items-center justify-center gap-3">
            <div
              className="grid place-items-center rounded-lg border border-border bg-background"
              style={{ width: previewSize, height: previewSize, maxWidth: '100%' }}
            >
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Generating…</p>
                </div>
              ) : hasQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dataUrl ?? undefined}
                  alt="Generated QR code"
                  className="h-full w-full rounded-lg object-contain p-3"
                />
              ) : (
                <p className="px-6 text-center text-sm text-muted-foreground">
                  No QR generated yet.
                </p>
              )}
            </div>

            {(status || errorMessage) && (
              <div className="w-full max-w-xl">
                {errorMessage ? (
                  <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {errorMessage}
                  </p>
                ) : status ? (
                  <p
                    className={[
                      'rounded-md border px-3 py-2 text-sm',
                      statusTone === 'success' ? 'border-border bg-muted text-foreground' : '',
                      statusTone === 'info' ? 'border-border bg-muted text-foreground' : '',
                      statusTone === 'error'
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : '',
                    ].join(' ')}
                    role="status"
                    aria-live="polite"
                  >
                    {status}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}