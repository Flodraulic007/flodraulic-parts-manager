"use client";

import { useRouter } from "next/navigation";
import { Plus, Printer, Trash2 } from "lucide-react";
import { saveBuildSheet } from "@/lib/actions";
import { uid } from "@/lib/format";
import { Button } from "./ui";
import { SaveBar } from "./save-bar";
import { useEditable } from "./use-dirty";
import { run } from "./toast";

type Motor = { id: string; label: string; setting: string };

export function SheetForm({
  id,
  sheet,
  title,
  header,
  fields,
  values,
  motors,
  team,
  editable,
}: {
  id: string;
  sheet: "summary" | "f5";
  title: string;
  header: { mtr: string; customer: string; description: string; extra?: [string, string][] };
  fields: { key: string; label: string; type?: "date" | "person" | "textarea"; placeholder?: string }[];
  values: Record<string, string>;
  motors?: Motor[];
  team: string[];
  editable: boolean;
}) {
  const router = useRouter();
  const ed = useEditable({ values, motors: motors ?? [] }, async (v) => {
    const r = await run(saveBuildSheet(id, sheet, v.values, sheet === "f5" ? v.motors : undefined), `${title} saved`);
    if (r.ok) router.refresh();
    return r.ok;
  });
  const v = ed.value;
  const setVal = (k: string, val: string) => ed.setValue({ ...v, values: { ...v.values, [k]: val } });
  const setMotor = (mid: string, patch: Partial<Motor>) => ed.setValue({ ...v, motors: v.motors.map((m) => (m.id === mid ? { ...m, ...patch } : m)) });

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[820px] justify-end">
        <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print sheet
        </Button>
      </div>
      <article className="paper print-full mx-auto max-w-[820px]">
        <div className="h-1.5 rounded-t-md bg-brand-600" />
        <header className="flex items-start justify-between gap-6 border-b border-gray-200 px-8 py-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">{title}</div>
            <div className="mt-1 font-mono text-3xl font-bold text-gray-900">{header.mtr}</div>
            <div className="mt-1 text-sm text-gray-600">{header.description.replace(/_/g, " ")}</div>
          </div>
          <div className="text-right">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/flodraulic-mark.png" alt="" className="ml-auto h-10 w-auto" />
            <div className="mt-2 text-sm font-semibold text-gray-900">{header.customer}</div>
            {header.extra?.map(([k, val]) => (
              <div key={k} className="text-xs text-gray-500">
                {k}: <span className="font-medium text-gray-700">{val || "—"}</span>
              </div>
            ))}
          </div>
        </header>

        <dl className="divide-y divide-gray-100 px-8 py-2">
          {fields.map((f) => (
            <div key={f.key} className="grid items-center gap-2 py-2 sm:grid-cols-[240px_1fr]">
              <dt className="text-[13px] font-semibold uppercase tracking-wide text-gray-600">{f.label}</dt>
              <dd>
                {f.type === "textarea" ? (
                  <textarea className="cell-input min-h-16 border-gray-200 text-sm" disabled={!editable} value={v.values[f.key] ?? ""} onChange={(e) => setVal(f.key, e.target.value)} />
                ) : (
                  <input
                    type={f.type === "date" ? "date" : "text"}
                    list={f.type === "person" ? "sheet-team" : undefined}
                    className="cell-input border-b border-b-gray-200 text-sm"
                    disabled={!editable}
                    placeholder={editable ? f.placeholder : ""}
                    value={v.values[f.key] ?? ""}
                    onChange={(e) => setVal(f.key, e.target.value)}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
        <datalist id="sheet-team">
          {team.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        {sheet === "f5" && (
          <section className="border-t border-gray-200 px-8 py-5">
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-gray-600">Motor overload settings</h3>
            <div className="space-y-1.5">
              {v.motors.map((m) => (
                <div key={m.id} className="group grid grid-cols-[1fr_200px_32px] items-center gap-2">
                  <input className="cell-input text-sm" disabled={!editable} value={m.label} onChange={(e) => setMotor(m.id, { label: e.target.value })} />
                  <input className="cell-input border-b border-b-gray-200 text-sm font-medium" placeholder="e.g. 7.6 A" disabled={!editable} value={m.setting} onChange={(e) => setMotor(m.id, { setting: e.target.value })} />
                  {editable && (
                    <button onClick={() => ed.setValue({ ...v, motors: v.motors.filter((x) => x.id !== m.id) })} className="no-print rounded p-1 text-gray-300 hover:text-red-600" aria-label="Remove motor">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {editable && (
              <button
                onClick={() => ed.setValue({ ...v, motors: [...v.motors, { id: uid(), label: `Motor #${v.motors.length + 1} O/L setting`, setting: "" }] })}
                className="no-print mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Plus className="size-3.5" /> Add motor
              </button>
            )}
          </section>
        )}
      </article>
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </>
  );
}
