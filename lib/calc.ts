import type { Bom, BomLine, Project, QuoteDoc, Revision } from "./types";

/** Labour is entered as a USD sell price; the BOM works in CAD (matches the Excel: =H4/H127). */
export function labourRateCAD(bom: Bom) {
  return bom.cadToUsd > 0 ? bom.labourRateUSD / bom.cadToUsd : 0;
}

export function lineTotal(bom: Bom, l: BomLine) {
  const unit = l.kind === "labour" ? labourRateCAD(bom) : l.unitCost || 0;
  return (l.qty || 0) * unit;
}

export interface BomTotals {
  partsSubtotal: number;
  partsSell: number;
  labourHours: number;
  labourSell: number;
  buildCost: number;
  totalWithCert: number;
  quotePrice: number;
  suggestedPrice: number;
  quotePriceUSD: number;
  actualMargin: number | null; // parts-only margin, as in the Excel
  overallMargin: number | null; // (price - parts cost) / price
  belowTarget: boolean;
}

export function bomTotals(bom: Bom): BomTotals {
  let partsSubtotal = 0;
  let labourSell = 0;
  let labourHours = 0;
  for (const l of bom.lines) {
    if (l.kind === "labour") {
      labourSell += lineTotal(bom, l);
      labourHours += l.qty || 0;
    } else partsSubtotal += lineTotal(bom, l);
  }
  const m = Math.min(Math.max(bom.targetMargin, 0), 99) / 100;
  const partsSell = partsSubtotal / (1 - m);
  const buildCost = partsSell + labourSell;
  const totalWithCert = buildCost + (bom.certificationCost || 0);
  const suggestedPrice = Math.ceil(totalWithCert / 10) * 10;
  const quotePrice = bom.actualQuotePrice ?? suggestedPrice;
  const denom = quotePrice - labourSell - (bom.certificationCost || 0);
  const actualMargin = partsSubtotal > 0 && denom > 0 ? 1 - partsSubtotal / denom : null;
  const overallMargin = quotePrice > 0 ? (quotePrice - partsSubtotal) / quotePrice : null;
  return {
    partsSubtotal,
    partsSell,
    labourHours,
    labourSell,
    buildCost,
    totalWithCert,
    quotePrice,
    suggestedPrice,
    quotePriceUSD: quotePrice * bom.cadToUsd,
    actualMargin,
    overallMargin,
    belowTarget: actualMargin !== null && actualMargin * 100 < bom.targetMargin - 0.05,
  };
}

export function resolvedLines(quote: QuoteDoc, bom: Bom) {
  const price = bomTotals(bom).quotePrice;
  return quote.lines.map((l) => ({ ...l, unitPrice: l.linkToBom ? price : l.unitPrice || 0 }));
}

export function quoteTotals(quote: QuoteDoc, bom: Bom) {
  const lines = resolvedLines(quote, bom);
  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0);
  const tax = quote.taxRate == null ? null : (subtotal * quote.taxRate) / 100;
  return { lines, subtotal, tax, total: tax == null ? null : subtotal + tax };
}

export function revisionValue(r: Revision) {
  return quoteTotals(r.quote, r.bom).subtotal;
}

export function currentRevision(p: Project): Revision | undefined {
  return p.revisions[p.revisions.length - 1];
}

export function quoteNumber(p: Project) {
  const r = currentRevision(p);
  return r ? r.quoteNumber : p.isRepeat ? "REPEAT" : p.quoteBase;
}

export function projectValue(p: Project) {
  if (p.build) {
    const approved = p.revisions.find((r) => r.rev === p.build!.approvedRev);
    if (approved) return revisionValue(approved);
    return bomTotals(p.build.bom).quotePrice * (p.pcs || 1);
  }
  const r = currentRevision(p);
  return r ? revisionValue(r) : 0;
}

export function validUntil(q: QuoteDoc) {
  const d = new Date(q.quoteDate + "T00:00:00");
  d.setDate(d.getDate() + (q.validityDays || 0));
  return d.toISOString().slice(0, 10);
}

/** Lines that differ between the quoted BOM and the build BOM. */
export function bomVariance(quoted: Bom, build: Bom) {
  const key = (l: BomLine) => (l.kind === "labour" ? `L:${l.description}` : `P:${l.partNumber || l.description}`);
  const q = new Map<string, BomLine>();
  for (const l of quoted.lines) q.set(key(l), l);
  const rows: { line: BomLine; change: "added" | "removed" | "changed"; delta: number; before?: BomLine }[] = [];
  const seen = new Set<string>();
  for (const l of build.lines) {
    const k = key(l);
    seen.add(k);
    const prev = q.get(k);
    const now = lineTotal(build, l);
    if (!prev) rows.push({ line: l, change: "added", delta: now });
    else {
      const before = lineTotal(quoted, prev);
      if (prev.qty !== l.qty || Math.abs(before - now) > 0.005)
        rows.push({ line: l, change: "changed", delta: now - before, before: prev });
    }
  }
  for (const [k, l] of q) if (!seen.has(k)) rows.push({ line: l, change: "removed", delta: -lineTotal(quoted, l) });
  return rows;
}
