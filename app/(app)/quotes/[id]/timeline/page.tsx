import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { Timeline } from "@/components/timeline";

export default async function QuoteTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p) notFound();
  return (
    <div className="px-4 py-6 sm:px-8">
      <Timeline p={p} />
    </div>
  );
}
