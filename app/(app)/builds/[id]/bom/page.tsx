import { notFound } from "next/navigation";
import { catalogFor, getProject } from "@/lib/data";
import { bomTotals, bomVariance } from "@/lib/calc";
import { money } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { BomPageEditor } from "@/components/bom-page-editor";

export default async function BuildBomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(id);
  if (!p?.build) notFound();
  const approved = p.revisions.find((r) => r.rev === p.build!.approvedRev);
  const catalog = await catalogFor(p.build.bom);
  const variance = approved ? bomVariance(approved.bom, p.build.bom) : [];
  const delta = approved ? bomTotals(p.build.bom).partsSubtotal - bomTotals(approved.bom).partsSubtotal : 0;

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      <p className="text-sm text-gray-500">
        The build BOM started as a copy of {approved ? <b>{approved.quoteNumber}</b> : "the original job"}. Update it as the design is finalized —
        the quoted BOM is preserved under <i>Quoted BOM</i>. Track ordering per line; open the Purchasing page for a cross-job view.
      </p>
      <BomPageEditor target={{ kind: "build", projectId: p.id }} bom={p.build.bom} editable={p.buildStatus !== "shipped"} catalog={catalog} exportName={`BOM ${p.mtrNumber} ${p.customer}`} title="Build BOM" />

      {approved && (
        <Card
          title="Changes vs quoted BOM"
          padded={false}
          actions={
            <span className={`text-sm font-semibold tabular ${delta > 0 ? "text-rose-600" : delta < 0 ? "text-emerald-600" : "text-gray-500"}`}>
              Parts cost {delta >= 0 ? "+" : ""}
              {money(delta)}
            </span>
          }
        >
          {variance.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No changes from the quoted BOM.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {variance.map((v) => (
                  <tr key={v.line.id}>
                    <td className="w-24 px-5 py-2.5">
                      <Badge tone={v.change === "added" ? "green" : v.change === "removed" ? "rose" : "amber"}>{v.change}</Badge>
                    </td>
                    <td className="w-28 px-3 py-2.5 font-mono text-xs text-gray-500">{v.line.partNumber}</td>
                    <td className="px-3 py-2.5">{v.line.description}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-gray-500 tabular">{v.before ? `${v.before.qty} → ${v.line.qty}` : v.line.qty}</td>
                    <td className={`px-5 py-2.5 text-right font-medium tabular ${v.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {v.delta >= 0 ? "+" : ""}
                      {money(v.delta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
