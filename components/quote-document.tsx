"use client";

import { Link2, Link2Off, Plus, Trash2 } from "lucide-react";
import type { Bom, QuoteDoc, QuoteLine, Settings } from "@/lib/types";
import { quoteTotals, validUntil } from "@/lib/calc";
import { date, money, uid } from "@/lib/format";
import { cx } from "./ui";

interface Props {
  quote: QuoteDoc;
  bom: Bom;
  quoteNumber: string;
  mtrNumber: string;
  company: Settings["company"];
  editable: boolean;
  onChange?: (q: QuoteDoc) => void;
  team?: Settings["team"];
}

export function QuoteDocument({ quote, bom, quoteNumber, mtrNumber, company, editable, onChange, team = [] }: Props) {
  const set = <K extends keyof QuoteDoc>(k: K, v: QuoteDoc[K]) => onChange?.({ ...quote, [k]: v });
  const setLine = (id: string, patch: Partial<QuoteLine>) =>
    set(
      "lines",
      quote.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const totals = quoteTotals(quote, bom);

  const t = ({ k, className, placeholder, multiline }: { k: keyof QuoteDoc; className?: string; placeholder?: string; multiline?: boolean }) =>
    multiline ? (
      <textarea
        className={cx("cell-input resize-none leading-relaxed", className)}
        value={String(quote[k] ?? "")}
        disabled={!editable}
        placeholder={editable ? placeholder : ""}
        rows={Math.max(2, String(quote[k] ?? "").split("\n").length)}
        onChange={(e) => set(k, e.target.value as never)}
      />
    ) : (
      <input
        className={cx("cell-input", className)}
        value={String(quote[k] ?? "")}
        disabled={!editable}
        placeholder={editable ? placeholder : ""}
        onChange={(e) => set(k, e.target.value as never)}
      />
    );

  const pickPerson = (who: "quotedBy" | "designerName", name: string) => {
    const m = team.find((t) => t.name === name);
    if (who === "quotedBy") onChange?.({ ...quote, quotedBy: name, quotedByEmail: m?.email ?? quote.quotedByEmail, quotedByPhone: m?.phone ?? quote.quotedByPhone });
    else onChange?.({ ...quote, designerName: name, designerEmail: m?.email ?? quote.designerEmail, designerPhone: m?.phone ?? quote.designerPhone });
  };

  return (
    <article className="paper print-full mx-auto w-full max-w-[880px] text-[13px] text-gray-800">
      {/* Letterhead */}
      <div className="h-1.5 rounded-t-md bg-brand-600" />
      <header className="flex flex-wrap items-start justify-between gap-6 px-10 pb-6 pt-8">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/flodraulic-wordmark.png" alt="Flodraulic" className="h-8 w-auto" />
          <div className="mt-3 text-xs leading-relaxed text-gray-500">
            <div className="font-semibold text-gray-700">{company.name}</div>
            <div>{company.address}</div>
            <div>
              P: {company.phone} · F: {company.fax}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[26px] font-light uppercase tracking-[0.25em] text-gray-900">Quotation</div>
          <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-4 gap-y-0.5 text-xs">
            <dt className="text-gray-500">Quote #</dt>
            <dd className="font-mono font-semibold text-gray-900">{quoteNumber}</dd>
            <dt className="text-gray-500">Date</dt>
            <dd>
              {editable ? (
                <input type="date" className="cell-input -my-1 w-[130px] text-right text-xs" value={quote.quoteDate} onChange={(e) => set("quoteDate", e.target.value)} />
              ) : (
                date(quote.quoteDate)
              )}
            </dd>
            <dt className="text-gray-500">Valid until</dt>
            <dd>{date(validUntil(quote))}</dd>
            <dt className="text-gray-500">Our ref.</dt>
            <dd className="font-mono">{mtrNumber}</dd>
          </dl>
        </div>
      </header>

      {/* Parties */}
      <section className="grid gap-px border-y border-gray-200 bg-gray-200 sm:grid-cols-2">
        <div className="bg-gray-50/70 px-10 py-5">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Prepared for</h3>
          <div className="space-y-0.5">
            <Row label="Company">{t({ k: "company", className: "font-semibold uppercase text-gray-900" })}</Row>
            <Row label="Attention">{t({ k: "attention", placeholder: "Contact name" })}</Row>
            <Row label="Email">{t({ k: "customerEmail", placeholder: "name@customer.com" })}</Row>
            <Row label="Phone">{t({ k: "customerPhone", placeholder: "(000) 000-0000" })}</Row>
            <Row label="Address">{t({ k: "customerAddress", placeholder: "Site / billing address" })}</Row>
            <Row label="Reference">{t({ k: "reference", className: "font-medium", placeholder: "Project reference" })}</Row>
          </div>
        </div>
        <div className="bg-gray-50/70 px-10 py-5">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">Prepared by</h3>
          <div className="space-y-0.5">
            <Row label="Quoted by">
              {editable ? (
                <PersonInput value={quote.quotedBy} team={team} onChange={(v) => pickPerson("quotedBy", v)} />
              ) : (
                <span className="px-1.5 font-semibold text-gray-900">{quote.quotedBy}</span>
              )}
            </Row>
            <Row label="Email">{t({ k: "quotedByEmail" })}</Row>
            <Row label="Phone">{t({ k: "quotedByPhone", placeholder: company.phone })}</Row>
            <Row label="Designer">
              {editable ? (
                <PersonInput value={quote.designerName} team={team} onChange={(v) => pickPerson("designerName", v)} />
              ) : (
                <span className="px-1.5 font-medium">{quote.designerName}</span>
              )}
            </Row>
            <Row label="Designer email">{t({ k: "designerEmail" })}</Row>
            <Row label="Designer phone">{t({ k: "designerPhone" })}</Row>
          </div>
        </div>
      </section>

      {/* Lines */}
      <section className="px-10 pt-6">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-900 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              <th className="w-14 py-2 pr-2">Qty</th>
              <th className="py-2 pr-2">Product / description</th>
              <th className="w-32 py-2 pr-2 text-right">Unit price</th>
              <th className="w-32 py-2 pr-2 text-right">Ext. price</th>
              <th className="w-32 py-2 text-right">Availability</th>
              {editable && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="align-top">
            {totals.lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    className="cell-input text-center tabular"
                    value={l.qty}
                    disabled={!editable}
                    onChange={(e) => setLine(l.id, { qty: +e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="cell-input font-semibold text-gray-900"
                    value={l.product}
                    disabled={!editable}
                    placeholder="Product"
                    onChange={(e) => setLine(l.id, { product: e.target.value })}
                  />
                  <textarea
                    className="cell-input resize-none text-gray-600"
                    rows={Math.max(1, l.description.split("\n").length)}
                    value={l.description}
                    disabled={!editable}
                    placeholder={editable ? "Description" : ""}
                    onChange={(e) => setLine(l.id, { description: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {editable && (
                      <button
                        type="button"
                        title={l.linkToBom ? "Price linked to BOM — click to enter manually" : "Link price to BOM quote price"}
                        onClick={() => setLine(l.id, { linkToBom: !l.linkToBom, unitPrice: l.unitPrice })}
                        className={cx("rounded p-1", l.linkToBom ? "text-brand-600 hover:bg-brand-50" : "text-gray-300 hover:bg-gray-100")}
                      >
                        {l.linkToBom ? <Link2 className="size-3.5" /> : <Link2Off className="size-3.5" />}
                      </button>
                    )}
                    {l.linkToBom || !editable ? (
                      <span className="px-1.5 py-1 tabular">{money(l.unitPrice)}</span>
                    ) : (
                      <input
                        type="number"
                        className="cell-input text-right tabular"
                        value={l.unitPrice}
                        onChange={(e) => setLine(l.id, { unitPrice: +e.target.value })}
                      />
                    )}
                  </div>
                </td>
                <td className="py-2 pr-2 text-right font-medium tabular">
                  <span className="inline-block px-1.5 py-1">{money(l.qty * l.unitPrice)}</span>
                </td>
                <td className="py-2 text-right">
                  <input
                    className="cell-input text-right"
                    value={l.availability}
                    disabled={!editable}
                    onChange={(e) => setLine(l.id, { availability: e.target.value })}
                  />
                </td>
                {editable && (
                  <td className="py-2 pl-1">
                    <button
                      type="button"
                      onClick={() => set("lines", quote.lines.filter((x) => x.id !== l.id))}
                      className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <button
            type="button"
            onClick={() =>
              set("lines", [
                ...quote.lines,
                { id: uid(), qty: 1, product: "", description: "", unitPrice: 0, availability: quote.lines[0]?.availability ?? "", linkToBom: false },
              ])
            }
            className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            <Plus className="size-3.5" /> Add line (option, spare, freight…)
          </button>
        )}
      </section>

      {/* Notes + totals */}
      <section className="grid gap-8 px-10 pb-6 pt-6 sm:grid-cols-[1fr_300px]">
        <div>
          <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Special notes</h3>
          {t({ k: "specialNotes", multiline: true, placeholder: "Notes specific to this quotation" })}
          <h3 className="mb-1 mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Rating / certification</h3>
          {t({ k: "rating", placeholder: "e.g. RATED: Class 1 Division 2 Group D", className: "font-medium" })}
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <dl className="space-y-1.5 text-[13px]">
            <TotRow label="Subtotal" value={<span className="tabular">{money(totals.subtotal)}</span>} />
            <TotRow
              label={
                <span className="flex items-center gap-1">
                  Tax
                  {editable && (
                    <input
                      className="cell-input w-14 py-0 text-right text-xs"
                      placeholder="TBD"
                      value={quote.taxRate ?? ""}
                      onChange={(e) => set("taxRate", e.target.value === "" ? null : +e.target.value)}
                    />
                  )}
                  {quote.taxRate != null && <span className="text-xs text-gray-400">{editable ? "%" : `(${quote.taxRate}%)`}</span>}
                </span>
              }
              value={totals.tax == null ? "TBD" : <span className="tabular">{money(totals.tax)}</span>}
            />
            <div className="border-t border-gray-300 pt-1.5">
              <TotRow label={<span className="font-semibold text-gray-900">Total</span>} value={<span className="text-base font-bold text-gray-900 tabular">{totals.total == null ? "TBD" : money(totals.total)}</span>} />
            </div>
          </dl>
          <dl className="mt-3 space-y-0.5 border-t border-gray-200 pt-3 text-xs">
            <Mini label="Funds">{t({ k: "funds", className: "py-0.5 text-right text-xs" })}</Mini>
            <Mini label="Validity">
              {editable ? (
                <span className="flex items-center justify-end">
                  <input type="number" className="cell-input w-14 py-0.5 text-right text-xs" value={quote.validityDays} onChange={(e) => set("validityDays", +e.target.value)} />
                  <span className="text-gray-500">days</span>
                </span>
              ) : (
                <span className="px-1.5">{quote.validityDays} Days</span>
              )}
            </Mini>
            <Mini label="F.O.B.">{t({ k: "fob", className: "py-0.5 text-right text-xs" })}</Mini>
            <Mini label="Terms">{t({ k: "terms", className: "py-0.5 text-right text-xs" })}</Mini>
          </dl>
        </div>
      </section>

      <section className="mx-10 mb-6 rounded-lg border border-brand-100 bg-brand-50/50 px-5 py-3 text-xs leading-relaxed text-gray-700">
        Please send PO&apos;s to the person quoting, <b>{company.quotesEmail}</b>, and <b>{company.poEmail}</b>. Availability timeline starts
        from the date the PO was released. We appreciate this opportunity for quotation! If you have any questions regarding this quotation,
        please don&apos;t hesitate to call.
      </section>

      {/* Important notes */}
      <section className="border-t border-gray-200 px-10 py-6">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Important notes</h3>
        <div className="grid gap-5 md:grid-cols-3">
          {(
            [
              ["General", "generalNotes"],
              ["Lead time", "leadTimeNotes"],
              ["Freight", "freightNotes"],
            ] as const
          ).map(([title, k]) => (
            <div key={k}>
              <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600">{title}</h4>
              {editable ? (
                <textarea
                  className="cell-input min-h-40 resize-y text-[11.5px] leading-relaxed text-gray-600"
                  value={quote[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              ) : (
                <ul className="space-y-1 text-[11.5px] leading-relaxed text-gray-600">
                  {quote[k]
                    .split("\n")
                    .filter(Boolean)
                    .map((n, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-brand-500">•</span>
                        {n}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="rounded-b-md bg-ink-900 px-10 py-3 text-center text-[11px] text-gray-400">
        {company.address} · P: {company.phone} · {company.quotesEmail} · {company.web}
      </footer>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function TotRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[60px_1fr] items-center">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function PersonInput({ value, team, onChange }: { value: string; team: Settings["team"]; onChange: (v: string) => void }) {
  return (
    <>
      <input className="cell-input font-semibold text-gray-900" list="fd-team" value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id="fd-team">
        {team.map((t) => (
          <option key={t.name} value={t.name} />
        ))}
      </datalist>
    </>
  );
}
