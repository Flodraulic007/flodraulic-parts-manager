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

## Roles

| Role | Can do |
| --- | --- |
| **Manager** (the built-in `jeril` account) | Everything: create users and set roles, assign quotes/builds, see and override margins, approve and send quotes, mark PO received, settings |
| **Designer** | Build quotes and build BOMs assigned to them, send for peer review, review other designers' work. Never sees margins. |
| **Production Manager** | Production view: start released builds and update progress through to shipped |

Everyone gets **My dashboard** with the tasks waiting on them, and in-app notifications (bell). Email notifications are optional per user and need `SMTP_URL` set.

## Workflow

```
Quote:  Drafting → In peer review ─┬→ Returned for changes → (designer fixes) → In peer review …
                                   └→ Awaiting manager → Sent to client ─┬→ Revision requested (new version, reason required) → review again
                                                                          └→ PO received
Build:  PO received → Building → Build review ─┬→ Build returned → Building …
                                               └→ Ready for production → In production → Shipped
```

- Every status change is logged with who, when and the comment, and shown on each project's **Timeline** with time spent per status.
- **Stage overview** (managers) groups open projects by stage and highlights the ones that have been there too long.
- Reviewers comment on the whole BOM or on individual lines; open comments travel with "Return for changes".
- **Customer margins**: each customer has a default margin that new quotes inherit; a manager can override it per quote (logged in the timeline).
- **Revisions** (v1, v2 …) need a reason and who asked (customer / internal). Compare any two versions side by side with price differences.
- On **PO received**, the quote is frozen and the build gets its own copy of the BOM. Every build BOM change asks for a reason (the **change log**), the cumulative difference from the quote is shown, and a build that drifts past the threshold in Settings (default 10%) is flagged for a possible quote revision.
- **Suppliers** directory (seeded from the ledger's supplier names) and **part documents** (datasheets, manuals; up to 4 MB each) that open from the parts list and from BOM lines.

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
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Built-in manager account (default `jeril` / `jeril` / Jeril Benny). Works even before the database is set up, until its password is changed under My account. |
| `SMTP_URL`, `SMTP_FROM`, `APP_URL` | Optional: send email notifications (e.g. `smtps://user:pass@smtp.example.com`). `APP_URL` makes the links in emails absolute. |
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
