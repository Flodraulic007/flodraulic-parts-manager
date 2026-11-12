"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Bom, QuoteDoc, ReviewComment } from "@/lib/types";
import { previewBuildChanges, saveBuildBom, saveRevision } from "@/lib/actions";
import { money } from "@/lib/format";
import { BomEditor, type CatalogInfo } from "./bom-editor";
import { ReviewComments, type FocusLine } from "./review-comments";
import { SaveBar } from "./save-bar";
import { useEditable } from "./use-dirty";
import { Button, Field, Modal } from "./ui";
import { run } from "./toast";

type Target = { kind: "quote"; projectId: string; rev: number; quote: QuoteDoc } | { kind: "build"; projectId: string };
type Change = { label: string; change: string; delta: number };

export function BomPageEditor({
  target,
  bom,
  editable,
  catalog,
  exportName,
  title,
  showMargin = true,
  comments,
  canComment = false,
}: {
  target: Target;
  bom: Bom;
  editable: boolean;
  catalog: Record<string, CatalogInfo>;
  exportName: string;
  title?: string;
  showMargin?: boolean;
  /** Review comments for this stage; omit to hide the panel */
  comments?: ReviewComment[];
  canComment?: boolean;
}) {
  const router = useRouter();
  const [focus, setFocus] = useState<FocusLine | null>(null);
  const [pending, setPending] = useState<Change[] | null>(null);
  const [reason, setReason] = useState("");
  const resolver = useRef<((reason: string | null) => void) | null>(null);

  /** Build BOM edits need a short reason, recorded in the change log. */
  const askReason = (changes: Change[]) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setReason("");
      setPending(changes);
    });

  const ed = useEditable(bom, async (b) => {
    let why: string | undefined;
    if (target.kind === "build") {
      const changes = await previewBuildChanges(target.projectId, b);
      if (changes.length) {
        const r = await askReason(changes);
        if (r == null) return false;
        why = r;
      }
    }
    const r = await run(
      target.kind === "quote" ? saveRevision(target.projectId, target.rev, target.quote, b) : saveBuildBom(target.projectId, b, why),
      "BOM saved",
    );
    if (r.ok) router.refresh();
    return r.ok;
  });

  const lineComments: Record<string, number> = {};
  for (const c of comments ?? []) if (c.lineId && !c.resolved) lineComments[c.lineId] = (lineComments[c.lineId] ?? 0) + 1;

  const close = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setPending(null);
  };

  return (
    <>
      <BomEditor
        bom={ed.value}
        onChange={ed.setValue}
        editable={editable}
        mode={target.kind}
        catalog={catalog}
        exportName={exportName}
        title={title}
        showMargin={showMargin}
        lineComments={comments ? lineComments : undefined}
        onLineComment={
          comments
            ? (l) => setFocus({ id: l.id, label: `${l.partNumber ? l.partNumber + " " : ""}${l.description}`.slice(0, 80) })
            : undefined
        }
      />
      {comments && (
        <div className="mt-6 max-w-3xl">
          <ReviewComments
            projectId={target.projectId}
            comments={comments}
            rev={target.kind === "quote" ? target.rev : undefined}
            canComment={canComment}
            focus={focus}
            onClearFocus={() => setFocus(null)}
          />
        </div>
      )}
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />

      <Modal
        open={!!pending}
        onClose={() => close(null)}
        title="Record this build change"
        description="The build BOM now differs from what was saved. Add a short reason — it goes into the build change log."
        width="max-w-xl"
        footer={
          <>
            <Button onClick={() => close(null)}>Cancel</Button>
            <Button variant="primary" disabled={reason.trim().length < 3} onClick={() => close(reason.trim())}>
              Save with reason
            </Button>
          </>
        }
      >
        <ul className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200 text-sm">
          {pending?.map((c, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-gray-800">{c.label}</span>
                <span className="text-xs capitalize text-gray-500">{c.change}</span>
              </span>
              <span className={`shrink-0 font-medium tabular ${c.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {c.delta >= 0 ? "+" : ""}
                {money(c.delta)}
              </span>
            </li>
          ))}
        </ul>
        <Field label="Reason for change" hint="required">
          <textarea
            className="field min-h-20"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer asked for a 2nd e-stop on the door during design review"
          />
        </Field>
      </Modal>
    </>
  );
}
