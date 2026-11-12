import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, FileText, PackageCheck, TrendingUp, Wrench } from "lucide-react";
import { getProjects } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { projectValue, quoteNumber } from "@/lib/calc";
import { projectAlerts, projectStatus } from "@/lib/status";
import { daysInStatus, tasksFor } from "@/lib/workflow";
import type { ProjectStatus } from "@/lib/types";
import { money0, relative } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { cx } from "@/lib/cx";
import { ProjectTable } from "@/components/project-table";

export const metadata: Metadata = { title: "Overview" };

export default async function Dashboard() {
  const user = await requireUser();
  const projects = await getProjects();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const quotes = projects.filter((p) => p.stage === "quote");
  const open = quotes.filter((p) => !["lost", "hold"].includes(p.status));
  const sent = quotes.filter((p) => p.status === "sent");
  const builds = projects.filter((p) => p.stage === "build");
  const active = builds.filter((p) => p.status !== "shipped");
  const shippedMonth = builds.filter((p) => p.status === "shipped" && (p.build?.shippedAt ?? p.updatedAt) >= monthStart);
  const tasks = tasksFor(projects, user);
  const manager = user.role === "manager";
  const won = projects.filter((p) => !p.isRepeat && p.quoteStatus === "approved").length;
  const lost = quotes.filter((p) => p.quoteStatus === "lost").length;
  const winRate = won + lost > 0 ? won / (won + lost) : null;
  const alerts = projectAlerts(projects);

  const buckets: { key: string; label: string; href: string; statuses: ProjectStatus[]; color: string }[] = [
    { key: "draft", label: "Drafting", href: "/pipeline", statuses: ["drafting", "quote_returned", "revision_requested"], color: "bg-slate-400" },
    { key: "review", label: "In review", href: "/pipeline", statuses: ["quote_review", "awaiting_manager"], color: "bg-violet-500" },
    { key: "sent", label: "With client", href: "/quotes?status=sent", statuses: ["sent"], color: "bg-blue-500" },
    { key: "po", label: "PO received", href: "/builds?status=po_received", statuses: ["po_received"], color: "bg-teal-500" },
    { key: "build", label: "Building", href: "/builds", statuses: ["building", "build_returned"], color: "bg-blue-700" },
    { key: "breview", label: "Build review", href: "/builds?status=build_review", statuses: ["build_review"], color: "bg-violet-700" },
    { key: "prod", label: "Production", href: "/production", statuses: ["ready_production", "in_production"], color: "bg-orange-500" },
    { key: "shipped", label: "Shipped", href: "/builds?status=shipped", statuses: ["shipped"], color: "bg-emerald-500" },
  ];
  const pipeline = buckets.map((b) => ({ ...b, n: projects.filter((p) => b.statuses.includes(p.status)).length }));
  const maxN = Math.max(1, ...pipeline.map((p) => p.n));

  const activity = projects
    .flatMap((p) => p.activity.slice(0, 5).map((a) => ({ ...a, p })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting}, ${user.name.split(" ")[0]}`}
        subtitle={`${open.length} open quotes · ${active.length} panels in the shop · ${alerts.length} items need attention`}
      />

      <Card
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4 text-brand-600" /> My tasks
            {tasks.length > 0 && <Badge tone="red" dot={false}>{tasks.length}</Badge>}
          </span>
        }
        padded={false}
      >
        {tasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-5" />} title="Nothing waiting on you">
            New assignments, review requests and returned work will show up here.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tasks.map((tk) => {
              const p = projects.find((x) => x.id === tk.id)!;
              const days = daysInStatus(p);
              return (
                <li key={tk.id + tk.action}>
                  <Link href={tk.href} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-gray-50">
                    <Badge tone={tk.tone}>{tk.action}</Badge>
                    <span className="font-mono text-sm font-semibold text-gray-900">{tk.title}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-600">{tk.detail}</span>
                    <span className={cx("text-xs tabular", days >= 3 ? "font-semibold text-rose-600" : "text-gray-500")}>
                      {days === 0 ? "today" : `${days}d waiting`}
                    </span>
                    <ArrowRight className="size-4 text-gray-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {manager && (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Open quotes" value={open.length} sub={`${money0(open.reduce((s, p) => s + projectValue(p), 0))} in pipeline`} icon={<FileText className="size-4" />} tone="blue" />
        <Stat label="Awaiting customer" value={sent.length} sub={money0(sent.reduce((s, p) => s + projectValue(p), 0))} icon={<ArrowRight className="size-4" />} tone="violet" />
        <Stat label="In build" value={active.length} sub={money0(active.reduce((s, p) => s + projectValue(p), 0))} icon={<Wrench className="size-4" />} tone="amber" />
        <Stat label="Shipped this month" value={shippedMonth.length} sub={`${shippedMonth.reduce((s, p) => s + p.pcs, 0)} panels`} icon={<PackageCheck className="size-4" />} tone="green" />
        <Stat label="Win rate" value={winRate == null ? "—" : `${Math.round(winRate * 100)}%`} sub={`${won} won · ${lost} lost`} icon={<TrendingUp className="size-4" />} tone="red" />
      </div>
      )}

      <Card className="mt-6" title="Pipeline" actions={manager ? <Link href="/pipeline" className="text-sm font-medium text-brand-600">Stage overview →</Link> : <span className="text-xs text-gray-500">Quote → Build → Ship</span>}>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {pipeline.map((s, i) => (
            <Link key={s.key} href={s.href} className="group rounded-lg p-2 transition hover:bg-gray-50">
              <div className="flex h-20 items-end">
                <div className={cx("w-full rounded-md transition-all group-hover:opacity-80", s.color)} style={{ height: `${Math.max(6, (s.n / maxN) * 100)}%` }} />
              </div>
              <div className="mt-2 text-xl font-semibold tabular text-gray-900">{s.n}</div>
              <div className="text-xs leading-tight text-gray-500">
                {s.label}
                {i === 2 && <span className="block text-[10px] text-gray-400">end of quote stage</span>}
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[1fr_380px]">
        <Card title="Project status" padded={false} actions={<Link href="/projects" className="text-sm font-medium text-brand-600 hover:text-brand-700">Full register →</Link>}>
          <ProjectTable projects={projects.filter((p) => p.status !== "shipped" && p.status !== "lost").map((p) => ({
            id: p.id,
            stage: p.stage,
            quote: quoteNumber(p),
            mtr: p.mtrNumber,
            customer: p.customer,
            description: p.description,
            pcs: p.pcs,
            status: projectStatus(p),
            value: projectValue(p),
            updatedAt: p.updatedAt,
            quotedBy: p.quotedBy,
          }))} compact />
        </Card>

        <div className="space-y-6">
          <Card title={<span className="flex items-center gap-2">Needs attention {alerts.length > 0 && <Badge tone="red" dot={false}>{alerts.length}</Badge>}</span>} padded={false}>
            {alerts.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="size-5" />} title="All clear">Nothing overdue or expiring.</EmptyState>
            ) : (
              <ul className="max-h-[360px] divide-y divide-gray-100 overflow-y-auto">
                {alerts.slice(0, 12).map((a) => (
                  <li key={a.id}>
                    <Link href={a.href} className="flex gap-3 px-5 py-3 hover:bg-gray-50">
                      <AlertTriangle
                        className={cx("mt-0.5 size-4 shrink-0", { rose: "text-rose-500", amber: "text-amber-500", orange: "text-orange-500" }[a.tone as string] ?? "text-gray-400")}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">{a.title}</div>
                        <div className="truncate text-xs text-gray-500">{a.detail}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent activity" padded={false}>
            <ol className="relative px-5 py-4">
              {activity.map((a, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < activity.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-gray-200" />}
                  <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white bg-brand-500 ring-1 ring-gray-200" />
                  <div className="min-w-0">
                    <Link href={a.p.stage === "build" ? `/builds/${a.p.id}` : `/quotes/${a.p.id}`} className="text-sm text-gray-800 hover:text-brand-700">
                      {a.text}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {a.user} · {a.p.customer} · {relative(a.at)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
