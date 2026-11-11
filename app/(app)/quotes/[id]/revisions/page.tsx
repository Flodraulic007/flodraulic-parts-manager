import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { bomTotals, revisionValue } from "@/lib/calc";
import { dateTime, money, pct } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import type { RevisionStatus } from "@/lib/types";
import type { Tone } from "@/lib/defaults";

const TONE: Record<RevisionStatus, Tone> = { draft: "slate", issued: "blue", superseded: "amber", approved: "green" };

export default async function RevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) notFound();
  const revs = [...p.revisions].reverse();

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <Card
        title="Revision history"
        padded={false}
        actions={<span className="text-xs text-gray-500">Revisions are never deleted. Only the latest draft can be edited.</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50/80 text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Quote #</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Change note</th>
                <th className="px-3 py-2.5 font-medium">Created</th>
                <th className="px-3 py-2.5 text-right font-medium">Unit price</th>
                <th className="px-3 py-2.5 text-right font-medium">Quote value</th>
                <th className="px-3 py-2.5 text-right font-medium">Δ vs previous</th>
                <th className="px-3 py-2.5 text-right font-medium">Parts margin</th>
                <th className="px-5 py-2.5 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {revs.map((r) => {
                const prev = p.revisions.find((x) => x.rev === r.rev - 1);
                const v = revisionValue(r);
                const delta = prev ? v - revisionValue(prev) : null;
                const bt = bomTotals(r.bom);
                const q = r.rev === p.revisions.at(-1)!.rev ? "" : `?rev=${r.rev}`;
                return (
                  <tr key={r.rev} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3 font-mono font-semibold text-gray-900">{r.quoteNumber}</td>
                    <td className="px-3 py-3">
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="max-w-xs px-3 py-3 text-gray-700">{r.note}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                      {dateTime(r.createdAt)}
                      <div className="text-xs text-gray-400">{r.createdBy}</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular">{money(bt.quotePrice)}</td>
                    <td className="px-3 py-3 text-right font-medium tabular">{money(v)}</td>
                    <td className={`px-3 py-3 text-right tabular ${delta == null ? "text-gray-300" : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-gray-500"}`}>
                      {delta == null ? "—" : `${delta > 0 ? "+" : ""}${money(delta)}`}
                    </td>
                    <td className="px-3 py-3 text-right tabular">{pct(bt.actualMargin)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Link href={`/quotes/${p.id}/quote${q}`} className="font-medium text-brand-600 hover:text-brand-700">
                        Quote
                      </Link>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <Link href={`/quotes/${p.id}/bom${q}`} className="font-medium text-brand-600 hover:text-brand-700">
                        BOM
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {revs.length > 1 && <RevisionCompare p={p} />}
    </div>
  );
}

function RevisionCompare({ p }: { p: NonNullable<Awaited<ReturnType<typeof getProject>>> }) {
  const a = p.revisions.at(-2)!;
  const b = p.revisions.at(-1)!;
  const key = (l: { kind: string; partNumber: string; description: string }) => (l.kind === "labour" ? `L${l.description}` : `P${l.partNumber || l.description}`);
  const am = new Map(a.bom.lines.map((l) => [key(l), l]));
  const bm = new Map(b.bom.lines.map((l) => [key(l), l]));
  const rows: { desc: string; pn: string; from: string; to: string; kind: "added" | "removed" | "changed" }[] = [];
  for (const [k, l] of bm) {
    const o = am.get(k);
    if (!o) rows.push({ desc: l.description, pn: l.partNumber, from: "—", to: `${l.qty} × ${money(l.unitCost)}`, kind: "added" });
    else if (o.qty !== l.qty || o.unitCost !== l.unitCost)
      rows.push({ desc: l.description, pn: l.partNumber, from: l.kind === "labour" ? `${o.qty} h` : `${o.qty} × ${money(o.unitCost)}`, to: l.kind === "labour" ? `${l.qty} h` : `${l.qty} × ${money(l.unitCost)}`, kind: "changed" });
  }
  for (const [k, l] of am) if (!bm.has(k)) rows.push({ desc: l.description, pn: l.partNumber, from: `${l.qty} × ${money(l.unitCost)}`, to: "—", kind: "removed" });

  return (
    <Card title={`What changed: ${a.quoteNumber} → ${b.quoteNumber}`} padded={false}>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No BOM line changes between these revisions.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="w-24 px-5 py-2.5">
                  <Badge tone={r.kind === "added" ? "green" : r.kind === "removed" ? "rose" : "amber"}>{r.kind}</Badge>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{r.pn}</td>
                <td className="px-3 py-2.5 text-gray-800">{r.desc}</td>
                <td className="px-3 py-2.5 text-right text-gray-500 tabular">{r.from}</td>
                <td className="px-5 py-2.5 text-right font-medium tabular">{r.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
