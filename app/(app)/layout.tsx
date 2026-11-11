import { requireUser } from "@/lib/auth";
import { getCustomers, getProjects, getSettings } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "@/components/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, settings, customers] = await Promise.all([getProjects(), getSettings(), getCustomers()]);
  const counts = {
    quotes: projects.filter((p) => p.stage === "quote" && (p.quoteStatus === "draft" || p.quoteStatus === "sent")).length,
    builds: projects.filter((p) => p.stage === "build" && p.buildStatus !== "shipped").length,
  };
  const searchIndex = projects.map((p) => ({
    id: p.id,
    stage: p.stage,
    quote: p.revisions.at(-1)?.quoteNumber ?? (p.isRepeat ? "REPEAT" : p.quoteBase),
    mtr: p.mtrNumber,
    customer: p.customer,
    description: p.description,
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar counts={counts} user={user.name} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar
          searchIndex={searchIndex}
          team={settings.team.map((t) => t.name)}
          customers={customers.map((c) => ({ name: c.name, attention: c.attention, email: c.email, phone: c.phone }))}
          userName={user.name}
        />
        <main className="flex-1">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
