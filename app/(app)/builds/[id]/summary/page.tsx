import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { BUILD_SUMMARY_FIELDS } from "@/lib/defaults";
import { SheetForm } from "@/components/sheet-form";

export default async function BuildSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p?.build) notFound();
  return (
    <div className="px-4 py-6 sm:px-8">
      <SheetForm
        id={p.id}
        sheet="summary"
        title="Build summary"
        header={{ mtr: p.mtrNumber, customer: p.customer, description: p.description, extra: [["PO", p.poNumber], ["Pieces", String(p.pcs)]] }}
        fields={BUILD_SUMMARY_FIELDS}
        values={p.build.summary}
        team={settings.team.map((t) => t.name)}
        editable={p.status !== "shipped"}
      />
    </div>
  );
}
