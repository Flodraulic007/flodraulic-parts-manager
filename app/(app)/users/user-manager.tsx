"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import type { Role } from "@/lib/types";
import { saveUser, type UserInput } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/workflow";
import { date } from "@/lib/format";
import { Badge, Button, Field, Modal, Toggle, cx } from "@/components/ui";
import { run } from "@/components/toast";

interface Row extends Omit<UserInput, "password"> {
  id: string;
  createdAt: string;
  openTasks: number;
  assigned: number;
}

const ROLE_HELP: Record<Role, string> = {
  manager: "Everything, including margins, approvals, users and settings",
  designer: "Builds quotes and build BOMs, peer-reviews others. No margins.",
  production: "Sees builds released to production and updates progress",
};
const ROLE_TONE = { manager: "red", designer: "blue", production: "orange" } as const;

export function UserManager({ rows, me }: { rows: Row[]; me: string }) {
  const router = useRouter();
  const [edit, setEdit] = useState<(UserInput & { isNew: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);

  const blank = (): UserInput & { isNew: boolean } => ({
    isNew: true,
    username: "",
    name: "",
    email: "",
    phone: "",
    role: "designer",
    title: "Controls Designer",
    active: true,
    emailNotifications: false,
    password: "",
  });

  const submit = async () => {
    if (!edit) return;
    setBusy(true);
    const { isNew, ...input } = edit;
    void isNew;
    const r = await run(saveUser({ ...input, password: input.password || undefined }), edit.isNew ? "User created" : "User updated");
    setBusy(false);
    if (r.ok) {
      setEdit(null);
      router.refresh();
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setEdit(blank())}>
          Add user
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-3 py-2.5 font-medium">Username</th>
              <th className="px-3 py-2.5 font-medium">Role</th>
              <th className="px-3 py-2.5 font-medium">Email</th>
              <th className="px-3 py-2.5 text-center font-medium">Open tasks</th>
              <th className="px-3 py-2.5 text-center font-medium">Active projects</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((u) => (
              <tr key={u.id} className={cx("hover:bg-gray-50/60", !u.active && "opacity-50")}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                      {u.name
                        .split(/\s+/)
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">
                        {u.name} {u.username === me && <span className="text-xs text-gray-400">(you)</span>}
                      </div>
                      <div className="text-xs text-gray-500">{u.title || "—"} · since {date(u.createdAt)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{u.username}</td>
                <td className="px-3 py-3">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                </td>
                <td className="px-3 py-3 text-gray-600">{u.email || "—"}</td>
                <td className="px-3 py-3 text-center tabular">{u.openTasks}</td>
                <td className="px-3 py-3 text-center tabular">{u.assigned}</td>
                <td className="px-3 py-3">{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Deactivated</Badge>}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => setEdit({ ...u, password: "", isNew: false })}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label={`Edit ${u.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal
          open
          onClose={() => setEdit(null)}
          title={edit.isNew ? "Add user" : `Edit ${edit.name}`}
          width="max-w-xl"
          footer={
            <>
              <Button onClick={() => setEdit(null)}>Cancel</Button>
              <Button variant="primary" disabled={busy} onClick={submit}>
                {edit.isNew ? "Create account" : "Save"}
              </Button>
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Username" hint={edit.isNew ? "used to sign in" : "can't be changed"}>
              <input className="field font-mono" value={edit.username} disabled={!edit.isNew} onChange={(e) => setEdit({ ...edit, username: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="Email" hint="shown on quotes">
              <input className="field" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="field" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
            </Field>
            <Field label="Job title" className="sm:col-span-2">
              <input className="field" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-gray-700">
                <ShieldCheck className="size-4 text-gray-400" /> Role
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEdit({ ...edit, role: r })}
                    className={cx(
                      "rounded-lg border px-3 py-2.5 text-left",
                      edit.role === r ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:bg-gray-50",
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">{ROLE_LABEL[r]}</div>
                    <div className="text-xs leading-snug text-gray-500">{ROLE_HELP[r]}</div>
                  </button>
                ))}
              </div>
            </div>
            <Field label={edit.isNew ? "Password" : "Reset password"} hint={edit.isNew ? "min 6 characters" : "leave blank to keep"} className="sm:col-span-2">
              <input className="field" type="password" autoComplete="new-password" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 sm:col-span-2">
              <span>
                <span className="block text-sm font-medium text-gray-800">Email notifications</span>
                <span className="text-xs text-gray-500">Also email task alerts (needs SMTP configured on the server)</span>
              </span>
              <Toggle checked={edit.emailNotifications} onChange={(v) => setEdit({ ...edit, emailNotifications: v })} label="Email notifications" />
            </label>
            {!edit.isNew && (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 sm:col-span-2">
                <span>
                  <span className="block text-sm font-medium text-gray-800">Account active</span>
                  <span className="text-xs text-gray-500">Deactivated users can&apos;t sign in. Their history is kept.</span>
                </span>
                <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />
              </label>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
