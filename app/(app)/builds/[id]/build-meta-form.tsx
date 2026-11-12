"use client";

import { useRouter } from "next/navigation";
import { updateBuildMeta } from "@/lib/actions";
import { Card, Field } from "@/components/ui";
import { SaveBar } from "@/components/save-bar";
import { useEditable } from "@/components/use-dirty";
import { run } from "@/components/toast";

export function BuildMetaForm({ id, dueDate, assignedTo, team }: { id: string; dueDate: string; assignedTo: string; team: string[] }) {
  const router = useRouter();
  const ed = useEditable({ dueDate, assignedTo }, async (v) => {
    const r = await run(updateBuildMeta(id, v), "Build details saved");
    if (r.ok) router.refresh();
    return r.ok;
  });
  return (
    <Card title="Schedule">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Required ship date">
          <input type="date" className="field" value={ed.value.dueDate} onChange={(e) => ed.setValue({ ...ed.value, dueDate: e.target.value })} />
        </Field>
        <Field label="Build lead">
          <select className="field" value={ed.value.assignedTo} onChange={(e) => ed.setValue({ ...ed.value, assignedTo: e.target.value })}>
            <option value="">Unassigned</option>
            {team.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </Card>
  );
}
