import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardCheck, PackageSearch, TrendingDown } from "lucide-react";
import { getProject, getSettings } from "@/lib/data";
import { bomTotals, projectValue, quoteNumber } from "@/lib/calc";
import { procurementProgress, qcProgress } from "@/lib/status";
import { date, money } from "@/lib/format";
import { Card, Stat } from "@/components/ui";
import { ProjectInfoForm } from "@/components/project-info-form";
import { ActivityList } from "@/components/activity-list";
import { BuildMetaForm } from "./build-meta-form";

export default async function BuildOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p?.build) notFound();
  const b = p.build;
  const approved = p.revisions.find((r) => r.rev === b.approvedRev);
  const quotedCost = approved ? bomTotals(approved.bom).partsSubtotal : null;
  const buildCost = bomTotals(b.bom).partsSubtotal;
  const variance = quotedCost == null ? null : buildCost - quotedCost;
  const pr = procurementProgress(p);
  const qc = qcProgress(p);
  const today = new Date().toISOString().slice(0, 10);
  const daysLeft = Math.round((new Date(b.dueDate).getTime() - new Date(today).getTime()) / 86400000);
  const original = p.repeatOf ? await getProject(p.repeatOf) : null;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Due date"
          value={date(b.dueDate)}
          sub={p.buildStatus === "shipped" ? `Shipped ${date(b.shippedAt)}` : daysLeft < 0 ? `${-daysLeft} days overdue` : `${daysLeft} days left`}
          icon={<CalendarClock className="size-4" />}
          tone={p.buildStatus !== "shipped" && daysLeft < 0 ? "rose" : "blue"}
        />
        <Stat label="Parts ready" value={`${pr.ready}/${pr.total}`} sub={`${pr.ordered} on order · ${pr.outstanding} to order`} icon={<PackageSearch className="size-4" />} tone={pr.outstanding ? "orange" : "green"} />
        <Stat label="QC checklist" value={`${qc.done}/${qc.total}`} sub={qc.done === qc.total ? "Complete" : "In progress"} icon={<ClipboardCheck className="size-4" />} tone={qc.done === qc.total ? "green" : "violet"} />
        <Stat
          label="Parts cost vs quote"
          value={variance == null ? money(buildCost) : `${variance >= 0 ? "+" : ""}${money(variance)}`}
          sub={quotedCost == null ? "Repeat order — no quote baseline" : `Quoted ${money(quotedCost)} · now ${money(buildCost)}`}
          icon={<TrendingDown className="size-4" />}
          tone={variance != null && variance > 0 ? "rose" : "green"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <ProjectInfoForm
            id={p.id}
            showSerial
            info={{ customer: p.customer, description: p.description, pcs: p.pcs, csa: p.csa, ul: p.ul, qps: p.qps, poNumber: p.poNumber, quotedBy: p.quotedBy, serialNumber: p.serialNumber }}
            team={settings.team.map((t) => t.name)}
          />
          <BuildMetaForm id={p.id} dueDate={b.dueDate} assignedTo={b.assignedTo} team={settings.team.map((t) => t.name)} />
          <Card title="Source">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-500">Quote #</dt>
                <dd className="mt-0.5 font-mono font-semibold">
                  {approved ? <Link href={`/quotes/${p.id}`} className="text-brand-700 hover:underline">{quoteNumber(p)}</Link> : "REPEAT"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Approved</dt>
                <dd className="mt-0.5">{date(b.approvedAt)} · {b.approvedBy}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Contract value</dt>
                <dd className="mt-0.5 font-semibold tabular">{money(projectValue(p))}</dd>
              </div>
              {original && (
                <div className="sm:col-span-3">
                  <dt className="text-xs text-gray-500">Repeat of</dt>
                  <dd className="mt-0.5">
                    <Link href={original.stage === "build" ? `/builds/${original.id}` : `/quotes/${original.id}`} className="font-mono text-brand-700 hover:underline">
                      {original.mtrNumber} ({quoteNumber(original)})
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
        <Card title="Activity">
          <ActivityList items={p.activity} />
        </Card>
      </div>
    </div>
  );
}
