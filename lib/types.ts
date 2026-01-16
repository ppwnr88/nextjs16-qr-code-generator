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
   *
   * NOTE: When using an icon overlay, the server should force this to "H"
   * to preserve scannability.
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';

  /**
   * Optional center icon overlay configuration.
   * If omitted, QR generation behaves as before (no icon).
   *
   * The server should:
   * - Force errorCorrectionLevel "H"
   * - Add white padding behind the icon
   * - Keep the icon within a safe area (default ~20–25% of QR size)
   */
  icon?: {
    /**
     * Remote image URL (https://...) to fetch server-side.
     * Mutually exclusive with `base64`.
     */
    url?: string;

    /**
     * Base64-encoded image input. Supports:
     * - raw base64 (no prefix), or
     * - full data URL (e.g. data:image/png;base64,...)
     * Mutually exclusive with `url`.
     */
    base64?: string;

    /**
     * Icon size relative to QR size (0–1). Default: ~0.22.
     * Example: 0.25 means icon is 25% of QR width/height.
     */
    scale?: number;

    /**
     * White padding around the icon, relative to QR size (0–1).
     * Example: 0.03 means pad is ~3% of QR size.
     * Server may clamp to safe range.
     */
    paddingScale?: number;
  };
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