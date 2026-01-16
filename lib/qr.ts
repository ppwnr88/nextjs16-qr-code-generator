import QRCode from 'qrcode';

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