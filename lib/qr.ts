import QRCode from 'qrcode';
import sharp from 'sharp';

export type QrSize = 256 | 512 | 1024;

export type GenerateQrOptions = {
  /**
   * PNG size in pixels (width & height).
   * Keep this aligned with the UI options and API validation.
   */
  size?: QrSize;

  /**
   * Error correction level.
   * Higher levels are more resilient but can make QR denser.
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Margin around the QR modules (in "modules", not pixels).
   */
  margin?: number;
};

export type GenerateQrResult = {
  /** `data:image/png;base64,...` suitable for <img src="..."> */
  dataUrl: string;
  /** Raw PNG bytes (useful for streaming responses) */
  pngBuffer: Buffer;
  /** Final size (pixels) used */
  size: number;
};

export type QrIconOverlayInput = {
  /**
   * Remote icon image URL. Must be fetched server-side by the API route.
   * (This module provides helpers; the API route decides what to allow.)
   */
  url?: string;

  /**
   * Base64 string or data URL (data:image/...;base64,....).
   */
  base64?: string;

  /**
   * Icon size relative to QR size (0–1). Default ~0.22 (22%).
   * The server should clamp to a safe range to preserve scannability.
   */
  scale?: number;

  /**
   * White padding around the icon relative to QR size (0–1). Default ~0.03 (3%).
   * The server should clamp to a safe range.
   */
  paddingScale?: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isProbablyDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function decodeBase64OrDataUrl(input: string): Buffer {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Icon base64 must not be empty.');

  if (isProbablyDataUrl(trimmed)) {
    const comma = trimmed.indexOf(',');
    if (comma === -1) throw new Error('Invalid icon data URL.');
    const b64 = trimmed.slice(comma + 1);
    return Buffer.from(b64, 'base64');
  }

  return Buffer.from(trimmed, 'base64');
}

async function loadIconImageBuffer(input: QrIconOverlayInput): Promise<Buffer | null> {
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  const base64 = typeof input.base64 === 'string' ? input.base64.trim() : '';

  if (!url && !base64) return null;
  if (url && base64) throw new Error('Provide either icon.url or icon.base64, not both.');

  if (base64) return decodeBase64OrDataUrl(base64);

  // Node.js fetch is available in Next.js runtime; keep this server-side only.
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid icon URL.');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Icon URL must be http(s).');
  }

  const res = await fetch(parsed.toString(), {
    method: 'GET',
    // Keep it simple; API route can enforce stricter allowlists if desired.
    headers: { Accept: 'image/*' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch icon (HTTP ${res.status}).`);
  }

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

/**
 * Convenience helper for API routes that only need a data URL.
 * Server-side only.
 */
export async function generateQrPngDataUrl(
  text: string,
  size?: QrSize,
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
): Promise<string> {
  // With `exactOptionalPropertyTypes`, avoid passing `{ size: undefined }`.
  const options: GenerateQrOptions = { errorCorrectionLevel };
  if (size !== undefined) options.size = size;

  const { dataUrl } = await generateQrPng(text, options);
  return dataUrl;
}

/**
 * Generates a QR code and optionally overlays a center icon.
 *
 * IMPORTANT:
 * - This runs server-side only.
 * - This does NOT rewrite the core QR generation logic (`generateQrPng` remains the source of truth).
 * - When an icon is used, error correction is forced to "H" to preserve scannability.
 * - A white padded background is placed behind the icon.
 */
export async function generateQrPngWithIcon(
  text: string,
  options: GenerateQrOptions = {},
  icon?: QrIconOverlayInput,
): Promise<GenerateQrResult> {
  // No icon: behave exactly like before.
  if (!icon || (!icon.url && !icon.base64)) {
    return generateQrPng(text, options);
  }

  // Force best error correction for overlays.
  const forcedOptions: GenerateQrOptions = {
    ...options,
    errorCorrectionLevel: 'H',
  };

  const base = await generateQrPng(text, forcedOptions);

  const iconBuffer = await loadIconImageBuffer(icon);
  if (!iconBuffer) return base;

  // Compute icon and padding sizes relative to QR size.
  const scale = clamp(typeof icon.scale === 'number' ? icon.scale : 0.22, 0.10, 0.35);
  const paddingScale = clamp(
    typeof icon.paddingScale === 'number' ? icon.paddingScale : 0.03,
    0.00,
    0.08,
  );

  const qrSize = base.size;
  const iconSize = Math.max(1, Math.round(qrSize * scale));
  const pad = Math.max(0, Math.round(qrSize * paddingScale));
  const bgSize = iconSize + pad * 2;

  // Prepare icon: resize to a square that fits within iconSize.
  // `contain` preserves aspect ratio with transparent fill where needed.
  const iconPng = await sharp(iconBuffer)
    .rotate()
    .resize(iconSize, iconSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Create white background (padding) behind icon to ensure readability/scannability.
  const bgPng = await sharp({
    create: {
      width: bgSize,
      height: bgSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  // Composite icon onto white background, centered.
  const iconWithBg = await sharp(bgPng)
    .composite([{ input: iconPng, left: pad, top: pad }])
    .png()
    .toBuffer();

  // Composite padded icon onto QR code, centered.
  const left = Math.round((qrSize - bgSize) / 2);
  const top = Math.round((qrSize - bgSize) / 2);

  const finalPngBuffer = await sharp(base.pngBuffer)
    .composite([{ input: iconWithBg, left, top }])
    .png()
    .toBuffer();

  const finalDataUrl = `data:image/png;base64,${finalPngBuffer.toString('base64')}`;

  return {
    dataUrl: finalDataUrl,
    pngBuffer: finalPngBuffer,
    size: base.size,
  };
}

/**
 * Server-side-only helper for generating QR codes.
 *
 * Important: Do not import this from Client Components.
 * (The API route should call this and return a data URL or stream the PNG.)
 */
export async function generateQrPng(
  text: string,
  options: GenerateQrOptions = {},
): Promise<GenerateQrResult> {
  const cleaned = typeof text === 'string' ? text.trim() : '';
  if (!cleaned) {
    throw new Error('QR text must not be empty.');
  }

  const size =
    options.size ?? (parseInt(process.env.QR_DEFAULT_SIZE ?? '512', 10) as QrSize);

  const maxSize = parseInt(process.env.QR_MAX_SIZE ?? '1024', 10);
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('Invalid QR size.');
  }
  if (Number.isFinite(maxSize) && size > maxSize) {
    throw new Error(`QR size too large. Maximum allowed is ${maxSize}px.`);
  }

  const errorCorrectionLevel = options.errorCorrectionLevel ?? 'M';
  const margin = options.margin ?? 2;

  // Render PNG (Buffer) for efficient server responses.
  const pngBuffer = await QRCode.toBuffer(cleaned, {
    type: 'png',
    width: size,
    errorCorrectionLevel,
    margin,
    // Use sensible default colors (black on white).
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  // Also provide a data URL for easy preview rendering.
  // Using the buffer ensures the data URL matches the PNG bytes exactly.
  const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  return { dataUrl, pngBuffer, size };
}