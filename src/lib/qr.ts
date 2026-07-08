export const qrTypes = ["STATIC", "DYNAMIC"] as const;
export const errorCorrectionLevels = ["L", "M", "Q", "H"] as const;

export type QrType = (typeof qrTypes)[number];
export type ErrorCorrectionLevel = (typeof errorCorrectionLevels)[number];

export type QrStyleInput = {
  foregroundColor?: string;
  backgroundColor?: string;
  margin?: number;
  size?: number;
  errorCorrectionLevel?: string;
};

export type QrPayloadLink = {
  type: string;
  slug: string;
  targetUrl: string;
};

export const defaultQrStyle = {
  foregroundColor: "#111827",
  backgroundColor: "#ffffff",
  margin: 2,
  size: 280,
  errorCorrectionLevel: "M" satisfies ErrorCorrectionLevel,
};

export function isQrType(value: string): value is QrType {
  return qrTypes.includes(value as QrType);
}

export function cleanBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function makeDynamicUrl(slug: string, baseUrl: string) {
  return `${cleanBaseUrl(baseUrl)}/r/${slug}`;
}

export function getQrPayload(link: QrPayloadLink, baseUrl: string) {
  return link.type === "DYNAMIC"
    ? makeDynamicUrl(link.slug, baseUrl)
    : link.targetUrl;
}

export function coerceQrStyle(input: QrStyleInput = {}) {
  return {
    foregroundColor: normalizeHexColor(
      input.foregroundColor,
      defaultQrStyle.foregroundColor,
    ),
    backgroundColor: normalizeHexColor(
      input.backgroundColor,
      defaultQrStyle.backgroundColor,
    ),
    margin: clampInteger(input.margin, 0, 8, defaultQrStyle.margin),
    size: clampInteger(input.size, 160, 720, defaultQrStyle.size),
    errorCorrectionLevel: coerceErrorCorrection(input.errorCorrectionLevel),
  };
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value as number)));
}

function coerceErrorCorrection(value: string | undefined) {
  return errorCorrectionLevels.includes(value as ErrorCorrectionLevel)
    ? (value as ErrorCorrectionLevel)
    : defaultQrStyle.errorCorrectionLevel;
}
