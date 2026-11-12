import { notFound } from "next/navigation";
import { catalogFor, getProject } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { canComment, canEditQuote, isManager } from "@/lib/workflow";
import { RevisionBar } from "@/components/revision-bar";
import { BomPageEditor } from "@/components/bom-page-editor";

export default async function QuoteBomPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rev?: string }> }) {
  const [{ id }, { rev }] = await Promise.all([params, searchParams]);
  const [p, user] = await Promise.all([getProject(id), requireUser()]);
  if (!p) notFound();
  const r = (rev != null ? p.revisions.find((x) => x.rev === +rev) : undefined) ?? p.revisions[p.revisions.length - 1];
  const latest = r.rev === p.revisions.at(-1)!.rev;
  const catalog = await catalogFor(r.bom);

  return (
    <div className="px-4 py-6 sm:px-8">
      <RevisionBar basePath={`/quotes/${p.id}/bom`} revisions={p.revisions} selected={r.rev} />
      <BomPageEditor
        key={r.rev}
        target={{ kind: "quote", projectId: p.id, rev: r.rev, quote: r.quote }}
        bom={r.bom}
        editable={latest && canEditQuote(p, user)}
        catalog={catalog}
        exportName={`BOM ${r.quoteNumber} ${p.customer}`}
        showMargin={isManager(user)}
        comments={(p.comments ?? []).filter((c) => c.stage === "quote" && (c.rev == null || c.rev === r.rev))}
        canComment={latest && p.stage === "quote" && canComment(p, user)}
      />
    </div>
  );
}
