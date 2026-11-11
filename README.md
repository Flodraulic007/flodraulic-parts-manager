# Flodraulic Controls Hub

Web application for the Flodraulic electrical / controls team. It replaces the quote tracking spreadsheet, the per-job quote/BOM workbooks and the part number ledger.

## Workflow

```
New Quote ──► Quoting (quote # 261109A0) ──► Approve ──► Build (MTR7271) ──► Shipped
               │  Quote document                           │  Build BOM (+ purchasing status)
               │  BOM & pricing                            │  Build summary · F5 sheet · QC checklist
               │  Revisions A0 → A1 → A2 …                 │  Approved quote + quoted BOM (read-only)
```

| Section | What it does |
| --- | --- |
| **Overview** | KPIs, pipeline by stage, status of every project, "needs attention" alerts, recent activity |
| **Project Register** | The quote tracking sheet: quote #, MTR #, serial #, customer, CSA/UL/QPS, PO, quoted by, status. Serial and PO editable inline, CSV export |
| **Quoting** | All quotes by status. Each quote has its own side menu: Overview, Quote, BOM & pricing, Revisions |
| **Build (MTR)** | Kanban/list of jobs by MTR #. Each job: Overview, Build BOM, Build summary, F5, QC checklist, Approved quote, Quoted BOM |
| **Purchasing** | All parts on active build BOMs grouped by supplier; mark lines ordered/received with a PO ref |
| **Part Numbers** | The PB ledger (3,176 parts, 18 categories). Search, add (auto next number per category), edit, price history |
| **Customers** | Contacts that pre-fill new quotes; per-customer project history |
| **Settings** | Next MTR #, pricing defaults (margin, labour rate, CAD→USD), letterhead, quote terms/notes, team |

### Numbering
- **Quote #** = `YYMMDD` + letter for the n-th quote that day + revision digit: `261109A0`, `261109B0`, revised → `261109A1`.
- **MTR #** increments from the last one used (seeded at MTR7272; adjustable in Settings).
- **Repeat orders** reuse an existing MTR #, skip quoting and copy the original BOM when that job is in the system.

### Revision control
Only the latest *draft* revision can be edited. Issuing a quote locks it; changes require a new revision, which copies the previous one. Old revisions are never deleted and can be viewed, downloaded, and compared (price delta + BOM line changes).

### Pricing (mirrors the Excel BOM)
- Labour lines are *sell* price: `USD rate ÷ CAD→USD` per hour.
- Parts sell = parts cost ÷ (1 − target margin).
- Quote price = parts sell + labour sell + certification, rounded up to $10 (or a manual override).
- Actual parts margin = 1 − parts cost ÷ (price − labour − certification), with a warning below target.
- BOM lines warn when the ledger cost has changed since they were added ("Update N prices").

## Running

```bash
npm install
npm run build
npm start          # http://localhost:3000
```

Sign in with **jeril / jeril**.

### Configuration (environment variables)

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Secret used to sign session cookies. **Set this in production.** |
| `MONGODB_URI` | If set, data is stored in MongoDB (db `MONGODB_DB`, default `flodraulic`, collections prefixed `hub_` so existing collections such as the legacy `parts` are left untouched). **Required on Vercel.** |
| `DATA_DIR` | Otherwise data is stored in `$DATA_DIR/db.json` (default `./data/db.json`). |
| `INSECURE_COOKIES=1` | Allow login over plain HTTP when running `npm start` without HTTPS (e.g. on a LAN server). |

On first start the app seeds the part ledger from `data/seed/parts.json`, the user `jeril`, and the current project register.
The file store suits a single always-on server (office PC / VM). On Vercel without `MONGODB_URI` the app falls back to `/tmp`, which is wiped between instances — fine for a quick look, but data will not persist.

### Re-importing the part ledger

```bash
python3 scripts/import_ledger.py NEW_PART_NUMBER_LEDGER.xlsx   # regenerates data/seed/parts.json
```
The seed is only loaded into an empty database.
