import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, DollarSign, Layers, Percent } from "lucide-react";
import { getProject, getSettings } from "@/lib/data";
import { bomTotals, currentRevision, quoteTotals, validUntil } from "@/lib/calc";
import { date, money, pct } from "@/lib/format";
import { Card, Stat } from "@/components/ui";
import { ProjectInfoForm } from "@/components/project-info-form";
import { ActivityList } from "@/components/activity-list";

export default async function QuoteOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  const r = currentRevision(p)!;
  const bt = bomTotals(r.bom);
  const qt = quoteTotals(r.quote, r.bom);
  const parts = r.bom.lines.filter((l) => l.kind === "part").length;
  const today = new Date().toISOString().slice(0, 10);
  const until = validUntil(r.quote);

  const steps = [
    { label: "Quote created", done: true, at: p.createdAt },
    { label: "BOM priced", done: parts > 0 && bt.labourHours > 0 },
    { label: "Issued to customer", done: p.revisions.some((x) => x.issuedAt), at: p.revisions.find((x) => x.issuedAt)?.issuedAt },
    { label: "Approved / PO received", done: p.quoteStatus === "approved" },
    { label: "Released to build", done: p.stage === "build", at: p.build?.approvedAt },
  ];

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Quote total (subtotal)" value={money(qt.subtotal)} sub={`${p.pcs} pc × ${money(bt.quotePrice)}`} icon={<DollarSign className="size-4" />} tone="blue" />
        <Stat label="Parts margin" value={pct(bt.actualMargin)} sub={`Target ${r.bom.targetMargin}%`} icon={<Percent className="size-4" />} tone={bt.belowTarget ? "amber" : "green"} />
        <Stat label="Components" value={parts} sub={`${money(bt.partsSubtotal)} parts cost`} icon={<Layers className="size-4" />} tone="violet" />
        <Stat label="Labour" value={`${bt.labourHours} h`} sub={money(bt.labourSell)} icon={<Clock className="size-4" />} tone="orange" />
      </div>

      <Card title="Progress">
        <ol className="grid gap-4 sm:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-start gap-3 sm:flex-col sm:gap-2">
              <div className="flex w-full items-center gap-2">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-400 ring-1 ring-gray-200"}`}
                >
                  {i + 1}
                </span>
                {i < steps.length - 1 && <span className={`hidden h-0.5 flex-1 rounded sm:block ${s.done ? "bg-brand-200" : "bg-gray-100"}`} />}
              </div>
              <div>
                <div className={`text-sm font-medium ${s.done ? "text-gray-900" : "text-gray-400"}`}>{s.label}</div>
                {s.at && <div className="text-xs text-gray-500">{date(s.at)}</div>}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <ProjectInfoForm
            id={p.id}
            info={{ customer: p.customer, description: p.description, pcs: p.pcs, csa: p.csa, ul: p.ul, qps: p.qps, poNumber: p.poNumber, quotedBy: p.quotedBy, serialNumber: p.serialNumber }}
            team={settings.team.map((t) => t.name)}
          />
          <Card title="Current revision" actions={<Link href={`/quotes/${p.id}/revisions`} className="text-sm font-medium text-brand-600">All revisions →</Link>}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Item k="Quote #" v={<span className="font-mono font-semibold">{r.quoteNumber}</span>} />
              <Item k="Status" v={<span className="capitalize">{r.status}</span>} />
              <Item k="Quote date" v={date(r.quote.quoteDate)} />
              <Item k="Valid until" v={<span className={p.quoteStatus === "sent" && until < today ? "font-semibold text-rose-600" : ""}>{date(until)}</span>} />
              <Item k="Attention" v={r.quote.attention || "—"} />
              <Item k="Designer" v={r.quote.designerName || "—"} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/quotes/${p.id}/quote`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                Open quote <ArrowRight className="size-4" />
              </Link>
              <Link href={`/quotes/${p.id}/bom`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                Open BOM <ArrowRight className="size-4" />
              </Link>
            </div>
          </Card>
        </div>
        <Card title="Activity">
          <ActivityList items={p.activity} />
        </Card>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{k}</dt>
      <dd className="mt-0.5 text-gray-900">{v}</dd>
    </div>
  );
}
