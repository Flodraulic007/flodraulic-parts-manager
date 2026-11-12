import type { Bom, BuildStatus, QuoteDoc, QuoteStatus, Settings } from "./types";

export const CATEGORY_NAMES: Record<string, string> = {
  PBA: "Accessories, Meters & Climate",
  PBB: "Push Buttons, Selectors & E-Stops",
  PBC: "Contactors & Circuit Breakers",
  PBD: "Disconnects & Displays",
  PBE: "Enclosures & Backplates",
  PBF: "Fuses & Fuse Holders",
  PBG: "Ground Fault & Current Transformers",
  PBH: "Hardware, Glands & Strain Relief",
  PBI: "Intrinsic Safety Barriers",
  PBK: "Keys & Locks",
  PBL: "Legend Plates & Pilot Lights",
  PBM: "Mounting Plates & Brackets",
  PBO: "Overloads & Overlays",
  PBP: "Power Supplies, PLC & Sensors",
  PBR: "Relays, Timers & Receptacles",
  PBS: "Soft Starters & Sensors",
  PBT: "Transformers & Terminals",
  PBV: "VFDs & Motor Controls",
  PBW: "Wire, Cable & Wire Duct",
};

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  company: {
    name: "FloDraulic Controls Ltd.",
    address: "45 Sinclair Avenue, Georgetown, ON Canada L7G 4X4",
    phone: "1 (905) 702-9456",
    fax: "1 (905) 702-9457",
    quotesEmail: "myQuotes@Flodraulic.com",
    poEmail: "myPO@Flodraulic.com",
    web: "www.flodraulic.com",
  },
  pricing: { targetMargin: 40, labourRateUSD: 65, cadToUsd: 0.73, certificationCost: 0 },
  quoteDefaults: {
    availability: "6-8 Weeks",
    funds: "CDN Funds",
    validityDays: 30,
    fob: "Georgetown",
    terms: "Your standard terms",
    generalNotes: [
      "Wiring schematics and panel layout drawings will be provided by FloDraulic Controls Ltd.",
      "Errors and omissions in customer supplied design and/or drawings may result in additional charges.",
      "FloDraulic Controls Ltd. assumes no responsibility for the condition and/or functionality of customer supplied equipment. Any costs incurred due to defective or incorrect parts may be billed to the customer, and may affect lead-time.",
      "Panels will be UL508A or CSA labeled, depending on customer requirements.",
      "All customer free issued parts must be either UL or CSA approved or the panel may not be approved.",
      "Installation and/or field start-up are not included in this pricing.",
      "This pricing includes our shop's standard wiring methods, which may include as examples: TEW wire, Wieland terminals, Brady adhesive wire markers and Wieland grey wire duct etc.",
      "Price quoted is based on the information provided at the time quote was submitted. Any necessary changes may result in additional charges and/or lead-time.",
    ].join("\n"),
    leadTimeNotes: [
      "Our standard lead-time is stated above. However, if your project requires expediting, please inform your sales representative, and we will make every effort to meet your delivery requirements.",
      "Lead times may suffer due to schematic approvals.",
      "Standard lead-time is subject to change.",
      "For customers free issuing parts, lead-time will start after receipt of parts at our FloDraulic, Georgetown location.",
      "Availability timeline starts from the date PO was released.",
    ].join("\n"),
    freightNotes: [
      "Freight and brokerages have not been allowed for in the quoted price unless otherwise noted, and is F.O.B. Georgetown, Ontario, Canada.",
      "Incoming freight charges incurred to meet the required ship date will be billed separately.",
      "Customer to decide if a crate is required for larger panels. NOTE: This will be an additional cost.",
    ].join("\n"),
  },
  nextMtr: 7272,
  team: [
    { name: "Jeril Benny", email: "jbenny@flodraulic.com", phone: "", role: "Controls Designer" },
    { name: "Stephen Platkin-Hogg", email: "", phone: "", role: "Controls Designer" },
    { name: "Ben DaSilva", email: "", phone: "", role: "Controls Designer" },
    { name: "Robert Cado", email: "", phone: "", role: "Sales" },
    { name: "RobC", email: "", phone: "", role: "Sales" },
    { name: "Kiran Krishnan", email: "", phone: "", role: "Controls Designer" },
  ],
  categories: CATEGORY_NAMES,
};

export const LABOUR_DEFAULTS = [
  "TIME TO ASSEMBLE & WIRE",
  "TIME TO ENGINEER AND PREP DRAWINGS",
  "TIME TO TEST",
];

export function newBom(s: Settings): Bom {
  return {
    targetMargin: s.pricing.targetMargin,
    labourRateUSD: s.pricing.labourRateUSD,
    cadToUsd: s.pricing.cadToUsd,
    certificationCost: s.pricing.certificationCost,
    actualQuotePrice: null,
    lines: LABOUR_DEFAULTS.map((d, i) => ({
      id: `lab${i}`,
      kind: "labour" as const,
      partNumber: "LABOUR-PB",
      description: d,
      qty: 0,
      uom: "hr" as const,
      unitCost: 0,
    })),
  };
}

export function newQuoteDoc(
  s: Settings,
  p: { customer: string; description: string; mtrNumber: string; pcs: number; quotedBy: string; csa: boolean; ul: boolean },
  customer?: { attention?: string; email?: string; phone?: string; address?: string },
): QuoteDoc {
  const member = s.team.find((t) => t.name === p.quotedBy);
  return {
    attention: customer?.attention ?? "",
    company: p.customer,
    reference: p.description.replace(/_/g, " "),
    customerEmail: customer?.email ?? "",
    customerPhone: customer?.phone ?? "",
    customerAddress: customer?.address ?? "",
    quoteDate: new Date().toISOString().slice(0, 10),
    quotedBy: p.quotedBy,
    quotedByEmail: member?.email ?? "",
    quotedByPhone: member?.phone ?? "",
    designerName: p.quotedBy,
    designerEmail: member?.email ?? "",
    designerPhone: member?.phone ?? "",
    lines: [
      {
        id: "l1",
        qty: p.pcs || 1,
        product: `${p.mtrNumber}-A`,
        description: p.description,
        unitPrice: 0,
        availability: s.quoteDefaults.availability,
        linkToBom: true,
      },
    ],
    specialNotes: "",
    rating: [p.csa && "CSA approved", p.ul && "UL508A labelled"].filter(Boolean).join(" / "),
    taxRate: null,
    funds: s.quoteDefaults.funds,
    validityDays: s.quoteDefaults.validityDays,
    fob: s.quoteDefaults.fob,
    terms: s.quoteDefaults.terms,
    generalNotes: s.quoteDefaults.generalNotes,
    leadTimeNotes: s.quoteDefaults.leadTimeNotes,
    freightNotes: s.quoteDefaults.freightNotes,
  };
}

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "slate" },
  sent: { label: "Sent to customer", tone: "blue" },
  approved: { label: "Approved", tone: "green" },
  lost: { label: "Lost", tone: "rose" },
  hold: { label: "On hold", tone: "amber" },
};

export const BUILD_STATUS: Record<BuildStatus, { label: string; tone: Tone }> = {
  queued: { label: "Queued", tone: "violet" },
  wiring: { label: "Assembly & wiring", tone: "blue" },
  testing: { label: "Testing", tone: "amber" },
  qc: { label: "QC inspection", tone: "orange" },
  complete: { label: "Ready to ship", tone: "teal" },
  shipped: { label: "Shipped", tone: "green" },
};

export const BUILD_FLOW: BuildStatus[] = ["queued", "wiring", "testing", "qc", "complete", "shipped"];

export type Tone = "slate" | "blue" | "green" | "rose" | "amber" | "violet" | "orange" | "teal" | "red";

export const BUILD_SUMMARY_FIELDS: { key: string; label: string; type?: "date" | "person" | "textarea" }[] = [
  { key: "serialNumber", label: "Serial number" },
  { key: "pieces", label: "# of pieces" },
  { key: "packageDate", label: "Date of package", type: "date" },
  { key: "packageBy", label: "Build package by", type: "person" },
  { key: "cpcDocsBy", label: "CPC docs completed by", type: "person" },
  { key: "jobBin", label: "Located in job bin" },
  { key: "wiredBy", label: "Wired by", type: "person" },
  { key: "testedBy", label: "Tested by", type: "person" },
  { key: "testDate", label: "Date of test", type: "date" },
  { key: "returnTo", label: "Package return to", type: "person" },
  { key: "pickTicket", label: "Pick ticket number" },
  { key: "customerOrder", label: "Customer order #" },
  { key: "csaApproval", label: "CSA / UL approval" },
  { key: "ferrules", label: "Ferrules & wire labels" },
  { key: "specialNotes", label: "Special notes (loose parts, etc.)", type: "textarea" },
];

export const F5_FIELDS: { key: string; label: string; placeholder?: string }[] = [
  { key: "wiringInstruction", label: "Use wiring instruction" },
  { key: "schematic", label: "Use schematic / diagram" },
  { key: "layout", label: "Use layout drawing" },
  { key: "testProcedure", label: "Use test procedure" },
  { key: "maxVoltage", label: "Max voltage", placeholder: "e.g. 600VAC" },
  { key: "motorVoltage", label: "Motor voltage" },
  { key: "motorHp", label: "Motor horsepower" },
  { key: "panelFla", label: "Panel F.L.A." },
  { key: "largestMotorFla", label: "F.L.A. of largest motor" },
  { key: "controlVoltage", label: "Control voltage", placeholder: "e.g. 24VDC" },
  { key: "infeedTorque", label: "Infeed wiring torque" },
  { key: "motorTorque", label: "Motor wiring torque" },
  { key: "environment", label: "Environment type" },
  { key: "scc", label: "SCC rating" },
  { key: "specialNotes", label: "Special notes" },
];

export const QC_SECTIONS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: "Labels",
    items: [
      "Flo label - top left corner.",
      "Dangerman label - right edge, center (when possible).",
      "CSA or UL label as specified in package.",
      "White label on inside of door, top left corner.",
      "White label data matches drawing package data & CSA info.",
      "All labels & lamacoids on straight & spelling is good.",
      "All internal components identified.",
      "Ground labels in place.",
      "Set of drawings included.",
      "Pull test ALL wires.",
    ].map((label, i) => ({ key: `lbl${i}`, label })),
  },
  {
    title: "Mechanical",
    items: [
      "Grommets in place on VFD at cable entry, or other protection.",
      "Disconnect switch works smoothly.",
      "Panel strain reliefs checked for looseness.",
      "Connector strain reliefs checked for looseness.",
      "Gasket on lid checked for damage or cuts.",
      "Door closes properly & locks.",
      "All debris blown / vacuumed out.",
      "Overload set as per F5 page.",
    ].map((label, i) => ({ key: `mec${i}`, label })),
  },
  {
    title: "Electrical",
    items: [
      "VFDs are grounded.",
      "Ground to the door.",
      "Ground to the backplate.",
      "Paint removed from backplate ground points.",
      "Additional parts to ship with the panel identified (limit switch, pendant, etc.).",
      "Braided sleeving used where needed.",
      "Transformer covers fitted where needed.",
      "Multiple panels: wire routing and assembly similar across all panels.",
      "Terminal connection points for field wiring as clear as possible.",
    ].map((label, i) => ({ key: `ele${i}`, label })),
  },
];

export const QC_SIGNOFF = ["Built by", "Harness by", "Tested by", "QC'd by", "Date"];
