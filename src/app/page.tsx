import { Prisma } from "@prisma/client";
import { QrDashboard, type LinkSummary } from "@/components/qr-dashboard";
import { prisma } from "@/lib/prisma";
import { defaultQrStyle } from "@/lib/qr";

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

export default async function Home() {
  let initialLinks: LinkSummary[] = [];
  let initialMessage = "";

  try {
    const links = await prisma.qrLink.findMany({
      include: linkInclude,
      orderBy: { updatedAt: "desc" },
    });

    initialLinks = links.map(serializeLink);
  } catch (error) {
    console.error("Unable to load QR links", error);
    initialMessage =
      "No se pudo conectar con la base de datos. Revisa DATABASE_URL en Vercel y redeploy.";
  }

  return <QrDashboard initialLinks={initialLinks} initialMessage={initialMessage} />;
}

function serializeLink(
  link: Prisma.QrLinkGetPayload<{
    include: typeof linkInclude;
  }>,
): LinkSummary {
  return {
    id: link.id,
    slug: link.slug,
    type: link.type as LinkSummary["type"],
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
