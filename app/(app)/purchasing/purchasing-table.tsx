"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, ShoppingCart } from "lucide-react";
import type { ProcurementStatus } from "@/lib/types";
import { setLineStatus } from "@/lib/actions";
import { date, money } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { Button, EmptyState, cx } from "@/components/ui";
import { PROC } from "@/components/bom-editor";
import { run } from "@/components/toast";

export interface PurchaseRow {
  projectId: string;
  mtr: string;
  customer: string;
  dueDate: string;
  lineId: string;
  partNumber: string;
  description: string;
  mfr: string;
  qty: number;
  perUnit: number;
  uom: string;
  unitCost: number;
  supplier: string;
  contact: string;
  status: ProcurementStatus;
  poRef: string;
}

export function PurchasingTable({ rows: initial }: { rows: PurchaseRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"open" | ProcurementStatus | "all">("required");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [po, setPo] = useState("");

  const shown = rows.filter((r) => filter === "all" || (filter === "open" ? r.status === "required" || r.status === "ordered" : r.status === filter));
  const groups = useMemo(() => {
    const m = new Map<string, PurchaseRow[]>();
    for (const r of shown) m.set(r.supplier, [...(m.get(r.supplier) ?? []), r]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const update = async (targets: PurchaseRow[], status: ProcurementStatus, poRef?: string) => {
    setRows((rs) => rs.map((r) => (targets.some((t) => t.lineId === r.lineId) ? { ...r, status, poRef: poRef ?? r.poRef } : r)));
    for (const t of targets) await run(setLineStatus(t.projectId, t.lineId, status, poRef));
    setSelected(new Set());
    router.refresh();
  };

  const counts = (s: ProcurementStatus) => rows.filter((r) => r.status === s).length;
  const selRows = rows.filter((r) => selected.has(r.lineId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["required", `To order (${counts("required")})`],
            ["ordered", `On order (${counts("ordered")})`],
            ["received", `Received (${counts("received")})`],
            ["open", "Open"],
            ["all", "All"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cx("rounded-lg border px-3 py-1.5 text-sm font-medium", filter === k ? "border-ink-900 bg-ink-900 text-white" : "border-gray-200 bg-white text-gray-600")}
          >
            {l}
          </button>
        ))}
        <div className="ml-auto">
          <Button
            size="sm"
            icon={<Download className="size-4" />}
            onClick={() =>
              downloadCsv(
                "purchasing.csv",
                ["Supplier", "Contact", "Part #", "Manufacturer #", "Description", "Qty", "UOM", "Unit cost", "Ext.", "MTR", "Customer", "Due", "Status", "PO ref"],
                shown.map((r) => [r.supplier, r.contact, r.partNumber, r.mfr, r.description, r.qty, r.uom, r.unitCost.toFixed(2), (r.qty * r.unitCost).toFixed(2), r.mtr, r.customer, r.dueDate, PROC[r.status].label, r.poRef]),
              )
            }
          >
            Export CSV
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-ink-900 px-4 py-2.5 text-sm text-white shadow-lg">
          <span>
            {selected.size} line{selected.size > 1 ? "s" : ""} · {money(selRows.reduce((s, r) => s + r.qty * r.unitCost, 0))}
          </span>
          <input value={po} onChange={(e) => setPo(e.target.value)} placeholder="Our PO #" className="h-8 w-36 rounded-md border border-white/15 bg-white/5 px-2 text-sm outline-none focus:border-brand-500" />
          <Button size="sm" variant="primary" onClick={() => update(selRows, "ordered", po || undefined)}>
            Mark ordered
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-200 hover:bg-white/10" onClick={() => update(selRows, "received")}>
            Mark received
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-200 hover:bg-white/10" onClick={() => update(selRows, "stock")}>
            From stock
          </Button>
          <button className="ml-auto text-xs text-gray-400 hover:text-white" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <EmptyState icon={<ShoppingCart className="size-5" />} title="Nothing here">No build BOM lines in this state.</EmptyState>
        </div>
      ) : (
        groups.map(([supplier, items]) => {
          const allSel = items.every((i) => selected.has(i.lineId));
          return (
            <section key={supplier} className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xs">
              <header className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5">
                <input
                  type="checkbox"
                  className="accent-brand-600"
                  checked={allSel}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      items.forEach((i) => (allSel ? n.delete(i.lineId) : n.add(i.lineId)));
                      return n;
                    })
                  }
                />
                <h3 className="font-semibold text-gray-900">{supplier}</h3>
                {items[0].contact && <span className="text-xs text-gray-500">{items[0].contact}</span>}
                <span className="ml-auto text-sm font-medium tabular text-gray-700">{money(items.reduce((s, r) => s + r.qty * r.unitCost, 0))}</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-[13px]">
                  <tbody className="divide-y divide-gray-100">
                    {items.map((r) => (
                      <tr key={r.lineId} className="hover:bg-gray-50/60">
                        <td className="w-10 px-4 py-2">
                          <input
                            type="checkbox"
                            className="accent-brand-600"
                            checked={selected.has(r.lineId)}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(r.lineId)) n.delete(r.lineId);
                                else n.add(r.lineId);
                                return n;
                              })
                            }
                          />
                        </td>
                        <td className="w-24 px-2 py-2 font-mono text-xs font-semibold">{r.partNumber || "—"}</td>
                        <td className="px-2 py-2">
                          {r.description}
                          {r.mfr && <span className="ml-2 font-mono text-[11px] text-gray-400">{r.mfr}</span>}
                        </td>
                        <td className="w-24 px-2 py-2 text-right tabular">
                          {r.qty} {r.uom}
                          {r.qty !== r.perUnit && <div className="text-[10px] text-gray-400">{r.perUnit}/unit</div>}
                        </td>
                        <td className="w-24 px-2 py-2 text-right tabular">{money(r.qty * r.unitCost)}</td>
                        <td className="w-40 px-2 py-2">
                          <Link href={`/builds/${r.projectId}/bom`} className="font-mono text-xs font-semibold text-gray-800 hover:text-brand-700">
                            {r.mtr}
                          </Link>
                          <div className="truncate text-[11px] text-gray-500">
                            {r.customer} · due {date(r.dueDate)}
                          </div>
                        </td>
                        <td className="w-32 px-2 py-2">
                          <select
                            value={r.status}
                            onChange={(e) => update([r], e.target.value as ProcurementStatus)}
                            className={cx("w-full rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset outline-none", PROC[r.status].cls)}
                          >
                            {Object.entries(PROC).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="w-28 px-4 py-2 font-mono text-xs text-gray-500">{r.poRef || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
