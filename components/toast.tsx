"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

type T = { id: number; kind: "success" | "error"; text: string };
const listeners = new Set<(t: T) => void>();
let n = 0;

export function toast(text: string, kind: T["kind"] = "success") {
  const t = { id: ++n, kind, text };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const l = (t: T) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), t.kind === "error" ? 6000 : 3000);
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return (
    <div className="no-print pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-xl ring-1 ring-white/10"
        >
          {t.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Run a server action that returns {ok, error}, toasting the outcome. */
export async function run<R extends { ok: boolean; error?: string }>(p: Promise<R>, success?: string): Promise<R> {
  try {
    const r = await p;
    if (!r.ok) toast(r.error || "Something went wrong", "error");
    else if (success) toast(success);
    return r;
  } catch (e) {
    toast(e instanceof Error ? e.message : "Something went wrong", "error");
    return { ok: false, error: String(e) } as R;
  }
}
