'use client';

import * as React from 'react';

import QRForm, { type QRFormValues } from '@/components/QRForm';
import QRPreview from '@/components/QRPreview';

type ApiResponse =
  | { dataUrl: string; size: number }
  | { error: string };

export default function Page() {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const onGenerate = React.useCallback(async (values: QRFormValues) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const body: Record<string, unknown> = { text: values.text, size: values.size };

      // Optional icon payload (backward compatible)
      if (values.icon && values.icon.base64DataUrl) {
        body.icon = {
          base64: values.icon.base64DataUrl, // API accepts data URL or raw base64
          scale: values.icon.scale,
          paddingScale: values.icon.paddingScale,
        };
      }

      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiResponse;

      if (!res.ok) {
        const message = 'error' in json ? json.error : 'Failed to generate QR code.';
        setErrorMessage(message);
        setDataUrl(null);
        return;
      }

      if (!('dataUrl' in json) || typeof json.dataUrl !== 'string') {
        setErrorMessage('Unexpected response from server.');
        setDataUrl(null);
        return;
      }

      setDataUrl(json.dataUrl);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to generate QR code.');
      setDataUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <main className="terminal-grid min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
        <section className="terminal-glow overflow-hidden rounded-lg border border-border/80 bg-card/95 backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/55 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2" aria-hidden="true">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon.svg"
                alt="gen-qr"
                className="h-5 w-5 rounded-[5px] border border-border/70 bg-background"
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">~/apps/gen-qr</p>
            <p className="hidden text-xs text-[#8be9fd] sm:block">zsh</p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-7 border-b border-border/70 p-4 sm:p-6 lg:border-b-0 lg:border-r">
              <header className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8be9fd]">
                  $ gen-qr --modern
                </p>
                <div className="space-y-3">
                  <h1 className="text-balance text-3xl font-semibold tracking-normal text-[#f8f8f2] sm:text-5xl">
                    QR Code Generator
                  </h1>
                  <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                    Generate a clean QR code from a URL or text, then download the result as PNG.
                    Add a center icon when you want it to feel more branded.
                  </p>
                </div>
              </header>

              <QRForm onGenerate={onGenerate} disabled={isLoading} externalError={errorMessage} />
            </div>

            <aside className="bg-background/35 p-4 sm:p-6">
              <QRPreview dataUrl={dataUrl} isLoading={isLoading} errorMessage={errorMessage} />
            </aside>
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground">
          Powered by Wannarat.cc
        </footer>
      </div>
    </main>
  );
}
