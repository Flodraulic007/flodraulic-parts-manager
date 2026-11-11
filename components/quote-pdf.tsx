import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Keep words whole — the default hyphenation splits part numbers and long words.
Font.registerHyphenationCallback((word) => [word]);
import type { Bom, QuoteDoc, Settings } from "@/lib/types";
import { quoteTotals, validUntil } from "@/lib/calc";
import { date, money } from "@/lib/format";

const RED = "#d71920";
const INK = "#16191f";
const GREY = "#6b7280";
const LINE = "#e5e7eb";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1f2937", paddingTop: 22, paddingBottom: 50 },
  bar: { position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: RED },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 36, paddingTop: 0, paddingBottom: 14 },
  logo: { width: 190, height: 21.6 },
  small: { fontSize: 8, color: GREY, lineHeight: 1.45 },
  title: { fontSize: 20, letterSpacing: 4, color: INK, textAlign: "right" },
  metaRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  metaLabel: { width: 60, color: GREY, fontSize: 8, textAlign: "right", marginRight: 8 },
  metaVal: { width: 78, fontSize: 8.5, textAlign: "right" },
  parties: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, backgroundColor: "#f9fafb" },
  party: { flex: 1, paddingHorizontal: 36, paddingVertical: 12 },
  partyDivider: { width: 1, backgroundColor: LINE },
  eyebrow: { fontSize: 7, letterSpacing: 1.5, color: RED, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  kv: { flexDirection: "row", marginBottom: 2 },
  k: { width: 72, color: GREY, fontSize: 8 },
  v: { flex: 1, fontSize: 8.5 },
  table: { marginHorizontal: 36, marginTop: 16 },
  th: { flexDirection: "row", borderBottomWidth: 1.5, borderColor: INK, paddingBottom: 4 },
  thText: { fontSize: 7, letterSpacing: 1, color: GREY, fontFamily: "Helvetica-Bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: LINE, paddingVertical: 6 },
  cQty: { width: 34, textAlign: "center" },
  cDesc: { flex: 1, paddingRight: 8 },
  cUnit: { width: 78, textAlign: "right" },
  cExt: { width: 78, textAlign: "right" },
  cAvail: { width: 78, textAlign: "right" },
  bottom: { flexDirection: "row", marginHorizontal: 36, marginTop: 16, gap: 24 },
  totals: { width: 200, backgroundColor: "#f3f4f6", borderRadius: 4, padding: 10 },
  totRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  po: { marginHorizontal: 36, marginTop: 14, padding: 9, borderWidth: 0.75, borderColor: "#fbcaca", backgroundColor: "#fef6f6", borderRadius: 4, fontSize: 8, lineHeight: 1.45 },
  notes: { flexDirection: "row", marginHorizontal: 36, marginTop: 16, gap: 16 },
  noteCol: { flex: 1 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: INK, paddingVertical: 8, paddingHorizontal: 36, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#9ca3af" },
});

export function QuotePdf({
  quote,
  bom,
  quoteNumber,
  mtrNumber,
  company,
  logoUrl,
}: {
  quote: QuoteDoc;
  bom: Bom;
  quoteNumber: string;
  mtrNumber: string;
  company: Settings["company"];
  logoUrl: string;
}) {
  const t = quoteTotals(quote, bom);
  const KV = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) =>
    v ? (
      <View style={s.kv}>
        <Text style={s.k}>{k}</Text>
        <Text style={[s.v, bold ? { fontFamily: "Helvetica-Bold" } : {}]}>{v}</Text>
      </View>
    ) : null;
  const Meta = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{k}</Text>
      <Text style={[s.metaVal, mono ? { fontFamily: "Courier-Bold" } : {}]}>{v}</Text>
    </View>
  );

  return (
    <Document title={`Quotation ${quoteNumber}`} author={company.name} subject={quote.reference}>
      <Page size="LETTER" style={s.page}>
        <View style={s.bar} fixed />
        <View style={s.header}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={logoUrl} style={s.logo} />
            <Text style={[s.small, { marginTop: 8, color: "#374151", fontFamily: "Helvetica-Bold" }]}>{company.name}</Text>
            <Text style={s.small}>{company.address}</Text>
            <Text style={s.small}>
              P: {company.phone} · F: {company.fax}
            </Text>
          </View>
          <View>
            <Text style={s.title}>QUOTATION</Text>
            <View style={{ marginTop: 6 }}>
              <Meta k="Quote #" v={quoteNumber} mono />
              <Meta k="Date" v={date(quote.quoteDate)} />
              <Meta k="Valid until" v={date(validUntil(quote))} />
              <Meta k="Our ref." v={mtrNumber} />
            </View>
          </View>
        </View>

        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.eyebrow}>PREPARED FOR</Text>
            <KV k="Company" v={quote.company} bold />
            <KV k="Attention" v={quote.attention} />
            <KV k="Email" v={quote.customerEmail} />
            <KV k="Phone" v={quote.customerPhone} />
            <KV k="Address" v={quote.customerAddress} />
            <KV k="Reference" v={quote.reference} />
          </View>
          <View style={s.partyDivider} />
          <View style={s.party}>
            <Text style={s.eyebrow}>PREPARED BY</Text>
            <KV k="Quoted by" v={quote.quotedBy} bold />
            <KV k="Email" v={quote.quotedByEmail} />
            <KV k="Phone" v={quote.quotedByPhone} />
            <KV k="Designer" v={quote.designerName} />
            <KV k="Designer email" v={quote.designerEmail} />
            <KV k="Designer phone" v={quote.designerPhone} />
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.thText, s.cQty]}>QTY</Text>
            <Text style={[s.thText, s.cDesc]}>PRODUCT / DESCRIPTION</Text>
            <Text style={[s.thText, s.cUnit]}>UNIT PRICE</Text>
            <Text style={[s.thText, s.cExt]}>EXT. PRICE</Text>
            <Text style={[s.thText, s.cAvail]}>AVAILABILITY</Text>
          </View>
          {t.lines.map((l) => (
            <View key={l.id} style={s.tr} wrap={false}>
              <Text style={s.cQty}>{l.qty}</Text>
              <View style={s.cDesc}>
                <Text style={{ fontFamily: "Helvetica-Bold", color: INK }}>{l.product}</Text>
                {!!l.description && <Text style={{ color: "#4b5563", marginTop: 1.5 }}>{l.description}</Text>}
              </View>
              <Text style={s.cUnit}>{money(l.unitPrice)}</Text>
              <Text style={[s.cExt, { fontFamily: "Helvetica-Bold" }]}>{money(l.qty * l.unitPrice)}</Text>
              <Text style={s.cAvail}>{l.availability}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottom} wrap={false}>
          <View style={{ flex: 1 }}>
            {!!quote.specialNotes && (
              <>
                <Text style={[s.eyebrow, { color: GREY }]}>SPECIAL NOTES</Text>
                <Text style={{ lineHeight: 1.4, marginBottom: 8 }}>{quote.specialNotes}</Text>
              </>
            )}
            {!!quote.rating && (
              <>
                <Text style={[s.eyebrow, { color: GREY }]}>RATING / CERTIFICATION</Text>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{quote.rating}</Text>
              </>
            )}
          </View>
          <View style={s.totals}>
            <View style={s.totRow}>
              <Text style={{ color: GREY }}>Subtotal</Text>
              <Text>{money(t.subtotal)}</Text>
            </View>
            <View style={s.totRow}>
              <Text style={{ color: GREY }}>Tax{quote.taxRate != null ? ` (${quote.taxRate}%)` : ""}</Text>
              <Text>{t.tax == null ? "TBD" : money(t.tax)}</Text>
            </View>
            <View style={[s.totRow, { borderTopWidth: 0.75, borderColor: "#9ca3af", paddingTop: 4, marginTop: 2 }]}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Total</Text>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11 }}>{t.total == null ? "TBD" : money(t.total)}</Text>
            </View>
            <View style={{ borderTopWidth: 0.5, borderColor: "#d1d5db", marginTop: 6, paddingTop: 6 }}>
              {[
                ["Funds", quote.funds],
                ["Validity", `${quote.validityDays} Days`],
                ["F.O.B.", quote.fob],
                ["Terms", quote.terms],
              ].map(([k, v]) => (
                <View key={k} style={s.totRow}>
                  <Text style={{ color: GREY, fontSize: 8 }}>{k}</Text>
                  <Text style={{ fontSize: 8 }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={s.po} wrap={false}>
          <Text>
            Please send PO&apos;s to the person quoting, {company.quotesEmail}, and {company.poEmail}. Availability timeline starts from the
            date the PO was released. We appreciate this opportunity for quotation! If you have any questions regarding this quotation,
            please don&apos;t hesitate to call.
          </Text>
        </View>

        <View style={s.notes}>
          {(
            [
              ["GENERAL", quote.generalNotes],
              ["LEAD TIME", quote.leadTimeNotes],
              ["FREIGHT", quote.freightNotes],
            ] as const
          ).map(([title, text]) => (
            <View key={title} style={s.noteCol}>
              <Text style={s.eyebrow}>{title}</Text>
              {text
                .split("\n")
                .filter(Boolean)
                .map((n, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={{ color: RED, width: 8, fontSize: 7.5 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 7.5, color: "#4b5563", lineHeight: 1.4 }}>{n}</Text>
                  </View>
                ))}
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {company.address} · P: {company.phone} · {company.quotesEmail} · {company.web}
          </Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${quoteNumber} · Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function downloadQuotePdf(props: Omit<Parameters<typeof QuotePdf>[0], "logoUrl">) {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<QuotePdf {...props} logoUrl={`${window.location.origin}/flodraulic-wordmark.png`} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Flodraulic Quote ${props.quoteNumber} - ${props.quote.company}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
