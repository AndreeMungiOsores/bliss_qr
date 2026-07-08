import { NextResponse, type NextRequest } from "next/server";
import { getRequestIpHash } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const link = await prisma.qrLink.findUnique({ where: { slug } });

  if (!link || link.type !== "DYNAMIC") {
    return statusPage("QR no encontrado", 404);
  }

  if (!link.active) {
    return statusPage("QR desactivado", 410);
  }

  try {
    await prisma.$transaction([
      prisma.qrVisit.create({
        data: {
          linkId: link.id,
          userAgent: request.headers.get("user-agent"),
          referer: request.headers.get("referer"),
          ipHash: getRequestIpHash(request),
        },
      }),
      prisma.qrLink.update({
        where: { id: link.id },
        data: { scanCount: { increment: 1 } },
      }),
    ]);
  } catch (error) {
    console.error("No se pudo registrar el scan", error);
  }

  const response = NextResponse.redirect(link.targetUrl, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

function statusPage(message: string, status: number) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${message}</title><style>body{font-family:Arial,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#111827}main{max-width:420px;padding:32px;text-align:center}h1{font-size:24px;margin:0 0 8px}p{color:#4b5563;margin:0}</style></head><body><main><h1>${message}</h1><p>El enlace no esta disponible.</p></main></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
