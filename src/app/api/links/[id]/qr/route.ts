import QRCode from "qrcode";
import type {
  QRCodeErrorCorrectionLevel,
  QRCodeToBufferOptions,
  QRCodeToStringOptions,
} from "qrcode";
import type { NextRequest } from "next/server";
import { getRequestOrigin } from "@/lib/analytics";
import { jsonError } from "@/lib/api";
import { getLinkForQr } from "@/lib/data";
import { coerceQrStyle, getQrPayload } from "@/lib/qr";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const link = await getLinkForQr(id);

  if (!link) {
    return jsonError("QR no encontrado.", 404);
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "png" ? "png" : "svg";
  const baseUrl = url.searchParams.get("baseUrl") ?? getRequestOrigin(request);
  const payload = getQrPayload(link, baseUrl);
  const style = coerceQrStyle(link.style ?? undefined);
  const fileName = `${link.slug}.${format}`;
  const sharedOptions = {
    errorCorrectionLevel: style.errorCorrectionLevel as QRCodeErrorCorrectionLevel,
    margin: style.margin,
    width: style.size,
    color: {
      dark: toRgbaHex(style.foregroundColor),
      light: toRgbaHex(style.backgroundColor),
    },
  };

  if (format === "png") {
    const options: QRCodeToBufferOptions = {
      ...sharedOptions,
      type: "png",
    };
    const buffer = await QRCode.toBuffer(payload, options);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const options: QRCodeToStringOptions = {
    ...sharedOptions,
    type: "svg",
  };
  const svg = await QRCode.toString(payload, options);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

function toRgbaHex(hex: string) {
  return `${hex}ff`;
}
