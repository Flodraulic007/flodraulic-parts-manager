import { NextResponse } from "next/server";
import { getParts } from "@/lib/data";

/** Part search used by the BOM part picker and global search. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "20") || 20, 100);
  const parts = await getParts();
  if (!q) return NextResponse.json({ parts: parts.slice(0, limit), total: parts.length });

  const terms = q.split(/\s+/);
  const scored = [];
  for (const p of parts) {
    const hay = `${p.partNumber} ${p.description} ${p.mfrPartNumber} ${p.supplier}`.toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    let score = 0;
    if (p.partNumber.toLowerCase() === q || p.mfrPartNumber.toLowerCase() === q) score += 100;
    if (p.partNumber.toLowerCase().startsWith(q)) score += 50;
    if (p.mfrPartNumber.toLowerCase().startsWith(q)) score += 40;
    if (p.obsolete) score -= 30;
    scored.push({ p, score });
  }
  scored.sort((a, b) => b.score - a.score || a.p.partNumber.localeCompare(b.p.partNumber));
  return NextResponse.json({ parts: scored.slice(0, limit).map((s) => s.p), total: scored.length });
}
