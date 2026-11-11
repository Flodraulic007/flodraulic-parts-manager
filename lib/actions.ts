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
  getCustomers,
  getParts,
  getProject,
  getProjects,
  getSettings,
  getUser,
  makeBuild,
  nextMtrNumber,
  nextPartNumber,
  nextQuoteBase,
} from "./data";
import { newBom, newQuoteDoc } from "./defaults";
import { currentRevision } from "./calc";
import { uid } from "./format";
import type { Bom, BuildStatus, Customer, Part, Project, QuoteDoc, QuoteStatus, Settings } from "./types";

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
  if (username.toLowerCase() === b.username.toLowerCase() && password === b.password) {
    user = { username: b.username, name: b.name };
  } else if (username) {
    try {
      const u = await getUser(username);
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

async function mutate(id: string, fn: (p: Project, user: string) => string | void | Promise<string | void>): Promise<Result> {
  const user = await requireUser();
  const p = await getProject(id);
  if (!p) return { ok: false, error: "Project not found" };
  try {
    const msg = await fn(p, user.name);
    if (msg) p.activity.unshift({ at: new Date().toISOString(), user: user.name, text: msg });
    p.updatedAt = new Date().toISOString();
    await store().put("projects", p);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

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
      createdAt: now,
      updatedAt: now,
      revisions: [
        { rev: 0, quoteNumber: `${quoteBase}0`, status: "draft", note: "Initial quote", createdAt: now, createdBy: user.name, quote, bom: newBom(settings) },
      ],
      activity: [{ at: now, user: user.name, text: `Quote ${quoteBase}0 created with ${mtrNumber}` }],
    };
    settings.nextMtr = mtrN + 1;
    await store().put("settings", settings);
  }
  await store().put("projects", p);
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
  return mutate(id, (p) => {
    const r = p.revisions.find((x) => x.rev === rev);
    if (!r) throw new Error("Revision not found");
    if (r.status !== "draft") throw new Error(`${r.quoteNumber} is locked. Create a new revision to make changes.`);
    r.quote = quote;
    r.bom = bom;
    // Keep register details in step with the quote
    if (quote.company) p.customer = quote.company.toUpperCase();
  });
}

export async function issueRevision(id: string) {
  return mutate(id, (p) => {
    const r = currentRevision(p);
    if (!r || r.status !== "draft") throw new Error("Only a draft revision can be issued");
    r.status = "issued";
    r.issuedAt = new Date().toISOString();
    p.quoteStatus = "sent";
    return `Quote ${r.quoteNumber} issued to customer`;
  });
}

export async function createRevision(id: string, note: string) {
  return mutate(id, (p, user) => {
    if (p.stage === "build") throw new Error("This project is already approved and in build");
    const last = currentRevision(p);
    if (!last) throw new Error("No revision to copy");
    if (last.status === "issued" || last.status === "draft") last.status = "superseded";
    const rev = last.rev + 1;
    if (rev > 9) throw new Error("Maximum of 10 revisions (0–9) reached");
    p.revisions.push({
      rev,
      quoteNumber: `${p.quoteBase}${rev}`,
      status: "draft",
      note: note || `Revision ${rev}`,
      createdAt: new Date().toISOString(),
      createdBy: user,
      quote: { ...structuredClone(last.quote), quoteDate: new Date().toISOString().slice(0, 10) },
      bom: structuredClone(last.bom),
    });
    p.quoteStatus = "draft";
    return `Revision ${p.quoteBase}${rev} created${note ? ` — ${note}` : ""}`;
  });
}

export async function setQuoteStatus(id: string, status: QuoteStatus, reason?: string) {
  return mutate(id, (p) => {
    if (p.stage === "build") throw new Error("Project is already in build");
    if (status === "approved") throw new Error("Use Approve to move a quote to build");
    p.quoteStatus = status;
    p.lostReason = status === "lost" ? reason : undefined;
    const label = { draft: "re-opened", sent: "marked as sent", lost: "marked as lost", hold: "put on hold" }[status];
    return `Quote ${label}${reason ? ` — ${reason}` : ""}`;
  });
}

export async function approveQuote(id: string, input: { rev: number; poNumber: string; dueDate: string; assignedTo: string }) {
  return mutate(id, (p, user) => {
    if (p.stage === "build") throw new Error("Already in build");
    const r = p.revisions.find((x) => x.rev === input.rev);
    if (!r) throw new Error("Revision not found");
    for (const x of p.revisions) if (x.status === "draft" || x.status === "issued") x.status = x.rev === r.rev ? "approved" : "superseded";
    r.status = "approved";
    r.issuedAt ??= new Date().toISOString();
    p.poNumber = input.poNumber || p.poNumber;
    p.quoteStatus = "approved";
    p.stage = "build";
    p.buildStatus = "queued";
    p.build = makeBuild(p, r.bom, r.rev, user, new Date().toISOString(), {
      ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      assignedTo: input.assignedTo,
    });
    return `Quote ${r.quoteNumber} approved${p.poNumber ? ` (PO ${p.poNumber})` : ""} — moved to build as ${p.mtrNumber}`;
  });
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

export async function saveBuildBom(id: string, bom: Bom) {
  return mutate(id, (p) => {
    if (!p.build) throw new Error("Not in build");
    p.build.bom = bom;
    return "Build BOM updated";
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

export async function setBuildStatus(id: string, status: BuildStatus) {
  return mutate(id, (p) => {
    if (!p.build) throw new Error("Not in build");
    p.buildStatus = status;
    if (status === "shipped") p.build.shippedAt = new Date().toISOString();
    return `Build status changed to ${status}`;
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
  await requireUser();
  if (!c.name.trim()) return { ok: false, error: "Name is required" };
  await store().put("customers", { ...c, id: c.id || uid(), name: c.name.trim().toUpperCase(), createdAt: c.createdAt || new Date().toISOString() });
  revalidatePath("/customers");
  return { ok: true };
}

export async function saveSettings(s: Settings): Promise<Result> {
  await requireUser();
  await store().put("settings", { ...s, id: "app" });
  revalidatePath("/", "layout");
  return { ok: true };
}
