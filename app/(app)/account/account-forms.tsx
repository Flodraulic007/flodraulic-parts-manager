"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeOwnPassword, setMyEmailNotifications } from "@/lib/actions";
import { Button, Card, Field, Toggle } from "@/components/ui";
import { run } from "@/components/toast";

export function AccountForms({ emailNotifications }: { emailNotifications: boolean }) {
  const router = useRouter();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(emailNotifications);

  const change = async () => {
    setBusy(true);
    const r = await run(changeOwnPassword(pw.current, pw.next), "Password changed");
    setBusy(false);
    if (r.ok) setPw({ current: "", next: "", confirm: "" });
  };

  return (
    <>
      <Card title="Notifications">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-gray-800">Email me when a task lands in my queue</span>
            <span className="text-xs text-gray-500">In-app notifications are always on (the bell in the top bar).</span>
          </span>
          <Toggle
            checked={email}
            label="Email notifications"
            onChange={async (v) => {
              setEmail(v);
              const r = await run(setMyEmailNotifications(v), v ? "Email notifications on" : "Email notifications off");
              if (!r.ok) setEmail(!v);
              else router.refresh();
            }}
          />
        </label>
      </Card>
      <Card title="Change password">
        <div className="grid gap-4">
          <Field label="Current password">
            <input type="password" autoComplete="current-password" className="field" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </Field>
          <Field label="New password" hint="min 6 characters">
            <input type="password" autoComplete="new-password" className="field" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </Field>
          {pw.confirm && pw.next !== pw.confirm && <p className="text-sm text-rose-600">Passwords don&apos;t match.</p>}
          <div>
            <Button variant="primary" disabled={busy || !pw.current || pw.next.length < 6 || pw.next !== pw.confirm} onClick={change}>
              Change password
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
