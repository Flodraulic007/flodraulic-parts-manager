"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { Part } from "@/lib/types";
import { money } from "@/lib/format";
import { cx } from "./ui";

export function PartPicker({ onPick, placeholder = "Add part — search by PB #, description, manufacturer # or supplier…", autoFocus }: { onPick: (p: Part) => void; placeholder?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/parts?limit=12&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (r.ok) {
          setResults((await r.json()).parts);
          setSel(0);
        }
      } catch {}
      setLoading(false);
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const pick = (p: Part) => {
    onPick(p);
    setQ("");
    setResults([]);
    input.current?.focus();
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-gray-400" />}
      <input
        ref={input}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(s + 1, results.length - 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(s - 1, 0));
          }
          if (e.key === "Enter" && results[sel]) {
            e.preventDefault();
            pick(results[sel]);
          }
        }}
        placeholder={placeholder}
        className="field h-10 pl-9"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {results.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => pick(p)}
                onMouseEnter={() => setSel(i)}
                className={cx("grid w-full grid-cols-[90px_1fr_auto] items-center gap-3 px-3 py-2 text-left", i === sel && "bg-gray-50")}
              >
                <span className="font-mono text-xs font-semibold text-gray-900">{p.partNumber}</span>
                <span className="min-w-0">
                  <span className={cx("block truncate text-sm", p.obsolete ? "text-gray-400 line-through" : "text-gray-800")}>{p.description}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {[p.mfrPartNumber, p.supplier].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="text-right text-sm tabular text-gray-700">{money(p.cost)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
