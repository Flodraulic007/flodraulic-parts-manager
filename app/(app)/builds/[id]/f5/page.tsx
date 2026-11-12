import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { F5_FIELDS } from "@/lib/defaults";
import { SheetForm } from "@/components/sheet-form";

export default async function F5Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p?.build) notFound();
  return (
    <div className="px-4 py-6 sm:px-8">
      <SheetForm
        id={p.id}
        sheet="f5"
        title="F5 · Panel data sheet"
        header={{ mtr: p.mtrNumber, customer: p.customer, description: p.description, extra: [["Serial #", p.serialNumber]] }}
        fields={F5_FIELDS}
        values={p.build.f5}
        motors={p.build.motors}
        team={settings.team.map((t) => t.name)}
        editable={p.status !== "shipped"}
      />
    </div>
  );
}
