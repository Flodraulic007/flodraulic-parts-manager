"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, MessageSquare, RotateCcw, X } from "lucide-react";
import type { ReviewComment } from "@/lib/types";
import { addComment, resolveComment } from "@/lib/actions";
import { relative } from "@/lib/format";
import { Button, Card, cx } from "./ui";
import { run } from "./toast";

export interface FocusLine {
  id: string;
  label: string;
}

export function ReviewComments({
  projectId,
  comments,
  rev,
  canComment,
  focus,
  onClearFocus,
}: {
  projectId: string;
  comments: ReviewComment[];
  rev?: number;
  canComment: boolean;
  focus: FocusLine | null;
  onClearFocus: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focus) {
      card.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => box.current?.focus(), 250);
    }
  }, [focus]);

  const open = comments.filter((c) => !c.resolved);
  const shown = (showResolved ? comments : open).filter((c) => !focus || c.lineId === focus.id);

  const submit = async () => {
    setBusy(true);
    const r = await run(addComment(projectId, { text, lineId: focus?.id, lineLabel: focus?.label, rev }), "Comment added");
    setBusy(false);
    if (r.ok) {
      setText("");
      router.refresh();
    }
  };

  return (
    <div ref={card}>
      <Card
        title={
          <span className="flex items-center gap-2">
            <MessageSquare className="size-4 text-gray-400" /> Review comments
            {open.length > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">{open.length} open</span>}
          </span>
        }
        actions={
          comments.length > open.length && (
            <button className="text-xs font-medium text-gray-500 hover:text-gray-800" onClick={() => setShowResolved((s) => !s)}>
              {showResolved ? "Hide resolved" : `Show resolved (${comments.length - open.length})`}
            </button>
          )
        }
        padded={false}
      >
        {focus && (
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-amber-50/60 px-5 py-2 text-xs text-amber-900">
            <span className="truncate">
              Line: <b>{focus.label}</b>
            </span>
            <button onClick={onClearFocus} className="flex items-center gap-1 font-medium hover:text-amber-700">
              <X className="size-3.5" /> All comments
            </button>
          </div>
        )}
        {shown.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">{focus ? "No comments on this line yet." : "No open comments."}</p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto">
            {shown.map((c) => (
              <li key={c.id} className={cx("px-5 py-3", c.resolved && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">
                      <b className="font-semibold text-gray-800">{c.by}</b> · {relative(c.at)}
                      {c.rev != null && <span className="ml-1 font-mono">· rev {c.rev}</span>}
                    </div>
                    {c.lineLabel && <div className="mt-0.5 truncate font-mono text-[11px] text-amber-700">↳ {c.lineLabel}</div>}
                    <p className={cx("mt-1 whitespace-pre-wrap text-sm text-gray-800", c.resolved && "line-through")}>{c.text}</p>
                  </div>
                  {canComment && (
                    <button
                      title={c.resolved ? "Re-open" : "Mark resolved"}
                      onClick={async () => {
                        await run(resolveComment(projectId, c.id, !c.resolved));
                        router.refresh();
                      }}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-emerald-600"
                    >
                      {c.resolved ? <RotateCcw className="size-4" /> : <Check className="size-4" />}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canComment && (
          <div className="border-t border-gray-100 p-4">
            <textarea
              ref={box}
              className="field min-h-20 text-sm"
              placeholder={focus ? `Comment on ${focus.label}…` : "Comment on the whole BOM… (use the 💬 icon on a line to comment on one item)"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="primary" disabled={busy || !text.trim()} onClick={submit}>
                Add comment
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
