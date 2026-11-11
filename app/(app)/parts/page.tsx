import type { Metadata } from "next";
import { getParts, getSettings, nextPartNumber } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PartsBrowser } from "./parts-browser";

export const metadata: Metadata = { title: "Part Numbers" };
const PAGE = 50;

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; page?: string; obs?: string }> }) {
  const sp = await searchParams;
  const [all, settings] = await Promise.all([getParts(), getSettings()]);
  const q = (sp.q ?? "").trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  const filtered = all.filter(
    (p) =>
      (!sp.cat || p.category === sp.cat) &&
      (sp.obs === "1" || !p.obsolete) &&
      terms.every((t) => `${p.partNumber} ${p.description} ${p.mfrPartNumber} ${p.supplier} ${p.jobRef}`.toLowerCase().includes(t)),
  );
  const page = Math.max(1, +(sp.page ?? 1) || 1);
  const counts: Record<string, number> = {};
  for (const p of all) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const nextNumbers = Object.fromEntries(Object.keys(settings.categories).map((c) => [c, nextPartNumber(all, c)]));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Reference"
        title="Part Numbers"
        subtitle={`${all.length.toLocaleString()} parts in the PB ledger across ${Object.keys(counts).length} categories. New parts get the next number in their category automatically.`}
      />
      <PartsBrowser
        parts={filtered.slice((page - 1) * PAGE, page * PAGE)}
        total={filtered.length}
        page={page}
        pages={Math.max(1, Math.ceil(filtered.length / PAGE))}
        categories={settings.categories}
        counts={counts}
        nextNumbers={nextNumbers}
        query={{ q: sp.q ?? "", cat: sp.cat ?? "", obs: sp.obs === "1" }}
      />
    </div>
  );
}
