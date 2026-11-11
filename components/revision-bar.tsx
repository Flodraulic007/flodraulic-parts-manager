import Link from "next/link";
import { Lock } from "lucide-react";
import type { RevisionStatus } from "@/lib/types";
import { cx } from "@/lib/cx";

const LABEL: Record<RevisionStatus, string> = { draft: "Draft", issued: "Issued", superseded: "Superseded", approved: "Approved" };

export function RevisionBar({
  basePath,
  revisions,
  selected,
}: {
  basePath: string;
  revisions: { rev: number; quoteNumber: string; status: RevisionStatus }[];
  selected: number;
}) {
  const latest = revisions[revisions.length - 1]?.rev;
  const sel = revisions.find((r) => r.rev === selected);
  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs">
        {revisions.map((r) => (
          <Link
            key={r.rev}
            href={r.rev === latest ? basePath : `${basePath}?rev=${r.rev}`}
            className={cx(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition",
              r.rev === selected ? "bg-ink-900 text-white" : "text-gray-500 hover:bg-gray-100",
            )}
            title={`${r.quoteNumber} — ${LABEL[r.status]}`}
          >
            Rev {r.rev}
            {r.status !== "draft" && <Lock className="size-3 opacity-60" />}
          </Link>
        ))}
      </div>
      {sel && sel.status !== "draft" && (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <Lock className="size-3.5" />
          {sel.quoteNumber} is {LABEL[sel.status].toLowerCase()} and read-only.
          {sel.rev === latest && sel.status === "issued" && " Use “New revision” to make changes."}
        </span>
      )}
    </div>
  );
}
