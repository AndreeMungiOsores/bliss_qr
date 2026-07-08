import { nanoid } from "nanoid";

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  const url = new URL(trimmed);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Solo se permiten enlaces http y https.");
  }

  return url.href;
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function assertValidSlug(slug: string) {
  if (slug.length < 3 || slug.length > 64) {
    throw new Error("El slug debe tener entre 3 y 64 caracteres.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("El slug solo puede usar letras, numeros y guiones.");
  }
}

export function makeSlugCandidate(title?: string) {
  const base = title ? normalizeSlug(title) : "";
  return base.length >= 3 ? base.slice(0, 42) : nanoid(8).toLowerCase();
}

export async function generateUniqueSlug(
  exists: (slug: string) => Promise<boolean>,
  title?: string,
) {
  const base = makeSlugCandidate(title);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${nanoid(4).toLowerCase()}`;
    const slug = `${base}${suffix}`.slice(0, 64);

    if (!(await exists(slug))) {
      return slug;
    }
  }

  return nanoid(10).toLowerCase();
}
