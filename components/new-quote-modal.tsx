"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Repeat, FileText } from "lucide-react";
import { createProject, type NewQuoteInput } from "@/lib/actions";
import type { Role } from "@/lib/types";
import { Button, Field, Modal, cx } from "./ui";
import { run, toast } from "./toast";

export interface CustomerLite {
  name: string;
  attention: string;
  email: string;
  phone: string;
  defaultMargin?: number;
}

const empty = (quotedBy: string, assignee = ""): NewQuoteInput => ({
  assignee,
  customer: "",
  description: "",
  pcs: 1,
  csa: true,
  ul: false,
  qps: false,
  quotedBy,
  poNumber: "",
  attention: "",
  email: "",
  phone: "",
  isRepeat: false,
  repeatMtr: "",
  serialNumber: "",
});

export function NewQuoteModal({
  open,
  onClose,
  designers,
  customers,
  userName,
  username,
  role,
}: {
  open: boolean;
  onClose: () => void;
  designers: { username: string; name: string }[];
  customers: CustomerLite[];
  userName: string;
  username: string;
  role: Role;
}) {
  const router = useRouter();
  const manager = role === "manager";
  const [f, setF] = useState<NewQuoteInput>(() => empty(userName, manager ? "" : username));
  const cust = customers.find((x) => x.name.toUpperCase() === f.customer.trim().toUpperCase());
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof NewQuoteInput>(k: K, v: NewQuoteInput[K]) => setF((x) => ({ ...x, [k]: v }));

  const pickCustomer = (name: string) => {
    const c = customers.find((x) => x.name.toUpperCase() === name.trim().toUpperCase());
    setF((x) => ({
      ...x,
      customer: name,
      ...(c ? { attention: x.attention || c.attention, email: x.email || c.email, phone: x.phone || c.phone } : {}),
    }));
  };

  const submit = async () => {
    setBusy(true);
    const r = await run(createProject(f));
    setBusy(false);
    if (r.ok && r.data) {
      toast(f.isRepeat ? `Repeat order ${f.repeatMtr.toUpperCase()} added to build` : "Quote created — quote # and MTR # assigned");
      onClose();
      setF(empty(userName, manager ? "" : username));
      router.push(r.data.stage === "build" ? `/builds/${r.data.id}` : `/quotes/${r.data.id}/quote`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="New project"
      description="Quote # and MTR # are assigned automatically in sequence."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={busy}>
            {f.isRepeat ? "Create repeat order" : "Create quote"}
          </Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
        {[
          { v: false, label: "New quote", icon: FileText, d: "Generates quote # + next MTR #" },
          { v: true, label: "Repeat order", icon: Repeat, d: "Re-build an existing MTR" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={() => set("isRepeat", o.v)}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition",
              f.isRepeat === o.v ? "bg-white shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700",
            )}
          >
            <o.icon className={cx("size-5", f.isRepeat === o.v ? "text-brand-600" : "text-gray-400")} />
            <div>
              <div className="text-sm font-semibold text-gray-900">{o.label}</div>
              <div className="text-xs text-gray-500">{o.d}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field label="Customer" className="sm:col-span-3">
          <input className="field uppercase" list="fd-customers" value={f.customer} onChange={(e) => pickCustomer(e.target.value)} autoFocus />
          <datalist id="fd-customers">
            {customers.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
        </Field>
        <Field label={f.isRepeat ? "Build designer" : "Assign to designer"} hint={manager ? undefined : "you"} className="sm:col-span-3">
          <select
            className="field"
            value={f.assignee}
            disabled={!manager}
            onChange={(e) => {
              const d = designers.find((x) => x.username === e.target.value);
              setF((x) => ({ ...x, assignee: e.target.value, quotedBy: d?.name ?? x.quotedBy }));
            }}
          >
            <option value="">Unassigned — assign later</option>
            {designers.map((d) => (
              <option key={d.username} value={d.username}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>

        {f.isRepeat && (
          <>
            <Field label="MTR # being repeated" className="sm:col-span-3">
              <input className="field uppercase" placeholder="MTR6868" value={f.repeatMtr} onChange={(e) => set("repeatMtr", e.target.value)} />
            </Field>
            <Field label="Serial number(s)" hint="optional" className="sm:col-span-3">
              <input className="field" placeholder="1126-00627" value={f.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} />
            </Field>
          </>
        )}

        <Field label="Description" hint={f.isRepeat ? "optional" : "spaces become _"} className="sm:col-span-6">
          <input
            className="field uppercase"
            placeholder="25HP 460V 3PH 60Hz N4X W HEATER"
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
        <Field label="Pieces" className="sm:col-span-1">
          <input type="number" min={1} className="field" value={f.pcs} onChange={(e) => set("pcs", +e.target.value)} />
        </Field>
        <div className="sm:col-span-3">
          <span className="mb-1 block text-[13px] font-medium text-gray-700">Certification</span>
          <div className="flex h-[38px] items-center gap-2">
            {(["csa", "ul", "qps"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => set(k, !f[k])}
                className={cx(
                  "h-full flex-1 rounded-lg border text-sm font-semibold uppercase transition",
                  f[k] ? "border-brand-600 bg-brand-50 text-brand-700" : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50",
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <Field label="PO number" hint="optional" className="sm:col-span-2">
          <input className="field" value={f.poNumber} onChange={(e) => set("poNumber", e.target.value)} />
        </Field>

        {manager && !f.isRepeat && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 sm:col-span-6">
            Margin for this quote:{" "}
            <b>{cust?.defaultMargin != null ? `${cust.defaultMargin}% (customer default)` : "company default"}</b>. You can override it per quote on the BOM page.
          </p>
        )}
        {!f.isRepeat && (
          <>
            <div className="border-t border-gray-100 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-400 sm:col-span-6">
              Customer contact (pre-fills the quote)
            </div>
            <Field label="Attention" className="sm:col-span-2">
              <input className="field" value={f.attention} onChange={(e) => set("attention", e.target.value)} />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <input className="field" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone" className="sm:col-span-2">
              <input className="field" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  );
}
