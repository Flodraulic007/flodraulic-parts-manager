"use client";

import { AlertTriangle, ArrowDown, ArrowUp, Download, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Bom, BomLine, ProcurementStatus, Uom } from "@/lib/types";
import { bomTotals, labourRateCAD, lineTotal } from "@/lib/calc";
import { money, moneyUSD, pct, uid } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { Button, Card, cx } from "./ui";
import { PartPicker } from "./part-picker";

export interface CatalogInfo {
  cost: number;
  description: string;
  supplier: string;
  obsolete: boolean;
}

const UOMS: Uom[] = ["ea", "m", "ft", "hr", "lot"];
export const PROC: Record<ProcurementStatus, { label: string; cls: string }> = {
  required: { label: "To order", cls: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  ordered: { label: "Ordered", cls: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  received: { label: "Received", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  stock: { label: "From stock", cls: "bg-sky-50 text-sky-700 ring-sky-600/20" },
};

export function BomEditor({
  bom,
  onChange,
  editable,
  mode,
  catalog,
  title,
  exportName,
}: {
  bom: Bom;
  onChange: (b: Bom) => void;
  editable: boolean;
  mode: "quote" | "build";
  catalog: Record<string, CatalogInfo>;
  title?: string;
  exportName: string;
}) {
  const t = bomTotals(bom);
  const set = <K extends keyof Bom>(k: K, v: Bom[K]) => onChange({ ...bom, [k]: v });
  const setLine = (id: string, patch: Partial<BomLine>) => set("lines", bom.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => set("lines", bom.lines.filter((l) => l.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const parts = bom.lines.filter((l) => l.kind === "part");
    const i = parts.findIndex((l) => l.id === id);
    const j = i + dir;
    if (j < 0 || j >= parts.length) return;
    [parts[i], parts[j]] = [parts[j], parts[i]];
    set("lines", [...bom.lines.filter((l) => l.kind === "labour"), ...parts]);
  };

  const labour = bom.lines.filter((l) => l.kind === "labour");
  const parts = bom.lines.filter((l) => l.kind === "part");
  const stale = parts.filter((l) => catalog[l.partNumber] && Math.abs(catalog[l.partNumber].cost - l.unitCost) > 0.005);

  const addPart = (p: { partNumber: string; description: string; cost: number; supplier: string; link?: string; category?: string }) => {
    const existing = parts.find((l) => l.partNumber === p.partNumber);
    if (existing) return setLine(existing.id, { qty: existing.qty + 1 });
    catalog[p.partNumber] ??= { cost: p.cost, description: p.description, supplier: p.supplier, obsolete: false };
    set("lines", [
      ...bom.lines,
      {
        id: uid(),
        kind: "part",
        partNumber: p.partNumber,
        description: p.description,
        qty: 1,
        uom: p.category === "PBW" ? "m" : "ea",
        unitCost: p.cost,
        supplier: p.supplier,
        link: p.link || undefined,
        ...(mode === "build" ? { status: "required" as const } : {}),
      },
    ]);
  };

  const exportCsv = () =>
    downloadCsv(
      `${exportName}.csv`,
      ["Item", "Comp. #", "Component description", "Qty", "UOM", "Unit cost (CAD)", "Total (CAD)", "Supplier", ...(mode === "build" ? ["Status", "PO ref"] : []), "Link", "Notes"],
      [
        ...labour.map((l, i) => [i + 1, l.partNumber, l.description, l.qty, "hr", labourRateCAD(bom).toFixed(2), lineTotal(bom, l).toFixed(2), "", ...(mode === "build" ? ["", ""] : []), "", ""]),
        ...parts.map((l, i) => [
          labour.length + i + 1,
          l.partNumber,
          l.description,
          l.qty,
          l.uom,
          l.unitCost.toFixed(2),
          lineTotal(bom, l).toFixed(2),
          l.supplier ?? "",
          ...(mode === "build" ? [PROC[l.status ?? "required"].label, l.poRef ?? ""] : []),
          l.link ?? "",
          l.notes ?? "",
        ]),
        [],
        ["", "", "PARTS SUB TOTAL", "", "", "", t.partsSubtotal.toFixed(2)],
        ["", "", `PARTS SELL PRICE ${bom.targetMargin}% MARGIN`, "", "", "", t.partsSell.toFixed(2)],
        ["", "", "TOTAL LABOUR SELL", "", "", "", t.labourSell.toFixed(2)],
        ["", "", "BUILD COST (PARTS + LABOUR SELL)", "", "", "", t.buildCost.toFixed(2)],
        ["", "", "TOTAL COST WITH CERTIFICATION", "", "", "", t.totalWithCert.toFixed(2)],
        ["", "", "ACTUAL QUOTE PRICE", "", "", "", t.quotePrice.toFixed(2)],
        ["", "", "ACTUAL QUOTE PRICE [USD]", "", "", "", t.quotePriceUSD.toFixed(2)],
      ],
    );

  const num = (v: string) => (v === "" ? 0 : +v);

  return (
    <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-6">
        {/* Labour */}
        <Card
          title={title ? `${title} — Labour` : "Labour"}
          padded={false}
          actions={<span className="text-xs text-gray-500">Labour is sell price, not cost · {money(labourRateCAD(bom))}/hr CAD</span>}
        >
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-left text-xs text-gray-500">
              <tr>
                <th className="w-28 px-4 py-2 font-medium">Comp. #</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Hours</th>
                <th className="w-32 px-4 py-2 text-right font-medium">Sell</th>
                {editable && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labour.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-1.5 font-mono text-xs text-gray-500">{l.partNumber}</td>
                  <td className="px-2 py-1.5">
                    <input className="cell-input" value={l.description} disabled={!editable} onChange={(e) => setLine(l.id, { description: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} step={0.5} className="cell-input text-right tabular" value={l.qty} disabled={!editable} onChange={(e) => setLine(l.id, { qty: num(e.target.value) })} />
                  </td>
                  <td className="px-4 py-1.5 text-right tabular">{money(lineTotal(bom, l))}</td>
                  {editable && (
                    <td className="pr-2">
                      <IconBtn onClick={() => remove(l.id)} label="Remove">
                        <Trash2 className="size-3.5" />
                      </IconBtn>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50/60 text-sm">
                <td className="px-4 py-2" colSpan={2}>
                  {editable && (
                    <button
                      onClick={() =>
                        set("lines", [
                          ...labour,
                          { id: uid(), kind: "labour", partNumber: "LABOUR-PB", description: "ADDITIONAL LABOUR", qty: 0, uom: "hr", unitCost: 0 },
                          ...parts,
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      <Plus className="size-3.5" /> Add labour line
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular">{t.labourHours} h</td>
                <td className="px-4 py-2 text-right font-semibold tabular">{money(t.labourSell)}</td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        </Card>

        {/* Parts */}
        <Card
          title={
            <span className="flex items-center gap-2">
              {title ? `${title} — Components` : "Components"}
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">{parts.length}</span>
            </span>
          }
          padded={false}
          actions={
            <>
              {editable && stale.length > 0 && (
                <Button
                  size="sm"
                  icon={<RefreshCw className="size-3.5" />}
                  onClick={() => set("lines", bom.lines.map((l) => (catalog[l.partNumber] && l.kind === "part" ? { ...l, unitCost: catalog[l.partNumber].cost } : l)))}
                  title="Update unit costs to the current part ledger cost"
                >
                  Update {stale.length} price{stale.length > 1 ? "s" : ""}
                </Button>
              )}
              <Button size="sm" icon={<Download className="size-3.5" />} onClick={exportCsv}>
                CSV
              </Button>
            </>
          }
        >
          {editable && (
            <div className="border-b border-gray-100 bg-gray-50/50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <PartPicker onPick={(p) => addPart(p)} />
                </div>
                <Button
                  onClick={() =>
                    set("lines", [
                      ...bom.lines,
                      { id: uid(), kind: "part", partNumber: "", description: "", qty: 1, uom: "ea", unitCost: 0, ...(mode === "build" ? { status: "required" as const } : {}) },
                    ])
                  }
                  icon={<Plus className="size-4" />}
                >
                  Non-catalog line
                </Button>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-[13px]">
              <thead className="bg-gray-50/80 text-left text-xs text-gray-500">
                <tr>
                  <th className="w-10 px-3 py-2 text-center font-medium">#</th>
                  <th className="w-28 px-2 py-2 font-medium">Comp. #</th>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="w-20 px-2 py-2 text-right font-medium">Qty</th>
                  <th className="w-16 px-1 py-2 font-medium">UOM</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">Unit cost</th>
                  <th className="w-28 px-2 py-2 text-right font-medium">Total</th>
                  <th className="w-32 px-2 py-2 font-medium">Supplier</th>
                  {mode === "build" && <th className="w-32 px-2 py-2 font-medium">Status</th>}
                  {mode === "build" && <th className="w-28 px-2 py-2 font-medium">PO ref</th>}
                  <th className="w-20 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parts.map((l, i) => {
                  const cat = catalog[l.partNumber];
                  const isStale = cat && Math.abs(cat.cost - l.unitCost) > 0.005;
                  return (
                    <tr key={l.id} className="group align-middle hover:bg-gray-50/50">
                      <td className="px-3 py-1 text-center text-xs text-gray-400 tabular">{labour.length + i + 1}</td>
                      <td className="px-2 py-1">
                        <input
                          className="cell-input font-mono text-xs font-semibold"
                          value={l.partNumber}
                          disabled={!editable}
                          placeholder="—"
                          onChange={(e) => setLine(l.id, { partNumber: e.target.value.toUpperCase() })}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <input className="cell-input" value={l.description} disabled={!editable} placeholder="Description" onChange={(e) => setLine(l.id, { description: e.target.value })} />
                          {cat?.obsolete && <span className="rounded bg-rose-50 px-1 text-[10px] font-semibold text-rose-700" title="Marked obsolete in the part ledger">OBS</span>}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" min={0} className="cell-input text-right tabular" value={l.qty} disabled={!editable} onChange={(e) => setLine(l.id, { qty: num(e.target.value) })} />
                      </td>
                      <td className="px-1 py-1">
                        <select className="cell-input px-1" value={l.uom} disabled={!editable} onChange={(e) => setLine(l.id, { uom: e.target.value as Uom })}>
                          {UOMS.map((u) => (
                            <option key={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className={cx("cell-input text-right tabular", isStale && "pr-6")}
                            value={l.unitCost}
                            disabled={!editable}
                            onChange={(e) => setLine(l.id, { unitCost: num(e.target.value) })}
                          />
                          {isStale && (
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => setLine(l.id, { unitCost: cat.cost })}
                              title={`Part ledger cost is now ${money(cat.cost)}${editable ? " — click to use it" : ""}`}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-amber-500"
                            >
                              <AlertTriangle className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-right font-medium tabular">{money(lineTotal(bom, l))}</td>
                      <td className="px-2 py-1">
                        <input className="cell-input text-xs" value={l.supplier ?? ""} disabled={!editable} onChange={(e) => setLine(l.id, { supplier: e.target.value })} />
                      </td>
                      {mode === "build" && (
                        <td className="px-2 py-1">
                          <select
                            value={l.status ?? "required"}
                            disabled={!editable}
                            onChange={(e) => setLine(l.id, { status: e.target.value as ProcurementStatus })}
                            className={cx("w-full rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset outline-none", PROC[l.status ?? "required"].cls)}
                          >
                            {Object.entries(PROC).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      {mode === "build" && (
                        <td className="px-2 py-1">
                          <input className="cell-input text-xs" value={l.poRef ?? ""} placeholder={editable ? "PO #" : ""} disabled={!editable} onChange={(e) => setLine(l.id, { poRef: e.target.value })} />
                        </td>
                      )}
                      <td className="px-2 py-1">
                        <div className="flex items-center justify-end gap-0.5">
                          {l.link && (
                            <a href={l.link} target="_blank" rel="noreferrer" className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Supplier link">
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                          {editable && (
                            <span className="flex opacity-0 transition group-hover:opacity-100">
                              <IconBtn onClick={() => move(l.id, -1)} label="Move up">
                                <ArrowUp className="size-3.5" />
                              </IconBtn>
                              <IconBtn onClick={() => move(l.id, 1)} label="Move down">
                                <ArrowDown className="size-3.5" />
                              </IconBtn>
                              <IconBtn onClick={() => remove(l.id)} label="Remove" danger>
                                <Trash2 className="size-3.5" />
                              </IconBtn>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {parts.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-500">
                      No components yet. {editable && "Search the part ledger above to add parts."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Pricing panel */}
      <div className="space-y-4 2xl:sticky 2xl:top-36 2xl:self-start">
        <Card title="Pricing">
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Target margin" suffix="%" value={bom.targetMargin} disabled={!editable} onChange={(v) => set("targetMargin", v)} />
            <ParamInput label="Labour sell" suffix="USD/h" value={bom.labourRateUSD} disabled={!editable} onChange={(v) => set("labourRateUSD", v)} />
            <ParamInput label="CAD → USD" value={bom.cadToUsd} step={0.01} disabled={!editable} onChange={(v) => set("cadToUsd", v)} />
            <ParamInput label="Certification" suffix="CAD" value={bom.certificationCost} disabled={!editable} onChange={(v) => set("certificationCost", v)} />
          </div>
          <dl className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
            <Line label="Parts sub total" value={money(t.partsSubtotal)} />
            <Line label={`Parts sell @ ${bom.targetMargin}% margin`} value={money(t.partsSell)} />
            <Line label="Total labour sell" value={money(t.labourSell)} />
            <Line label="Build cost (parts + labour sell)" value={money(t.buildCost)} />
            <Line label="Total with certification" value={money(t.totalWithCert)} strong />
          </dl>
        </Card>

        <div className="rounded-xl bg-ink-900 p-5 text-white shadow-lg">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Actual quote price · per unit</div>
          <div className="mt-1 text-3xl font-semibold tabular">{money(t.quotePrice)}</div>
          <div className="text-sm text-gray-400 tabular">{moneyUSD(t.quotePriceUSD)} USD</div>
          <label className="mt-4 block">
            <span className="text-xs text-gray-400">Override price (blank = suggested {money(t.suggestedPrice)})</span>
            <input
              type="number"
              disabled={!editable}
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-brand-500 disabled:opacity-60"
              placeholder={String(t.suggestedPrice)}
              value={bom.actualQuotePrice ?? ""}
              onChange={(e) => set("actualQuotePrice", e.target.value === "" ? null : +e.target.value)}
            />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <div className="text-xs text-gray-400">Actual margin (parts)</div>
              <div className={cx("text-lg font-semibold tabular", t.belowTarget ? "text-amber-400" : "text-emerald-400")}>{pct(t.actualMargin)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Gross margin</div>
              <div className="text-lg font-semibold tabular">{pct(t.overallMargin)}</div>
            </div>
          </div>
          {t.belowTarget && (
            <p className="mt-3 flex gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="size-4 shrink-0" />
              Parts margin is below the {bom.targetMargin}% target.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cx("rounded p-1 text-gray-400", danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-gray-100 hover:text-gray-700")}>
      {children}
    </button>
  );
}

function ParamInput({ label, value, onChange, suffix, step = 1, disabled }: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <div className="relative">
        <input type="number" step={step} className="field h-9 pr-12 text-right tabular" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? 0 : +e.target.value)} />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">{suffix}</span>}
      </div>
    </label>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={strong ? "font-semibold text-gray-900" : "text-gray-500"}>{label}</dt>
      <dd className={cx("tabular", strong ? "font-semibold text-gray-900" : "text-gray-800")}>{value}</dd>
    </div>
  );
}
