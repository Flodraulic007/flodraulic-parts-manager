import Link from "next/link";
import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { getProjects } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { procurementProgress, qcProgress } from "@/lib/status";
import { BUILD_STATUS } from "@/lib/defaults";
import { STATUS, daysInStatus } from "@/lib/workflow";
import { date } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { cx } from "@/lib/cx";

export const metadata: Metadata = { title: "Production" };

export default async function ProductionPage() {
  await requireRole("manager", "production");
  const projects = await getProjects();
  const today = new Date().toISOString().slice(0, 10);
  const ready = projects.filter((p) => p.status === "ready_production").sort((a, b) => (a.build?.dueDate ?? "").localeCompare(b.build?.dueDate ?? ""));
  const inProd = projects.filter((p) => p.status === "in_production").sort((a, b) => (a.build?.dueDate ?? "").localeCompare(b.build?.dueDate ?? ""));
  const shipped = projects.filter((p) => p.status === "shipped").slice(0, 10);

  const Table = ({ rows, empty }: { rows: typeof projects; empty: string }) =>
    rows.length === 0 ? (
      <EmptyState icon={<Factory className="size-5" />} title={empty} />
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              {["MTR #", "Customer / description", "Pcs", "Serial #", "Status", "Parts ready", "QC", "Due", "In stage"].map((h) => (
                <th key={h} className="px-4 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p) => {
              const pr = procurementProgress(p);
              const qc = qcProgress(p);
              const overdue = p.build && p.build.dueDate < today && p.status !== "shipped";
              return (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-4 py-3 font-mono font-semibold">
                    <Link href={`/builds/${p.id}`} className="hover:text-brand-700">
                      {p.mtrNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.customer}</div>
                    <div className="text-xs text-gray-500">{p.description.replace(/_/g, " ")}</div>
                  </td>
                  <td className="px-4 py-3 tabular">{p.pcs}</td>
                  <td className="px-4 py-3 font-mono text-xs">{p.serialNumber || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[p.status].tone}>{p.status === "in_production" ? BUILD_STATUS[p.buildStatus].label : STATUS[p.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular">
                    {pr.ready}/{pr.total}
                  </td>
                  <td className="px-4 py-3 tabular">
                    {qc.done}/{qc.total}
                  </td>
                  <td className={cx("px-4 py-3", overdue ? "font-semibold text-rose-600" : "text-gray-600")}>{date(p.build?.dueDate)}</td>
                  <td className="px-4 py-3 text-gray-500 tabular">{daysInStatus(p)}d</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-8">
      <PageHeader eyebrow="Workflow" title="Production" subtitle="Builds that passed peer review and are released to the shop floor, by due date." />
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <h2 className="border-b border-gray-100 px-5 py-3.5 text-[15px] font-semibold">
          Ready for production <span className="ml-1 text-sm font-normal text-gray-500">{ready.length}</span>
        </h2>
        <Table rows={ready} empty="No builds waiting to start" />
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <h2 className="border-b border-gray-100 px-5 py-3.5 text-[15px] font-semibold">
          In production <span className="ml-1 text-sm font-normal text-gray-500">{inProd.length}</span>
        </h2>
        <Table rows={inProd} empty="Nothing in production" />
      </section>
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <h2 className="border-b border-gray-100 px-5 py-3.5 text-[15px] font-semibold">Recently shipped</h2>
        <Table rows={shipped} empty="Nothing shipped yet" />
      </section>
    </div>
  );
}
