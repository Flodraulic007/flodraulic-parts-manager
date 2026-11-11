"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import type { Tone } from "@/lib/defaults";
import { money0, relative } from "@/lib/format";
import { Badge, EmptyState, cx } from "./ui";

export interface ProjectRow {
  id: string;
  stage: string;
  quote: string;
  mtr: string;
  customer: string;
  description: string;
  pcs: number;
  status: { label: string; tone: Tone; stage: string; progress: number };
  value: number;
  updatedAt: string;
  quotedBy: string;
}

type SortKey = "quote" | "mtr" | "customer" | "value" | "updatedAt" | "progress";

export function ProjectTable({ projects, compact }: { projects: ProjectRow[]; compact?: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "updatedAt", dir: -1 });
  const [stage, setStage] = useState<"all" | "quote" | "build">("all");

  const rows = useMemo(() => {
    const r = projects.filter((p) => stage === "all" || p.stage === stage);
    const val = (p: ProjectRow): string | number => (sort.key === "progress" ? p.status.progress : (p[sort.key] as string | number));
    return r.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * sort.dir);
  }, [projects, sort, stage]);

  const H = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={cx("px-4 py-2.5 font-medium", className)}>
      <button
        onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? ((-s.dir) as 1 | -1) : 1 }))}
        className="inline-flex items-center gap-1 hover:text-gray-900"
      >
        {children}
        <ArrowUpDown className={cx("size-3", sort.key === k ? "text-brand-600" : "text-gray-300")} />
      </button>
    </th>
  );

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-100 px-4 py-2">
        {(["all", "quote", "build"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={cx(
              "rounded-md px-2.5 py-1 text-xs font-medium capitalize",
              stage === s ? "bg-ink-900 text-white" : "text-gray-500 hover:bg-gray-100",
            )}
          >
            {s === "all" ? `All (${projects.length})` : `${s} (${projects.filter((p) => p.stage === s).length})`}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/80 text-xs text-gray-500">
            <tr>
              <H k="quote">Quote #</H>
              <H k="mtr">MTR #</H>
              <H k="customer">Customer / description</H>
              {!compact && <th className="px-4 py-2.5 font-medium">Quoted by</th>}
              <H k="progress">Status</H>
              <H k="value" className="text-right">Value</H>
              <H k="updatedAt" className="text-right">Updated</H>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p) => {
              const href = p.stage === "build" ? `/builds/${p.id}` : `/quotes/${p.id}`;
              return (
                <tr key={p.id} className="group hover:bg-gray-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px]">
                    <Link href={href} className="font-semibold text-gray-900 group-hover:text-brand-700">
                      {p.quote}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-gray-700">{p.mtr}</td>
                  <td className="max-w-[340px] px-4 py-3">
                    <Link href={href} className="block">
                      <div className="font-medium text-gray-900">{p.customer}</div>
                      <div className="truncate text-xs text-gray-500">{p.description.replace(/_/g, " ")}</div>
                    </Link>
                  </td>
                  {!compact && <td className="whitespace-nowrap px-4 py-3 text-gray-600">{p.quotedBy}</td>}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-10 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{p.status.stage}</span>
                        <Badge tone={p.status.tone}>{p.status.label}</Badge>
                      </div>
                      <div className="ml-12 h-1 w-28 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(p.status.progress * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular text-gray-900">{p.value ? money0(p.value) : "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs text-gray-500">{relative(p.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <EmptyState title="No projects here yet" />}
      </div>
    </div>
  );
}
