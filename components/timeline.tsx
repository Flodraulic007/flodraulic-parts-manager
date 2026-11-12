import { ArrowRight, CircleDot, GitBranch, MessageSquareText, Percent, Wrench } from "lucide-react";
import type { ActivityEntry, Project } from "@/lib/types";
import { STATUS } from "@/lib/workflow";
import { dateTime } from "@/lib/format";
import { Badge, Card } from "./ui";
import { cx } from "@/lib/cx";

function duration(ms: number) {
  const h = ms / 3600000;
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}

/** Full history of a project, oldest first, with time spent in each status. */
export function Timeline({ p }: { p: Project }) {
  const items: ActivityEntry[] = [...p.activity].reverse();
  const statusEvents = items.filter((a) => a.kind === "status" && a.to);
  const durations = new Map<ActivityEntry, number>();
  statusEvents.forEach((e, i) => {
    const next = statusEvents[i + 1];
    durations.set(e, (next ? new Date(next.at).getTime() : Date.now()) - new Date(e.at).getTime());
  });

  // Time per status, for the summary bar
  const perStatus = new Map<string, number>();
  for (const [e, ms] of durations) perStatus.set(e.to!, (perStatus.get(e.to!) ?? 0) + ms);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card title="Timeline" padded={false}>
        <ol className="px-5 py-5">
          {items.map((a, i) => {
            const Icon = a.kind === "status" ? CircleDot : a.kind === "margin" ? Percent : a.kind === "revision" ? GitBranch : a.kind === "change" ? Wrench : MessageSquareText;
            const ms = durations.get(a);
            return (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < items.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-gray-200" />}
                <span
                  className={cx(
                    "relative flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                    a.kind === "status" ? "bg-ink-900 text-white" : a.kind === "margin" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.kind === "status" && a.to ? (
                      <>
                        {a.from && STATUS[a.from] && <Badge tone={STATUS[a.from].tone}>{STATUS[a.from].label}</Badge>}
                        {a.from && <ArrowRight className="size-3.5 text-gray-400" />}
                        <Badge tone={STATUS[a.to].tone}>{STATUS[a.to].label}</Badge>
                      </>
                    ) : null}
                  </div>
                  <div className={cx("text-sm text-gray-800", a.kind === "status" && "mt-1")}>{a.text}</div>
                  {a.comment && <blockquote className="mt-1.5 whitespace-pre-wrap rounded-lg border-l-2 border-brand-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">{a.comment}</blockquote>}
                  <div className="mt-1 text-xs text-gray-500">
                    {a.user} · {dateTime(a.at)}
                    {ms != null && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">{duration(ms)} in this status</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
      <Card title="Time in each status">
        {perStatus.size === 0 ? (
          <p className="text-sm text-gray-500">No status changes recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {[...perStatus.entries()].map(([s, ms]) => {
              const max = Math.max(...perStatus.values());
              const st = STATUS[s as keyof typeof STATUS];
              return (
                <li key={s}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-700">{st?.label ?? s}</span>
                    <span className="text-gray-500 tabular">{duration(ms)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(ms / max) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
