"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import type { Notification } from "@/lib/types";
import { markNotificationsRead } from "@/lib/actions";
import { relative } from "@/lib/format";
import { cx } from "./ui";

export function NotificationBell({ items }: { items: Notification[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    // Pick up new notifications while the app is open.
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 60000);
    return () => {
      document.removeEventListener("mousedown", h);
      clearInterval(t);
    };
  }, [router]);

  const readAll = async () => {
    await markNotificationsRead();
    router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-40 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-50 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) markNotificationsRead([n.id]).then(() => router.refresh());
                    }}
                    className={cx("flex gap-3 px-4 py-3 hover:bg-gray-50", !n.read && "bg-brand-50/40")}
                  >
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                    <span className="min-w-0">
                      <span className="block text-sm text-gray-800">{n.text}</span>
                      <span className="text-xs text-gray-500">{relative(n.at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
