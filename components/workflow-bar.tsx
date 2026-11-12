"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CornerUpLeft,
  Factory,
  GitBranchPlus,
  PackageCheck,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import {
  approveQuote,
  assignDesigner,
  createRevision,
  reviewDecision,
  sendToClient,
  setQuoteStatus,
  startProduction,
  submitForReview,
} from "@/lib/actions";
import type { ProjectStatus, Role, RevisionStatus, Stage } from "@/lib/types";
import { STATUS } from "@/lib/workflow";
import { Badge, Button, Field, Modal, cx } from "./ui";
import { run } from "./toast";

type Designer = { username: string; name: string };

export interface WorkflowBarProps {
  id: string;
  stage: Stage;
  status: ProjectStatus;
  role: Role;
  username: string;
  assignee?: string;
  reviewer?: string;
  designers: Designer[];
  daysInStatus: number;
  openComments: number;
  quote?: {
    quoteNumber: string;
    revStatus: RevisionStatus;
    revisions: { rev: number; quoteNumber: string; status: RevisionStatus }[];
    poNumber: string;
  };
}

type ModalKind = null | "assign" | "review" | "return" | "approve" | "revision" | "po" | "lost";

export function WorkflowBar(props: WorkflowBarProps) {
  const { id, stage, status, role, username, assignee, reviewer, designers, quote } = props;
  const router = useRouter();
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const manager = role === "manager";
  const isAssignee = assignee === username;
  const isReviewer = reviewer === username;
  const nameOf = (u?: string) => designers.find((d) => d.username === u)?.name ?? u ?? "";
  const build = stage === "build";

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

  const editable = build ? ["po_received", "building", "build_returned"] : ["drafting", "quote_returned", "revision_requested"];
  const canSubmit = editable.includes(status) && (isAssignee || (manager && !!assignee));
  const inReview = status === (build ? "build_review" : "quote_review");
  const st = STATUS[status];

  const actions: React.ReactNode[] = [];
  if (manager && (build ? ["po_received", "building", "build_returned"] : ["drafting", "quote_returned", "revision_requested", "quote_review", "awaiting_manager", "sent"]).includes(status))
    actions.push(
      <Button key="assign" icon={<UserPlus className="size-4" />} onClick={() => setModal("assign")}>
        {assignee ? "Reassign" : build ? "Assign build designer" : "Assign designer"}
      </Button>,
    );
  if (canSubmit)
    actions.push(
      <Button key="review" variant="primary" icon={<Users className="size-4" />} onClick={() => setModal("review")}>
        Send for peer review
      </Button>,
    );
  if (inReview && (isReviewer || manager)) {
    actions.push(
      <Button key="return" variant="danger" icon={<CornerUpLeft className="size-4" />} onClick={() => setModal("return")}>
        Return for changes
      </Button>,
      <Button key="ok" variant="primary" icon={<CheckCircle2 className="size-4" />} onClick={() => setModal("approve")}>
        {build ? "Mark ready for production" : "Mark as reviewed"}
      </Button>,
    );
  }
  if (!build && manager && status === "awaiting_manager")
    actions.push(
      <Button
        key="send"
        variant="primary"
        icon={<Send className="size-4" />}
        disabled={busy}
        onClick={() =>
          confirm(`Approve ${quote?.quoteNumber} and mark it as sent to the client? The revision will be locked.`) &&
          go(sendToClient(id), "Quote sent to client")
        }
      >
        Approve & send to client
      </Button>,
    );
  if (!build && (manager || isAssignee) && ["sent", "hold", "awaiting_manager"].includes(status))
    actions.push(
      <Button key="rev" icon={<GitBranchPlus className="size-4" />} onClick={() => setModal("revision")}>
        New revision
      </Button>,
    );
  if (!build && manager && ["sent", "awaiting_manager", "hold"].includes(status))
    actions.push(
      <Button key="po" variant="dark" icon={<PackageCheck className="size-4" />} onClick={() => setModal("po")}>
        PO received → Build
      </Button>,
    );
  if (build && status === "ready_production" && (role === "production" || manager))
    actions.push(
      <Button key="prod" variant="primary" icon={<Factory className="size-4" />} disabled={busy} onClick={() => go(startProduction(id), "Production started")}>
        Start production
      </Button>,
    );

  const others = reviewerChoices(designers, assignee);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span>
          {props.daysInStatus === 0 ? "today" : `${props.daysInStatus}d in stage`}
          {assignee && (
            <>
              {" · "}
              <b className="font-medium text-gray-700">{nameOf(assignee)}</b>
            </>
          )}
          {reviewer && inReview && (
            <>
              {" · reviewer "}
              <b className="font-medium text-gray-700">{nameOf(reviewer)}</b>
            </>
          )}
          {!assignee && !["lost", "shipped", "ready_production", "in_production"].includes(status) && " · unassigned"}
          {props.openComments > 0 && <> · <b className="font-medium text-amber-700">{props.openComments} open comment{props.openComments > 1 ? "s" : ""}</b></>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {!build && manager && (
          <div className="relative">
            <Button variant="ghost" onClick={() => setMenu((m) => !m)} aria-label="More actions">
              <ChevronDown className="size-4" />
            </Button>
            {menu && (
              <div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg" onMouseLeave={() => setMenu(false)}>
                {status !== "hold" && status !== "lost" && <MenuItem onClick={() => (setMenu(false), go(setQuoteStatus(id, "hold"), "Quote put on hold"))}>Put on hold</MenuItem>}
                {status !== "lost" && <MenuItem onClick={() => (setMenu(false), setModal("lost"))}>Mark as lost</MenuItem>}
                {(status === "lost" || status === "hold") && <MenuItem onClick={() => (setMenu(false), go(setQuoteStatus(id, "reopen"), "Quote re-opened"))}>Re-open quote</MenuItem>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign */}
      <AssignModal
        open={modal === "assign"}
        onClose={() => setModal(null)}
        designers={designers}
        current={assignee}
        title={build ? "Assign build designer" : "Assign quote to a designer"}
        onSubmit={(u) => go(assignDesigner(id, u), `Assigned to ${nameOf(u)}`)}
      />

      {/* Send for review */}
      <ReviewRequestModal
        open={modal === "review"}
        onClose={() => setModal(null)}
        choices={others}
        busy={busy}
        what={build ? "build" : "quote"}
        onSubmit={(r, note) => go(submitForReview(id, r, note), `Sent to ${nameOf(r)} for review`)}
      />

      {/* Reviewer decisions */}
      <CommentModal
        open={modal === "return"}
        onClose={() => setModal(null)}
        title="Return for changes"
        description="Goes back to the designer with your comments. Line-item comments you left on the BOM are included."
        required={props.openComments === 0}
        cta="Return to designer"
        danger
        busy={busy}
        onSubmit={(c) => go(reviewDecision(id, "return", c), "Returned for changes")}
      />
      <CommentModal
        open={modal === "approve"}
        onClose={() => setModal(null)}
        title={build ? "Mark ready for production" : "Mark as reviewed"}
        description={build ? "The build will appear in the Production Manager's queue." : "The quote goes to the manager to approve and send to the client."}
        cta={build ? "Ready for production" : "Reviewed — ready for manager"}
        busy={busy}
        onSubmit={(c) => go(reviewDecision(id, "approve", c), build ? "Ready for production" : "Marked as reviewed")}
      />

      {quote && (
        <>
          <RevisionModal
            open={modal === "revision"}
            onClose={() => setModal(null)}
            next={`${quote.quoteNumber.slice(0, -1)}${+quote.quoteNumber.slice(-1) + 1}`}
            busy={busy}
            onSubmit={(reason, by) => go(createRevision(id, reason, by), "New revision created")}
          />
          <PoModal
            open={modal === "po"}
            onClose={() => setModal(null)}
            revisions={quote.revisions}
            current={quote.revisions[quote.revisions.length - 1]?.rev ?? 0}
            poNumber={quote.poNumber}
            designers={designers}
            assignee={assignee}
            busy={busy}
            onSubmit={(v) => go(approveQuote(id, v), "PO received — build created", () => router.push(`/builds/${id}`))}
          />
          <LostModal open={modal === "lost"} onClose={() => setModal(null)} onSubmit={(r) => go(setQuoteStatus(id, "lost", r), "Quote marked as lost")} />
        </>
      )}
    </div>
  );
}

function reviewerChoices(designers: Designer[], assignee?: string) {
  return designers.filter((d) => d.username !== assignee);
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
      {children}
    </button>
  );
}

function AssignModal({
  open,
  onClose,
  designers,
  current,
  title,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  designers: Designer[];
  current?: string;
  title: string;
  onSubmit: (u: string) => void;
}) {
  const [v, setV] = useState(current ?? "");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="The designer is notified and the work shows on their dashboard."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!v} onClick={() => onSubmit(v)}>
            Assign
          </Button>
        </>
      }
    >
      <PeoplePicker people={designers} value={v} onChange={setV} />
    </Modal>
  );
}

function PeoplePicker({ people, value, onChange }: { people: Designer[]; value: string; onChange: (v: string) => void }) {
  if (!people.length) return <p className="text-sm text-gray-500">No other designers yet — add them under Users & roles.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {people.map((d) => (
        <button
          key={d.username}
          type="button"
          onClick={() => onChange(d.username)}
          className={cx(
            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition",
            value === d.username ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:bg-gray-50",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
            {d.name
              .split(/\s+/)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="font-medium text-gray-900">{d.name}</span>
        </button>
      ))}
    </div>
  );
}

function ReviewRequestModal({
  open,
  onClose,
  choices,
  busy,
  what,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  choices: Designer[];
  busy: boolean;
  what: string;
  onSubmit: (reviewer: string, note: string) => void;
}) {
  const [r, setR] = useState("");
  const [note, setNote] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send ${what} for peer review`}
      description="Pick another designer. It appears on their dashboard and they're notified. Editing is locked while it's in review."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!r || busy} onClick={() => onSubmit(r, note)}>
            Send for review
          </Button>
        </>
      }
    >
      <PeoplePicker people={choices} value={r} onChange={setR} />
      <Field label="Note to reviewer" hint="optional" className="mt-4">
        <textarea className="field min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything they should look at closely?" />
      </Field>
    </Modal>
  );
}

function CommentModal({
  open,
  onClose,
  title,
  description,
  cta,
  required,
  danger,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  cta: string;
  required?: boolean;
  danger?: boolean;
  busy: boolean;
  onSubmit: (c: string) => void;
}) {
  const [c, setC] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy || (required && !c.trim())} onClick={() => onSubmit(c)}>
            {cta}
          </Button>
        </>
      }
    >
      <Field label="Comment" hint={required ? "required" : "optional"}>
        <textarea className="field min-h-28" value={c} onChange={(e) => setC(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

function RevisionModal({
  open,
  onClose,
  next,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  next: string;
  busy: boolean;
  onSubmit: (reason: string, by: "customer" | "internal") => void;
}) {
  const [reason, setReason] = useState("");
  const [by, setBy] = useState<"customer" | "internal">("customer");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Create revision ${next}`}
      description="Only for significant changes that affect pricing. Small changes during the build are handled in the build BOM. Previous versions stay viewable and unchanged."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy || reason.trim().length < 3} onClick={() => onSubmit(reason, by)}>
            Create {next}
          </Button>
        </>
      }
    >
      <span className="mb-1.5 block text-[13px] font-medium text-gray-700">Requested by</span>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            ["customer", "Customer", "The client asked for a change"],
            ["internal", "Internal correction", "We found something to fix"],
          ] as const
        ).map(([k, l, d]) => (
          <button
            key={k}
            type="button"
            onClick={() => setBy(k)}
            className={cx("rounded-lg border px-3 py-2.5 text-left", by === k ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-gray-200 hover:bg-gray-50")}
          >
            <div className="text-sm font-semibold text-gray-900">{l}</div>
            <div className="text-xs text-gray-500">{d}</div>
          </button>
        ))}
      </div>
      <Field label="Reason for revision" hint="required">
        <textarea className="field min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer upgraded to N4X stainless enclosure and added a second VFD" />
      </Field>
    </Modal>
  );
}

function PoModal({
  open,
  onClose,
  revisions,
  current,
  poNumber,
  designers,
  assignee,
  busy,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  revisions: { rev: number; quoteNumber: string; status: RevisionStatus }[];
  current: number;
  poNumber: string;
  designers: Designer[];
  assignee?: string;
  busy: boolean;
  onSubmit: (v: { rev: number; poNumber: string; dueDate: string; assignedTo: string }) => void;
}) {
  const [v, setV] = useState({ rev: current, poNumber, dueDate: "", assignedTo: assignee ?? "" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="PO received — create build"
      description="The selected revision's quote and BOM are frozen as the customer-agreed baseline. The build gets its own copy of the BOM."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => onSubmit(v)}>
            Create build
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Revision the customer accepted" className="sm:col-span-2">
          <select className="field" value={v.rev} onChange={(e) => setV({ ...v, rev: +e.target.value })}>
            {[...revisions].reverse().map((r) => (
              <option key={r.rev} value={r.rev}>
                {r.quoteNumber} ({r.status})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer PO number">
          <input className="field" value={v.poNumber} onChange={(e) => setV({ ...v, poNumber: e.target.value })} />
        </Field>
        <Field label="Required ship date" hint="default +6 weeks">
          <input type="date" className="field" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
        </Field>
        <Field label="Build designer" className="sm:col-span-2">
          <select className="field" value={v.assignedTo} onChange={(e) => setV({ ...v, assignedTo: e.target.value })}>
            <option value="">Assign later</option>
            {designers.map((d) => (
              <option key={d.username} value={d.username}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
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
