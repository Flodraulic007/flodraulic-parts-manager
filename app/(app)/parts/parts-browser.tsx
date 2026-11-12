"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, History, Loader2, Paperclip, Pencil, Plus, Search } from "lucide-react";
import { PartDocs } from "@/components/part-docs";
import type { Part } from "@/lib/types";
import { savePart } from "@/lib/actions";
import { date, money } from "@/lib/format";
import { Badge, Button, Field, Modal, cx } from "@/components/ui";
import { toast } from "@/components/toast";

export function PartsBrowser({
  parts,
  total,
  page,
  pages,
  categories,
  counts,
  nextNumbers,
  query,
}: {
  parts: Part[];
  total: number;
  page: number;
  pages: number;
  categories: Record<string, string>;
  counts: Record<string, number>;
  nextNumbers: Record<string, string>;
  query: { q: string; cat: string; obs: boolean };
}) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(query.q);
  const [editing, setEditing] = useState<Partial<Part> | null>(null);

  const nav = (patch: Partial<{ q: string; cat: string; obs: boolean; page: number }>) => {
    const next = { ...query, page: 1, ...patch };
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.cat) sp.set("cat", next.cat);
    if (next.obs) sp.set("obs", "1");
    if (next.page > 1) sp.set("page", String(next.page));
    start(() => router.replace(`${path}?${sp}`, { scroll: false }));
  };

  useEffect(() => {
    if (q === query.q) return;
    const t = setTimeout(() => nav({ q }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-0.5 lg:sticky lg:top-24 lg:self-start">
        <button
          onClick={() => nav({ cat: "" })}
          className={cx("flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm", !query.cat ? "bg-ink-900 text-white" : "text-gray-700 hover:bg-white")}
        >
          <span className="font-medium">All categories</span>
          <span className="text-xs opacity-60 tabular">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </button>
        <div className="max-h-[70vh] overflow-y-auto">
          {Object.entries(categories).map(([k, name]) => (
            <button
              key={k}
              onClick={() => nav({ cat: k })}
              className={cx(
                "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm",
                query.cat === k ? "bg-white font-medium text-gray-900 shadow-sm ring-1 ring-gray-200" : "text-gray-600 hover:bg-white",
              )}
            >
              <span className={cx("w-9 font-mono text-[11px] font-semibold", query.cat === k ? "text-brand-600" : "text-gray-400")}>{k}</span>
              <span className="flex-1 truncate">{name}</span>
              <span className="text-xs text-gray-400 tabular">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 rounded-xl border border-gray-200/80 bg-white shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-3">
          <div className="relative min-w-60 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            {pending && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search PB #, description, manufacturer #, supplier, job ref…" className="field h-10 pl-9" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" className="accent-brand-600" checked={query.obs} onChange={(e) => nav({ obs: e.target.checked })} />
            Show obsolete
          </label>
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEditing({ category: query.cat || "PBC", currency: "CAD" })}>
            Add part
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead className="bg-gray-50/80 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Part #</th>
                <th className="px-3 py-2.5 font-medium">Description</th>
                <th className="px-3 py-2.5 font-medium">Manufacturer #</th>
                <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                <th className="px-3 py-2.5 font-medium">Supplier</th>
                <th className="px-3 py-2.5 font-medium">Contact</th>
                <th className="px-3 py-2.5 font-medium">Job ref.</th>
                <th className="w-16 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className={cx("divide-y divide-gray-100 transition-opacity", pending && "opacity-60")}>
              {parts.map((p) => (
                <tr key={p.id} className="group hover:bg-gray-50/70">
                  <td className="whitespace-nowrap px-4 py-2 font-mono font-semibold text-gray-900">{p.partNumber}</td>
                  <td className="px-3 py-2">
                    <span className={p.obsolete ? "text-gray-400 line-through" : "text-gray-800"}>{p.description}</span>
                    {p.obsolete && <Badge tone="rose" className="ml-2">Obsolete</Badge>}
                    {p.notes && <div className="text-xs text-gray-400">{p.notes}</div>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{p.mfrPartNumber || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular">
                    {money(p.cost)}
                    {p.currency === "USD" && <span className="ml-1 text-[10px] text-gray-400">USD</span>}
                    {p.updatedAt && <div className="text-[10px] text-gray-400">{date(p.updatedAt)}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{p.supplier || "—"}</td>
                  <td className="px-3 py-2 text-gray-500">{p.contact || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{p.jobRef || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-0.5">
                      {!!p.docs?.length && (
                        <a
                          href={`/api/parts/${encodeURIComponent(p.id)}/docs/${p.docs[0].id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-0.5 rounded p-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                          title={p.docs.map((d) => d.name).join("\n")}
                        >
                          <Paperclip className="size-3.5" />
                          {p.docs.length > 1 && p.docs.length}
                        </a>
                      )}
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer" className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Supplier page">
                          <ExternalLink className="size-3.5" />
                        </a>
                      )}
                      <button onClick={() => setEditing(p)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                        <Pencil className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {parts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">
                    No parts match. Try a different search, or add it as a new part.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-sm text-gray-500">
          <span>
            {total.toLocaleString()} part{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => nav({ page: page - 1 })} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular">
              {page} / {pages}
            </span>
            <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => nav({ page: page + 1 })} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {editing && (
        <PartModal
          part={editing}
          categories={categories}
          nextNumbers={nextNumbers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function PartModal({
  part,
  categories,
  nextNumbers,
  onClose,
  onSaved,
}: {
  part: Partial<Part>;
  categories: Record<string, string>;
  nextNumbers: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<Part>>(part);
  const [busy, setBusy] = useState(false);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const isNew = !part.id;
  const set = <K extends keyof Part>(k: K, v: Part[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (force = false) => {
    setBusy(true);
    const r = await savePart({ ...(f as Part), category: f.category!, description: f.description ?? "", ...(force ? { force: true } : {}) } as Part);
    setBusy(false);
    if (r.ok) {
      toast(isNew ? `Created ${r.data?.partNumber}` : "Part updated");
      onSaved();
    } else if (r.error.startsWith("Manufacturer part #")) setDupWarning(r.error);
    else toast(r.error, "error");
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={isNew ? "Add new part" : `Edit ${part.partNumber}`}
      description={isNew ? `Will be created as ${nextNumbers[f.category ?? "PBC"]}` : categories[part.category ?? ""]}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          {dupWarning && (
            <Button variant="danger" onClick={() => submit(true)} disabled={busy}>
              Create anyway
            </Button>
          )}
          <Button variant="primary" onClick={() => submit()} disabled={busy}>
            {isNew ? "Create part" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-6">
        {isNew && (
          <Field label="Category" className="sm:col-span-6">
            <select className="field" value={f.category} onChange={(e) => set("category", e.target.value)}>
              {Object.entries(categories).map(([k, n]) => (
                <option key={k} value={k}>
                  {k} — {n} (next: {nextNumbers[k]})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Description" className="sm:col-span-6">
          <input className="field uppercase" value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} autoFocus />
        </Field>
        <Field label="Manufacturer part #" className="sm:col-span-3">
          <input className="field font-mono" value={f.mfrPartNumber ?? ""} onChange={(e) => (set("mfrPartNumber", e.target.value), setDupWarning(null))} />
        </Field>
        <Field label="Cost" className="sm:col-span-2">
          <input type="number" step="0.01" className="field text-right" value={f.cost ?? ""} onChange={(e) => set("cost", e.target.value === "" ? 0 : +e.target.value)} />
        </Field>
        <Field label="Currency" className="sm:col-span-1">
          <select className="field" value={f.currency ?? "CAD"} onChange={(e) => set("currency", e.target.value as Part["currency"])}>
            <option>CAD</option>
            <option>USD</option>
          </select>
        </Field>
        <Field label="Supplier" className="sm:col-span-2">
          <input className="field uppercase" value={f.supplier ?? ""} onChange={(e) => set("supplier", e.target.value)} />
        </Field>
        <Field label="Contact" className="sm:col-span-2">
          <input className="field" value={f.contact ?? ""} onChange={(e) => set("contact", e.target.value)} />
        </Field>
        <Field label="Job ref." className="sm:col-span-2">
          <input className="field uppercase" placeholder="MTR…" value={f.jobRef ?? ""} onChange={(e) => set("jobRef", e.target.value)} />
        </Field>
        <Field label="Alt. supplier" className="sm:col-span-3">
          <input className="field uppercase" value={f.altSupplier ?? ""} onChange={(e) => set("altSupplier", e.target.value)} />
        </Field>
        <Field label="Alt. cost" className="sm:col-span-3">
          <input type="number" step="0.01" className="field text-right" value={f.altCost ?? ""} onChange={(e) => set("altCost", e.target.value === "" ? null : +e.target.value)} />
        </Field>
        <Field label="Supplier link" className="sm:col-span-6">
          <input className="field" placeholder="https://" value={f.link ?? ""} onChange={(e) => set("link", e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-6">
          <input className="field" value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        {!isNew && (
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-6">
            <input type="checkbox" className="accent-brand-600" checked={!!f.obsolete} onChange={(e) => set("obsolete", e.target.checked)} />
            Obsolete — hide from search and flag on BOMs
          </label>
        )}
        {dupWarning && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-600/20 sm:col-span-6">{dupWarning}</p>}
        <div className="sm:col-span-6">
          {isNew ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">Save the part first, then attach datasheets and manuals.</p>
          ) : (
            <PartDocs partId={part.id!} docs={part.docs ?? []} />
          )}
        </div>
        {!!part.priceHistory?.length && (
          <div className="sm:col-span-6">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <History className="size-3.5" /> Price history
            </div>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
              {part.priceHistory.map((h, i) => (
                <li key={i} className="flex justify-between px-3 py-1.5">
                  <span className="text-gray-500">
                    {date(h.at)} · {h.by}
                  </span>
                  <span className="tabular">was {money(h.cost)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
