"use client";

import { useRouter } from "next/navigation";
import { updateProjectInfo } from "@/lib/actions";
import type { Project } from "@/lib/types";
import { Card, Field, cx } from "./ui";
import { SaveBar } from "./save-bar";
import { useEditable } from "./use-dirty";
import { run } from "./toast";

type Info = Pick<Project, "customer" | "description" | "pcs" | "csa" | "ul" | "qps" | "poNumber" | "quotedBy" | "serialNumber">;

export function ProjectInfoForm({ id, info, team, showSerial }: { id: string; info: Info; team: string[]; showSerial?: boolean }) {
  const router = useRouter();
  const ed = useEditable(info, async (v) => {
    const r = await run(updateProjectInfo(id, { ...v, customer: v.customer.toUpperCase(), description: v.description.toUpperCase() }), "Project details saved");
    if (r.ok) router.refresh();
    return r.ok;
  });
  const v = ed.value;
  const set = <K extends keyof Info>(k: K, val: Info[K]) => ed.setValue({ ...v, [k]: val });

  return (
    <Card title="Project details">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer">
          <input className="field uppercase" value={v.customer} onChange={(e) => set("customer", e.target.value)} />
        </Field>
        <Field label="Quoted by">
          <select className="field" value={v.quotedBy} onChange={(e) => set("quotedBy", e.target.value)}>
            {[...new Set([v.quotedBy, ...team])].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <input className="field uppercase" value={v.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Pieces">
          <input type="number" min={1} className="field" value={v.pcs} onChange={(e) => set("pcs", +e.target.value)} />
        </Field>
        <Field label="PO number">
          <input className="field" value={v.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
        </Field>
        <div>
          <span className="mb-1 block text-[13px] font-medium text-gray-700">Certification</span>
          <div className="flex gap-2">
            {(["csa", "ul", "qps"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set(k, !v[k])}
                className={cx(
                  "h-9 flex-1 rounded-lg border text-xs font-semibold uppercase",
                  v[k] ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 bg-white text-gray-500",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        {showSerial && (
          <Field label="Serial number(s)">
            <input className="field font-mono" placeholder="1126-00627 to 1126-00630" value={v.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
          </Field>
        )}
      </div>
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </Card>
  );
}
