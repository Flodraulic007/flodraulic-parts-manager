import { BUILD_FLOW, BUILD_STATUS, QUOTE_STATUS, QC_SECTIONS, type Tone } from "./defaults";
import { currentRevision, validUntil } from "./calc";
import type { Project } from "./types";

export function projectStatus(p: Project): { label: string; tone: Tone; stage: string; progress: number } {
  if (p.stage === "build") {
    const s = BUILD_STATUS[p.buildStatus];
    const i = BUILD_FLOW.indexOf(p.buildStatus);
    return { label: s.label, tone: s.tone, stage: "Build", progress: 0.4 + (0.6 * (i + 1)) / BUILD_FLOW.length };
  }
  const s = QUOTE_STATUS[p.quoteStatus];
  return {
    label: s.label,
    tone: s.tone,
    stage: "Quote",
    progress: p.quoteStatus === "sent" ? 0.3 : p.quoteStatus === "draft" ? 0.15 : 0.1,
  };
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

export interface Alert {
  id: string;
  href: string;
  tone: Tone;
  title: string;
  detail: string;
}

export function projectAlerts(projects: Project[], today = new Date().toISOString().slice(0, 10)): Alert[] {
  const out: Alert[] = [];
  const daysTo = (d: string) => Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000);
  for (const p of projects) {
    const r = currentRevision(p);
    if (p.stage === "quote" && p.quoteStatus === "sent" && r) {
      const left = daysTo(validUntil(r.quote));
      if (left < 0)
        out.push({ id: p.id + "exp", href: `/quotes/${p.id}`, tone: "rose", title: `${r.quoteNumber} expired`, detail: `${p.customer} · validity ended ${-left}d ago — follow up or revise` });
      else if (left <= 7)
        out.push({ id: p.id + "exp", href: `/quotes/${p.id}`, tone: "amber", title: `${r.quoteNumber} expires in ${left}d`, detail: `${p.customer} · chase the customer for a PO` });
    }
    if (p.stage === "quote" && p.quoteStatus === "draft" && r && daysTo(r.createdAt.slice(0, 10)) < -5)
      out.push({ id: p.id + "draft", href: `/quotes/${p.id}`, tone: "slate", title: `${r.quoteNumber} still in draft`, detail: `${p.customer} · started ${-daysTo(r.createdAt.slice(0, 10))} days ago` });
    if (p.stage === "build" && p.build && p.buildStatus !== "shipped") {
      const left = daysTo(p.build.dueDate);
      if (left < 0)
        out.push({ id: p.id + "due", href: `/builds/${p.id}`, tone: "rose", title: `${p.mtrNumber} is overdue`, detail: `${p.customer} · due ${-left}d ago` });
      if (!p.serialNumber && ["testing", "qc", "complete"].includes(p.buildStatus))
        out.push({ id: p.id + "sn", href: `/builds/${p.id}/summary`, tone: "amber", title: `${p.mtrNumber} needs a serial number`, detail: `${p.customer} · ${p.pcs} pc` });
      const pr = procurementProgress(p);
      if (pr.outstanding > 0 && p.buildStatus !== "queued" && p.buildStatus !== "complete")
        out.push({ id: p.id + "parts", href: `/builds/${p.id}/bom`, tone: "orange", title: `${p.mtrNumber}: ${pr.outstanding} parts not ordered`, detail: `${p.customer} · build is ${p.buildStatus}` });
    }
  }
  const rank: Record<string, number> = { rose: 0, orange: 1, amber: 2, slate: 3 };
  return out.sort((a, b) => (rank[a.tone] ?? 9) - (rank[b.tone] ?? 9));
}
