import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { bomTotals, labourRateCAD, lineTotal, quoteTotals, revisionValue } from "@/lib/calc";
import { isManager } from "@/lib/workflow";
import { dateTime, money, pct } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { BomLine, Revision, RevisionStatus } from "@/lib/types";
import type { Tone } from "@/lib/defaults";

const TONE: Record<RevisionStatus, Tone> = { draft: "slate", issued: "blue", superseded: "amber", approved: "green" };
const v = (r: Revision) => `v${r.rev + 1}`;

export default async function RevisionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ a?: string; b?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [p, user] = await Promise.all([getProject(id), requireUser()]);
  if (!p) notFound();
  const manager = isManager(user);
  const revs = [...p.revisions].reverse();
  const latest = p.revisions.at(-1)!;
  const a = p.revisions.find((r) => r.rev === +(sp.a ?? NaN)) ?? p.revisions.at(-2) ?? latest;
  const b = p.revisions.find((r) => r.rev === +(sp.b ?? NaN)) ?? latest;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <Card title="Revision history" padded={false} actions={<span className="text-xs text-gray-500">Every version is kept and can't be changed once a newer one exists.</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-gray-50/80 text-left text-xs text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Version</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Requested by</th>
                <th className="px-3 py-2.5 font-medium">Reason</th>
                <th className="px-3 py-2.5 font-medium">Created</th>
                <th className="px-3 py-2.5 text-right font-medium">Quote value</th>
                <th className="px-3 py-2.5 text-right font-medium">Δ vs previous</th>
                {manager && <th className="px-3 py-2.5 text-right font-medium">Parts margin</th>}
                <th className="px-5 py-2.5 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {revs.map((r) => {
                const prev = p.revisions.find((x) => x.rev === r.rev - 1);
                const val = revisionValue(r);
                const delta = prev ? val - revisionValue(prev) : null;
                const q = r.rev === latest.rev ? "" : `?rev=${r.rev}`;
                return (
                  <tr key={r.rev} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-gray-900">{v(r)}</div>
                      <div className="font-mono text-xs text-gray-500">{r.quoteNumber}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={TONE[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{r.rev === 0 ? "—" : r.requestedBy === "internal" ? "Internal correction" : "Customer"}</td>
                    <td className="max-w-xs px-3 py-3 text-gray-700">{r.note}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-gray-600">
                      {dateTime(r.createdAt)}
                      <div className="text-xs text-gray-400">{r.createdBy}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular">{money(val)}</td>
                    <td className={`px-3 py-3 text-right tabular ${delta == null ? "text-gray-300" : delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-600" : "text-gray-500"}`}>
                      {delta == null ? "—" : `${delta > 0 ? "+" : ""}${money(delta)}`}
                    </td>
                    {manager && <td className="px-3 py-3 text-right tabular">{pct(bomTotals(r.bom).actualMargin)}</td>}
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <Link href={`/quotes/${p.id}/quote${q}`} className="font-medium text-brand-600 hover:text-brand-700">Quote</Link>
                      <span className="mx-1.5 text-gray-300">·</span>
                      <Link href={`/quotes/${p.id}/bom${q}`} className="font-medium text-brand-600 hover:text-brand-700">BOM</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {p.revisions.length > 1 && <Compare id={p.id} revisions={p.revisions} a={a} b={b} manager={manager} />}
    </div>
  );
}

function Compare({ id, revisions, a, b, manager }: { id: string; revisions: Revision[]; a: Revision; b: Revision; manager: boolean }) {
  const ta = bomTotals(a.bom);
  const tb = bomTotals(b.bom);
  const qa = quoteTotals(a.quote, a.bom);
  const qb = quoteTotals(b.quote, b.bom);
  const key = (l: BomLine) => (l.kind === "labour" ? `L${l.description}` : `P${l.partNumber || l.description}`);
  const am = new Map(a.bom.lines.map((l) => [key(l), l]));
  const bm = new Map(b.bom.lines.map((l) => [key(l), l]));
  const keys = [...new Set([...am.keys(), ...bm.keys()])];
  const rows = keys.map((k) => {
    const la = am.get(k);
    const lb = bm.get(k);
    const ca = la ? lineTotal(a.bom, la) : 0;
    const cb = lb ? lineTotal(b.bom, lb) : 0;
    const change = !la ? "added" : !lb ? "removed" : la.qty !== lb.qty || Math.abs(ca - cb) > 0.005 ? "changed" : "same";
    return { k, line: (lb ?? la)!, la, lb, ca, cb, change };
  });
  const changed = rows.filter((r) => r.change !== "same");

  const summary: [string, number, number, boolean?][] = [
    ["Quote value (all lines)", qa.subtotal, qb.subtotal],
    ["Unit price", ta.quotePrice, tb.quotePrice],
    ["Parts cost", ta.partsSubtotal, tb.partsSubtotal],
    ["Labour sell", ta.labourSell, tb.labourSell],
    ["Labour hours", ta.labourHours, tb.labourHours, true],
  ];

  const pick = (side: "a" | "b") => (
    <div className="flex flex-wrap gap-1">
      {revisions.map((r) => {
        const sel = (side === "a" ? a : b).rev === r.rev;
        const href = `/quotes/${id}/revisions?a=${side === "a" ? r.rev : a.rev}&b=${side === "b" ? r.rev : b.rev}`;
        return (
          <Link key={r.rev} href={href} scroll={false} className={cx("rounded-md px-2 py-0.5 text-xs font-semibold", sel ? "bg-ink-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {v(r)}
          </Link>
        );
      })}
    </div>
  );

  return (
    <Card title="Compare versions side by side" padded={false}>
      <div className="grid gap-4 border-b border-gray-100 px-5 py-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Left</div>
          {pick("a")}
          <div className="mt-2 text-sm"><b>{v(a)}</b> <span className="font-mono text-xs text-gray-500">{a.quoteNumber}</span> — {a.note}</div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Right</div>
          {pick("b")}
          <div className="mt-2 text-sm"><b>{v(b)}</b> <span className="font-mono text-xs text-gray-500">{b.quoteNumber}</span> — {b.note}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50/80 text-xs text-gray-500">
            <tr>
              <th className="px-5 py-2 text-left font-medium" />
              <th className="px-3 py-2 text-right font-medium">{v(a)}</th>
              <th className="px-3 py-2 text-right font-medium">{v(b)}</th>
              <th className="px-5 py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.map(([label, x, y, hrs]) => (
              <tr key={label}>
                <td className="px-5 py-2.5 font-medium text-gray-700">{label}</td>
                <td className="px-3 py-2.5 text-right tabular">{hrs ? `${x} h` : money(x)}</td>
                <td className="px-3 py-2.5 text-right tabular">{hrs ? `${y} h` : money(y)}</td>
                <td className={cx("px-5 py-2.5 text-right font-semibold tabular", y - x > 0 ? "text-emerald-600" : y - x < 0 ? "text-rose-600" : "text-gray-400")}>
                  {y - x === 0 ? "—" : `${y - x > 0 ? "+" : ""}${hrs ? `${y - x} h` : money(y - x)}`}
                </td>
              </tr>
            ))}
            {manager && (
              <tr>
                <td className="px-5 py-2.5 font-medium text-gray-700">Parts margin</td>
                <td className="px-3 py-2.5 text-right tabular">{pct(ta.actualMargin)}</td>
                <td className="px-3 py-2.5 text-right tabular">{pct(tb.actualMargin)}</td>
                <td className="px-5 py-2.5 text-right text-gray-500 tabular">
                  {ta.actualMargin != null && tb.actualMargin != null ? `${((tb.actualMargin - ta.actualMargin) * 100).toFixed(1)} pts` : "—"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-5 py-3 text-sm font-semibold text-gray-900">
        Line changes <span className="ml-1 text-xs font-normal text-gray-500">({changed.length} of {rows.length} lines differ)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead className="bg-gray-50/80 text-xs text-gray-500">
            <tr>
              <th className="w-24 px-5 py-2 text-left font-medium" />
              <th className="px-3 py-2 text-left font-medium">Item</th>
              <th className="border-l border-gray-200 px-3 py-2 text-right font-medium">{v(a)} qty × cost</th>
              <th className="px-3 py-2 text-right font-medium">{v(a)} total</th>
              <th className="border-l border-gray-200 px-3 py-2 text-right font-medium">{v(b)} qty × cost</th>
              <th className="px-3 py-2 text-right font-medium">{v(b)} total</th>
              <th className="px-5 py-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {changed.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-6 text-center text-gray-500">These versions have identical BOM lines.</td>
              </tr>
            )}
            {changed.map((r) => {
              const unit = (l?: BomLine, bom = a.bom) => (l ? (l.kind === "labour" ? `${l.qty} h × ${money(labourRateCAD(bom))}` : `${l.qty} × ${money(l.unitCost)}`) : "—");
              return (
                <tr key={r.k} className={r.change === "added" ? "bg-emerald-50/40" : r.change === "removed" ? "bg-rose-50/40" : ""}>
                  <td className="px-5 py-2">
                    <Badge tone={r.change === "added" ? "green" : r.change === "removed" ? "rose" : "amber"}>{r.change}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-gray-500">{r.line.partNumber}</span> {r.line.description}
                  </td>
                  <td className="border-l border-gray-100 px-3 py-2 text-right text-gray-600 tabular">{unit(r.la, a.bom)}</td>
                  <td className="px-3 py-2 text-right tabular">{r.la ? money(r.ca) : "—"}</td>
                  <td className="border-l border-gray-100 px-3 py-2 text-right text-gray-600 tabular">{unit(r.lb, b.bom)}</td>
                  <td className="px-3 py-2 text-right tabular">{r.lb ? money(r.cb) : "—"}</td>
                  <td className={cx("px-5 py-2 text-right font-medium tabular", r.cb - r.ca > 0 ? "text-rose-600" : "text-emerald-600")}>
                    {r.cb - r.ca >= 0 ? "+" : ""}
                    {money(r.cb - r.ca)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
