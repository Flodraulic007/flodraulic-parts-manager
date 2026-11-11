import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { BUILD_STATUS } from "@/lib/defaults";
import { quoteNumber } from "@/lib/calc";
import { procurementProgress, qcProgress } from "@/lib/status";
import { Badge } from "@/components/ui";
import { ProjectNav } from "@/components/project-nav";
import { BuildStatusControl } from "./build-status-control";

export default async function BuildWorkspace({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p || !p.build) notFound();
  const base = `/builds/${p.id}`;
  const st = BUILD_STATUS[p.buildStatus];
  const pr = procurementProgress(p);
  const qc = qcProgress(p);
  const pill = (t: string) => <span className="rounded bg-gray-100 px-1.5 text-[11px] font-semibold text-gray-500 tabular">{t}</span>;
  const hasQuote = p.build.approvedRev != null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <ProjectNav
        header={
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Build · MTR</div>
            <div className="font-mono text-xl font-bold text-gray-900">{p.mtrNumber}</div>
            <div className="mt-0.5 truncate text-sm font-medium text-gray-700">{p.customer}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={st.tone}>{st.label}</Badge>
              {p.isRepeat ? <Badge tone="violet" dot={false}>Repeat</Badge> : <span className="font-mono text-xs text-gray-400">{quoteNumber(p)}</span>}
            </div>
          </div>
        }
        items={[
          { href: base, label: "Overview", icon: "overview", group: "Build" },
          { href: `${base}/bom`, label: "Build BOM", icon: "bom", group: "Build", badge: pill(`${pr.ready}/${pr.total}`) },
          { href: `${base}/summary`, label: "Build summary", icon: "summary", group: "Build" },
          { href: `${base}/f5`, label: "F5 sheet", icon: "f5", group: "Build" },
          { href: `${base}/qc`, label: "QC checklist", icon: "qc", group: "Build", badge: pill(`${qc.done}/${qc.total}`) },
          ...(hasQuote
            ? [
                { href: `${base}/quote`, label: "Approved quote", icon: "locked" as const, group: "From quotation" },
                { href: `${base}/quote-bom`, label: "Quoted BOM", icon: "locked" as const, group: "From quotation" },
              ]
            : []),
        ]}
      />
      <div className="min-w-0 flex-1">
        <div className="no-print sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-[#f4f5f7]/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="min-w-0 text-sm text-gray-500">
            <Link href="/builds" className="hover:text-gray-800">Build</Link>
            <span className="mx-1.5 text-gray-300">/</span>
            <span className="font-medium text-gray-900">{p.description.replace(/_/g, " ")}</span>
          </div>
          <BuildStatusControl id={p.id} status={p.buildStatus} />
        </div>
        {children}
      </div>
    </div>
  );
}
