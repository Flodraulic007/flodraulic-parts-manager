import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { RevisionBar } from "@/components/revision-bar";
import { QuoteEditor } from "./quote-editor";

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rev?: string }> }) {
  const [{ id }, { rev }] = await Promise.all([params, searchParams]);
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p) notFound();
  const r = (rev != null ? p.revisions.find((x) => x.rev === +rev) : undefined) ?? p.revisions[p.revisions.length - 1];
  const editable = r.status === "draft" && p.stage === "quote";

  return (
    <div className="px-4 py-6 sm:px-8">
      <RevisionBar basePath={`/quotes/${p.id}/quote`} revisions={p.revisions} selected={r.rev} />
      <QuoteEditor
        key={r.rev}
        projectId={p.id}
        rev={r.rev}
        quoteNumber={r.quoteNumber}
        mtrNumber={p.mtrNumber}
        quote={r.quote}
        bom={r.bom}
        company={settings.company}
        team={settings.team}
        editable={editable}
      />
    </div>
  );
}
