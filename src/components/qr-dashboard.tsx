"use client";

import {
  Activity,
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Plus,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  FormEvent,
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  defaultQrStyle,
  errorCorrectionLevels,
  getQrPayload,
  type ErrorCorrectionLevel,
  type QrType,
} from "@/lib/qr";

type QrStyle = typeof defaultQrStyle;

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
  style: QrStyle;
  visitCount: number;
  versionCount: number;
};

type LinkDetail = LinkSummary & {
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

type Draft = {
  title: string;
  slug: string;
  type: QrType;
  targetUrl: string;
  active: boolean;
  style: QrStyle;
};

type CreateForm = Draft;

const emptyCreateForm: CreateForm = {
  title: "Instagram",
  slug: "insta",
  type: "DYNAMIC",
  targetUrl: "https://www.instagram.com/",
  active: true,
  style: defaultQrStyle,
};

export function QrDashboard({ initialLinks = [] }: { initialLinks?: LinkSummary[] }) {
  const [links, setLinks] = useState<LinkSummary[]>(initialLinks);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedDetail, setSelectedDetail] = useState<LinkDetail | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreateForm);
  const [draft, setDraft] = useState<Draft | null>(null);
  const baseUrl = useClientOrigin();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  const selected = useMemo(
    () => selectedDetail ?? links.find((link) => link.id === selectedId) ?? null,
    [links, selectedDetail, selectedId],
  );

  const selectedPayload = selected ? getQrPayload(selected, baseUrl) : "";

  const refreshLinks = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const data = await fetchJson<{ links: LinkSummary[] }>("/api/links");
      setLinks(data.links);

      if (!data.links.length) {
        setSelectedId("");
        setSelectedDetail(null);
        setDraft(null);
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    try {
      const data = await fetchJson<{ link: LinkDetail }>(`/api/links/${id}`);
      setSelectedDetail(data.link);
      setDraft(toDraft(data.link));
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, []);

  async function selectLink(id: string) {
    setSelectedId(id);
    setSelectedDetail(null);
    setDraft(null);
    await loadDetail(id);
  }

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const data = await fetchJson<{ link: LinkSummary }>("/api/links", {
        method: "POST",
        body: JSON.stringify(createForm),
      });

      setLinks((current) => [data.link, ...current]);
      setSelectedId(data.link.id);
      setSelectedDetail(null);
      setDraft(null);
      void loadDetail(data.link.id);
      setCreateForm({
        ...emptyCreateForm,
        slug: "",
        title: "",
        targetUrl: "https://",
      });
      setMessage("QR creado.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft || !selected) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const data = await fetchJson<{ link: LinkDetail }>(`/api/links/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });

      setSelectedDetail(data.link);
      setDraft(toDraft(data.link));
      setLinks((current) =>
        current.map((link) => (link.id === data.link.id ? toSummary(data.link) : link)),
      );
      setMessage("Cambios guardados.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(link: LinkSummary) {
    setBusy(true);

    try {
      const data = await fetchJson<{ link: LinkDetail }>(`/api/links/${link.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !link.active }),
      });

      setLinks((current) =>
        current.map((item) => (item.id === data.link.id ? toSummary(data.link) : item)),
      );

      if (selectedId === link.id) {
        setSelectedDetail(data.link);
        setDraft(toDraft(data.link));
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function deleteLink(link: LinkSummary) {
    if (!window.confirm(`Eliminar ${link.title}?`)) {
      return;
    }

    setBusy(true);

    try {
      await fetchJson<{ ok: boolean }>(`/api/links/${link.id}`, { method: "DELETE" });
      setLinks((current) => current.filter((item) => item.id !== link.id));

      if (selectedId === link.id) {
        const next = links.find((item) => item.id !== link.id);
        setSelectedId(next?.id ?? "");

        if (!next) {
          setSelectedDetail(null);
          setDraft(null);
        }
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  }

  function downloadQr(format: "svg" | "png") {
    if (!selected) {
      return;
    }

    const href = `/api/links/${selected.id}/qr?format=${format}&baseUrl=${encodeURIComponent(baseUrl)}`;
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${selected.slug}.${format}`;
    anchor.click();
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#111827]">
      <header className="border-b border-[#d9dee6] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#0f766e] text-white">
              <QrCode size={22} aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">QR Router</h1>
              <p className="text-sm text-[#667085]">{baseUrl.replace(/^https?:\/\//, "")}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshLinks()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#cfd6df] bg-white px-3 text-sm font-medium text-[#344054] transition hover:bg-[#eef2f6]"
            >
              <RefreshCw size={16} aria-hidden />
              Actualizar
            </button>
            {message ? (
              <span className="rounded-md border border-[#d4dbe4] bg-[#f8fafc] px-3 py-2 text-sm text-[#475467]">
                {message}
              </span>
            ) : null}
            {copied ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#dcfce7] px-3 py-2 text-sm font-medium text-[#166534]">
                <Check size={15} aria-hidden />
                Copiado {copied}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)_390px]">
        <section className="rounded-lg border border-[#d9dee6] bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Nuevo QR</h2>
            <Plus size={18} className="text-[#0f766e]" aria-hidden />
          </div>

          <form className="space-y-4" onSubmit={createLink}>
            <div className="grid grid-cols-2 rounded-md border border-[#cfd6df] bg-[#f8fafc] p-1">
              {(["DYNAMIC", "STATIC"] as QrType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCreateForm((form) => ({ ...form, type }))}
                  className={`h-9 rounded px-3 text-sm font-medium transition ${
                    createForm.type === type
                      ? "bg-[#0f766e] text-white shadow-sm"
                      : "text-[#475467] hover:bg-white"
                  }`}
                >
                  {type === "DYNAMIC" ? "Dinamico" : "Estatico"}
                </button>
              ))}
            </div>

            <Field label="Titulo">
              <input
                className={inputClass}
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, title: event.target.value }))
                }
                placeholder="Instagram"
              />
            </Field>

            <Field label="Destino">
              <input
                className={inputClass}
                value={createForm.targetUrl}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, targetUrl: event.target.value }))
                }
                placeholder="https://www.instagram.com/tu_usuario"
              />
            </Field>

            <Field label="Slug">
              <input
                className={inputClass}
                value={createForm.slug}
                onChange={(event) =>
                  setCreateForm((form) => ({ ...form, slug: event.target.value }))
                }
                placeholder="insta"
              />
            </Field>

            <StyleControls
              style={createForm.style}
              onChange={(style) => setCreateForm((form) => ({ ...form, style }))}
            />

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#0f766e] px-4 text-sm font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={17} aria-hidden />
              Crear QR
            </button>
          </form>
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Biblioteca</h2>
              <p className="text-sm text-[#667085]">{links.length} registros</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#d9dee6] bg-white px-3 py-2 text-sm text-[#475467]">
              <BarChart3 size={16} aria-hidden />
              {links.reduce((total, link) => total + link.scanCount, 0)} scans
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <div className="rounded-lg border border-[#d9dee6] bg-white p-5 text-sm text-[#667085]">
                Cargando...
              </div>
            ) : null}

            {!loading && links.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#b8c2cc] bg-white p-8 text-center">
                <QrCode className="mx-auto mb-3 text-[#98a2b3]" size={30} aria-hidden />
                <p className="text-sm font-medium text-[#475467]">Sin QRs todavia</p>
              </div>
            ) : null}

            {links.map((link) => {
              const payload = getQrPayload(link, baseUrl);
              const isSelected = selectedId === link.id;

              return (
                <article
                  key={link.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm transition ${
                    isSelected ? "border-[#0f766e] ring-2 ring-[#99f6e4]" : "border-[#d9dee6]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <button
                      type="button"
                      onClick={() => void selectLink(link.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            link.type === "DYNAMIC"
                              ? "bg-[#ccfbf1] text-[#115e59]"
                              : "bg-[#fee2e2] text-[#991b1b]"
                          }`}
                        >
                          {link.type === "DYNAMIC" ? "Dinamico" : "Estatico"}
                        </span>
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            link.active
                              ? "bg-[#dcfce7] text-[#166534]"
                              : "bg-[#f2f4f7] text-[#667085]"
                          }`}
                        >
                          {link.active ? "Activo" : "Pausado"}
                        </span>
                      </div>
                      <h3 className="truncate text-base font-semibold">{link.title}</h3>
                      <p className="mt-1 truncate text-sm text-[#667085]">{payload}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#667085]">
                        <span>{link.scanCount} scans</span>
                        <span>{domainFromUrl(link.targetUrl)}</span>
                        <span>{formatDate(link.updatedAt)}</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1">
                      <IconButton
                        label="Copiar"
                        onClick={() => void copyText(payload, link.slug)}
                      >
                        <Copy size={16} aria-hidden />
                      </IconButton>
                      <IconButton label={link.active ? "Pausar" : "Activar"} onClick={() => void toggleActive(link)}>
                        {link.active ? <PowerOff size={16} aria-hidden /> : <Power size={16} aria-hidden />}
                      </IconButton>
                      <IconButton label="Eliminar" onClick={() => void deleteLink(link)}>
                        <Trash2 size={16} aria-hidden />
                      </IconButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="min-w-0 rounded-lg border border-[#d9dee6] bg-white p-4 shadow-sm">
          {selected && draft ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">{selected.title}</h2>
                  <p className="truncate text-sm text-[#667085]">{selected.slug}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-[#fef3c7] px-2 py-1 text-xs font-semibold text-[#92400e]">
                  <Activity size={14} aria-hidden />
                  {selected.scanCount}
                </span>
              </div>

              <div className="grid place-items-center rounded-lg border border-[#d9dee6] bg-[#f8fafc] p-4">
                <QRCodeSVG
                  value={selectedPayload}
                  size={Math.min(selected.style.size, 310)}
                  level={selected.style.errorCorrectionLevel as ErrorCorrectionLevel}
                  fgColor={selected.style.foregroundColor}
                  bgColor={selected.style.backgroundColor}
                  marginSize={selected.style.margin}
                  title={selected.title}
                  className="h-auto max-w-full"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <IconButton label="Copiar QR" onClick={() => void copyText(selectedPayload, "QR")}>
                  <Copy size={16} aria-hidden />
                </IconButton>
                <IconButton label="Abrir" onClick={() => window.open(selectedPayload, "_blank", "noopener,noreferrer")}>
                  <ExternalLink size={16} aria-hidden />
                </IconButton>
                <IconButton label="SVG" onClick={() => downloadQr("svg")}>
                  <Download size={16} aria-hidden />
                </IconButton>
                <IconButton label="PNG" onClick={() => downloadQr("png")}>
                  <QrCode size={16} aria-hidden />
                </IconButton>
              </div>

              <div className="rounded-md border border-[#d9dee6] bg-[#f8fafc] p-3">
                <p className="break-all font-mono text-xs leading-5 text-[#344054]">
                  {selectedPayload}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo">
                    <select
                      className={inputClass}
                      value={draft.type}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, type: event.target.value as QrType } : current,
                        )
                      }
                    >
                      <option value="DYNAMIC">Dinamico</option>
                      <option value="STATIC">Estatico</option>
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select
                      className={inputClass}
                      value={draft.active ? "active" : "paused"}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? { ...current, active: event.target.value === "active" }
                            : current,
                        )
                      }
                    >
                      <option value="active">Activo</option>
                      <option value="paused">Pausado</option>
                    </select>
                  </Field>
                </div>

                <Field label="Titulo">
                  <input
                    className={inputClass}
                    value={draft.title}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, title: event.target.value } : current,
                      )
                    }
                  />
                </Field>

                <Field label="Slug">
                  <input
                    className={inputClass}
                    value={draft.slug}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, slug: event.target.value } : current,
                      )
                    }
                  />
                </Field>

                <Field label="Destino">
                  <input
                    className={inputClass}
                    value={draft.targetUrl}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, targetUrl: event.target.value } : current,
                      )
                    }
                  />
                </Field>

                <StyleControls
                  style={draft.style}
                  onChange={(style) =>
                    setDraft((current) => (current ? { ...current, style } : current))
                  }
                />

                <button
                  type="button"
                  onClick={() => void saveDraft()}
                  disabled={busy}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={17} aria-hidden />
                  Guardar cambios
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Ultimos scans</h3>
                <div className="overflow-hidden rounded-md border border-[#d9dee6]">
                  {selectedDetail?.visits.length ? (
                    selectedDetail.visits.slice(0, 8).map((visit) => (
                      <div
                        key={visit.id}
                        className="border-b border-[#edf0f3] px-3 py-2 last:border-b-0"
                      >
                        <p className="text-xs font-medium text-[#344054]">
                          {formatDateTime(visit.visitedAt)}
                        </p>
                        <p className="truncate text-xs text-[#667085]">
                          {visit.userAgent ?? "Sin user-agent"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-[#667085]">Sin scans</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Cambios de destino</h3>
                <div className="overflow-hidden rounded-md border border-[#d9dee6]">
                  {selectedDetail?.versions.length ? (
                    selectedDetail.versions.slice(0, 6).map((version) => (
                      <div
                        key={version.id}
                        className="border-b border-[#edf0f3] px-3 py-2 last:border-b-0"
                      >
                        <p className="text-xs font-medium text-[#344054]">
                          {formatDateTime(version.changedAt)}
                        </p>
                        <p className="truncate text-xs text-[#667085]">
                          {domainFromUrl(version.oldUrl)} {"->"} {domainFromUrl(version.newUrl)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-[#667085]">Sin cambios</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[520px] place-items-center text-center">
              <div>
                <Link2 className="mx-auto mb-3 text-[#98a2b3]" size={32} aria-hidden />
                <p className="text-sm font-medium text-[#475467]">Selecciona un QR</p>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function StyleControls({
  style,
  onChange,
}: {
  style: QrStyle;
  onChange: (style: QrStyle) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Color">
          <ColorInput
            value={style.foregroundColor}
            onChange={(foregroundColor) => onChange({ ...style, foregroundColor })}
          />
        </Field>
        <Field label="Fondo">
          <ColorInput
            value={style.backgroundColor}
            onChange={(backgroundColor) => onChange({ ...style, backgroundColor })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Tamano">
          <input
            className={inputClass}
            type="number"
            min={160}
            max={720}
            value={style.size}
            onChange={(event) =>
              onChange({ ...style, size: Number.parseInt(event.target.value, 10) || 280 })
            }
          />
        </Field>
        <Field label="Margen">
          <input
            className={inputClass}
            type="number"
            min={0}
            max={8}
            value={style.margin}
            onChange={(event) =>
              onChange({ ...style, margin: Number.parseInt(event.target.value, 10) || 0 })
            }
          />
        </Field>
        <Field label="Nivel">
          <select
            className={inputClass}
            value={style.errorCorrectionLevel}
            onChange={(event) =>
              onChange({
                ...style,
                errorCorrectionLevel: event.target.value as ErrorCorrectionLevel,
              })
            }
          >
            {errorCorrectionLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-[#cfd6df] bg-white px-2">
      <input
        aria-label="Color"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
      />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#475467]">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#667085]">
        {label}
      </span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid h-9 min-w-9 place-items-center rounded-md border border-[#cfd6df] bg-white px-2 text-[#344054] transition hover:bg-[#eef2f6]"
    >
      {children}
    </button>
  );
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Solicitud fallida.");
  }

  return data;
}

function toSummary(link: LinkDetail): LinkSummary {
  return {
    id: link.id,
    slug: link.slug,
    type: link.type,
    title: link.title,
    targetUrl: link.targetUrl,
    active: link.active,
    scanCount: link.scanCount,
    createdAt: link.createdAt,
    updatedAt: link.updatedAt,
    style: link.style,
    visitCount: link.visitCount,
    versionCount: link.versionCount,
  };
}

function toDraft(link: LinkDetail): Draft {
  return {
    title: link.title,
    slug: link.slug,
    type: link.type,
    targetUrl: link.targetUrl,
    active: link.active,
    style: link.style,
  };
}

function useClientOrigin() {
  return useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "http://localhost:3000",
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Algo salio mal.";
}

function domainFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const inputClass =
  "h-10 w-full rounded-md border border-[#cfd6df] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#98a2b3] focus:border-[#0f766e] focus:ring-2 focus:ring-[#99f6e4]";
