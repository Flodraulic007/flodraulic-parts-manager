import { QC_SECTIONS, type Tone } from "./defaults";
import { bomTotals, currentRevision, validUntil } from "./calc";
import { STATUS } from "./workflow";
import type { Project } from "./types";

export function projectStatus(p: Project): { label: string; tone: Tone; stage: string; progress: number } {
  const s = STATUS[p.status] ?? STATUS.drafting;
  return { label: s.label, tone: s.tone, stage: s.stage === "build" ? "Build" : "Quote", progress: s.progress };
}

export function qcProgress(p: Project) {
  const total = QC_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const done = p.build ? Object.values(p.build.qc).filter((x) => x.done).length : 0;
  return { done, total };
}

export function procurementProgress(p: Project) {
  const lines = p.build?.bom.lines.filter((l) => l.kind === "part") ?? [];
  const ready = lines.filter((l) => l.status === "received" || l.status === "stock").length;
  const ordered = lines.filter((l) => l.status === "ordered").length;
  return { total: lines.length, ready, ordered, outstanding: lines.length - ready - ordered };
}

/** Cost drift between the quoted BOM and the build BOM (parts cost + labour sell). */
export function buildDrift(p: Project, driftPercent = 10) {
  const approved = p.revisions.find((r) => r.rev === p.build?.approvedRev);
  if (!p.build || !approved) return null;
  const q = bomTotals(approved.bom);
  const b = bomTotals(p.build.bom);
  const quoted = q.partsSubtotal + q.labourSell;
  const now = b.partsSubtotal + b.labourSell;
  const delta = now - quoted;
  const pct = quoted > 0 ? delta / quoted : 0;
  return { quoted, now, delta, pct, flagged: Math.abs(pct) * 100 >= driftPercent && Math.abs(delta) >= 100 };
}

export interface Alert {
  id: string;
  href: string;
  tone: Tone;
  title: string;
  detail: string;
}

export function projectAlerts(projects: Project[], today = new Date().toISOString().slice(0, 10), driftPercent = 10): Alert[] {
  const out: Alert[] = [];
  const daysTo = (d: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
  for (const p of projects) {
    const r = currentRevision(p);
    if (p.status === "sent" && r) {
      const left = daysTo(validUntil(r.quote));
      if (left < 0)
        out.push({ id: p.id + "exp", href: `/quotes/${p.id}`, tone: "rose", title: `${r.quoteNumber} expired`, detail: `${p.customer} · validity ended ${-left}d ago — follow up or revise` });
      else if (left <= 7)
        out.push({ id: p.id + "exp", href: `/quotes/${p.id}`, tone: "amber", title: `${r.quoteNumber} expires in ${left}d`, detail: `${p.customer} · chase the customer for a PO` });
    }
    if (p.stage === "build" && p.build && p.status !== "shipped") {
      const left = daysTo(p.build.dueDate);
      if (left < 0) out.push({ id: p.id + "due", href: `/builds/${p.id}`, tone: "rose", title: `${p.mtrNumber} is overdue`, detail: `${p.customer} · due ${-left}d ago` });
      const d = buildDrift(p, driftPercent);
      if (d?.flagged)
        out.push({ id: p.id + "drift", href: `/builds/${p.id}/bom`, tone: "orange", title: `${p.mtrNumber}: build cost drift ${(d.pct * 100).toFixed(0)}%`, detail: `${p.customer} · a quote revision may be needed` });
      if (!p.serialNumber && p.status === "in_production")
        out.push({ id: p.id + "sn", href: `/builds/${p.id}/summary`, tone: "amber", title: `${p.mtrNumber} needs a serial number`, detail: `${p.customer} · ${p.pcs} pc` });
    }
  }
  const rank: Record<string, number> = { rose: 0, orange: 1, amber: 2, slate: 3 };
  return out.sort((a, b) => (rank[a.tone] ?? 9) - (rank[b.tone] ?? 9));
}
