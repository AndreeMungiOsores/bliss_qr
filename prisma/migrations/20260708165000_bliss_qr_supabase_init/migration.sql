CREATE TABLE "bliss_qr_links" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DYNAMIC',
  "title" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bliss_qr_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bliss_qr_styles" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "foregroundColor" TEXT NOT NULL DEFAULT '#111827',
  "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
  "margin" INTEGER NOT NULL DEFAULT 2,
  "size" INTEGER NOT NULL DEFAULT 280,
  "errorCorrectionLevel" TEXT NOT NULL DEFAULT 'M',

  CONSTRAINT "bliss_qr_styles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bliss_qr_visits" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "referer" TEXT,
  "ipHash" TEXT,

  CONSTRAINT "bliss_qr_visits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bliss_qr_destination_versions" (
  "id" TEXT NOT NULL,
  "linkId" TEXT NOT NULL,
  "oldUrl" TEXT NOT NULL,
  "newUrl" TEXT NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bliss_qr_destination_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bliss_qr_links_slug_key" ON "bliss_qr_links"("slug");
CREATE INDEX "bliss_qr_links_type_idx" ON "bliss_qr_links"("type");
CREATE INDEX "bliss_qr_links_active_idx" ON "bliss_qr_links"("active");
CREATE INDEX "bliss_qr_links_updated_at_idx" ON "bliss_qr_links"("updatedAt");
CREATE UNIQUE INDEX "bliss_qr_styles_linkId_key" ON "bliss_qr_styles"("linkId");
CREATE INDEX "bliss_qr_visits_link_id_visited_at_idx" ON "bliss_qr_visits"("linkId", "visitedAt");
CREATE INDEX "bliss_qr_destination_versions_link_id_changed_at_idx" ON "bliss_qr_destination_versions"("linkId", "changedAt");

ALTER TABLE "bliss_qr_styles"
  ADD CONSTRAINT "bliss_qr_styles_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "bliss_qr_links"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bliss_qr_visits"
  ADD CONSTRAINT "bliss_qr_visits_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "bliss_qr_links"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bliss_qr_destination_versions"
  ADD CONSTRAINT "bliss_qr_destination_versions_linkId_fkey"
  FOREIGN KEY ("linkId") REFERENCES "bliss_qr_links"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
