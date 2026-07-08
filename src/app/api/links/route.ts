import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { assertValidSlug, generateUniqueSlug, normalizeSlug, normalizeUrl } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { coerceQrStyle, defaultQrStyle, isQrType } from "@/lib/qr";
import { jsonError, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const linkInclude = {
  style: true,
  _count: {
    select: {
      visits: true,
      versions: true,
    },
  },
} satisfies Prisma.QrLinkInclude;

export async function GET() {
  const links = await prisma.qrLink.findMany({
    include: linkInclude,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ links: links.map(serializeLink) });
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
          async (candidate) =>
            Boolean(await prisma.qrLink.findUnique({ where: { slug: candidate } })),
          title,
        );

    assertValidSlug(slug);

    const existing = await prisma.qrLink.findUnique({ where: { slug } });

    if (existing) {
      return jsonError("Ese slug ya existe. Prueba con otro.", 409);
    }

    const style = coerceQrStyle(
      typeof body.style === "object" && body.style !== null ? body.style : {},
    );

    const link = await prisma.qrLink.create({
      data: {
        slug,
        type,
        title,
        targetUrl,
        style: {
          create: style,
        },
      },
      include: linkInclude,
    });

    return NextResponse.json({ link: serializeLink(link) }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo crear el QR.");
  }
}

function serializeLink(link: Prisma.QrLinkGetPayload<{ include: typeof linkInclude }>) {
  return {
    id: link.id,
    slug: link.slug,
    type: link.type,
    title: link.title,
    targetUrl: link.targetUrl,
    active: link.active,
    scanCount: link.scanCount,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    style: link.style ?? defaultQrStyle,
    visitCount: link._count.visits,
    versionCount: link._count.versions,
  };
}
