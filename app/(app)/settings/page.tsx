import type { Metadata } from "next";
import { getProjects, getSettings, nextMtrNumber } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, projects] = await Promise.all([getSettings(), getProjects()]);
  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-8">
      <PageHeader eyebrow="Reference" title="Settings" subtitle="Defaults for new quotes and BOMs. Changing them never alters existing revisions." />
      <SettingsForm settings={settings} nextMtr={nextMtrNumber(projects, settings)} />
    </div>
  );
}
