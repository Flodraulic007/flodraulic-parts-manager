import type { Tone } from "./defaults";
import type { Project, ProjectStatus, Role, SessionUser } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  manager: "Manager",
  designer: "Designer",
  production: "Production Manager",
};

export type StageGroup = "Quoting" | "Review" | "With client" | "Build" | "Production" | "Closed";

export const STATUS: Record<ProjectStatus, { label: string; tone: Tone; stage: "quote" | "build"; group: StageGroup; progress: number }> = {
  drafting: { label: "Drafting", tone: "slate", stage: "quote", group: "Quoting", progress: 0.08 },
  quote_review: { label: "In peer review", tone: "violet", stage: "quote", group: "Review", progress: 0.16 },
  quote_returned: { label: "Returned for changes", tone: "rose", stage: "quote", group: "Quoting", progress: 0.12 },
  awaiting_manager: { label: "Awaiting manager", tone: "amber", stage: "quote", group: "Review", progress: 0.22 },
  sent: { label: "Sent to client", tone: "blue", stage: "quote", group: "With client", progress: 0.3 },
  revision_requested: { label: "Revision requested", tone: "orange", stage: "quote", group: "Quoting", progress: 0.12 },
  hold: { label: "On hold", tone: "amber", stage: "quote", group: "Closed", progress: 0.1 },
  lost: { label: "Lost", tone: "rose", stage: "quote", group: "Closed", progress: 0 },
  po_received: { label: "PO received", tone: "teal", stage: "build", group: "Build", progress: 0.4 },
  building: { label: "Building", tone: "blue", stage: "build", group: "Build", progress: 0.5 },
  build_review: { label: "Build review", tone: "violet", stage: "build", group: "Build", progress: 0.6 },
  build_returned: { label: "Build returned", tone: "rose", stage: "build", group: "Build", progress: 0.55 },
  ready_production: { label: "Ready for production", tone: "green", stage: "build", group: "Production", progress: 0.7 },
  in_production: { label: "In production", tone: "orange", stage: "build", group: "Production", progress: 0.85 },
  shipped: { label: "Shipped", tone: "green", stage: "build", group: "Closed", progress: 1 },
};

export const STATUS_ORDER: ProjectStatus[] = [
  "drafting",
  "quote_returned",
  "revision_requested",
  "quote_review",
  "awaiting_manager",
  "sent",
  "po_received",
  "building",
  "build_returned",
  "build_review",
  "ready_production",
  "in_production",
  "shipped",
  "hold",
  "lost",
];

const QUOTE_EDITABLE: ProjectStatus[] = ["drafting", "quote_returned", "revision_requested"];
const BUILD_EDITABLE: ProjectStatus[] = ["po_received", "building", "build_returned"];

export const isManager = (u: Pick<SessionUser, "role">) => u.role === "manager";

export function canEditQuote(p: Project, u: SessionUser) {
  const r = p.revisions[p.revisions.length - 1];
  return !!r && r.status === "draft" && p.stage === "quote" && QUOTE_EDITABLE.includes(p.status) && (isManager(u) || p.assignee === u.username);
}

export function canEditBuild(p: Project, u: SessionUser) {
  return p.stage === "build" && BUILD_EDITABLE.includes(p.status) && (isManager(u) || p.assignee === u.username);
}

export function canComment(p: Project, u: SessionUser) {
  return isManager(u) || p.assignee === u.username || p.reviewer === u.username || u.role === "designer";
}

export function daysInStatus(p: Project, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(p.statusSince || p.updatedAt).getTime()) / 86400000));
}

export interface Task {
  id: string;
  href: string;
  title: string;
  detail: string;
  action: string;
  tone: Tone;
  since: string;
}

/** What each person needs to do next. */
export function tasksFor(projects: Project[], u: SessionUser): Task[] {
  const out: Task[] = [];
  const mine = (x?: string) => x === u.username;
  for (const p of projects) {
    const q = p.revisions.at(-1)?.quoteNumber ?? p.mtrNumber;
    const base = { since: p.statusSince, detail: `${p.customer} — ${p.description.replace(/_/g, " ")}` };
    const qh = `/quotes/${p.id}`;
    const bh = `/builds/${p.id}`;
    switch (p.status) {
      case "drafting":
      case "revision_requested":
        if (mine(p.assignee))
          out.push({ ...base, id: p.id, href: `${qh}/bom`, title: q, action: p.status === "drafting" ? "Build the quote" : "Revise the quote", tone: p.status === "drafting" ? "slate" : "orange" });
        else if (!p.assignee && isManager(u)) out.push({ ...base, id: p.id, href: qh, title: q, action: "Assign a designer", tone: "amber" });
        break;
      case "quote_returned":
        if (mine(p.assignee)) out.push({ ...base, id: p.id, href: `${qh}/bom`, title: q, action: "Address review comments", tone: "rose" });
        break;
      case "quote_review":
        if (mine(p.reviewer)) out.push({ ...base, id: p.id, href: `${qh}/bom`, title: q, action: "Peer review the quote", tone: "violet" });
        break;
      case "awaiting_manager":
        if (isManager(u)) out.push({ ...base, id: p.id, href: `${qh}/quote`, title: q, action: "Approve & send to client", tone: "amber" });
        break;
      case "po_received":
        if (isManager(u) && !p.assignee) out.push({ ...base, id: p.id, href: bh, title: p.mtrNumber, action: "Assign a build designer", tone: "teal" });
        else if (mine(p.assignee)) out.push({ ...base, id: p.id, href: `${bh}/bom`, title: p.mtrNumber, action: "Start the build BOM", tone: "teal" });
        break;
      case "building":
        if (mine(p.assignee)) out.push({ ...base, id: p.id, href: `${bh}/bom`, title: p.mtrNumber, action: "Refine the build BOM", tone: "blue" });
        break;
      case "build_returned":
        if (mine(p.assignee)) out.push({ ...base, id: p.id, href: `${bh}/bom`, title: p.mtrNumber, action: "Address build review comments", tone: "rose" });
        break;
      case "build_review":
        if (mine(p.reviewer)) out.push({ ...base, id: p.id, href: `${bh}/bom`, title: p.mtrNumber, action: "Peer review the build", tone: "violet" });
        break;
      case "ready_production":
        if (u.role === "production" || isManager(u)) out.push({ ...base, id: p.id, href: bh, title: p.mtrNumber, action: "Start production", tone: "green" });
        break;
      case "in_production":
        if (u.role === "production") out.push({ ...base, id: p.id, href: bh, title: p.mtrNumber, action: "In production — update progress", tone: "orange" });
        break;
    }
  }
  return out.sort((a, b) => a.since.localeCompare(b.since));
}
