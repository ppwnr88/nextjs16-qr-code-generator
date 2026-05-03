import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

const APP_NAME = 'gen-qr';
const APP_DESCRIPTION =
  'Generate a QR code from text or a URL. Serverless, Next.js App Router, and Node.js runtime route handler.';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — QR Code Generator`,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  openGraph: {
    title: `${APP_NAME} — QR Code Generator`,
    description: APP_DESCRIPTION,
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1110',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
