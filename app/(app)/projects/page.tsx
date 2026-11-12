import type { Metadata } from "next";
import { getProjects } from "@/lib/data";
import { quoteNumber } from "@/lib/calc";
import { projectStatus } from "@/lib/status";
import { PageHeader } from "@/components/ui";
import { RegisterTable } from "./register-table";

export const metadata: Metadata = { title: "Project Register" };

export default async function RegisterPage() {
  const projects = await getProjects();
  const rows = [...projects]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((p) => ({
      id: p.id,
      stage: p.stage,
      quote: quoteNumber(p),
      isRepeat: p.isRepeat,
      mtr: p.mtrNumber,
      serial: p.serialNumber,
      customer: p.customer,
      description: p.description,
      pcs: p.pcs,
      csa: p.csa,
      ul: p.ul,
      qps: p.qps,
      po: p.poNumber,
      quotedBy: p.quotedBy,
      status: projectStatus(p),
      createdAt: p.createdAt,
    }));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Workspace"
        title="Project Register"
        subtitle="Every quote, MTR and serial number — replaces the quote tracking spreadsheet. Serial # and PO can be edited inline."
      />
      <RegisterTable rows={rows} />
    </div>
  );
}
