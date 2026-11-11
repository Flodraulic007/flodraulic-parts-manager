"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutGrid,
  FileText,
  ListTree,
  History,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  Activity,
  Lock,
  GitCompare,
} from "lucide-react";
import { cx } from "./ui";

const ICONS = {
  overview: LayoutGrid,
  quote: FileText,
  bom: ListTree,
  revisions: History,
  qc: ClipboardCheck,
  summary: ClipboardList,
  f5: Gauge,
  activity: Activity,
  locked: Lock,
  variance: GitCompare,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badge?: ReactNode;
  group?: string;
}

export function ProjectNav({ items, header }: { items: NavItem[]; header: ReactNode }) {
  const path = usePathname();
  let lastGroup: string | undefined;
  return (
    <aside className="no-print border-b border-gray-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="border-b border-gray-100 p-4">{header}</div>
      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:p-3">
        {items.map((it) => {
          const active = path === it.href;
          const Icon = ICONS[it.icon];
          const groupHeader = it.group && it.group !== lastGroup;
          lastGroup = it.group;
          return (
            <div key={it.href} className="contents">
              {groupHeader && (
                <div className="hidden px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 lg:block">{it.group}</div>
              )}
              <Link
                href={it.href}
                className={cx(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <Icon className={cx("size-4", active ? "text-brand-600" : "text-gray-400")} />
                <span className="flex-1 whitespace-nowrap">{it.label}</span>
                {it.badge}
              </Link>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
