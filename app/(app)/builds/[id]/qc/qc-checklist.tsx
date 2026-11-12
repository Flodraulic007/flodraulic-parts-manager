"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Printer } from "lucide-react";
import { saveQcSignoff, setQcItem } from "@/lib/actions";
import { QC_SECTIONS, QC_SIGNOFF } from "@/lib/defaults";
import type { QcItem } from "@/lib/types";
import { date } from "@/lib/format";
import { Button, cx } from "@/components/ui";
import { SaveBar } from "@/components/save-bar";
import { useEditable } from "@/components/use-dirty";
import { run } from "@/components/toast";

export function QcChecklist({
  id,
  mtr,
  customer,
  serial,
  qc: initial,
  signoff,
  team,
  editable,
}: {
  id: string;
  mtr: string;
  customer: string;
  serial: string;
  qc: Record<string, QcItem>;
  signoff: Record<string, string>;
  team: string[];
  editable: boolean;
}) {
  const router = useRouter();
  const [qc, setQc] = useState(initial);
  const ed = useEditable(signoff, async (v) => {
    const r = await run(saveQcSignoff(id, v), "Sign-off saved");
    if (r.ok) router.refresh();
    return r.ok;
  });
  const total = QC_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = Object.values(qc).filter((x) => x.done).length;

  const toggle = async (key: string) => {
    const now = !qc[key]?.done;
    setQc((q) => ({ ...q, [key]: { done: now, by: now ? "you" : undefined } }));
    const r = await run(setQcItem(id, key, now));
    if (!r.ok) setQc((q) => ({ ...q, [key]: { done: !now } }));
    else router.refresh();
  };

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="h-2 max-w-xs flex-1 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700 tabular">
            {done}/{total} checked
          </span>
        </div>
        <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
          Print checklist
        </Button>
      </div>
      <article className="paper print-full mx-auto max-w-[820px]">
        <div className="h-1.5 rounded-t-md bg-brand-600" />
        <header className="flex items-start justify-between gap-6 border-b border-gray-200 px-8 py-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Q.C. check list</div>
            <div className="mt-1 font-mono text-3xl font-bold text-gray-900">{mtr}</div>
            <div className="text-sm text-gray-600">
              {customer}
              {serial && <span className="ml-2 font-mono text-xs text-gray-500">S/N {serial}</span>}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flodraulic-mark.png" alt="" className="h-10 w-auto" />
        </header>

        {QC_SECTIONS.map((s) => (
          <section key={s.title} className="border-b border-gray-100 px-8 py-5">
            <h3 className="mb-2 flex items-center justify-between text-[13px] font-semibold uppercase tracking-wide text-gray-600">
              {s.title}
              <span className="text-xs font-medium normal-case tracking-normal text-gray-400">
                {s.items.filter((i) => qc[i.key]?.done).length}/{s.items.length}
              </span>
            </h3>
            <ul>
              {s.items.map((i) => {
                const st = qc[i.key];
                return (
                  <li key={i.key}>
                    <button
                      type="button"
                      disabled={!editable}
                      onClick={() => toggle(i.key)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-gray-50 disabled:hover:bg-transparent"
                    >
                      <span
                        className={cx(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                          st?.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 bg-white",
                        )}
                      >
                        {st?.done && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                      <span className={cx("flex-1", st?.done ? "text-gray-500" : "text-gray-800")}>{i.label}</span>
                      {st?.done && st.by && (
                        <span className="text-xs text-gray-400">
                          {st.by}
                          {st.at && ` · ${date(st.at)}`}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="grid gap-x-8 gap-y-3 px-8 py-6 sm:grid-cols-2">
          {QC_SIGNOFF.map((k) => (
            <label key={k} className="grid grid-cols-[100px_1fr] items-center gap-2">
              <span className="text-[13px] font-semibold text-gray-600">{k}:</span>
              <input
                type={k === "Date" ? "date" : "text"}
                list="qc-team"
                disabled={!editable}
                className="cell-input border-b border-b-gray-300 text-sm"
                value={ed.value[k] ?? ""}
                onChange={(e) => ed.setValue({ ...ed.value, [k]: e.target.value })}
              />
            </label>
          ))}
          <datalist id="qc-team">
            {team.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </section>
      </article>
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </>
  );
}
