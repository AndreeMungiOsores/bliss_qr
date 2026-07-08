import { NextResponse, type NextRequest } from "next/server";
import { assertValidSlug, normalizeSlug, normalizeUrl } from "@/lib/links";
import {
  deleteLink,
  getLinkDetail,
  linkExistsBySlug,
  updateLink,
} from "@/lib/data";
import { coerceQrStyle, isQrType } from "@/lib/qr";
import { jsonError, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const link = await getLinkDetail(id);

  if (!link) {
    return jsonError("QR no encontrado.", 404);
  }

  return NextResponse.json({ link });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody(request);

  const current = await getLinkDetail(id);

  if (!current) {
    return jsonError("QR no encontrado.", 404);
  }

  try {
    const data: Parameters<typeof updateLink>[1] = {};

    if (typeof body.title === "string") {
      data.title = body.title.trim().slice(0, 100) || current.title;
    }

    if (typeof body.type === "string" && isQrType(body.type)) {
      data.type = body.type;
    }

    if (typeof body.targetUrl === "string") {
      data.targetUrl = normalizeUrl(body.targetUrl);
    }

    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (typeof body.slug === "string" && body.slug.trim()) {
      const slug = normalizeSlug(body.slug);
      assertValidSlug(slug);

      if (slug !== current.slug) {
        const existing = await linkExistsBySlug(slug);

        if (existing) {
          return jsonError("Ese slug ya existe. Prueba con otro.", 409);
        }

        data.slug = slug;
      }
    }

    if (typeof body.style === "object" && body.style !== null) {
      data.style = coerceQrStyle(body.style);
    }

    const updated = await updateLink(id, data);

    return NextResponse.json({ link: updated });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo actualizar.");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await deleteLink(id);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("QR no encontrado.", 404);
  }
}
