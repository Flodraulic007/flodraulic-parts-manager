"use client";

import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/types";
import { saveSettings } from "@/lib/actions";
import { Card, Field } from "@/components/ui";
import { SaveBar } from "@/components/save-bar";
import { useEditable } from "@/components/use-dirty";
import { run } from "@/components/toast";

export function SettingsForm({ settings, nextMtr }: { settings: Settings; nextMtr: number }) {
  const router = useRouter();
  const ed = useEditable(settings, async (s) => {
    const r = await run(saveSettings(s), "Settings saved");
    if (r.ok) router.refresh();
    return r.ok;
  });
  const s = ed.value;
  const up = <K extends keyof Settings>(k: K, v: Settings[K]) => ed.setValue({ ...s, [k]: v });

  return (
    <div className="space-y-6">
      <Card title="Numbering">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Next MTR number" hint={`currently MTR${nextMtr}`}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-gray-400">MTR</span>
              <input type="number" className="field pl-12 font-mono" value={s.nextMtr} onChange={(e) => up("nextMtr", +e.target.value)} />
            </div>
          </Field>
          <div className="text-sm text-gray-500 sm:col-span-2">
            <p className="mb-1 font-medium text-gray-700">Quote numbers</p>
            Generated as <span className="font-mono">YYMMDD</span> + a letter per quote that day + the revision digit, e.g.{" "}
            <span className="font-mono font-semibold text-gray-800">261109A0</span> → <span className="font-mono font-semibold text-gray-800">261109A1</span>. MTR numbers
            never go backwards: the next one is the higher of this setting and the last one used.
          </div>
        </div>
      </Card>

      <Card title="Pricing defaults">
        <div className="grid gap-4 sm:grid-cols-4">
          {(
            [
              ["targetMargin", "Target margin (%)"],
              ["labourRateUSD", "Labour sell (USD/h)"],
              ["cadToUsd", "CAD → USD rate"],
              ["certificationCost", "Certification cost (CAD)"],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              <input type="number" step="0.01" className="field text-right" value={s.pricing[k]} onChange={(e) => up("pricing", { ...s.pricing, [k]: +e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Company (quote letterhead)">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Company name"],
              ["address", "Address"],
              ["phone", "Phone"],
              ["fax", "Fax"],
              ["quotesEmail", "Quotes email"],
              ["poEmail", "PO email"],
              ["web", "Website"],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              <input className="field" value={s.company[k]} onChange={(e) => up("company", { ...s.company, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Quote defaults">
        <div className="grid gap-4 sm:grid-cols-5">
          {(
            [
              ["availability", "Availability"],
              ["funds", "Funds"],
              ["fob", "F.O.B."],
              ["terms", "Terms"],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l}>
              <input className="field" value={s.quoteDefaults[k]} onChange={(e) => up("quoteDefaults", { ...s.quoteDefaults, [k]: e.target.value })} />
            </Field>
          ))}
          <Field label="Validity (days)">
            <input type="number" className="field" value={s.quoteDefaults.validityDays} onChange={(e) => up("quoteDefaults", { ...s.quoteDefaults, validityDays: +e.target.value })} />
          </Field>
          {(
            [
              ["generalNotes", "General notes"],
              ["leadTimeNotes", "Lead time notes"],
              ["freightNotes", "Freight notes"],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={l} hint="one bullet per line" className="sm:col-span-5">
              <textarea className="field min-h-28 text-sm" value={s.quoteDefaults[k]} onChange={(e) => up("quoteDefaults", { ...s.quoteDefaults, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Build cost drift">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Flag builds that drift more than (%)" hint="from the quoted cost">
            <input type="number" min={1} max={100} className="field" value={s.driftPercent ?? 10} onChange={(e) => up("driftPercent", +e.target.value)} />
          </Field>
          <p className="text-sm text-gray-500 sm:col-span-2">
            When a build BOM&apos;s parts + labour drift past this percentage from the quoted BOM, the build and the dashboard show a &ldquo;quote revision may
            be needed&rdquo; flag.
          </p>
        </div>
      </Card>

      <Card title="Team">
        <p className="text-sm text-gray-600">
          The people available as designers, reviewers and &ldquo;quoted by&rdquo; come from user accounts.{" "}
          <a href="/users" className="font-medium text-brand-600 hover:text-brand-700">
            Manage users & roles →
          </a>
        </p>
      </Card>
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </div>
  );
}
