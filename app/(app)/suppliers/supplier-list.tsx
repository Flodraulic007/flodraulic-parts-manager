"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Globe, Mail, Pencil, Phone, Plus, Search, Trash2, User } from "lucide-react";
import type { Supplier } from "@/lib/types";
import { deleteSupplier, saveSupplier } from "@/lib/actions";
import { Button, Field, Modal } from "@/components/ui";
import { run } from "@/components/toast";

const blank = (): Supplier => ({ id: "", name: "", contactName: "", email: "", phone: "", website: "", address: "", notes: "", createdAt: "" });

export function SupplierList({ suppliers, canDelete }: { suppliers: Supplier[]; canDelete: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Supplier | null>(null);
  const shown = useMemo(() => {
    const s = q.toLowerCase();
    return suppliers.filter((x) => `${x.name} ${x.contactName} ${x.email} ${x.notes}`.toLowerCase().includes(s));
  }, [q, suppliers]);

  const save = async () => {
    if (!edit) return;
    const r = await run(saveSupplier(edit), "Supplier saved");
    if (r.ok) {
      setEdit(null);
      router.refresh();
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search suppliers, contacts, notes…" className="field h-9 pl-8" />
        </div>
        <Button variant="primary" className="ml-auto" icon={<Plus className="size-4" />} onClick={() => setEdit(blank())}>
          Add supplier
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Supplier</th>
              <th className="px-3 py-2.5 font-medium">Contact</th>
              <th className="px-3 py-2.5 font-medium">Email / phone</th>
              <th className="px-3 py-2.5 font-medium">Notes</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((s) => (
              <tr key={s.id} className="group hover:bg-gray-50/60">
                <td className="px-5 py-3">
                  <div className="font-semibold text-gray-900">{s.name}</div>
                  {s.website && (
                    <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                      <Globe className="size-3" /> {s.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-700">
                  {s.contactName ? (
                    <span className="flex items-center gap-1.5">
                      <User className="size-3.5 text-gray-400" /> {s.contactName}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-700">
                  {s.email && (
                    <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 hover:text-brand-700">
                      <Mail className="size-3.5 text-gray-400" /> {s.email}
                    </a>
                  )}
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 hover:text-brand-700">
                      <Phone className="size-3.5 text-gray-400" /> {s.phone}
                    </a>
                  )}
                  {!s.email && !s.phone && <span className="text-gray-300">—</span>}
                </td>
                <td className="max-w-sm px-3 py-3 text-gray-600">{s.notes || <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100">
                    <button onClick={() => setEdit(s)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label={`Edit ${s.name}`}>
                      <Pencil className="size-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete ${s.name}?`)) return;
                          const r = await run(deleteSupplier(s.id), "Supplier deleted");
                          if (r.ok) router.refresh();
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${s.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-5 py-10 text-center text-sm text-gray-500">No suppliers match.</p>}
      </div>

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={edit.id ? `Edit ${edit.name}` : "Add supplier"}
          width="max-w-xl"
          footer={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button variant="primary" onClick={save}>
                Save
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier name" className="sm:col-span-2">
              <input className="field uppercase" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Contact name">
              <input className="field" value={edit.contactName} onChange={(e) => setEdit({ ...edit, contactName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="field" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="field" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label="Website">
              <input className="field" value={edit.website} onChange={(e) => setEdit({ ...edit, website: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className="field" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <textarea className="field min-h-20" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Account #, lead times, what they're good for…" />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
