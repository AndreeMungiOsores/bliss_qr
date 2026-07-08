import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultQrStyle, type QrStyleInput, type QrType } from "@/lib/qr";

type QrStyleRecord = {
  id: string;
  linkId: string;
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
  size: number;
  errorCorrectionLevel: string;
};

type QrLinkRecord = {
  id: string;
  slug: string;
  type: string;
  title: string;
  targetUrl: string;
  active: boolean;
  scanCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type QrVisitRecord = {
  id: string;
  linkId: string;
  visitedAt: string | Date;
  userAgent: string | null;
  referer: string | null;
  ipHash: string | null;
};

type QrVersionRecord = {
  id: string;
  linkId: string;
  oldUrl: string;
  newUrl: string;
  changedAt: string | Date;
};

export type LinkSummary = {
  id: string;
  slug: string;
  type: QrType;
  title: string;
  targetUrl: string;
  active: boolean;
  scanCount: number;
  createdAt: string;
  updatedAt: string;
  style: typeof defaultQrStyle | QrStyleRecord;
  visitCount: number;
  versionCount: number;
};

export type LinkDetail = LinkSummary & {
  visits: Array<{
    id: string;
    visitedAt: string;
    userAgent: string | null;
    referer: string | null;
  }>;
  versions: Array<{
    id: string;
    oldUrl: string;
    newUrl: string;
    changedAt: string;
  }>;
};

export type CreateLinkInput = {
  slug: string;
  type: QrType;
  title: string;
  targetUrl: string;
  style: Required<QrStyleInput>;
};

export type UpdateLinkInput = Partial<{
  slug: string;
  type: string;
  title: string;
  targetUrl: string;
  active: boolean;
  style: Required<QrStyleInput>;
}>;

export type VisitInput = {
  userAgent: string | null;
  referer: string | null;
  ipHash: string | null;
};

let cachedSupabase: SupabaseClient | null | undefined;

export async function listLinks() {
  const supabase = getSupabase();

  if (supabase) {
    return listLinksWithSupabase(supabase);
  }

  const prisma = await getPrisma();
  const links = await prisma.qrLink.findMany({
    include: {
      style: true,
      _count: { select: { visits: true, versions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return links.map((link) =>
    toSummary(link, link.style, link._count.visits, link._count.versions),
  );
}

export async function getLinkDetail(id: string) {
  const supabase = getSupabase();

  if (supabase) {
    return getLinkDetailWithSupabase(supabase, id);
  }

  const prisma = await getPrisma();
  const link = await prisma.qrLink.findUnique({
    where: { id },
    include: {
      style: true,
      visits: { orderBy: { visitedAt: "desc" }, take: 25 },
      versions: { orderBy: { changedAt: "desc" }, take: 20 },
      _count: { select: { visits: true, versions: true } },
    },
  });

  return link
    ? toDetail(link, link.style, link.visits, link.versions, link._count.visits, link._count.versions)
    : null;
}

export async function getLinkForQr(id: string) {
  const supabase = getSupabase();

  if (supabase) {
    const link = await getLinkByIdWithSupabase(supabase, id);

    if (!link) {
      return null;
    }

    const style = await getStyleWithSupabase(supabase, link.id);
    return { ...link, style: style ?? defaultQrStyle };
  }

  const prisma = await getPrisma();
  return prisma.qrLink.findUnique({
    where: { id },
    include: { style: true },
  });
}

export async function findLinkBySlug(slug: string) {
  const supabase = getSupabase();

  if (supabase) {
    return findLinkBySlugWithSupabase(supabase, slug);
  }

  const prisma = await getPrisma();
  return prisma.qrLink.findUnique({ where: { slug } });
}

export async function linkExistsBySlug(slug: string) {
  return Boolean(await findLinkBySlug(slug));
}

export async function createLink(input: CreateLinkInput) {
  const supabase = getSupabase();

  if (supabase) {
    const now = new Date().toISOString();
    const link: QrLinkRecord = {
      id: randomUUID(),
      slug: input.slug,
      type: input.type,
      title: input.title,
      targetUrl: input.targetUrl,
      active: true,
      scanCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await throwOnSupabase(
      supabase.from("bliss_qr_links").insert(link),
      "No se pudo crear el QR.",
    );

    const style: QrStyleRecord = {
      id: randomUUID(),
      linkId: link.id,
      ...input.style,
    };

    await throwOnSupabase(
      supabase.from("bliss_qr_styles").insert(style),
      "No se pudo guardar el estilo del QR.",
    );

    return toSummary(link, style, 0, 0);
  }

  const prisma = await getPrisma();
  const link = await prisma.qrLink.create({
    data: {
      slug: input.slug,
      type: input.type,
      title: input.title,
      targetUrl: input.targetUrl,
      style: { create: input.style },
    },
    include: {
      style: true,
      _count: { select: { visits: true, versions: true } },
    },
  });

  return toSummary(link, link.style, link._count.visits, link._count.versions);
}

export async function updateLink(id: string, input: UpdateLinkInput) {
  const supabase = getSupabase();

  if (supabase) {
    return updateLinkWithSupabase(supabase, id, input);
  }

  const prisma = await getPrisma();
  const current = await prisma.qrLink.findUnique({ where: { id } });

  if (!current) {
    return null;
  }

  const data = {
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.title ? { title: input.title } : {}),
    ...(typeof input.active === "boolean" ? { active: input.active } : {}),
    ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
    ...(input.style
      ? {
          style: {
            upsert: {
              create: input.style,
              update: input.style,
            },
          },
        }
      : {}),
  };

  const targetChanged =
    typeof input.targetUrl === "string" && input.targetUrl !== current.targetUrl;

  await prisma.$transaction(async (tx) => {
    await tx.qrLink.update({ where: { id }, data });

    if (targetChanged) {
      await tx.qrDestinationVersion.create({
        data: {
          linkId: id,
          oldUrl: current.targetUrl,
          newUrl: input.targetUrl as string,
        },
      });
    }
  });

  return getLinkDetail(id);
}

export async function deleteLink(id: string) {
  const supabase = getSupabase();

  if (supabase) {
    await throwOnSupabase(
      supabase.from("bliss_qr_links").delete().eq("id", id),
      "QR no encontrado.",
    );
    return;
  }

  const prisma = await getPrisma();
  await prisma.qrLink.delete({ where: { id } });
}

export async function recordVisit(link: QrLinkRecord, visit: VisitInput) {
  const supabase = getSupabase();

  if (supabase) {
    await throwOnSupabase(
      supabase.from("bliss_qr_visits").insert({
        id: randomUUID(),
        linkId: link.id,
        ...visit,
      }),
      "No se pudo registrar el scan.",
    );

    await throwOnSupabase(
      supabase
        .from("bliss_qr_links")
        .update({
          scanCount: link.scanCount + 1,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", link.id),
      "No se pudo actualizar el contador.",
    );
    return;
  }

  const prisma = await getPrisma();
  await prisma.$transaction([
    prisma.qrVisit.create({
      data: {
        linkId: link.id,
        userAgent: visit.userAgent,
        referer: visit.referer,
        ipHash: visit.ipHash,
      },
    }),
    prisma.qrLink.update({
      where: { id: link.id },
      data: { scanCount: { increment: 1 } },
    }),
  ]);
}

async function listLinksWithSupabase(supabase: SupabaseClient) {
  const links = await throwOnSupabase(
    supabase.from("bliss_qr_links").select("*").order("updatedAt", { ascending: false }),
    "No se pudieron cargar los QRs.",
  );

  if (!links.length) {
    return [];
  }

  const styles = await throwOnSupabase(
    supabase
      .from("bliss_qr_styles")
      .select("*")
      .in(
        "linkId",
        links.map((link) => link.id),
      ),
    "No se pudieron cargar los estilos.",
  );
  const styleByLinkId = new Map<string, QrStyleRecord>(
    styles.map((style) => [style.linkId, style]),
  );

  return links.map((link) =>
    toSummary(link, styleByLinkId.get(link.id) ?? null, link.scanCount, 0),
  );
}

async function getLinkDetailWithSupabase(supabase: SupabaseClient, id: string) {
  const link = await getLinkByIdWithSupabase(supabase, id);

  if (!link) {
    return null;
  }

  const [style, visits, versions] = await Promise.all([
    getStyleWithSupabase(supabase, id),
    throwOnSupabase(
      supabase
        .from("bliss_qr_visits")
        .select("id, linkId, visitedAt, userAgent, referer, ipHash")
        .eq("linkId", id)
        .order("visitedAt", { ascending: false })
        .limit(25),
      "No se pudieron cargar las visitas.",
    ),
    throwOnSupabase(
      supabase
        .from("bliss_qr_destination_versions")
        .select("id, linkId, oldUrl, newUrl, changedAt")
        .eq("linkId", id)
        .order("changedAt", { ascending: false })
        .limit(20),
      "No se pudo cargar el historial.",
    ),
  ]);

  return toDetail(link, style, visits, versions, link.scanCount, versions.length);
}

async function updateLinkWithSupabase(
  supabase: SupabaseClient,
  id: string,
  input: UpdateLinkInput,
) {
  const current = await getLinkByIdWithSupabase(supabase, id);

  if (!current) {
    return null;
  }

  const linkUpdate = {
    ...(input.slug ? { slug: input.slug } : {}),
    ...(input.type ? { type: input.type } : {}),
    ...(input.title ? { title: input.title } : {}),
    ...(typeof input.active === "boolean" ? { active: input.active } : {}),
    ...(input.targetUrl ? { targetUrl: input.targetUrl } : {}),
    updatedAt: new Date().toISOString(),
  };

  await throwOnSupabase(
    supabase.from("bliss_qr_links").update(linkUpdate).eq("id", id),
    "No se pudo actualizar el QR.",
  );

  if (input.style) {
    const currentStyle = await getStyleWithSupabase(supabase, id);

    if (currentStyle) {
      await throwOnSupabase(
        supabase.from("bliss_qr_styles").update(input.style).eq("linkId", id),
        "No se pudo actualizar el estilo.",
      );
    } else {
      await throwOnSupabase(
        supabase.from("bliss_qr_styles").insert({
          id: randomUUID(),
          linkId: id,
          ...input.style,
        }),
        "No se pudo crear el estilo.",
      );
    }
  }

  if (typeof input.targetUrl === "string" && input.targetUrl !== current.targetUrl) {
    await throwOnSupabase(
      supabase.from("bliss_qr_destination_versions").insert({
        id: randomUUID(),
        linkId: id,
        oldUrl: current.targetUrl,
        newUrl: input.targetUrl,
      }),
      "No se pudo registrar el cambio de destino.",
    );
  }

  return getLinkDetailWithSupabase(supabase, id);
}

async function getLinkByIdWithSupabase(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("bliss_qr_links")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as QrLinkRecord | null) ?? null;
}

async function findLinkBySlugWithSupabase(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("bliss_qr_links")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as QrLinkRecord | null) ?? null;
}

async function getStyleWithSupabase(supabase: SupabaseClient, linkId: string) {
  const { data, error } = await supabase
    .from("bliss_qr_styles")
    .select("*")
    .eq("linkId", linkId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as QrStyleRecord | null) ?? null;
}

function getSupabase() {
  if (cachedSupabase !== undefined) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  cachedSupabase =
    url && key
      ? createClient(url, key, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })
      : null;

  return cachedSupabase;
}

async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

async function throwOnSupabase<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  fallbackMessage: string,
) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

  return (data ?? []) as T;
}

function toSummary(
  link: QrLinkRecord,
  style: QrStyleRecord | null,
  visitCount: number,
  versionCount: number,
): LinkSummary {
  return {
    id: link.id,
    slug: link.slug,
    type: link.type as QrType,
    title: link.title,
    targetUrl: link.targetUrl,
    active: link.active,
    scanCount: link.scanCount,
    createdAt: toIsoString(link.createdAt),
    updatedAt: toIsoString(link.updatedAt),
    style: style ?? defaultQrStyle,
    visitCount,
    versionCount,
  };
}

function toDetail(
  link: QrLinkRecord,
  style: QrStyleRecord | null,
  visits: QrVisitRecord[],
  versions: QrVersionRecord[],
  visitCount: number,
  versionCount: number,
): LinkDetail {
  return {
    ...toSummary(link, style, visitCount, versionCount),
    visits: visits.map((visit) => ({
      id: visit.id,
      visitedAt: toIsoString(visit.visitedAt),
      userAgent: visit.userAgent,
      referer: visit.referer,
    })),
    versions: versions.map((version) => ({
      id: version.id,
      oldUrl: version.oldUrl,
      newUrl: version.newUrl,
      changedAt: toIsoString(version.changedAt),
    })),
  };
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
