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
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: values.text, size: values.size }),
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
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <header className="space-y-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            QR Code Generator
          </h1>
          <p className="text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
            Enter a URL or plain text to generate a QR code server-side. Download the result as a
            PNG.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-6">
          <QRForm onGenerate={onGenerate} disabled={isLoading} externalError={errorMessage} />
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-soft sm:p-6">
          <QRPreview dataUrl={dataUrl} isLoading={isLoading} errorMessage={errorMessage} />
        </section>

        <footer className="pt-2 text-center text-xs text-muted-foreground">
          Powered by Wannarat.cc
        </footer>
      </div>
    </main>
  );
}
