"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";
import type { Bom, QuoteDoc, Settings } from "@/lib/types";
import { saveRevision } from "@/lib/actions";
import { QuoteDocument } from "@/components/quote-document";
import { SaveBar } from "@/components/save-bar";
import { useEditable } from "@/components/use-dirty";
import { Button } from "@/components/ui";
import { run, toast } from "@/components/toast";

export function QuoteEditor(props: {
  projectId: string;
  rev: number;
  quoteNumber: string;
  mtrNumber: string;
  quote: QuoteDoc;
  bom: Bom;
  company: Settings["company"];
  team: Settings["team"];
  editable: boolean;
}) {
  const router = useRouter();
  const [pdfBusy, setPdfBusy] = useState(false);
  const ed = useEditable(props.quote, async (q) => {
    const r = await run(saveRevision(props.projectId, props.rev, q, props.bom), "Quote saved");
    if (r.ok) router.refresh();
    return r.ok;
  });

  const pdf = async () => {
    if (ed.dirty) toast("Downloading with unsaved changes — remember to save", "error");
    setPdfBusy(true);
    try {
      const { downloadQuotePdf } = await import("@/components/quote-pdf");
      await downloadQuotePdf({ quote: ed.value, bom: props.bom, quoteNumber: props.quoteNumber, mtrNumber: props.mtrNumber, company: props.company });
    } catch (e) {
      toast(`PDF failed: ${e instanceof Error ? e.message : e}`, "error");
    }
    setPdfBusy(false);
  };

  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-[880px] flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {props.editable
            ? "Click any field on the document to edit. Unit price on line 1 is linked to the BOM quote price."
            : "Read-only view of this revision."}
        </p>
        <div className="flex gap-2">
          <Button size="sm" icon={<Printer className="size-4" />} onClick={() => window.print()}>
            Print
          </Button>
          <Button size="sm" variant="dark" icon={pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} onClick={pdf} disabled={pdfBusy}>
            Download PDF
          </Button>
        </div>
      </div>
      <QuoteDocument
        quote={ed.value}
        bom={props.bom}
        quoteNumber={props.quoteNumber}
        mtrNumber={props.mtrNumber}
        company={props.company}
        team={props.team}
        editable={props.editable}
        onChange={ed.setValue}
      />
      <SaveBar dirty={ed.dirty} saving={ed.saving} onSave={ed.save} onReset={ed.reset} />
    </>
  );
}
