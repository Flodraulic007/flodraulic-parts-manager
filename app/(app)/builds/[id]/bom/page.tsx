import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { catalogFor, getProject, getSettings } from "@/lib/data";
import { requireUser } from "@/lib/auth";
import { bomVariance } from "@/lib/calc";
import { buildDrift } from "@/lib/status";
import { canComment, canEditBuild, isManager } from "@/lib/workflow";
import { dateTime, money } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { BomPageEditor } from "@/components/bom-page-editor";

export default async function BuildBomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, user, settings] = await Promise.all([getProject(id), requireUser(), getSettings()]);
  if (!p?.build) notFound();
  const approved = p.revisions.find((r) => r.rev === p.build!.approvedRev);
  const catalog = await catalogFor(p.build.bom);
  const variance = approved ? bomVariance(approved.bom, p.build.bom) : [];
  const drift = buildDrift(p, settings.driftPercent ?? 10);
  const log = p.build.changeLog ?? [];
  const editable = canEditBuild(p, user);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-8">
      {drift && (
        <div
          className={`flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border px-5 py-3.5 ${
            drift.flagged ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"
          }`}
        >
          {drift.flagged && <AlertTriangle className="size-5 text-orange-600" />}
          <div className="text-sm">
            <span className="text-gray-500">Quoted (parts + labour)</span> <b className="tabular">{money(drift.quoted)}</b>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">Build now</span> <b className="tabular">{money(drift.now)}</b>
          </div>
          <div className={`text-sm font-semibold tabular ${drift.delta > 0 ? "text-rose-600" : drift.delta < 0 ? "text-emerald-600" : "text-gray-500"}`}>
            {drift.delta >= 0 ? "+" : ""}
            {money(drift.delta)} ({(drift.pct * 100).toFixed(1)}%)
          </div>
          {drift.flagged && (
            <p className="text-sm font-medium text-orange-800">
              Build cost has drifted more than {settings.driftPercent ?? 10}% from the quote — a quote revision may be needed.
            </p>
          )}
        </div>
      )}

      {!editable && p.status !== "shipped" && (
        <p className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm text-gray-600">
          {p.status === "build_review"
            ? "This build is in peer review — the BOM is locked until the reviewer returns it or marks it ready."
            : ["ready_production", "in_production"].includes(p.status)
              ? "Released to production — the build BOM is locked. Ordering status can still be updated from Purchasing."
              : "Only the assigned build designer can edit this BOM."}
        </p>
      )}

      <BomPageEditor
        target={{ kind: "build", projectId: p.id }}
        bom={p.build.bom}
        editable={editable}
        catalog={catalog}
        exportName={`BOM ${p.mtrNumber} ${p.customer}`}
        title="Build BOM"
        showMargin={isManager(user)}
        comments={(p.comments ?? []).filter((c) => c.stage === "build")}
        canComment={canComment(p, user) && !["shipped"].includes(p.status)}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Build change log" padded={false} actions={<span className="text-xs text-gray-500">{log.length} change{log.length === 1 ? "" : "s"} recorded</span>}>
          {log.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">No changes from the quoted BOM recorded yet. Saving BOM changes asks for a reason.</p>
          ) : (
            <ul className="max-h-[480px] divide-y divide-gray-100 overflow-y-auto">
              {log.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{c.reason}</p>
                      <p className="text-xs text-gray-500">
                        {c.by} · {dateTime(c.at)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular ${c.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {c.delta >= 0 ? "+" : ""}
                      {money(c.delta)}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-gray-600">
                    {c.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="truncate">
                          <span className="capitalize text-gray-400">{l.change.split(" ")[0]}</span> {l.label}
                        </span>
                        <span className="tabular">{money(l.delta)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {approved && (
          <Card title={`Cumulative difference vs quoted BOM (${approved.quoteNumber})`} padded={false}>
            {variance.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">The build BOM matches the quoted BOM.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {variance.map((v) => (
                    <tr key={v.line.id}>
                      <td className="w-24 px-5 py-2.5">
                        <Badge tone={v.change === "added" ? "green" : v.change === "removed" ? "rose" : "amber"}>{v.change}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs text-gray-500">{v.line.partNumber}</span> {v.line.description}
                      </td>
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
    </div>
  );
}
