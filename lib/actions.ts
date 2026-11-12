"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { store } from "./store";
import { requireUser } from "./auth";
import { SESSION_COOKIE, signSession } from "./session";
import {
  BOOTSTRAP_USER,
  checkPassword,
  hashPassword as hashPasswordServer,
  getCustomers,
  getParts,
  getProject,
  getProjects,
  getSettings,
  getUser,
  getUsers,
  makeBuild,
  notify,
  usersWithRole,
  nextMtrNumber,
  nextPartNumber,
  nextQuoteBase,
} from "./data";
import { newBom, newQuoteDoc } from "./defaults";
import { bomTotals, bomVariance, currentRevision, lineTotal } from "./calc";
import { money, uid } from "./format";
import { STATUS, canEditBuild, canEditQuote, isManager } from "./workflow";
import type { Bom, BuildStatus, Customer, Part, Project, ProjectStatus, QuoteDoc, Role, SessionUser, Settings, Supplier, User } from "./types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function login(_: unknown, form: FormData): Promise<{ error?: string; username?: string }> {
  const username = String(form.get("username") || "").trim();
  const password = String(form.get("password") || "");
  const next = String(form.get("next") || "/");
  let user: { username: string; name: string } | null = null;
  const b = BOOTSTRAP_USER;
  let stored: User | null = null;
  try {
    stored = username ? await getUser(username) : null;
  } catch (e) {
    console.error("[login] user lookup failed", e);
  }
  if (stored?.active === false) return { error: "This account has been deactivated. Ask your manager.", username };
  if (username.toLowerCase() === b.username.toLowerCase() && password === b.password && !stored?.passwordChanged) {
    user = { username: b.username, name: stored?.name || b.name };
  } else if (username) {
    try {
      const u = stored ?? (await getUser(username));
      if (u && checkPassword(password, u.passwordHash)) user = u;
    } catch (e) {
      console.error("[login] user lookup failed", e);
      return { error: "Can't reach the database to check this account. See the server logs (MONGODB_URI).", username };
    }
  }
  if (!user) return { error: "Invalid username or password.", username };
  const { token, maxAge } = await signSession(user.username, user.name);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Mutator = (p: Project, user: string, u: SessionUser) => string | void | Promise<string | void>;

async function mutate(id: string, fn: Mutator): Promise<Result> {
  const user = await requireUser();
  const p = await getProject(id);
  if (!p) return { ok: false, error: "Project not found" };
  try {
    const msg = await fn(p, user.name, user);
    if (msg) p.activity.unshift({ at: new Date().toISOString(), user: user.name, text: msg });
    p.updatedAt = new Date().toISOString();
    await store().put("projects", p);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const managerOnly = (u: SessionUser) => need(isManager(u), "Only a manager can do this");

/** Change workflow status, recording who/when/comment in the project timeline. */
function setStatus(p: Project, to: ProjectStatus, u: SessionUser, comment?: string, text?: string) {
  const from = p.status;
  const now = new Date().toISOString();
  p.status = to;
  p.statusSince = now;
  if (STATUS[to].stage === "quote" && to !== "hold" && to !== "lost") p.quoteStatus = to === "sent" ? "sent" : "draft";
  if (to === "hold") p.quoteStatus = "hold";
  if (to === "lost") p.quoteStatus = "lost";
  p.activity.unshift({
    at: now,
    user: u.name,
    kind: "status",
    from,
    to,
    comment: comment || undefined,
    text: text ?? `${STATUS[from]?.label ?? from} → ${STATUS[to].label}`,
  });
}

async function nameOf(username?: string) {
  if (!username) return "";
  return (await getUsers()).find((u) => u.username === username)?.name ?? username;
}

const qn = (p: Project) => p.revisions.at(-1)?.quoteNumber ?? p.mtrNumber;

/* ------------------------------------------------------------------ */
/* Projects / quotes                                                   */
/* ------------------------------------------------------------------ */

export interface NewQuoteInput {
  customer: string;
  description: string;
  pcs: number;
  csa: boolean;
  ul: boolean;
  qps: boolean;
  quotedBy: string;
  poNumber: string;
  attention: string;
  email: string;
  phone: string;
  isRepeat: boolean;
  repeatMtr: string;
  serialNumber: string;
  /** Username of the designer the quote is assigned to */
  assignee?: string;
}

export async function createProject(input: NewQuoteInput): Promise<Result<{ id: string; stage: string }>> {
  const user = await requireUser();
  const customerName = input.customer.trim().toUpperCase();
  const description = input.description.trim().replace(/\s+/g, "_").toUpperCase();
  if (!customerName) return { ok: false, error: "Customer is required" };
  if (!input.isRepeat && !description) return { ok: false, error: "Description is required" };

  const [settings, projects, customers] = await Promise.all([getSettings(), getProjects(), getCustomers()]);
  const now = new Date().toISOString();

  // Customer directory: create or enrich
  let customer = customers.find((c) => c.name.toUpperCase() === customerName);
  if (!customer) {
    customer = {
      id: uid(),
      name: customerName,
      attention: input.attention,
      email: input.email,
      phone: input.phone,
      address: "",
      notes: "",
      createdAt: now,
      defaultMargin: settings.pricing.targetMargin,
    };
  } else {
    customer.attention ||= input.attention;
    customer.email ||= input.email;
    customer.phone ||= input.phone;
  }
  await store().put("customers", customer);

  const certs = { csa: input.csa, ul: input.ul, qps: input.qps };
  let p: Project;

  if (input.isRepeat) {
    const mtr = input.repeatMtr.trim().toUpperCase();
    if (!/^MTR/.test(mtr)) return { ok: false, error: "Enter the MTR number being repeated (e.g. MTR6868)" };
    const original = projects.find((x) => x.mtrNumber === mtr && !x.isRepeat) ?? projects.find((x) => x.mtrNumber === mtr);
    const sourceBom: Bom =
      original?.build?.bom ?? (original && currentRevision(original)?.bom) ?? newBom(settings);
    p = {
      id: uid(),
      quoteBase: "",
      mtrNumber: mtr,
      customer: customerName,
      description: description || original?.description || "REPEAT",
      pcs: input.pcs || 1,
      ...certs,
      poNumber: input.poNumber,
      quotedBy: input.quotedBy || user.name,
      serialNumber: input.serialNumber,
      isRepeat: true,
      repeatOf: original?.id,
      stage: "build",
      quoteStatus: "approved",
      buildStatus: "queued",
      status: input.assignee ? "building" : "po_received",
      statusSince: now,
      assignee: input.assignee || undefined,
      comments: [],
      createdAt: now,
      updatedAt: now,
      revisions: [],
      activity: [
        {
          at: now,
          user: user.name,
          text: original ? `Repeat order of ${mtr} opened — BOM copied from the original` : `Repeat order of ${mtr} opened`,
        },
      ],
    };
    p.build = makeBuild(p, sourceBom, null, user.name, now);
  } else {
    const quoteBase = nextQuoteBase(projects);
    const mtrN = nextMtrNumber(projects, settings);
    const mtrNumber = `MTR${mtrN}`;
    const base = { customer: customerName, description, mtrNumber, pcs: input.pcs || 1, quotedBy: input.quotedBy || user.name, ...certs };
    const quote = newQuoteDoc(settings, base, customer);
    const bom = newBom(settings);
    bom.targetMargin = customer.defaultMargin ?? settings.pricing.targetMargin;
    const assignee = input.assignee || (user.role === "designer" ? user.username : undefined);
    p = {
      id: quoteBase.toLowerCase(),
      quoteBase,
      mtrNumber,
      customer: customerName,
      description,
      pcs: input.pcs || 1,
      ...certs,
      poNumber: input.poNumber,
      quotedBy: base.quotedBy,
      serialNumber: "",
      isRepeat: false,
      stage: "quote",
      quoteStatus: "draft",
      buildStatus: "queued",
      status: "drafting",
      statusSince: now,
      assignee,
      comments: [],
      createdAt: now,
      updatedAt: now,
      revisions: [{ rev: 0, quoteNumber: `${quoteBase}0`, status: "draft", note: "Initial quote", createdAt: now, createdBy: user.name, quote, bom }],
      activity: [
        {
          at: now,
          user: user.name,
          kind: "status",
          to: "drafting",
          text: `Quote ${quoteBase}0 created with ${mtrNumber}${assignee ? ` — assigned to ${await nameOf(assignee)}` : ""}`,
        },
      ],
    };
    if (assignee) p.quotedBy = await nameOf(assignee);
    settings.nextMtr = mtrN + 1;
    await store().put("settings", settings);
  }
  await store().put("projects", p);
  if (p.assignee && p.assignee !== user.username)
    await notify([p.assignee], `${user.name} assigned you ${p.isRepeat ? p.mtrNumber : qn(p)} (${p.customer})`, p.stage === "build" ? `/builds/${p.id}` : `/quotes/${p.id}`);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: p.id, stage: p.stage } };
}

export async function updateProjectInfo(
  id: string,
  fields: Partial<Pick<Project, "customer" | "description" | "pcs" | "csa" | "ul" | "qps" | "poNumber" | "quotedBy" | "serialNumber">>,
) {
  return mutate(id, (p) => {
    const changed = Object.keys(fields).filter((k) => (p as unknown as Record<string, unknown>)[k] !== (fields as Record<string, unknown>)[k]);
    Object.assign(p, fields);
    if (fields.serialNumber !== undefined && p.build) p.build.summary.serialNumber = fields.serialNumber;
    if (fields.poNumber !== undefined && p.build) p.build.summary.customerOrder = fields.poNumber;
    return changed.length ? `Updated project details (${changed.join(", ")})` : undefined;
  });
}

export async function saveRevision(id: string, rev: number, quote: QuoteDoc, bom: Bom) {
  return mutate(id, async (p, _n, u) => {
    const r = p.revisions.find((x) => x.rev === rev);
    need(r, "Revision not found");
    need(r.status === "draft", `${r.quoteNumber} is locked. Create a new revision to make changes.`);
    need(canEditQuote(p, u), p.status === "quote_review" ? "This quote is in peer review and can't be edited right now." : "You can't edit this quote — it isn't assigned to you.");
    // Margin and the final price are a manager decision; keep them as they were for everyone else.
    if (!isManager(u)) {
      bom = { ...bom, targetMargin: r.bom.targetMargin, actualQuotePrice: r.bom.actualQuotePrice };
    } else if (bom.targetMargin !== r.bom.targetMargin) {
      const c = (await getCustomers()).find((x) => x.name.toUpperCase() === p.customer.toUpperCase());
      const def = c?.defaultMargin;
      p.activity.unshift({
        at: new Date().toISOString(),
        user: u.name,
        kind: "margin",
        text: `Margin on ${r.quoteNumber} changed ${r.bom.targetMargin}% → ${bom.targetMargin}%${def != null ? ` (customer default ${def}%)` : ""}`,
      });
    }
    r.quote = quote;
    r.bom = bom;
    if (quote.company) p.customer = quote.company.toUpperCase();
  });
}

/* ---- Quote workflow ---- */

export async function assignDesigner(id: string, username: string) {
  const res = await mutate(id, async (p, _n, u) => {
    managerOnly(u);
    const name = await nameOf(username);
    need(name, "Pick a designer");
    p.assignee = username;
    if (p.stage === "quote") p.quotedBy = name;
    if (p.build) p.build.assignedTo = name;
    if (p.status === "po_received") setStatus(p, "building", u, undefined, `Build assigned to ${name} — building`);
    else return `Assigned to ${name}`;
  });
  if (res.ok) {
    const p = (await getProject(id))!;
    const u = await requireUser();
    await notify([username], `${u.name} assigned you ${p.stage === "build" ? p.mtrNumber : qn(p)} (${p.customer})`, p.stage === "build" ? `/builds/${id}` : `/quotes/${id}`, u.username);
  }
  return res;
}

export async function submitForReview(id: string, reviewer: string, note: string) {
  let target = "";
  const res = await mutate(id, async (p, _n, u) => {
    const build = p.stage === "build";
    need(build ? canEditBuild(p, u) : canEditQuote(p, u), "Only the assigned designer can send this for review");
    need(reviewer && reviewer !== p.assignee, "Choose a different designer as the reviewer");
    const rname = await nameOf(reviewer);
    p.reviewer = reviewer;
    setStatus(p, build ? "build_review" : "quote_review", u, note, `Sent to ${rname} for peer review`);
    target = build ? `/builds/${p.id}/bom` : `/quotes/${p.id}/bom`;
  });
  if (res.ok) {
    const p = (await getProject(id))!;
    const u = await requireUser();
    await notify([reviewer], `Review requested: ${p.stage === "build" ? p.mtrNumber : qn(p)} from ${u.name}`, target, u.username);
  }
  return res;
}

export async function reviewDecision(id: string, decision: "return" | "approve", comment: string) {
  let notifyUsers: string[] = [];
  let text = "";
  let href = "";
  const res = await mutate(id, async (p, _n, u) => {
    const build = p.stage === "build";
    need(p.status === (build ? "build_review" : "quote_review"), "This project isn't waiting for review");
    need(p.reviewer === u.username || isManager(u), "Only the assigned reviewer can complete this review");
    const label = build ? p.mtrNumber : qn(p);
    if (decision === "return") {
      need(comment.trim() || (p.comments ?? []).some((c) => !c.resolved), "Add a comment explaining what needs to change");
      setStatus(p, build ? "build_returned" : "quote_returned", u, comment, `Returned for changes by ${u.name}`);
      notifyUsers = [p.assignee ?? ""];
      text = `${label} was returned for changes by ${u.name}`;
      href = build ? `/builds/${p.id}/bom` : `/quotes/${p.id}/bom`;
    } else {
      setStatus(p, build ? "ready_production" : "awaiting_manager", u, comment, build ? `Reviewed by ${u.name} — ready for production` : `Reviewed by ${u.name} — ready for the manager`);
      notifyUsers = [...(await usersWithRole("manager")), ...(build ? await usersWithRole("production") : []), p.assignee ?? ""];
      text = build ? `${label} is ready for production` : `${label} is reviewed and ready to send to ${p.customer}`;
      href = build ? `/builds/${p.id}` : `/quotes/${p.id}/quote`;
    }
    p.reviewer = undefined;
  });
  if (res.ok) await notify(notifyUsers, text, href, (await requireUser()).username);
  return res;
}

/** Manager approves the reviewed quote and sends it to the client. Locks the revision. */
export async function sendToClient(id: string) {
  return mutate(id, (p, _n, u) => {
    managerOnly(u);
    need(["awaiting_manager", "drafting", "quote_returned", "revision_requested"].includes(p.status), "This quote can't be sent from its current status");
    const r = currentRevision(p);
    need(r && r.status === "draft", "Only a draft revision can be sent");
    r.status = "issued";
    r.issuedAt = new Date().toISOString();
    setStatus(p, "sent", u, undefined, `${r.quoteNumber} approved by ${u.name} and sent to ${p.customer}`);
  });
}

/** Kept for compatibility: same as sendToClient. */
export const issueRevision = sendToClient;

/** A new version of the quote. A reason and who asked for it are required. */
export async function createRevision(id: string, reason: string, requestedBy: "customer" | "internal" = "customer") {
  let assignee: string | undefined;
  let label = "";
  const res = await mutate(id, (p, user, u) => {
    need(p.stage === "quote", "This project is already in build — the quote is frozen");
    need(reason.trim().length >= 3, "A reason for the revision is required");
    need(isManager(u) || p.assignee === u.username, "Only the manager or the assigned designer can revise this quote");
    const last = currentRevision(p);
    need(last, "No revision to copy");
    if (last.status === "issued" || last.status === "draft") last.status = "superseded";
    const rev = last.rev + 1;
    need(rev <= 9, "Maximum of 10 revisions (0–9) reached");
    p.revisions.push({
      rev,
      quoteNumber: `${p.quoteBase}${rev}`,
      status: "draft",
      note: reason.trim(),
      requestedBy,
      createdAt: new Date().toISOString(),
      createdBy: user,
      quote: { ...structuredClone(last.quote), quoteDate: new Date().toISOString().slice(0, 10) },
      bom: structuredClone(last.bom),
    });
    label = `${p.quoteBase}${rev}`;
    assignee = p.assignee;
    setStatus(
      p,
      "revision_requested",
      u,
      reason.trim(),
      `Revision ${label} created (${requestedBy === "customer" ? "customer request" : "internal correction"})`,
    );
  });
  if (res.ok) await notify([assignee], `Revision ${label} needs your changes`, `/quotes/${id}/bom`, (await requireUser()).username);
  return res;
}

export async function setQuoteStatus(id: string, status: "hold" | "lost" | "reopen", reason?: string) {
  return mutate(id, (p, _n, u) => {
    managerOnly(u);
    need(p.stage === "quote", "Project is already in build");
    if (status === "reopen") {
      const r = currentRevision(p);
      setStatus(p, r?.status === "draft" ? "drafting" : "sent", u, reason, "Quote re-opened");
      p.lostReason = undefined;
      return;
    }
    p.lostReason = status === "lost" ? reason : undefined;
    setStatus(p, status, u, reason, status === "lost" ? `Marked as lost${reason ? ` — ${reason}` : ""}` : "Put on hold");
  });
}

/** PO received: freeze the quote and create the build with its own copy of the BOM. */
export async function approveQuote(id: string, input: { rev: number; poNumber: string; dueDate: string; assignedTo: string }) {
  let assignee = "";
  const res = await mutate(id, async (p, user, u) => {
    managerOnly(u);
    need(p.stage === "quote", "Already in build");
    const r = p.revisions.find((x) => x.rev === input.rev);
    need(r, "Revision not found");
    for (const x of p.revisions) if (x.status === "draft" || x.status === "issued") x.status = x.rev === r.rev ? "approved" : "superseded";
    r.status = "approved";
    r.issuedAt ??= new Date().toISOString();
    p.poNumber = input.poNumber || p.poNumber;
    p.quoteStatus = "approved";
    p.stage = "build";
    p.buildStatus = "queued";
    assignee = input.assignedTo || p.assignee || "";
    p.assignee = assignee || undefined;
    p.reviewer = undefined;
    p.build = makeBuild(p, r.bom, r.rev, user, new Date().toISOString(), {
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      assignedTo: await nameOf(assignee),
    });
    setStatus(p, "po_received", u, input.poNumber ? `PO ${input.poNumber}` : undefined, `PO received${p.poNumber ? ` (${p.poNumber})` : ""} — ${r.quoteNumber} frozen, build ${p.mtrNumber} created`);
    if (assignee) setStatus(p, "building", u, undefined, `Build assigned to ${await nameOf(assignee)}`);
  });
  if (res.ok && assignee) {
    const p = (await getProject(id))!;
    await notify([assignee], `PO received — build ${p.mtrNumber} (${p.customer}) is assigned to you`, `/builds/${id}/bom`, (await requireUser()).username);
  }
  return res;
}

/** Production manager picks up a build that is ready. */
export async function startProduction(id: string) {
  return mutate(id, (p, _n, u) => {
    need(u.role === "production" || isManager(u), "Only the production manager can start production");
    need(p.status === "ready_production", "This build isn't ready for production");
    p.buildStatus = "wiring";
    setStatus(p, "in_production", u, undefined, `Production started by ${u.name}`);
  });
}

/* ---- Review comments ---- */

export async function addComment(id: string, input: { text: string; lineId?: string; lineLabel?: string; rev?: number }) {
  let notifyUsers: string[] = [];
  let href = "";
  let label = "";
  const res = await mutate(id, (p, _n, u) => {
    need(input.text.trim(), "Write a comment");
    const stage = p.stage;
    p.comments ??= [];
    p.comments.push({
      id: uid(),
      at: new Date().toISOString(),
      by: u.name,
      byUser: u.username,
      stage,
      rev: stage === "quote" ? (input.rev ?? p.revisions.at(-1)?.rev) : undefined,
      lineId: input.lineId,
      lineLabel: input.lineLabel,
      text: input.text.trim(),
      resolved: false,
    });
    notifyUsers = [p.assignee ?? "", p.reviewer ?? ""];
    href = stage === "build" ? `/builds/${p.id}/bom` : `/quotes/${p.id}/bom`;
    label = stage === "build" ? p.mtrNumber : qn(p);
  });
  if (res.ok) {
    const u = await requireUser();
    await notify(notifyUsers, `${u.name} commented on ${label}${input.lineLabel ? ` (${input.lineLabel})` : ""}`, href, u.username);
  }
  return res;
}

export async function resolveComment(id: string, commentId: string, resolved: boolean) {
  return mutate(id, (p) => {
    const c = p.comments?.find((x) => x.id === commentId);
    need(c, "Comment not found");
    c.resolved = resolved;
  });
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

/** Lines that changed between two versions of the build BOM (ignoring ordering status). */
function describeChanges(before: Bom, after: Bom) {
  return bomVariance(before, after).map((v) => ({
    label: v.line.partNumber && v.line.kind === "part" ? `${v.line.partNumber} ${v.line.description}` : v.line.description,
    change: v.change === "changed" ? `${v.before?.qty} → ${v.line.qty} @ ${money(v.line.unitCost)}` : v.change,
    delta: v.delta,
  }));
}

export async function previewBuildChanges(id: string, bom: Bom) {
  await requireUser();
  const p = await getProject(id);
  if (!p?.build) return [];
  return describeChanges(p.build.bom, bom);
}

export async function saveBuildBom(id: string, bom: Bom, reason?: string) {
  return mutate(id, (p, _n, u) => {
    need(p.build, "Not in build");
    need(canEditBuild(p, u), p.status === "build_review" ? "This build is in peer review and can't be edited right now." : "Only the assigned designer can edit the build BOM at this stage.");
    if (!isManager(u)) bom = { ...bom, targetMargin: p.build.bom.targetMargin, actualQuotePrice: p.build.bom.actualQuotePrice };
    const lines = describeChanges(p.build.bom, bom);
    if (lines.length) {
      need(reason && reason.trim().length >= 3, "Describe the reason for these BOM changes");
      const delta = lines.reduce((s, l) => s + l.delta, 0);
      p.build.changeLog ??= [];
      p.build.changeLog.unshift({ id: uid(), at: new Date().toISOString(), by: u.name, reason: reason!.trim(), lines, delta });
      p.build.bom = bom;
      if (p.status === "po_received") setStatus(p, "building", u);
      return `Build BOM changed (${lines.length} line${lines.length > 1 ? "s" : ""}, ${delta >= 0 ? "+" : ""}${money(delta)}) — ${reason!.trim()}`;
    }
    p.build.bom = bom;
  });
}

export async function saveBuildSheet(
  id: string,
  sheet: "summary" | "f5",
  values: Record<string, string>,
  motors?: { id: string; label: string; setting: string }[],
) {
  return mutate(id, (p) => {
    if (!p.build) throw new Error("Not in build");
    p.build[sheet] = values;
    if (motors) p.build.motors = motors;
    if (sheet === "summary" && values.serialNumber !== undefined) p.serialNumber = values.serialNumber;
    return sheet === "summary" ? "Build summary updated" : "F5 sheet updated";
  });
}

export async function updateBuildMeta(id: string, fields: { dueDate?: string; assignedTo?: string }) {
  return mutate(id, (p) => {
    if (!p.build) throw new Error("Not in build");
    Object.assign(p.build, fields);
    return `Build details updated`;
  });
}

/** Production progress (production manager / manager). */
export async function setBuildStatus(id: string, status: BuildStatus) {
  return mutate(id, (p, _n, u) => {
    need(p.build, "Not in build");
    need(u.role === "production" || isManager(u), "Only the production manager can update production progress");
    need(["ready_production", "in_production", "shipped"].includes(p.status), "This build hasn't been released to production yet");
    p.buildStatus = status;
    if (status === "shipped") {
      p.build.shippedAt = new Date().toISOString();
      setStatus(p, "shipped", u, undefined, `Shipped`);
      return;
    }
    if (p.status !== "in_production") setStatus(p, "in_production", u);
    return `Production step: ${status}`;
  });
}

export async function setQcItem(id: string, key: string, done: boolean) {
  return mutate(id, (p, user) => {
    if (!p.build) throw new Error("Not in build");
    p.build.qc[key] = done ? { done, by: user, at: new Date().toISOString() } : { done: false };
  });
}

export async function saveQcSignoff(id: string, values: Record<string, string>) {
  return mutate(id, (p) => {
    if (!p.build) throw new Error("Not in build");
    p.build.qcSignoff = values;
    return "QC sign-off updated";
  });
}

export async function setLineStatus(id: string, lineId: string, status: string, poRef?: string) {
  return mutate(id, (p) => {
    const l = p.build?.bom.lines.find((x) => x.id === lineId);
    if (!l) throw new Error("Line not found");
    l.status = status as typeof l.status;
    if (poRef !== undefined) l.poRef = poRef;
  });
}

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

export async function savePart(input: Partial<Part> & { category: string; description: string }): Promise<Result<{ partNumber: string }>> {
  const user = await requireUser();
  const parts = await getParts();
  const now = new Date().toISOString();
  let part: Part;
  if (input.id) {
    const existing = parts.find((x) => x.id === input.id);
    if (!existing) return { ok: false, error: "Part not found" };
    part = { ...existing, ...input, id: existing.id, partNumber: existing.partNumber, category: existing.category };
    if (input.cost !== undefined && input.cost !== existing.cost) {
      part.priceHistory = [{ at: now, by: user.name, cost: existing.cost }, ...(existing.priceHistory ?? [])].slice(0, 20);
    }
  } else {
    if (!input.description.trim()) return { ok: false, error: "Description is required" };
    const dup = input.mfrPartNumber?.trim()
      ? parts.find((x) => x.mfrPartNumber.toUpperCase() === input.mfrPartNumber!.trim().toUpperCase())
      : undefined;
    if (dup && !(input as { force?: boolean }).force)
      return { ok: false, error: `Manufacturer part # already exists as ${dup.partNumber} (${dup.description})` };
    const pn = nextPartNumber(parts, input.category);
    part = {
      id: pn,
      partNumber: pn,
      category: input.category,
      description: input.description.trim().toUpperCase(),
      mfrPartNumber: input.mfrPartNumber?.trim() ?? "",
      cost: input.cost ?? 0,
      altCost: input.altCost ?? null,
      currency: input.currency ?? "CAD",
      supplier: input.supplier?.trim().toUpperCase() ?? "",
      altSupplier: input.altSupplier?.trim().toUpperCase() ?? "",
      contact: input.contact?.trim() ?? "",
      jobRef: input.jobRef?.trim() ?? "",
      link: input.link?.trim() ?? "",
      notes: input.notes?.trim() ?? "",
      obsolete: false,
    };
  }
  part.updatedAt = now;
  part.updatedBy = user.name;
  delete (part as { force?: boolean }).force;
  await store().put("parts", part);
  revalidatePath("/parts");
  return { ok: true, data: { partNumber: part.partNumber } };
}

/* ------------------------------------------------------------------ */
/* Customers & settings                                                */
/* ------------------------------------------------------------------ */

export async function saveCustomer(c: Customer): Promise<Result> {
  const u = await requireUser();
  if (!c.name.trim()) return { ok: false, error: "Name is required" };
  const existing = c.id ? (await getCustomers()).find((x) => x.id === c.id) : undefined;
  // Only managers see or set margins.
  const defaultMargin = isManager(u) ? c.defaultMargin : existing?.defaultMargin;
  await store().put("customers", {
    ...c,
    defaultMargin,
    id: c.id || uid(),
    name: c.name.trim().toUpperCase(),
    createdAt: c.createdAt || new Date().toISOString(),
  });
  revalidatePath("/customers");
  return { ok: true };
}

export async function saveSettings(s: Settings): Promise<Result> {
  const u = await requireUser();
  if (!isManager(u)) return { ok: false, error: "Only a manager can change settings" };
  const { team, ...rest } = s;
  void team; // the team comes from user accounts
  const current = await store().get<Settings>("settings", "app");
  await store().put("settings", { ...rest, team: current?.team ?? [], seeded: current?.seeded, id: "app" });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export interface UserInput {
  id?: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  active: boolean;
  emailNotifications: boolean;
  password?: string;
}

export async function saveUser(input: UserInput): Promise<Result> {
  const u = await requireUser();
  if (!isManager(u)) return { ok: false, error: "Only a manager can manage users" };
  const users = await getUsers();
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,32}$/.test(username)) return { ok: false, error: "Username: 2–32 letters, numbers, dot, dash or underscore" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  const existing = input.id ? users.find((x) => x.id === input.id) : undefined;
  if (!existing && users.some((x) => x.username.toLowerCase() === username)) return { ok: false, error: "That username is taken" };
  if (!existing && (!input.password || input.password.length < 6)) return { ok: false, error: "Set a password of at least 6 characters" };
  if (input.password && input.password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };
  if (existing?.username === u.username && (input.role !== "manager" || !input.active))
    return { ok: false, error: "You can't remove your own manager access" };
  const doc: User & { passwordChanged?: boolean } = {
    id: existing?.id ?? username,
    username: existing?.username ?? username,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    role: input.role,
    title: input.title.trim(),
    active: input.active,
    emailNotifications: input.emailNotifications,
    passwordHash: input.password ? hashPasswordServer(input.password) : existing!.passwordHash,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ...(input.password && existing ? { passwordChanged: true } : {}),
    ...((existing as { passwordChanged?: boolean })?.passwordChanged ? { passwordChanged: true } : {}),
  };
  await store().put("users", doc);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeOwnPassword(current: string, next: string): Promise<Result> {
  const u = await requireUser();
  const me = await getUser(u.username);
  if (!me) return { ok: false, error: "Account not found" };
  const okCurrent =
    checkPassword(current, me.passwordHash) ||
    (u.username.toLowerCase() === BOOTSTRAP_USER.username.toLowerCase() && current === BOOTSTRAP_USER.password && !(me as { passwordChanged?: boolean }).passwordChanged);
  if (!okCurrent) return { ok: false, error: "Current password is incorrect" };
  if (next.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
  await store().put("users", { ...me, passwordHash: hashPasswordServer(next), passwordChanged: true });
  return { ok: true };
}

export async function setMyEmailNotifications(on: boolean): Promise<Result> {
  const u = await requireUser();
  const me = await getUser(u.username);
  if (!me) return { ok: false, error: "Account not found" };
  await store().put("users", { ...me, emailNotifications: on });
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export async function markNotificationsRead(ids?: string[]): Promise<Result> {
  const u = await requireUser();
  const all = await store().all<import("./types").Notification>("notifications");
  const mine = all.filter((n) => n.user === u.username && !n.read && (!ids || ids.includes(n.id)));
  if (mine.length) await store().putMany("notifications", mine.map((n) => ({ ...n, read: true })));
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Suppliers                                                           */
/* ------------------------------------------------------------------ */

export async function saveSupplier(s: Supplier): Promise<Result> {
  await requireUser();
  if (!s.name.trim()) return { ok: false, error: "Name is required" };
  await store().put("suppliers", { ...s, id: s.id || uid(), name: s.name.trim().toUpperCase(), createdAt: s.createdAt || new Date().toISOString() });
  revalidatePath("/suppliers");
  return { ok: true };
}

export async function deleteSupplier(id: string): Promise<Result> {
  const u = await requireUser();
  if (!isManager(u)) return { ok: false, error: "Only a manager can delete suppliers" };
  await store().remove("suppliers", id);
  revalidatePath("/suppliers");
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Part documents                                                      */
/* ------------------------------------------------------------------ */

export async function deletePartDoc(partId: string, docId: string): Promise<Result> {
  await requireUser();
  const part = await store().get<Part>("parts", partId);
  if (!part) return { ok: false, error: "Part not found" };
  part.docs = (part.docs ?? []).filter((d) => d.id !== docId);
  await store().put("parts", part);
  await store().removeFile(docId);
  revalidatePath("/parts");
  return { ok: true };
}
