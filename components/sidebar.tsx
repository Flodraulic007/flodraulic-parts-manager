"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Wrench,
  ShoppingCart,
  Boxes,
  Building2,
  Settings,
  LogOut,
} from "lucide-react";
import { logout } from "@/lib/actions";
import { cx } from "./ui";

const NAV = [
  { section: "Workspace" },
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/projects", label: "Project Register", icon: ClipboardList },
  { section: "Workflow" },
  { href: "/quotes", label: "Quoting", icon: FileText, count: "quotes" as const },
  { href: "/builds", label: "Build (MTR)", icon: Wrench, count: "builds" as const },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingCart },
  { section: "Reference" },
  { href: "/parts", label: "Part Numbers", icon: Boxes },
  { href: "/customers", label: "Customers", icon: Building2 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({ counts, user }: { counts: { quotes: number; builds: number }; user: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen((o) => !o);
    window.addEventListener("fd:menu", h);
    return () => window.removeEventListener("fd:menu", h);
  }, []);
  useEffect(() => setOpen(false), [path]);

  const initials = user
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {open && <div className="no-print fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={cx(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-950 text-gray-300 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flodraulic-mark.png" alt="" className="h-7 w-auto" />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-wide text-white">FLODRAULIC</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">Controls Hub</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((item, i) => {
            if ("section" in item)
              return (
                <div key={i} className="mb-1.5 mt-5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 first:mt-0">
                  {item.section}
                </div>
              );
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            const Icon = item.icon;
            const count = "count" in item ? counts[item.count] : undefined;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-white/[0.08] text-white" : "text-gray-400 hover:bg-white/[0.04] hover:text-gray-100",
                )}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-brand-500" />}
                <Icon className={cx("size-[18px]", active ? "text-brand-500" : "text-gray-500 group-hover:text-gray-300")} />
                <span className="flex-1">{item.label}</span>
                {!!count && (
                  <span
                    className={cx(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular",
                      active ? "bg-brand-600 text-white" : "bg-white/[0.07] text-gray-400",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user}</div>
              <div className="text-xs text-gray-500">Electrical team</div>
            </div>
            <form action={logout}>
              <button className="rounded-md p-1.5 text-gray-500 hover:bg-white/5 hover:text-white" title="Sign out" aria-label="Sign out">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
