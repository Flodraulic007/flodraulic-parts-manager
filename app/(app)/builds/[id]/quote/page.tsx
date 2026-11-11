import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { QuoteEditor } from "@/app/(app)/quotes/[id]/quote/quote-editor";

export default async function BuildQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  const r = p?.revisions.find((x) => x.rev === p.build?.approvedRev);
  if (!p || !r) notFound();
  return (
    <div className="px-4 py-6 sm:px-8">
      <QuoteEditor
        projectId={p.id}
        rev={r.rev}
        quoteNumber={r.quoteNumber}
        mtrNumber={p.mtrNumber}
        quote={r.quote}
        bom={r.bom}
        company={settings.company}
        team={settings.team}
        editable={false}
      />
    </div>
  );
}
