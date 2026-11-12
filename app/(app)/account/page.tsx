import type { Metadata } from "next";
import { getUser } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/workflow";
import { Card, PageHeader } from "@/components/ui";
import { AccountForms } from "./account-forms";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireUser();
  const u = await getUser(me.username);
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-8">
      <PageHeader eyebrow="Account" title={me.name} subtitle={`${ROLE_LABEL[me.role]} · signed in as ${me.username}`} />
      <Card title="Profile">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Email</dt>
            <dd>{u?.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Phone</dt>
            <dd>{u?.phone || "—"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-gray-500">Ask a manager to change your name, email or role.</p>
      </Card>
      <AccountForms emailNotifications={!!u?.emailNotifications} />
    </div>
  );
}
