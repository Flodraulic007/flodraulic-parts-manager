"use client";

import { Loader2, Save, Undo2 } from "lucide-react";
import { Button, Kbd } from "./ui";

export function SaveBar({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  if (!dirty && !saving) return null;
  return (
    <div className="no-print fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-ink-900 py-2 pl-5 pr-2 text-sm text-white shadow-2xl ring-1 ring-white/10 lg:left-[calc(50%+8rem)]">
      <span className="size-2 rounded-full bg-amber-400" />
      <span>Unsaved changes</span>
      <span className="hidden text-gray-400 sm:inline">
        <Kbd>Ctrl S</Kbd>
      </span>
      <Button size="sm" variant="ghost" className="text-gray-300 hover:bg-white/10 hover:text-white" icon={<Undo2 className="size-4" />} onClick={onReset} disabled={saving}>
        Discard
      </Button>
      <Button size="sm" variant="primary" icon={saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} onClick={onSave} disabled={saving}>
        Save
      </Button>
    </div>
  );
}
