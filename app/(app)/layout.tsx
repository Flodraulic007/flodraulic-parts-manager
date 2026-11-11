import { requireUser } from "@/lib/auth";
import { getCustomers, getProjects, getSettings } from "@/lib/data";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { Toaster } from "@/components/toast";

// First-run setup loads ~3,000 parts; give serverless functions room to finish it.
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  let data;
  try {
    data = await Promise.all([getProjects(), getSettings(), getCustomers()]);
  } catch (e) {
    console.error("[app] data load failed", e);
    return <DatabaseError message={e instanceof Error ? e.message : String(e)} />;
  }
  const [projects, settings, customers] = data;
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

function DatabaseError({ message }: { message: string }) {
  const mongo = !!process.env.MONGODB_URI;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5f7] p-6">
      <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600">Setup needed</div>
        <h1 className="mt-1 text-xl font-semibold text-gray-900">Can&apos;t load data</h1>
        <p className="mt-2 text-sm text-gray-600">
          {mongo
            ? "The app could not reach MongoDB. Check that MONGODB_URI is correct and that your MongoDB Atlas Network Access allows connections from Vercel (0.0.0.0/0)."
            : "No MONGODB_URI is configured and the local data file could not be used."}
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">{message.slice(0, 400)}</pre>
        <a href="/" className="mt-5 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Try again
        </a>
      </div>
    </main>
  );
}
