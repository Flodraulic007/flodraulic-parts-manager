"use client";

import { useRouter } from "next/navigation";
import type { Bom, QuoteDoc } from "@/lib/types";
import { saveBuildBom, saveRevision } from "@/lib/actions";
import { BomEditor, type CatalogInfo } from "./bom-editor";
import { SaveBar } from "./save-bar";
import { useEditable } from "./use-dirty";
import { run } from "./toast";

type Target = { kind: "quote"; projectId: string; rev: number; quote: QuoteDoc } | { kind: "build"; projectId: string };

export function BomPageEditor({
  target,
  bom,
  editable,
  catalog,
  exportName,
  title,
}: {
  target: Target;
  bom: Bom;
  editable: boolean;
  catalog: Record<string, CatalogInfo>;
  exportName: string;
  title?: string;
}) {
  const router = useRouter();
  const ed = useEditable(bom, async (b) => {
    const r = await run(
      target.kind === "quote" ? saveRevision(target.projectId, target.rev, target.quote, b) : saveBuildBom(target.projectId, b),
      "BOM saved",
    );
    if (r.ok) router.refresh();
    return r.ok;
  });
  return (
    <>
      <BomEditor bom={ed.value} onChange={ed.setValue} editable={editable} mode={target.kind} catalog={catalog} exportName={exportName} title={title} />
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </>
  );
}
