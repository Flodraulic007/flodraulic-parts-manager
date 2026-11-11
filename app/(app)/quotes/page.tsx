import Link from "next/link";
import type { Metadata } from "next";
import { getProjects } from "@/lib/data";
import { currentRevision, projectValue, validUntil } from "@/lib/calc";
import { QUOTE_STATUS } from "@/lib/defaults";
import { date, money0 } from "@/lib/format";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { cx } from "@/lib/cx";
import { FileText } from "lucide-react";
import { NewQuoteButton } from "@/components/new-quote-button";
import type { QuoteStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Quoting" };

const FILTERS: { key: string; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "hold", label: "On hold" },
  { key: "approved", label: "Approved" },
  { key: "lost", label: "Lost" },
  { key: "all", label: "All" },
];

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "open" } = await searchParams;
  const all = (await getProjects()).filter((p) => !p.isRepeat);
  const match = (s: QuoteStatus) => status === "all" || (status === "open" ? s === "draft" || s === "sent" : s === status);
  const quotes = all.filter((p) => match(p.quoteStatus));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Workflow"
        title="Quoting"
        subtitle="Quotes are identified by quote # (date + letter + revision). Approved quotes move to Build under their MTR #."
        actions={<NewQuoteButton />}
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const n = all.filter((p) =>
            f.key === "all" ? true : f.key === "open" ? p.quoteStatus === "draft" || p.quoteStatus === "sent" : p.quoteStatus === f.key,
          ).length;
          return (
            <Link
              key={f.key}
              href={`/quotes?status=${f.key}`}
              className={cx(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                status === f.key ? "border-ink-900 bg-ink-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
              )}
            >
              {f.label} <span className={cx("ml-1 tabular", status === f.key ? "text-gray-400" : "text-gray-400")}>{n}</span>
            </Link>
          );
        })}
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <EmptyState icon={<FileText className="size-5" />} title="No quotes in this view">
            Create a new quote with the button above.
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quotes.map((p) => {
            const r = currentRevision(p)!;
            const st = QUOTE_STATUS[p.quoteStatus];
            const until = validUntil(r.quote);
            const expired = p.quoteStatus === "sent" && until < today;
            return (
              <Link
                key={p.id}
                href={p.stage === "build" ? `/builds/${p.id}` : `/quotes/${p.id}`}
                className="group flex flex-col rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs transition hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-lg font-semibold text-gray-900 group-hover:text-brand-700">{r.quoteNumber}</div>
                    <div className="font-mono text-xs text-gray-500">{p.mtrNumber}</div>
                  </div>
                  <Badge tone={expired ? "rose" : st.tone}>{expired ? "Expired" : st.label}</Badge>
                </div>
                <div className="mt-4 font-medium text-gray-900">{p.customer}</div>
                <div className="line-clamp-2 text-sm text-gray-500">{p.description.replace(/_/g, " ")}</div>
                <div className="mt-auto flex items-end justify-between border-t border-gray-100 pt-3 mt-4 text-xs text-gray-500">
                  <div>
                    <div>{p.quotedBy}</div>
                    <div>
                      Rev {r.rev} · {date(r.quote.quoteDate)}
                      {p.quoteStatus === "sent" && ` · valid to ${date(until)}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold tabular text-gray-900">{money0(projectValue(p))}</div>
                    <div>{p.pcs} pc</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
