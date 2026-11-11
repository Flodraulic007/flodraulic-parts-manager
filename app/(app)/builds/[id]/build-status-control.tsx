"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { setBuildStatus } from "@/lib/actions";
import { BUILD_FLOW, BUILD_STATUS } from "@/lib/defaults";
import type { BuildStatus } from "@/lib/types";
import { Button, cx } from "@/components/ui";
import { run } from "@/components/toast";

export function BuildStatusControl({ id, status }: { id: string; status: BuildStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const idx = BUILD_FLOW.indexOf(status);
  const next = BUILD_FLOW[idx + 1];

  const change = async (s: BuildStatus) => {
    setBusy(true);
    const r = await run(setBuildStatus(id, s), `Status: ${BUILD_STATUS[s].label}`);
    setBusy(false);
    if (r.ok) router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ol className="hidden items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-xs md:flex">
        {BUILD_FLOW.map((s, i) => (
          <li key={s}>
            <button
              disabled={busy}
              onClick={() => s !== status && change(s)}
              title={`Set status: ${BUILD_STATUS[s].label}`}
              className={cx(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition",
                s === status ? "bg-ink-900 text-white" : i < idx ? "text-gray-700 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-100",
              )}
            >
              {i < idx && <Check className="size-3 text-emerald-500" />}
              {BUILD_STATUS[s].label}
            </button>
          </li>
        ))}
      </ol>
      {next && (
        <Button variant="primary" size="sm" disabled={busy} onClick={() => change(next)} icon={<ChevronRight className="size-4" />}>
          Move to {BUILD_STATUS[next].label}
        </Button>
      )}
    </div>
  );
}
