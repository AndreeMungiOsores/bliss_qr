import { QrDashboard } from "@/components/qr-dashboard";
import { listLinks, type LinkSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  let initialLinks: LinkSummary[] = [];
  let initialMessage = "";

  try {
    initialLinks = await listLinks();
  } catch (error) {
    console.error("Unable to load QR links", error);
    initialMessage =
      "No se pudo conectar con la base de datos. Revisa DATABASE_URL en Vercel y redeploy.";
  }

  return <QrDashboard initialLinks={initialLinks} initialMessage={initialMessage} />;
}
