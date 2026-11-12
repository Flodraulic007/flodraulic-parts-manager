import Link from "next/link";
import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { getProjects, getUsers } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { projectValue } from "@/lib/calc";
import { STATUS, daysInStatus } from "@/lib/workflow";
import { money0 } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { ProjectStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Stage overview" };

const COLUMNS: { title: string; statuses: ProjectStatus[]; warnAfter: number }[] = [
  { title: "Drafting", statuses: ["drafting", "quote_returned", "revision_requested"], warnAfter: 5 },
  { title: "Peer review", statuses: ["quote_review"], warnAfter: 2 },
  { title: "Awaiting manager", statuses: ["awaiting_manager"], warnAfter: 1 },
  { title: "Sent to client", statuses: ["sent"], warnAfter: 14 },
  { title: "PO received / building", statuses: ["po_received", "building", "build_returned"], warnAfter: 10 },
  { title: "Build review", statuses: ["build_review"], warnAfter: 2 },
  { title: "Production", statuses: ["ready_production", "in_production"], warnAfter: 21 },
];

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ who?: string }> }) {
  await requireRole("manager");
  const { who } = await searchParams;
  const [projects, users] = await Promise.all([getProjects(), getUsers()]);
  const nameOf = (u?: string) => users.find((x) => x.username === u)?.name ?? "Unassigned";
  const visible = projects.filter((p) => !who || p.assignee === who || p.reviewer === who);
  const stuck = visible.filter((p) => {
    const col = COLUMNS.find((c) => c.statuses.includes(p.status));
    return col && daysInStatus(p) > col.warnAfter;
  }).length;

  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Manager"
        title="Stage overview"
        subtitle={`Every open project grouped by stage, with how long it has been there. ${stuck} project${stuck === 1 ? "" : "s"} past the usual time for their stage.`}
      />
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm text-gray-500">Filter by person:</span>
        <Link href="/pipeline" className={cx("rounded-lg border px-3 py-1.5 text-sm font-medium", !who ? "border-ink-900 bg-ink-900 text-white" : "border-gray-200 bg-white text-gray-600")}>
          Everyone
        </Link>
        {users
          .filter((u) => u.active && u.role !== "production")
          .map((u) => (
            <Link
              key={u.username}
              href={`/pipeline?who=${u.username}`}
              className={cx("rounded-lg border px-3 py-1.5 text-sm font-medium", who === u.username ? "border-ink-900 bg-ink-900 text-white" : "border-gray-200 bg-white text-gray-600")}
            >
              {u.name}
            </Link>
          ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = visible.filter((p) => col.statuses.includes(p.status)).sort((a, b) => daysInStatus(b) - daysInStatus(a));
          return (
            <section key={col.title} className="w-72 shrink-0">
              <header className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-gray-900">{col.title}</h2>
                <span className="text-xs font-semibold text-gray-400">
                  {items.length} · {money0(items.reduce((s, p) => s + projectValue(p), 0))}
                </span>
              </header>
              <div className="space-y-2.5 rounded-xl bg-gray-200/40 p-2">
                {items.map((p) => {
                  const d = daysInStatus(p);
                  const late = d > col.warnAfter;
                  const href = p.stage === "build" ? `/builds/${p.id}` : `/quotes/${p.id}`;
                  return (
                    <Link
                      key={p.id}
                      href={href}
                      className={cx(
                        "block rounded-lg border bg-white p-3.5 shadow-xs transition hover:shadow-md",
                        late ? "border-rose-200 ring-1 ring-rose-100" : "border-gray-200",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900">{p.stage === "build" ? p.mtrNumber : (p.revisions.at(-1)?.quoteNumber ?? p.mtrNumber)}</span>
                        <span className={cx("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular", late ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-600")}>
                          <Clock className="size-3" />
                          {d}d
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-800">{p.customer}</div>
                      <div className="line-clamp-2 text-xs text-gray-500">{p.description.replace(/_/g, " ")}</div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                        <span className="truncate text-[11px] text-gray-500">{p.status === "quote_review" || p.status === "build_review" ? `↳ ${nameOf(p.reviewer)}` : nameOf(p.assignee)}</span>
                      </div>
                    </Link>
                  );
                })}
                {items.length === 0 && <div className="py-6 text-center text-xs text-gray-400">Empty</div>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Red cards have been in their stage longer than usual: drafting 5d, review 2d, awaiting manager 1d, with client 14d, building 10d, production 21d.
      </p>
    </div>
  );
}
