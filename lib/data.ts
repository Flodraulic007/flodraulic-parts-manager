import "server-only";
import crypto from "node:crypto";
import { store } from "./store";
import { DEFAULT_SETTINGS, newBom, newQuoteDoc } from "./defaults";
import { currentRevision } from "./calc";
import { uid } from "./format";
import type { Bom, Build, Customer, Part, Project, Settings, User } from "./types";

/* ------------------------------------------------------------------ */
/* Passwords                                                           */
/* ------------------------------------------------------------------ */

export function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 32);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

const g = globalThis as typeof globalThis & { __fdSeeded?: Promise<void> };

export function ensureSeeded() {
  g.__fdSeeded ??= seed().catch((e) => {
    g.__fdSeeded = undefined;
    throw e;
  });
  return g.__fdSeeded;
}

/** Built-in account, always accepted even if the database is empty or unreachable. Override with env vars. */
export const BOOTSTRAP_USER = {
  username: process.env.ADMIN_USERNAME || "jeril",
  password: process.env.ADMIN_PASSWORD || "jeril",
  name: process.env.ADMIN_NAME || "Jeril Benny",
};

async function seed() {
  const s = store();
  const settings = (await s.get<Settings>("settings", "app")) ?? DEFAULT_SETTINGS;
  const done = { ...settings.seeded };
  // Each step is idempotent (upserts) and marked complete only when it finishes, so an interrupted
  // first run (e.g. a serverless timeout) simply resumes next time.
  if (!done.parts) {
    // Imported (not read from disk) so it is bundled into serverless deployments.
    const { parts } = (await import("@/data/seed/parts.json")).default as unknown as { parts: Part[] };
    await s.putMany("parts", parts);
    done.parts = true;
    await s.put("settings", { ...settings, seeded: { ...done } });
  }
  if (!done.projects) {
    if ((await s.count("projects")) === 0) await seedProjects();
    done.projects = true;
    await s.put("settings", { ...((await s.get<Settings>("settings", "app")) ?? settings), seeded: { ...done } });
  }
}

/** The current project register (from the team's tracking spreadsheet) so the app opens with real context. */
const REGISTER: [string, string, string, string, string, number, string, string, string][] = [
  ["REPEAT", "MTR7257", "", "FLOCALGARY", "PLUS1_PANEL_FOR_AUTOMATEDIRON_CATWALK", 1, "", "", "Stephen Platkin-Hogg"],
  ["REPEAT", "MTR7087", "0926-00606", "ODYSSEY", "REPEAT_NEED_SERIAL_NUMBER", 1, "csa", "368371", "RobC"],
  ["261002A0", "MTR7258", "", "MMTC", "PUSHBUTTON_STATION_2X4", 1, "ul", "", "Stephen Platkin-Hogg"],
  ["REPEAT", "MTR6868", "1026-00607", "WESTERN GLOBAL", "REPEAT_NEED_SERIAL_NUMBER", 1, "csa", "POCA030740", "RobC"],
  ["REPEAT", "MTR6473-075", "1026-00608 to 1026-00611", "WESTERN GLOBAL", "REPEAT_NEED_SERIAL_NUMBER", 4, "csa", "POCA030712", "RobC"],
  ["261009A0", "MTR7259", "", "NORDOCK", "MTR6674_WITH_STAINLESS_ENCLOSURE", 1, "qps", "", "Ben DaSilva"],
  ["261009B0", "MTR7260", "", "FLOCALGARY", "LOCKOUT_PANEL_CALGARY_ZOO", 1, "csa", "", "Stephen Platkin-Hogg"],
  ["261009C0", "MTR7261", "1026-00612", "GRINDING AND POLISHING", "7.5 HP 460360 VAC VFD DUAL PANEL", 1, "ul", "", "Ben DaSilva"],
  ["261013A0", "MTR7262", "", "WESTERN GLOBAL", "25HP_460V_3PH_60Hz_N4X_CHEMREX_W_HEATER", 1, "csa", "", "Robert Cado"],
  ["261015A0", "MTR7263", "", "NORDOCK", "208V_5HP_1.5HP_M221_20x20_58-2409", 2, "csa", "", "Stephen Platkin-Hogg"],
  ["REPEAT", "MTR3615F-1", "1026-00613", "GRINDING AND POLISHING", "REPEAT_NEED_SERIAL_NUMBER", 1, "ul", "20432", "Ben DaSilva"],
  ["261020A0", "MTR7264", "1026-00614 to 1026-00616", "NORDOCK", "1HP_575V_1PB STARTER_100806_48-0566", 3, "csa", "", "Ben DaSilva"],
  ["REPEAT", "MTR7263", "1026-00617 to 1026-00618", "NORDOCK", "REPEAT_NEED_SERIAL_NUMBER", 2, "csa", "", "Kiran Krishnan"],
  ["261026A0", "MTR7265", "", "NORDOCK", "1.5HP_575V_AR_16148_58-2411", 38, "qps", "", "Ben DaSilva"],
  ["261027A0", "MTR7266", "", "GRINDING AND POLISHING", "7.5HP_460V_FLOOR_GRINDING_MACHINE", 1, "ul", "", "Stephen Platkin-Hogg"],
  ["261103A0", "MTR7267", "", "FLOCALGARY", "15HP_208V_STARTER_24VDC_CTRL", 1, "csa", "", "Stephen Platkin-Hogg"],
  ["261104A0", "MTR7268", "", "FLOCALGARY", "5.5KW_415V_STARTERW_24VDC_CTRL", 1, "ul", "", "Stephen Platkin-Hogg"],
  ["261105A0", "MTR7269", "", "TIMBERLAND EQUIPMENT", "5HP_460V_REVISED_MTR5731", 1, "ul", "", "Stephen Platkin-Hogg"],
  ["261106A0", "MTR7270", "1126-00619 to 1126-00626", "NORDOCK", "1450W_115V_PUMP_202010_58-2412", 8, "csa", "", "Ben DaSilva"],
  ["261109A0", "MTR7271", "", "NORDOCK", "1450W_115V_PUMP_ZELIO_58-2413", 9, "csa", "", "Stephen Platkin-Hogg"],
];

const SAMPLE_BOM: [string, number][] = [
  ["PBE", 1],
  ["PBD", 1],
  ["PBF", 3],
  ["PBC", 2],
  ["PBO", 1],
  ["PBT", 1],
  ["PBP", 1],
  ["PBB", 3],
  ["PBL", 3],
  ["PBR", 4],
  ["PBH", 6],
  ["PBW", 12],
];

async function seedProjects() {
  const s = store();
  const settings = (await s.get<Settings>("settings", "app"))!;
  const parts = (await s.all<Part>("parts")).filter((p) => !p.obsolete && p.cost > 5);
  const pickParts = (seedN: number): Bom["lines"] =>
    SAMPLE_BOM.map(([cat, qty], i) => {
      const pool = parts.filter((p) => p.category === cat);
      const p = pool[(seedN * 7 + i * 3) % Math.max(pool.length, 1)];
      return p
        ? {
            id: uid(),
            kind: "part" as const,
            partNumber: p.partNumber,
            description: p.description,
            qty: cat === "PBW" ? qty : qty,
            uom: cat === "PBW" ? ("m" as const) : ("ea" as const),
            unitCost: p.cost,
            supplier: p.supplier,
          }
        : null;
    }).filter(Boolean) as Bom["lines"];

  const customers = new Map<string, Customer>();
  const projects: Project[] = [];
  REGISTER.forEach((row, idx) => {
    const [q, mtr, serial, customer, description, pcs, cert, po, quotedBy] = row;
    const isRepeat = q === "REPEAT";
    // Date: from the quote number when there is one, otherwise approximate from the row order.
    const created = isRepeat
      ? new Date(Date.UTC(2026, 9, 1 + idx)).toISOString()
      : new Date(Date.UTC(2000 + +q.slice(0, 2), +q.slice(2, 4) - 1, +q.slice(4, 6), 14)).toISOString();
    if (!customers.has(customer))
      customers.set(customer, {
        id: slug(customer),
        name: customer,
        attention: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        createdAt: created,
      });

    const base = {
      customer,
      description,
      mtrNumber: mtr,
      pcs,
      quotedBy,
      csa: cert === "csa",
      ul: cert === "ul",
    };
    const bom = newBom(settings);
    bom.lines[0].qty = 8 + (idx % 5) * 4;
    bom.lines[1].qty = 3 + (idx % 3);
    bom.lines[2].qty = 2 + (idx % 2);
    bom.lines.push(...pickParts(idx));
    const quote = newQuoteDoc(settings, base);
    quote.quoteDate = created.slice(0, 10);

    const p: Project = {
      id: isRepeat ? `r${slug(mtr)}${idx}` : q.slice(0, 7).toLowerCase(),
      quoteBase: isRepeat ? "" : q.slice(0, 7),
      mtrNumber: mtr,
      customer,
      description,
      pcs,
      csa: cert === "csa",
      ul: cert === "ul",
      qps: cert === "qps",
      poNumber: po,
      quotedBy,
      serialNumber: serial,
      isRepeat,
      stage: "quote",
      quoteStatus: "draft",
      buildStatus: "queued",
      createdAt: created,
      updatedAt: created,
      revisions: isRepeat
        ? []
        : [{ rev: 0, quoteNumber: q, status: "draft", note: "Initial quote", createdAt: created, createdBy: quotedBy, quote, bom }],
      activity: [{ at: created, user: quotedBy, text: isRepeat ? `Repeat order opened for ${mtr}` : `Quote ${q} created` }],
    };

    const toBuild = isRepeat || !!serial;
    if (!isRepeat && !toBuild) {
      // Older quotes have gone out to the customer; the newest ones are still being priced.
      if (idx < 17) {
        p.revisions[0].status = "issued";
        p.revisions[0].issuedAt = created;
        p.quoteStatus = "sent";
        p.activity.unshift({ at: created, user: quotedBy, text: `Quote ${q} issued to customer` });
      }
    }
    if (toBuild) {
      const statuses = ["shipped", "testing", "wiring", "qc", "queued"] as const;
      if (!isRepeat) {
        p.revisions[0].status = "approved";
        p.quoteStatus = "approved";
      }
      p.stage = "build";
      p.buildStatus = serial ? statuses[idx % statuses.length] : "queued";
      p.build = makeBuild(p, isRepeat ? bom : p.revisions[0].bom, isRepeat ? null : 0, quotedBy, created);
      p.activity.unshift({ at: created, user: quotedBy, text: `Approved and moved to build as ${mtr}` });
    }
    projects.push(p);
  });
  await s.putMany("customers", [...customers.values()]);
  await s.putMany("projects", projects);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function makeBuild(p: Project, bom: Bom, approvedRev: number | null, by: string, at: string, extra?: Partial<Build>): Build {
  const due = new Date(at);
  due.setDate(due.getDate() + 42);
  return {
    approvedAt: at,
    approvedBy: by,
    approvedRev,
    dueDate: due.toISOString().slice(0, 10),
    assignedTo: "",
    bom: {
      ...structuredClone(bom),
      lines: bom.lines.map((l) => ({ ...structuredClone(l), status: l.kind === "labour" ? undefined : "required" })),
    },
    summary: {
      serialNumber: p.serialNumber,
      pieces: String(p.pcs),
      customerOrder: p.poNumber,
      csaApproval: [p.csa && "CSA", p.ul && "UL", p.qps && "QPS"].filter(Boolean).join(" / "),
    },
    f5: {
      wiringInstruction: p.mtrNumber,
      schematic: p.mtrNumber,
      layout: p.mtrNumber,
      testProcedure: p.mtrNumber,
      environment: "NEMA 1, 0-40 DEG C",
      scc: "5KA RMS",
    },
    motors: [{ id: uid(), label: "Motor #1 O/L setting", setting: "" }],
    qc: {},
    qcSignoff: {},
    ...extra,
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export async function getSettings() {
  await ensureSeeded();
  const s = await store().get<Settings>("settings", "app");
  return { ...DEFAULT_SETTINGS, ...s } as Settings;
}

export async function getProjects() {
  await ensureSeeded();
  const all = await store().all<Project>("projects");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProject(id: string) {
  await ensureSeeded();
  return store().get<Project>("projects", id);
}

export async function getParts() {
  await ensureSeeded();
  return (await store().all<Part>("parts")).sort((a, b) => a.partNumber.localeCompare(b.partNumber));
}

export async function getCustomers() {
  await ensureSeeded();
  return (await store().all<Customer>("customers")).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUser(username: string) {
  const users = await store().all<User>("users");
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) ?? null;
}

/* ------------------------------------------------------------------ */
/* Numbering                                                           */
/* ------------------------------------------------------------------ */

/** Quote numbers are YYMMDD + a letter per quote that day (A, B, C…) + the revision digit. */
export function nextQuoteBase(projects: Project[], now = new Date()) {
  const ymd =
    String(now.getFullYear()).slice(2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const used = new Set(projects.filter((p) => p.quoteBase.startsWith(ymd)).map((p) => p.quoteBase.slice(6)));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return ymd + letter;
  }
  throw new Error("More than 26 quotes created today");
}

export function nextMtrNumber(projects: Project[], settings: Settings) {
  let max = settings.nextMtr - 1;
  for (const p of projects) {
    if (p.isRepeat) continue;
    const m = /^MTR(\d+)$/.exec(p.mtrNumber);
    if (m) max = Math.max(max, +m[1]);
  }
  return max + 1;
}

export function nextPartNumber(parts: Part[], category: string) {
  let max = 0;
  for (const p of parts) if (p.category === category) max = Math.max(max, +p.partNumber.slice(3));
  return `${category}${String(max + 1).padStart(5, "0")}`;
}

export function latestRevision(p: Project) {
  return currentRevision(p);
}

/** Current ledger info for every part number used in the given BOMs (for stale-price warnings). */
export async function catalogFor(...boms: (Bom | undefined)[]) {
  const pns = new Set(boms.flatMap((b) => b?.lines.map((l) => l.partNumber) ?? []));
  const out: Record<string, { cost: number; description: string; supplier: string; obsolete: boolean }> = {};
  for (const p of await getParts())
    if (pns.has(p.partNumber)) out[p.partNumber] = { cost: p.cost, description: p.description, supplier: p.supplier, obsolete: p.obsolete };
  return out;
}
