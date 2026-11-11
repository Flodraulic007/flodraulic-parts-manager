import type { ActivityEntry } from "@/lib/types";
import { dateTime } from "@/lib/format";

export function ActivityList({ items }: { items: ActivityEntry[] }) {
  if (!items.length) return <p className="text-sm text-gray-500">No activity yet.</p>;
  return (
    <ol className="space-y-0">
      {items.map((a, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-gray-200" />}
          <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white bg-gray-400 ring-1 ring-gray-200 first:bg-brand-500" />
          <div className="min-w-0">
            <div className="text-sm text-gray-800">{a.text}</div>
            <div className="text-xs text-gray-500">
              {a.user} · {dateTime(a.at)}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
