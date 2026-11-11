import { notFound } from "next/navigation";
import { catalogFor, getProject } from "@/lib/data";
import { BomPageEditor } from "@/components/bom-page-editor";

export default async function QuotedBomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  const r = p?.revisions.find((x) => x.rev === p.build?.approvedRev);
  if (!p || !r) notFound();
  const catalog = await catalogFor(r.bom);
  return (
    <div className="px-4 py-6 sm:px-8">
      <p className="mb-4 text-sm text-gray-500">
        Read-only snapshot of the BOM as quoted in <b>{r.quoteNumber}</b>.
      </p>
      <BomPageEditor target={{ kind: "quote", projectId: p.id, rev: r.rev, quote: r.quote }} bom={r.bom} editable={false} catalog={catalog} exportName={`Quoted BOM ${r.quoteNumber}`} title="Quoted BOM" />
    </div>
  );
}
