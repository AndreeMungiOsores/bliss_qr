import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { assertValidSlug, normalizeSlug, normalizeUrl } from "@/lib/links";
import { prisma } from "@/lib/prisma";
import { coerceQrStyle, defaultQrStyle, isQrType } from "@/lib/qr";
import { jsonError, readJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

const detailInclude = {
  style: true,
  visits: {
    orderBy: { visitedAt: "desc" },
    take: 25,
  },
  versions: {
    orderBy: { changedAt: "desc" },
    take: 20,
  },
  _count: {
    select: {
      visits: true,
      versions: true,
    },
  },
} satisfies Prisma.QrLinkInclude;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const link = await prisma.qrLink.findUnique({
    where: { id },
    include: detailInclude,
  });

  if (!link) {
    return jsonError("QR no encontrado.", 404);
  }

  return NextResponse.json({ link: serializeDetail(link) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await readJsonBody(request);

  const current = await prisma.qrLink.findUnique({
    where: { id },
    include: { style: true },
  });

  if (!current) {
    return jsonError("QR no encontrado.", 404);
  }

  try {
    const data: Prisma.QrLinkUpdateInput = {};
    let targetChanged = false;
    let newTargetUrl = current.targetUrl;

    if (typeof body.title === "string") {
      data.title = body.title.trim().slice(0, 100) || current.title;
    }

    if (typeof body.type === "string" && isQrType(body.type)) {
      data.type = body.type;
    }

    if (typeof body.targetUrl === "string") {
      newTargetUrl = normalizeUrl(body.targetUrl);
      targetChanged = newTargetUrl !== current.targetUrl;
      data.targetUrl = newTargetUrl;
    }

    if (typeof body.active === "boolean") {
      data.active = body.active;
    }

    if (typeof body.slug === "string" && body.slug.trim()) {
      const slug = normalizeSlug(body.slug);
      assertValidSlug(slug);

      if (slug !== current.slug) {
        const existing = await prisma.qrLink.findUnique({ where: { slug } });

        if (existing) {
          return jsonError("Ese slug ya existe. Prueba con otro.", 409);
        }

        data.slug = slug;
      }
    }

    if (typeof body.style === "object" && body.style !== null) {
      const style = coerceQrStyle(body.style);
      data.style = {
        upsert: {
          create: style,
          update: style,
        },
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const link = await tx.qrLink.update({
        where: { id },
        data,
        include: detailInclude,
      });

      if (targetChanged) {
        await tx.qrDestinationVersion.create({
          data: {
            linkId: id,
            oldUrl: current.targetUrl,
            newUrl: newTargetUrl,
          },
        });
      }

      return link;
    });

    return NextResponse.json({ link: serializeDetail(updated) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo actualizar.");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.qrLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("QR no encontrado.", 404);
  }
}

function serializeDetail(link: Prisma.QrLinkGetPayload<{ include: typeof detailInclude }>) {
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
    visits: link.visits.map((visit) => ({
      id: visit.id,
      visitedAt: visit.visitedAt.toISOString(),
      userAgent: visit.userAgent,
      referer: visit.referer,
    })),
    versions: link.versions.map((version) => ({
      id: version.id,
      oldUrl: version.oldUrl,
      newUrl: version.newUrl,
      changedAt: version.changedAt.toISOString(),
    })),
  };
}
