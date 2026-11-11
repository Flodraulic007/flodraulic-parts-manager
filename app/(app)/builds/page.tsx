import Link from "next/link";
import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { getProjects } from "@/lib/data";
import { BUILD_FLOW, BUILD_STATUS } from "@/lib/defaults";
import { quoteNumber } from "@/lib/calc";
import { procurementProgress, qcProgress } from "@/lib/status";
import { date } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { BuildStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Build" };

export default async function BuildsPage({ searchParams }: { searchParams: Promise<{ status?: string; view?: string }> }) {
  const { status = "active", view = "board" } = await searchParams;
  const builds = (await getProjects()).filter((p) => p.stage === "build");
  const today = new Date().toISOString().slice(0, 10);
  const filtered = builds.filter((p) => (status === "all" ? true : status === "active" ? p.buildStatus !== "shipped" : p.buildStatus === status));
  const columns: BuildStatus[] = status === "all" ? BUILD_FLOW : status === "active" ? BUILD_FLOW.filter((s) => s !== "shipped") : [status as BuildStatus];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Workflow"
        title="Build (MTR)"
        subtitle="Approved quotes and repeat orders, tracked by MTR #. Open a job for its BOM, build summary, F5 and QC checklist."
        actions={
          <div className="flex rounded-lg bg-gray-200/70 p-0.5">
            {["board", "list"].map((v) => (
              <Link
                key={v}
                href={`/builds?status=${status}&view=${v}`}
                className={cx("rounded-md px-3 py-1.5 text-sm font-medium capitalize", view === v ? "bg-white shadow-sm" : "text-gray-500")}
              >
                {v}
              </Link>
            ))}
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap gap-1.5">
        {[["active", "Active"], ...BUILD_FLOW.map((s) => [s, BUILD_STATUS[s].label]), ["all", "All"]].map(([k, l]) => (
          <Link
            key={k}
            href={`/builds?status=${k}&view=${view}`}
            className={cx(
              "rounded-lg border px-3 py-1.5 text-sm font-medium",
              status === k ? "border-ink-900 bg-ink-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            {l}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <EmptyState icon={<Wrench className="size-5" />} title="No builds here">Approve a quote to release it to build.</EmptyState>
        </div>
      ) : view === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const items = filtered.filter((p) => p.buildStatus === col);
            return (
              <div key={col} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <Badge tone={BUILD_STATUS[col].tone}>{BUILD_STATUS[col].label}</Badge>
                  <span className="text-xs font-semibold text-gray-400">{items.length}</span>
                </div>
                <div className="space-y-2.5 rounded-xl bg-gray-200/40 p-2">
                  {items.map((p) => {
                    const pr = procurementProgress(p);
                    const qc = qcProgress(p);
                    const overdue = p.build && p.build.dueDate < today && p.buildStatus !== "shipped";
                    return (
                      <Link key={p.id} href={`/builds/${p.id}`} className="block rounded-lg border border-gray-200 bg-white p-3.5 shadow-xs transition hover:border-brand-200 hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-sm font-bold text-gray-900">{p.mtrNumber}</span>
                          {p.isRepeat ? <Badge tone="violet" dot={false}>Repeat</Badge> : <span className="font-mono text-[11px] text-gray-400">{quoteNumber(p)}</span>}
                        </div>
                        <div className="mt-1.5 text-sm font-medium text-gray-800">{p.customer}</div>
                        <div className="line-clamp-2 text-xs text-gray-500">{p.description.replace(/_/g, " ")}</div>
                        <div className="mt-3 space-y-1.5">
                          <Bar label="Parts" n={pr.ready} total={pr.total} color="bg-sky-500" />
                          <Bar label="QC" n={qc.done} total={qc.total} color="bg-emerald-500" />
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                          <span>{p.pcs} pc{p.serialNumber ? ` · ${p.serialNumber}` : ""}</span>
                          <span className={overdue ? "font-semibold text-rose-600" : ""}>Due {date(p.build?.dueDate)}</span>
                        </div>
                      </Link>
                    );
                  })}
                  {items.length === 0 && <div className="py-6 text-center text-xs text-gray-400">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                {["MTR #", "Quote #", "Customer / description", "Pcs", "Serial #", "Status", "Parts ready", "QC", "Due"].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const pr = procurementProgress(p);
                const qc = qcProgress(p);
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono font-semibold"><Link href={`/builds/${p.id}`} className="hover:text-brand-700">{p.mtrNumber}</Link></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{quoteNumber(p)}</td>
                    <td className="px-4 py-3"><div className="font-medium">{p.customer}</div><div className="text-xs text-gray-500">{p.description.replace(/_/g, " ")}</div></td>
                    <td className="px-4 py-3 tabular">{p.pcs}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.serialNumber || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><Badge tone={BUILD_STATUS[p.buildStatus].tone}>{BUILD_STATUS[p.buildStatus].label}</Badge></td>
                    <td className="px-4 py-3 tabular">{pr.ready}/{pr.total}</td>
                    <td className="px-4 py-3 tabular">{qc.done}/{qc.total}</td>
                    <td className="px-4 py-3 text-gray-600">{date(p.build?.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Bar({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-gray-500">
      <span className="w-8">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
        <div className={cx("h-full rounded-full", color)} style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
      </div>
      <span className="w-9 text-right tabular">{n}/{total}</span>
    </div>
  );
}
