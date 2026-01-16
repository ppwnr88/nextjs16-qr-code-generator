import { NextResponse } from 'next/server';
import { generateQrPng } from '@/lib/qr';
import sharp from 'sharp';

export const runtime = 'nodejs';

type QrRequestBody = {
  text?: unknown;
  size?: unknown;

  // Optional center icon overlay (URL or base64)
  icon?: {
    url?: unknown;
    base64?: unknown;
    scale?: unknown;
    paddingScale?: unknown;
  };
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

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function getEnvInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function stripDataUrlPrefix(base64OrDataUrl: string): { base64: string; mime: string | null } {
  const trimmed = base64OrDataUrl.trim();
  if (trimmed.startsWith('data:')) {
    const match = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (match) return { mime: match[1] ?? null, base64: match[2] ?? '' };
  }
  return { mime: null, base64: trimmed };
}

async function fetchIconBufferFromUrl(url: string): Promise<Buffer> {
  // Only allow http(s) URLs
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid icon URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Icon URL must be http(s).');
  }

  const res = await fetch(parsed.toString(), {
    // Minimal fetch; rely on platform networking. Do not forward credentials.
    method: 'GET',
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch icon URL (status ${res.status}).`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.startsWith('image/')) {
    throw new Error('Icon URL did not return an image.');
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function iconInputToPngBuffer(icon: { url?: string; base64?: string }): Promise<Buffer> {
  if (icon.url) {
    const buf = await fetchIconBufferFromUrl(icon.url);
    return await sharp(buf).png().toBuffer();
  }

  if (icon.base64) {
    const { base64 } = stripDataUrlPrefix(icon.base64);
    if (!base64) throw new Error('Invalid base64 icon input.');
    const buf = Buffer.from(base64, 'base64');
    return await sharp(buf).png().toBuffer();
  }

  throw new Error('No icon input provided.');
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

    const maybeIcon = body.icon && typeof body.icon === 'object' && body.icon !== null ? body.icon : null;
    const iconUrl = maybeIcon && typeof maybeIcon.url === 'string' ? maybeIcon.url.trim() : '';
    const iconBase64 = maybeIcon && typeof maybeIcon.base64 === 'string' ? maybeIcon.base64.trim() : '';

    const wantsIcon = Boolean(iconUrl || iconBase64);

    // Icon sizing defaults: ~22% for icon, paddingScale currently ignored (no white padding)
    const requestedScale = parseNumber(maybeIcon?.scale);
    const iconScale = clamp(requestedScale ?? 0.22, 0.1, 0.3);

    // Generate base QR (buffer + data url) server-side.
    // Preserve scannability with icon overlay:
    // - Force error correction level "H"
    const qr = await generateQrPng(text, {
      size,
      errorCorrectionLevel: wantsIcon ? 'H' : 'M',
    });

    // Backward compatible: no icon => original JSON response
    if (!wantsIcon) {
      return NextResponse.json(
        { dataUrl: qr.dataUrl, size },
        {
          status: 200,
          headers: {
            // Prevent caching across users; the QR content is user-provided.
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Resolve icon to PNG buffer
    const iconInput: { url?: string; base64?: string } = {};
    if (iconUrl) iconInput.url = iconUrl;
    if (iconBase64) iconInput.base64 = iconBase64;

    const iconPng = await iconInputToPngBuffer(iconInput);

    // Prepare sizes
    const iconPx = Math.max(1, Math.round(size * iconScale));
    const topLeft = Math.floor((size - iconPx) / 2);

    // Resize icon to fit within iconPx square (preserve aspect)
    const resizedIcon = await sharp(iconPng)
      .resize(iconPx, iconPx, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    // Composite icon directly onto QR (no white padding/background)
    const composedPng = await sharp(qr.pngBuffer)
      .composite([
        {
          input: resizedIcon,
          top: topLeft,
          left: topLeft,
        },
      ])
      .png()
      .toBuffer();

    const dataUrl = `data:image/png;base64,${composedPng.toString('base64')}`;

    return NextResponse.json(
      { dataUrl, size },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request. Ensure you send valid JSON.';
    return NextResponse.json(
      { error: message },
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
      body: {
        text: 'string (required)',
        size: '256 | 512 | 1024 (optional)',
        icon: {
          url: 'string (optional, http/https)',
          base64: 'string (optional, data URL or raw base64)',
          scale: 'number (optional, 0..1, default ~0.22)',
          paddingScale: 'number (optional, 0..1, ignored when no padding is used)',
        },
      },
      note: 'When icon is provided, server forces errorCorrectionLevel="H". White padding/background is not applied.',
    },
    { status: 200 }
  );
}