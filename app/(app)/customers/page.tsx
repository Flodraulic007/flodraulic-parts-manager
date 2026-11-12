import type { Metadata } from "next";
import { getCustomers, getProjects, getSettings } from "@/lib/data";
import { requireRole, requireUser } from "@/lib/auth";
import { projectValue } from "@/lib/calc";
import { PageHeader } from "@/components/ui";
import { CustomerList } from "./customer-list";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requireRole("manager", "designer");
  const [customers, projects, user, settings] = await Promise.all([getCustomers(), getProjects(), requireUser(), getSettings()]);
  const manager = user.role === "manager";
  const rows = customers.map((c) => {
    const ps = projects.filter((p) => p.customer.toUpperCase() === c.name.toUpperCase());
    const won = ps.filter((p) => p.quoteStatus === "approved");
    return {
      customer: manager ? c : { ...c, defaultMargin: undefined },
      projects: ps.length,
      open: ps.filter((p) => p.stage === "quote" && !["lost", "hold"].includes(p.status)).length,
      inBuild: ps.filter((p) => p.stage === "build" && p.status !== "shipped").length,
      wonValue: won.reduce((s, p) => s + projectValue(p), 0),
      last: ps[0]?.createdAt,
      recent: ps.slice(0, 5).map((p) => ({ id: p.id, stage: p.stage, mtr: p.mtrNumber, description: p.description })),
    };
  });
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <PageHeader eyebrow="Reference" title="Customers" subtitle={manager ? "Contact details pre-fill new quotes. Each customer has a default margin that new quotes inherit — override it per quote on the BOM page." : "Contact details here pre-fill new quotes. Customers are added automatically when you create a quote."} />
      <CustomerList rows={rows} manager={manager} companyMargin={settings.pricing.targetMargin} />
    </div>
  );
}
