import { NextResponse } from 'next/server';
import { generateQrPngDataUrl } from '@/lib/qr';

export const runtime = 'nodejs';

type QrRequestBody = {
  text?: unknown;
  size?: unknown;
};

const ALLOWED_SIZES = [256, 512, 1024] as const;
type AllowedSize = (typeof ALLOWED_SIZES)[number];

function parseSize(size: unknown): AllowedSize | null {
  if (size === undefined || size === null || size === '') return null;
  if (typeof size === 'number' && Number.isFinite(size)) {
    return (ALLOWED_SIZES as readonly number[]).includes(size) ? (size as AllowedSize) : null;
  }
  if (typeof size === 'string') {
    const n = Number(size);
    if (!Number.isFinite(n)) return null;
    return (ALLOWED_SIZES as readonly number[]).includes(n) ? (n as AllowedSize) : null;
  }
  return null;
}

function getEnvInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QrRequestBody;

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return NextResponse.json(
        { error: 'Input is required. Provide non-empty "text".' },
        { status: 400 }
      );
    }

    const defaultSizeEnv = getEnvInt('QR_DEFAULT_SIZE');
    const maxSizeEnv = getEnvInt('QR_MAX_SIZE');

    const requestedSize = parseSize(body.size);
    const fallbackSize: AllowedSize =
      parseSize(defaultSizeEnv ?? undefined) ?? 512;

    const size: AllowedSize = requestedSize ?? fallbackSize;

    if (maxSizeEnv !== null && size > maxSizeEnv) {
      return NextResponse.json(
        { error: `Requested size too large. Max allowed is ${maxSizeEnv}.` },
        { status: 400 }
      );
    }

    // Defense-in-depth: avoid extremely large inputs
    const inputMaxLen = getEnvInt('QR_INPUT_MAX_LENGTH');
    if (inputMaxLen !== null && text.length > inputMaxLen) {
      return NextResponse.json(
        { error: `Input too long. Max length is ${inputMaxLen} characters.` },
        { status: 400 }
      );
    }

    const dataUrl = await generateQrPngDataUrl(text, size);

    return NextResponse.json(
      { dataUrl, size },
      {
        status: 200,
        headers: {
          // Prevent caching across users; the QR content is user-provided.
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request. Ensure you send valid JSON.' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      endpoint: '/api/qr',
      method: 'POST',
      body: { text: 'string (required)', size: '256 | 512 | 1024 (optional)' },
    },
    { status: 200 }
  );
}