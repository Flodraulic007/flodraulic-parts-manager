import type { Metadata } from "next";
import { getParts, getProjects } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { PurchasingTable, type PurchaseRow } from "./purchasing-table";

export const metadata: Metadata = { title: "Purchasing" };

export default async function PurchasingPage() {
  const [projects, parts] = await Promise.all([getProjects(), getParts()]);
  const byPn = new Map(parts.map((p) => [p.partNumber, p]));
  const rows: PurchaseRow[] = [];
  for (const p of projects) {
    if (p.stage !== "build" || !p.build || p.buildStatus === "shipped") continue;
    for (const l of p.build.bom.lines) {
      if (l.kind !== "part") continue;
      const cat = byPn.get(l.partNumber);
      rows.push({
        projectId: p.id,
        mtr: p.mtrNumber,
        customer: p.customer,
        dueDate: p.build.dueDate,
        lineId: l.id,
        partNumber: l.partNumber,
        description: l.description,
        mfr: cat?.mfrPartNumber ?? "",
        qty: l.qty * Math.max(1, p.pcs),
        perUnit: l.qty,
        uom: l.uom,
        unitCost: l.unitCost,
        supplier: (l.supplier || cat?.supplier || "").toUpperCase() || "NO SUPPLIER",
        contact: cat?.contact ?? "",
        status: l.status ?? "required",
        poRef: l.poRef ?? "",
      });
    }
  }
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Workflow"
        title="Purchasing"
        subtitle="Every component on active build BOMs, grouped by supplier. Quantities are multiplied by the job's piece count. Changes here update each job's build BOM."
      />
      <PurchasingTable rows={rows} />
    </div>
  );
}
