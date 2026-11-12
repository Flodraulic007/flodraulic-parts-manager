"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus, Search, FileText, Wrench, Boxes } from "lucide-react";
import { Button, Kbd, cx } from "./ui";
import { NewQuoteModal, type CustomerLite } from "./new-quote-modal";
import { NotificationBell } from "./notification-bell";
import type { Notification, Role } from "@/lib/types";

interface SearchItem {
  id: string;
  stage: string;
  quote: string;
  mtr: string;
  customer: string;
  description: string;
}

export function Topbar({
  searchIndex,
  designers,
  customers,
  userName,
  username,
  role,
  notifications,
}: {
  searchIndex: SearchItem[];
  designers: { username: string; name: string }[];
  customers: CustomerLite[];
  userName: string;
  username: string;
  role: Role;
  notifications: Notification[];
}) {
  const canQuote = role !== "production";
  const router = useRouter();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [sel, setSel] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const [parts, setParts] = useState<{ partNumber: string; description: string }[]>([]);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const open = () => setNewOpen(true);
    window.addEventListener("keydown", h);
    window.addEventListener("fd:new-quote", open);
    return () => {
      window.removeEventListener("keydown", h);
      window.removeEventListener("fd:new-quote", open);
    };
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setParts([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/parts?limit=5&q=${encodeURIComponent(q)}`);
      if (r.ok) setParts((await r.json()).parts);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const proj = searchIndex
      .filter((i) => `${i.quote} ${i.mtr} ${i.customer} ${i.description}`.toLowerCase().includes(s))
      .slice(0, 7)
      .map((i) => ({
        key: i.id,
        href: i.stage === "build" ? `/builds/${i.id}` : `/quotes/${i.id}`,
        icon: i.stage === "build" ? Wrench : FileText,
        title: i.stage === "build" ? `${i.mtr} · ${i.quote}` : `${i.quote} · ${i.mtr}`,
        sub: `${i.customer} — ${i.description.replace(/_/g, " ")}`,
      }));
    const pr = parts.map((p) => ({
      key: p.partNumber,
      href: `/parts?q=${encodeURIComponent(p.partNumber)}`,
      icon: Boxes,
      title: p.partNumber,
      sub: p.description,
    }));
    return [...proj, ...pr];
  }, [q, searchIndex, parts]);

  const go = (href: string) => {
    setQ("");
    input.current?.blur();
    router.push(href);
  };

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        onClick={() => window.dispatchEvent(new Event("fd:menu"))}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setSel((s) => Math.min(s + 1, results.length - 1));
            if (e.key === "ArrowUp") setSel((s) => Math.max(s - 1, 0));
            if (e.key === "Enter" && results[sel]) go(results[sel].href);
            if (e.key === "Escape") input.current?.blur();
          }}
          placeholder="Search quote #, MTR #, customer or part number…"
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-14 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-3 focus:ring-brand-500/10"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">
          <Kbd>Ctrl K</Kbd>
        </span>
        {focused && q && (
          <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">No matches for “{q}”</div>
            ) : (
              <ul className="max-h-96 overflow-y-auto py-1.5">
                {results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <li key={r.key}>
                      <button
                        onMouseDown={() => go(r.href)}
                        onMouseEnter={() => setSel(i)}
                        className={cx("flex w-full items-center gap-3 px-3.5 py-2 text-left", i === sel && "bg-gray-50")}
                      >
                        <Icon className="size-4 shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">{r.title}</div>
                          <div className="truncate text-xs text-gray-500">{r.sub}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell items={notifications} />
        {canQuote && (
          <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setNewOpen(true)}>
            <span className="hidden sm:inline">New Quote</span>
          </Button>
        )}
      </div>
      {canQuote && (
        <NewQuoteModal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          designers={designers}
          customers={customers}
          userName={userName}
          username={username}
          role={role}
        />
      )}
    </header>
  );
}
