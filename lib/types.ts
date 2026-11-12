export type Uom = "ea" | "m" | "hr" | "ft" | "lot";

export type ProcurementStatus = "required" | "ordered" | "received" | "stock";

export interface BomLine {
  id: string;
  kind: "labour" | "part";
  partNumber: string;
  description: string;
  qty: number;
  uom: Uom;
  /** Unit cost in CAD. For labour lines this is ignored; the labour sell rate is used instead. */
  unitCost: number;
  supplier?: string;
  link?: string;
  notes?: string;
  /** Build stage only */
  status?: ProcurementStatus;
  poRef?: string;
}

export interface Bom {
  targetMargin: number; // percent
  labourRateUSD: number; // sell price per hour, USD
  cadToUsd: number;
  certificationCost: number; // CAD
  /** Manual override of the final per-unit quote price (CAD). null = use calculated */
  actualQuotePrice: number | null;
  lines: BomLine[];
}

export interface QuoteLine {
  id: string;
  qty: number;
  product: string;
  description: string;
  unitPrice: number;
  availability: string;
  /** When true, unitPrice is pulled from the BOM's quote price */
  linkToBom: boolean;
}

export interface QuoteDoc {
  // Customer
  attention: string;
  company: string;
  reference: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  // Flodraulic side
  quoteDate: string; // ISO date
  quotedBy: string;
  quotedByEmail: string;
  quotedByPhone: string;
  designerName: string;
  designerEmail: string;
  designerPhone: string;
  // Body
  lines: QuoteLine[];
  specialNotes: string;
  rating: string;
  taxRate: number | null; // percent, null => TBD
  funds: string;
  validityDays: number;
  fob: string;
  terms: string;
  generalNotes: string;
  leadTimeNotes: string;
  freightNotes: string;
}

export type RevisionStatus = "draft" | "issued" | "superseded" | "approved";

export interface Revision {
  rev: number;
  quoteNumber: string;
  status: RevisionStatus;
  note: string;
  createdAt: string;
  createdBy: string;
  issuedAt?: string;
  /** Who asked for this revision (rev ≥ 1) */
  requestedBy?: "customer" | "internal";
  quote: QuoteDoc;
  bom: Bom;
}

export type QuoteStatus = "draft" | "sent" | "approved" | "lost" | "hold";
export type BuildStatus = "queued" | "wiring" | "testing" | "qc" | "complete" | "shipped";
export type Stage = "quote" | "build";

export interface QcItem {
  done: boolean;
  by?: string;
  at?: string;
}

export interface Build {
  approvedAt: string;
  approvedBy: string;
  approvedRev: number | null; // null for repeat orders
  dueDate: string;
  assignedTo: string;
  bom: Bom;
  summary: Record<string, string>;
  f5: Record<string, string>;
  motors: { id: string; label: string; setting: string }[];
  qc: Record<string, QcItem>;
  qcSignoff: Record<string, string>;
  shippedAt?: string;
  changeLog?: BomChange[];
}

export interface ActivityEntry {
  at: string;
  user: string;
  text: string;
  /** Status transition, when this entry is one */
  from?: ProjectStatus;
  to?: ProjectStatus;
  comment?: string;
  kind?: "status" | "margin" | "revision" | "change" | "info";
}

export type Role = "manager" | "designer" | "production";

/** One status for the whole life of a project, quote → production. */
export type ProjectStatus =
  | "drafting"
  | "quote_review"
  | "quote_returned"
  | "awaiting_manager"
  | "sent"
  | "revision_requested"
  | "hold"
  | "lost"
  | "po_received"
  | "building"
  | "build_review"
  | "build_returned"
  | "ready_production"
  | "in_production"
  | "shipped";

export interface ReviewComment {
  id: string;
  at: string;
  by: string; // display name
  byUser: string; // username
  stage: "quote" | "build";
  rev?: number;
  lineId?: string;
  lineLabel?: string;
  text: string;
  resolved: boolean;
}

export interface BomChange {
  id: string;
  at: string;
  by: string;
  reason: string;
  /** Human summary of the lines that changed */
  lines: { label: string; change: string; delta: number }[];
  delta: number; // parts cost change of this edit (CAD)
}

export interface Notification {
  id: string;
  user: string; // username
  at: string;
  text: string;
  href: string;
  read: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface PartDoc {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Project {
  id: string;
  quoteBase: string; // e.g. 261009A  (full quote # = base + rev)
  mtrNumber: string; // e.g. MTR7259
  customer: string;
  description: string;
  pcs: number;
  csa: boolean;
  ul: boolean;
  qps: boolean;
  poNumber: string;
  quotedBy: string;
  serialNumber: string;
  isRepeat: boolean;
  repeatOf?: string; // project id of the original
  stage: Stage;
  quoteStatus: QuoteStatus;
  buildStatus: BuildStatus;
  /** Workflow status (drives tasks, dashboards and the timeline) */
  status: ProjectStatus;
  /** When the project entered its current status */
  statusSince: string;
  /** Username of the designer currently responsible */
  assignee?: string;
  /** Username of the peer reviewer (while in review) */
  reviewer?: string;
  comments?: ReviewComment[];
  lostReason?: string;
  createdAt: string;
  updatedAt: string;
  revisions: Revision[];
  build?: Build;
  activity: ActivityEntry[];
}

export interface Part {
  id: string;
  partNumber: string;
  category: string;
  description: string;
  mfrPartNumber: string;
  cost: number;
  altCost: number | null;
  currency: "CAD" | "USD";
  supplier: string;
  altSupplier: string;
  contact: string;
  jobRef: string;
  link: string;
  notes: string;
  obsolete: boolean;
  updatedAt?: string;
  updatedBy?: string;
  priceHistory?: { at: string; by: string; cost: number }[];
  docs?: PartDoc[];
}

export interface Customer {
  id: string;
  name: string;
  attention: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  /** Default margin % for this customer's quotes (managers only) */
  defaultMargin?: number;
}

export interface TeamMember {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Settings {
  id: "app";
  company: {
    name: string;
    address: string;
    phone: string;
    fax: string;
    quotesEmail: string;
    poEmail: string;
    web: string;
  };
  pricing: {
    targetMargin: number;
    labourRateUSD: number;
    cadToUsd: number;
    certificationCost: number;
  };
  quoteDefaults: {
    availability: string;
    funds: string;
    validityDays: number;
    fob: string;
    terms: string;
    generalNotes: string;
    leadTimeNotes: string;
    freightNotes: string;
  };
  nextMtr: number;
  team: TeamMember[];
  categories: Record<string, string>;
  /** Flag a build when its parts cost drifts more than this % from the quote */
  driftPercent?: number;
  /** First-run seeding progress */
  seeded?: { parts?: boolean; projects?: boolean; suppliers?: boolean; workflow?: boolean };
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  title: string;
  active: boolean;
  emailNotifications: boolean;
  passwordHash: string;
  /** Set once the password differs from the built-in default */
  passwordChanged?: boolean;
  createdAt: string;
}

export interface SessionUser {
  username: string;
  name: string;
  role: Role;
}
