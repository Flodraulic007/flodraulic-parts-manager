"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Pencil, Phone, Plus, Search, User } from "lucide-react";
import type { Customer } from "@/lib/types";
import { saveCustomer } from "@/lib/actions";
import { date, money0 } from "@/lib/format";
import { Button, Field, Modal } from "@/components/ui";
import { run } from "@/components/toast";

interface Row {
  customer: Customer;
  projects: number;
  open: number;
  inBuild: number;
  wonValue: number;
  last?: string;
  recent: { id: string; stage: string; mtr: string; description: string }[];
}

export function CustomerList({ rows, manager, companyMargin }: { rows: Row[]; manager: boolean; companyMargin: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Customer | null>(null);
  const shown = rows.filter((r) => `${r.customer.name} ${r.customer.attention} ${r.customer.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="field h-9 pl-8" />
        </div>
        <Button
          variant="primary"
          className="ml-auto"
          icon={<Plus className="size-4" />}
          onClick={() => setEdit({ id: "", name: "", attention: "", email: "", phone: "", address: "", notes: "", createdAt: "" })}
        >
          Add customer
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ customer: c, ...r }) => (
          <article key={c.id} className="flex flex-col rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-ink-900 text-sm font-bold text-white">
                  {c.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-500">{r.last ? `Last project ${date(r.last)}` : "No projects yet"}</p>
                </div>
              </div>
              {manager && (
                <span className="ml-auto mr-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700" title="Default margin for new quotes">
                  {c.defaultMargin ?? companyMargin}% margin
                </span>
              )}
              <button onClick={() => setEdit(c)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Edit customer">
                <Pencil className="size-4" />
              </button>
            </div>
            <dl className="mt-4 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2"><User className="size-3.5 text-gray-400" />{c.attention || <span className="text-gray-300">No contact</span>}</div>
              <div className="flex items-center gap-2"><Mail className="size-3.5 text-gray-400" />{c.email ? <a href={`mailto:${c.email}`} className="hover:text-brand-700">{c.email}</a> : <span className="text-gray-300">—</span>}</div>
              <div className="flex items-center gap-2"><Phone className="size-3.5 text-gray-400" />{c.phone || <span className="text-gray-300">—</span>}</div>
            </dl>
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-2.5 text-center">
              {[
                ["Projects", r.projects],
                ["Open", r.open],
                ["In build", r.inBuild],
                ["Won", money0(r.wonValue)],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <div className="text-sm font-semibold text-gray-900 tabular">{v}</div>
                  <div className="text-[11px] text-gray-500">{k}</div>
                </div>
              ))}
            </div>
            {r.recent.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs">
                {r.recent.map((p) => (
                  <li key={p.id}>
                    <Link href={p.stage === "build" ? `/builds/${p.id}` : `/quotes/${p.id}`} className="flex gap-2 text-gray-600 hover:text-brand-700">
                      <span className="font-mono font-semibold">{p.mtr}</span>
                      <span className="truncate">{p.description.replace(/_/g, " ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={edit.id ? `Edit ${edit.name}` : "Add customer"}
          footer={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={async () => {
                  const r = await run(saveCustomer(edit), "Customer saved");
                  if (r.ok) {
                    setEdit(null);
                    router.refresh();
                  }
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" className="sm:col-span-2">
              <input className="field uppercase" value={edit.name} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Attention / contact">
              <input className="field" value={edit.attention} onChange={(e) => setEdit({ ...edit, attention: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="field" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <input className="field" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className="field" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </Field>
            {manager && (
              <Field label="Default margin (%)" hint={`company default ${companyMargin}%`} className="sm:col-span-2">
                <input
                  type="number"
                  min={0}
                  max={95}
                  step={0.5}
                  className="field"
                  value={edit.defaultMargin ?? ""}
                  placeholder={String(companyMargin)}
                  onChange={(e) => setEdit({ ...edit, defaultMargin: e.target.value === "" ? undefined : +e.target.value })}
                />
              </Field>
            )}
            <Field label="Notes" className="sm:col-span-2">
              <textarea className="field min-h-20" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
