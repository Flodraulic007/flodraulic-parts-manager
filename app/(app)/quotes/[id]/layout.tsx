import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { currentRevision } from "@/lib/calc";
import { QUOTE_STATUS } from "@/lib/defaults";
import { Badge } from "@/components/ui";
import { ProjectNav } from "@/components/project-nav";
import { QuoteActions } from "./quote-actions";
import Link from "next/link";

export default async function QuoteWorkspace({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p || p.isRepeat) notFound();
  const r = currentRevision(p)!;
  const st = QUOTE_STATUS[p.quoteStatus];
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
        ]}
      />
      <div className="min-w-0 flex-1">
        <div className="no-print sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#f4f5f7]/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="min-w-0 text-sm text-gray-500">
            <Link href="/quotes" className="hover:text-gray-800">Quoting</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{p.description.replace(/_/g, " ")}</span>
          </div>
          <QuoteActions
            id={p.id}
            stage={p.stage}
            status={p.quoteStatus}
            current={{ rev: r.rev, status: r.status, quoteNumber: r.quoteNumber }}
            revisions={p.revisions.map((x) => ({ rev: x.rev, quoteNumber: x.quoteNumber, status: x.status }))}
            poNumber={p.poNumber}
            team={settings.team.map((t) => t.name)}
          />
        </div>
        {children}
      </div>
    </div>
  );
}
