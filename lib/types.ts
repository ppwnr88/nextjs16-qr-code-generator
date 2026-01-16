/**
 * Shared API contract types.
 *
 * This file is safe to import from both server and client components.
 * Keep it free of Node-only imports.
 */

/**
 * Sizes exposed by the UI. Keep in sync with server validation.
 */
export const QR_SIZES = [256, 512, 1024] as const;

export type QrSize = (typeof QR_SIZES)[number];

export type QrFormat = 'png';

/**
 * POST /api/qr request body
 */
export type QrGenerateRequest = {
  /**
   * The text to encode (URL or plain text).
   */
  text: string;

  /**
   * Output image size in pixels (width/height).
   * If omitted, the server will use its default.
   */
  size?: number;

  /**
   * Reserved for future extension. Today we only support PNG.
   */
  format?: QrFormat;

  /**
   * Optional error correction level.
   * Kept as string union to avoid importing qrcode types in shared code.
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
};

/**
 * Successful response for POST /api/qr.
 * Uses a data URL so the client can preview and download immediately.
 */
export type QrGenerateSuccess = {
  ok: true;

  /**
   * A PNG data URL:
   *   data:image/png;base64,....
   */
  dataUrl: string;

  /**
   * Echoed back (normalized) values used to generate the QR.
   */
  meta: {
    size: number;
    format: QrFormat;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  };
};

/**
 * Error response for POST /api/qr.
 */
export type QrGenerateError = {
  ok: false;
  error: {
    code:
      | 'BAD_REQUEST'
      | 'EMPTY_INPUT'
      | 'INPUT_TOO_LONG'
      | 'INVALID_SIZE'
      | 'UNSUPPORTED_FORMAT'
      | 'INTERNAL_ERROR';
    message: string;

    /**
     * Optional per-field validation issues.
     */
    details?: Record<string, string>;
  };
};

export type QrGenerateResponse = QrGenerateSuccess | QrGenerateError;

/**
 * Small guard/helpers to validate unknown JSON payloads without adding deps.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isQrGenerateRequest(value: unknown): value is QrGenerateRequest {
  if (!isRecord(value)) return false;

  if (typeof value.text !== 'string') return false;

  if (value.size !== undefined && typeof value.size !== 'number') return false;

  if (
    value.format !== undefined &&
    value.format !== 'png'
  )
    return false;

  if (
    value.errorCorrectionLevel !== undefined &&
    value.errorCorrectionLevel !== 'L' &&
    value.errorCorrectionLevel !== 'M' &&
    value.errorCorrectionLevel !== 'Q' &&
    value.errorCorrectionLevel !== 'H'
  ) {
    return false;
  }

  return true;
}