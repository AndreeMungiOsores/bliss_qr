CREATE TABLE IF NOT EXISTS "QrLink" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'DYNAMIC',
  "title" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "scanCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "QrStyle" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "linkId" TEXT NOT NULL,
  "foregroundColor" TEXT NOT NULL DEFAULT '#111827',
  "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
  "margin" INTEGER NOT NULL DEFAULT 2,
  "size" INTEGER NOT NULL DEFAULT 280,
  "errorCorrectionLevel" TEXT NOT NULL DEFAULT 'M',
  CONSTRAINT "QrStyle_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "QrLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "QrVisit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "linkId" TEXT NOT NULL,
  "visitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userAgent" TEXT,
  "referer" TEXT,
  "ipHash" TEXT,
  CONSTRAINT "QrVisit_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "QrLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "QrDestinationVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "linkId" TEXT NOT NULL,
  "oldUrl" TEXT NOT NULL,
  "newUrl" TEXT NOT NULL,
  "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QrDestinationVersion_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "QrLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "QrLink_slug_key" ON "QrLink"("slug");
CREATE INDEX IF NOT EXISTS "QrLink_type_idx" ON "QrLink"("type");
CREATE INDEX IF NOT EXISTS "QrLink_active_idx" ON "QrLink"("active");
CREATE INDEX IF NOT EXISTS "QrLink_updatedAt_idx" ON "QrLink"("updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "QrStyle_linkId_key" ON "QrStyle"("linkId");
CREATE INDEX IF NOT EXISTS "QrVisit_linkId_visitedAt_idx" ON "QrVisit"("linkId", "visitedAt");
CREATE INDEX IF NOT EXISTS "QrDestinationVersion_linkId_changedAt_idx" ON "QrDestinationVersion"("linkId", "changedAt");
