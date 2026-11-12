import type { Metadata } from "next";
import { getProjects, getUsers } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { tasksFor } from "@/lib/workflow";
import { PageHeader } from "@/components/ui";
import { UserManager } from "./user-manager";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireRole("manager");
  const [users, projects] = await Promise.all([getUsers(), getProjects()]);
  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email ?? "",
    phone: u.phone ?? "",
    role: u.role,
    title: u.title ?? "",
    active: u.active,
    emailNotifications: !!u.emailNotifications,
    createdAt: u.createdAt,
    openTasks: tasksFor(projects, { username: u.username, name: u.name, role: u.role }).length,
    assigned: projects.filter((p) => p.assignee === u.username && !["shipped", "lost"].includes(p.status)).length,
  }));
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Admin"
        title="Users & roles"
        subtitle="Create accounts for the team and set what each person can do. Managers see margins and approve quotes; designers build and peer-review; the production manager runs released builds."
      />
      <UserManager rows={rows} me={me.username} />
    </div>
  );
}
