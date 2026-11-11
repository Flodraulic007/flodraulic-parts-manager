"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, ChevronDown, GitBranchPlus, Send, Hammer } from "lucide-react";
import { approveQuote, createRevision, issueRevision, setQuoteStatus } from "@/lib/actions";
import type { QuoteStatus, RevisionStatus, Stage } from "@/lib/types";
import { Button, Field, Modal } from "@/components/ui";
import { run } from "@/components/toast";

export function QuoteActions({
  id,
  stage,
  status,
  current,
  revisions,
  poNumber,
  team,
}: {
  id: string;
  stage: Stage;
  status: QuoteStatus;
  current: { rev: number; status: RevisionStatus; quoteNumber: string };
  revisions: { rev: number; quoteNumber: string; status: RevisionStatus }[];
  poNumber: string;
  team: string[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "rev" | "approve" | "lost">(null);
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [approve, setApprove] = useState({ rev: current.rev, poNumber, dueDate: "", assignedTo: "" });
  const [busy, setBusy] = useState(false);

  if (stage === "build")
    return (
      <Button variant="dark" href={`/builds/${id}`} icon={<Hammer className="size-4" />}>
        Open build
      </Button>
    );

  const go = async (p: Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) => {
    setBusy(true);
    const r = await run(p, msg);
    setBusy(false);
    if (r.ok) {
      setModal(null);
      after?.();
      router.refresh();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current.status === "draft" && (
        <Button
          icon={<Send className="size-4" />}
          disabled={busy}
          onClick={() =>
            confirm(`Issue ${current.quoteNumber} to the customer? It will be locked — further changes need a new revision.`) &&
            go(issueRevision(id), `${current.quoteNumber} marked as sent`)
          }
        >
          Issue to customer
        </Button>
      )}
      <Button icon={<GitBranchPlus className="size-4" />} onClick={() => setModal("rev")}>
        New revision
      </Button>
      <Button variant="primary" icon={<CheckCircle2 className="size-4" />} onClick={() => setModal("approve")}>
        Approve → Build
      </Button>
      <div className="relative">
        <Button size="md" variant="ghost" onClick={() => setMenu((m) => !m)} aria-label="More actions">
          <ChevronDown className="size-4" />
        </Button>
        {menu && (
          <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
            {status !== "hold" && (
              <MenuItem onClick={() => (setMenu(false), go(setQuoteStatus(id, "hold"), "Quote put on hold"))}>Put on hold</MenuItem>
            )}
            {status !== "lost" && <MenuItem onClick={() => (setMenu(false), setModal("lost"))}>Mark as lost</MenuItem>}
            {(status === "lost" || status === "hold") && (
              <MenuItem onClick={() => (setMenu(false), go(setQuoteStatus(id, current.status === "draft" ? "draft" : "sent"), "Quote re-opened"))}>
                Re-open quote
              </MenuItem>
            )}
          </div>
        )}
      </div>

      <Modal
        open={modal === "rev"}
        onClose={() => setModal(null)}
        title="Create new revision"
        description={`Copies ${current.quoteNumber} into rev ${current.rev + 1}. Previous revisions are kept read-only.`}
        footer={
          <>
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={() => go(createRevision(id, note), "New revision created", () => setNote(""))}>
              Create rev {current.rev + 1}
            </Button>
          </>
        }
      >
        <Field label="What changed?" hint="shown in revision history">
          <textarea className="field min-h-24" placeholder="e.g. Customer requested N4X stainless enclosure; added 2nd VFD" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title="Approve quote & release to build"
        description="The approved revision's quote and BOM are copied into the build package. Quote data stays here, unchanged."
        footer={
          <>
            <Button onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" disabled={busy} onClick={() => go(approveQuote(id, approve), "Approved — moved to build", () => router.push(`/builds/${id}`))}>
              Approve & create build
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Approved revision" className="sm:col-span-2">
            <select className="field" value={approve.rev} onChange={(e) => setApprove((a) => ({ ...a, rev: +e.target.value }))}>
              {[...revisions].reverse().map((r) => (
                <option key={r.rev} value={r.rev}>
                  {r.quoteNumber} ({r.status})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer PO number">
            <input className="field" value={approve.poNumber} onChange={(e) => setApprove((a) => ({ ...a, poNumber: e.target.value }))} />
          </Field>
          <Field label="Required ship date" hint="default +6 weeks">
            <input type="date" className="field" value={approve.dueDate} onChange={(e) => setApprove((a) => ({ ...a, dueDate: e.target.value }))} />
          </Field>
          <Field label="Build lead / assigned to" className="sm:col-span-2">
            <select className="field" value={approve.assignedTo} onChange={(e) => setApprove((a) => ({ ...a, assignedTo: e.target.value }))}>
              <option value="">Unassigned</option>
              {team.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>

      <LostModal open={modal === "lost"} onClose={() => setModal(null)} onSubmit={(reason) => go(setQuoteStatus(id, "lost", reason), "Quote marked as lost")} />
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
      {children}
    </button>
  );
}

function LostModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (r: string) => void }) {
  const [reason, setReason] = useState("Price");
  const [other, setOther] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark quote as lost"
      description="Tracking why quotes are lost helps tune pricing and lead times."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => onSubmit(reason === "Other" ? other : reason)}>
            Mark as lost
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {["Price", "Lead time", "Went with competitor", "Project cancelled", "No response", "Other"].map((r) => (
          <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm has-checked:border-brand-500 has-checked:bg-brand-50">
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-brand-600" />
            {r}
          </label>
        ))}
      </div>
      {reason === "Other" && <input className="field mt-3" placeholder="Reason" value={other} onChange={(e) => setOther(e.target.value)} />}
    </Modal>
  );
}
