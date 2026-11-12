import { notFound, redirect } from "next/navigation";
import { getProject, getUsers } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { currentRevision } from "@/lib/calc";
import { STATUS, daysInStatus } from "@/lib/workflow";
import { Badge } from "@/components/ui";
import { ProjectNav } from "@/components/project-nav";
import { WorkflowBar } from "@/components/workflow-bar";
import Link from "next/link";

export default async function QuoteWorkspace({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, users, user] = await Promise.all([getProject(id), getUsers(), requireUser()]);
  if (!p || p.isRepeat) notFound();
  if (user.role === "production") redirect(p.stage === "build" ? `/builds/${p.id}` : "/");
  const r = currentRevision(p)!;
  const st = STATUS[p.status];
  const designers = users.filter((u) => u.active && u.role !== "production").map((u) => ({ username: u.username, name: u.name }));
  const openComments = (p.comments ?? []).filter((c) => c.stage === "quote" && !c.resolved).length;
  const base = `/quotes/${p.id}`;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <ProjectNav
        header={
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Quote</div>
            <div className="font-mono text-xl font-bold text-gray-900">{r.quoteNumber}</div>
            <div className="mt-0.5 truncate text-sm font-medium text-gray-700">{p.customer}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={st.tone}>{st.label}</Badge>
              <span className="font-mono text-xs text-gray-400">{p.mtrNumber}</span>
            </div>
            {p.stage === "build" && (
              <Link href={`/builds/${p.id}`} className="mt-3 block rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20 hover:bg-emerald-100">
                In build as {p.mtrNumber} →
              </Link>
            )}
          </div>
        }
        items={[
          { href: base, label: "Overview", icon: "overview", group: "Project" },
          { href: `${base}/quote`, label: "Quote", icon: "quote", group: "Quotation" },
          { href: `${base}/bom`, label: "BOM & pricing", icon: "bom", group: "Quotation" },
          {
            href: `${base}/revisions`,
            label: "Revisions",
            icon: "revisions",
            group: "Quotation",
            badge: <span className="rounded bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-500">{p.revisions.length}</span>,
          },
          { href: `${base}/timeline`, label: "Timeline", icon: "activity", group: "Project" },
        ]}
      />
      <div className="min-w-0 flex-1">
        <div className="no-print sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#f4f5f7]/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="min-w-0 text-sm text-gray-500">
            <Link href="/quotes" className="hover:text-gray-800">Quoting</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{p.description.replace(/_/g, " ")}</span>
          </div>
          {p.stage === "build" ? (
            <Link href={`/builds/${p.id}`} className="inline-flex h-9 items-center rounded-lg bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800">
              Quote frozen — open build {p.mtrNumber}
            </Link>
          ) : (
          <WorkflowBar
            id={p.id}
            stage={p.stage}
            status={p.status}
            role={user.role}
            username={user.username}
            assignee={p.assignee}
            reviewer={p.reviewer}
            designers={designers}
            daysInStatus={daysInStatus(p)}
            openComments={openComments}
            quote={{
              quoteNumber: r.quoteNumber,
              revStatus: r.status,
              revisions: p.revisions.map((x) => ({ rev: x.rev, quoteNumber: x.quoteNumber, status: x.status })),
              poNumber: p.poNumber,
            }}
          />
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
