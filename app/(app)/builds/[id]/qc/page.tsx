import { notFound } from "next/navigation";
import { getProject, getSettings } from "@/lib/data";
import { QcChecklist } from "./qc-checklist";

export default async function QcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([getProject(id), getSettings()]);
  if (!p?.build) notFound();
  return (
    <div className="px-4 py-6 sm:px-8">
      <QcChecklist
        id={p.id}
        mtr={p.mtrNumber}
        customer={p.customer}
        serial={p.serialNumber}
        qc={p.build.qc}
        signoff={p.build.qcSignoff}
        team={settings.team.map((t) => t.name)}
        editable={p.buildStatus !== "shipped"}
      />
    </div>
  );
}
