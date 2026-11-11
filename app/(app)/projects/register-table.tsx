"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Download, Plus, Search } from "lucide-react";
import type { Tone } from "@/lib/defaults";
import { updateProjectInfo } from "@/lib/actions";
import { date } from "@/lib/format";
import { Badge, Button, cx } from "@/components/ui";
import { run } from "@/components/toast";
import { downloadCsv } from "@/lib/csv";

interface Row {
  id: string;
  stage: string;
  quote: string;
  isRepeat: boolean;
  mtr: string;
  serial: string;
  customer: string;
  description: string;
  pcs: number;
  csa: boolean;
  ul: boolean;
  qps: boolean;
  po: string;
  quotedBy: string;
  status: { label: string; tone: Tone; stage: string };
  createdAt: string;
}

export function RegisterTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const shown = useMemo(() => {
    const s = q.toLowerCase();
    const r = rows.filter(
      (x) =>
        (stage === "all" || x.stage === stage || (stage === "repeat" && x.isRepeat)) &&
        (!s || `${x.quote} ${x.mtr} ${x.serial} ${x.customer} ${x.description} ${x.po} ${x.quotedBy}`.toLowerCase().includes(s)),
    );
    return order === "desc" ? [...r].reverse() : r;
  }, [rows, q, stage, order]);

  const exportCsv = () =>
    downloadCsv(
      "project-register.csv",
      ["QUOTE #", "MTR #", "SERIAL NUMBER", "CUSTOMER", "DESCRIPTION", "PCS", "CSA", "UL", "QPS", "PO NUMBER", "QUOTED BY", "STATUS"],
      shown.map((r) => [r.quote, r.mtr, r.serial, r.customer, r.description, r.pcs, r.csa ? "Y" : "", r.ul ? "Y" : "", r.qps ? "Y" : "", r.po, r.quotedBy, `${r.status.stage}: ${r.status.label}`]),
    );

  return (
    <div className="rounded-xl border border-gray-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter register…" className="field h-9 pl-8 text-sm" />
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {[
            ["all", "All"],
            ["quote", "Quoting"],
            ["build", "Build"],
            ["repeat", "Repeats"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setStage(k)}
              className={cx("rounded-md px-3 py-1 text-xs font-medium", stage === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}
            >
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))} className="text-xs font-medium text-gray-500 hover:text-gray-800">
          {order === "desc" ? "Newest first" : "Oldest first"}
        </button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" icon={<Download className="size-4" />} onClick={exportCsv}>
            Export CSV
          </Button>
          <Button size="sm" variant="primary" icon={<Plus className="size-4" />} onClick={() => window.dispatchEvent(new Event("fd:new-quote"))}>
            New Quote
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1360px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-ink-900 text-[11px] uppercase tracking-wider text-gray-300">
              <th className="px-3 py-2.5 font-semibold">Quote #</th>
              <th className="px-3 py-2.5 font-semibold">MTR #</th>
              <th className="px-3 py-2.5 font-semibold">Serial number</th>
              <th className="px-3 py-2.5 font-semibold">Customer</th>
              <th className="px-3 py-2.5 font-semibold">Description</th>
              <th className="px-3 py-2.5 text-center font-semibold">Pcs</th>
              <th className="px-2 py-2.5 text-center font-semibold">CSA</th>
              <th className="px-2 py-2.5 text-center font-semibold">UL</th>
              <th className="px-2 py-2.5 text-center font-semibold">QPS</th>
              <th className="px-3 py-2.5 font-semibold">PO number</th>
              <th className="px-3 py-2.5 font-semibold">Quoted by</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((r) => {
              const href = r.stage === "build" ? `/builds/${r.id}` : `/quotes/${r.id}`;
              return (
                <tr key={r.id} className="hover:bg-brand-50/30">
                  <td className="whitespace-nowrap px-3 py-2 font-mono">
                    <Link href={href} className={cx("font-semibold hover:text-brand-700", r.isRepeat ? "text-violet-700" : "text-gray-900")}>
                      {r.quote}
                    </Link>
                    <div className="font-sans text-[11px] text-gray-400">{date(r.createdAt)}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-gray-800">{r.mtr}</td>
                  <td className="min-w-[200px] px-1 py-1">
                    <InlineEdit value={r.serial} placeholder="Assign…" onSave={(v) => updateProjectInfo(r.id, { serialNumber: v })} disabled={r.stage !== "build"} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">{r.customer}</td>
                  <td className="max-w-[320px] truncate px-3 py-2 text-gray-600" title={r.description}>
                    {r.description}
                  </td>
                  <td className="px-3 py-2 text-center tabular">{r.pcs}</td>
                  {(["csa", "ul", "qps"] as const).map((k) => (
                    <td key={k} className="px-2 py-2 text-center">
                      {r[k] && <Check className="mx-auto size-4 text-brand-600" strokeWidth={3} />}
                    </td>
                  ))}
                  <td className="min-w-[120px] px-1 py-1">
                    <InlineEdit value={r.po} placeholder="—" onSave={(v) => updateProjectInfo(r.id, { poNumber: v })} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{r.quotedBy}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <Badge tone={r.status.tone}>{r.status.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">{shown.length} projects</div>
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  placeholder,
  disabled,
}: {
  value: string;
  onSave: (v: string) => Promise<{ ok: boolean; error?: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      className="cell-input font-mono placeholder:font-sans placeholder:text-gray-300"
      value={v}
      placeholder={disabled ? "" : placeholder}
      disabled={disabled}
      title={disabled ? "Serial numbers are assigned once the project is in build" : undefined}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={() => v !== value && run(onSave(v.trim()), "Saved")}
    />
  );
}
