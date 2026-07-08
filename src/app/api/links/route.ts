import { NextResponse, type NextRequest } from "next/server";
import { assertValidSlug, generateUniqueSlug, normalizeSlug, normalizeUrl } from "@/lib/links";
import { createLink, linkExistsBySlug, listLinks } from "@/lib/data";
import { coerceQrStyle, isQrType } from "@/lib/qr";
import { jsonError, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const links = await listLinks();
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);

  try {
    const typeValue = typeof body.type === "string" ? body.type : "DYNAMIC";
    const type = isQrType(typeValue) ? typeValue : "DYNAMIC";
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 100)
        : "QR sin titulo";
    const targetUrl = normalizeUrl(String(body.targetUrl ?? ""));
    const requestedSlug =
      typeof body.slug === "string" && body.slug.trim()
        ? normalizeSlug(body.slug)
        : "";

    const slug = requestedSlug
      ? requestedSlug
      : await generateUniqueSlug(
          async (candidate) => linkExistsBySlug(candidate),
          title,
        );

    assertValidSlug(slug);

    const existing = await linkExistsBySlug(slug);

    if (existing) {
      return jsonError("Ese slug ya existe. Prueba con otro.", 409);
    }

    const style = coerceQrStyle(
      typeof body.style === "object" && body.style !== null ? body.style : {},
    );

    const link = await createLink({
      slug,
      type,
      title,
      targetUrl,
      style,
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo crear el QR.");
  }
}
