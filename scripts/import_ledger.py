#!/usr/bin/env python3
"""Convert NEW_PART_NUMBER_LEDGER.xlsx into data/seed/parts.json.

Usage:  python3 scripts/import_ledger.py path/to/NEW_PART_NUMBER_LEDGER.xlsx

Each category sheet (PBA, PBB, ...) has slightly different column headers,
so columns are matched by header name rather than position.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

CATEGORY_NAMES = {
    "PBA": "Accessories, Meters & Climate",
    "PBB": "Push Buttons, Selectors & E-Stops",
    "PBC": "Contactors & Circuit Breakers",
    "PBD": "Disconnects & Displays",
    "PBE": "Enclosures & Backplates",
    "PBF": "Fuses & Fuse Holders",
    "PBG": "Ground Fault & Current Transformers",
    "PBH": "Hardware, Glands & Strain Relief",
    "PBI": "Intrinsic Safety Barriers",
    "PBK": "Keys & Locks",
    "PBL": "Legend Plates & Pilot Lights",
    "PBM": "Mounting Plates & Brackets",
    "PBO": "Overloads & Overlays",
    "PBP": "Power Supplies, PLC & Sensors",
    "PBR": "Relays, Timers & Receptacles",
    "PBS": "Soft Starters & Sensors",
    "PBT": "Transformers & Terminals",
    "PBV": "VFDs & Motor Controls",
    "PBW": "Wire, Cable & Wire Duct",
}

HEADER_MAP = {
    "PART NO.": "partNumber",
    "DESCRIPTION": "description",
    "PART #": "mfrPartNumber",
    "MANU. PART #": "mfrPartNumber2",
    "COST": "cost",
    "COST 1": "cost",
    "COST/MTR": "cost",
    "COST 2": "altCost",
    "2ND COST": "altCost",
    "ALT. COST": "altCost",
    "SUPPLIER": "supplier",
    "ALT. SUPPLIER": "altSupplier",
    "2ND SUPPLIER": "altSupplier",
    "SECONDARY SUPPLIER": "altSupplier",
    "CONTACT": "contact",
    "JOB REF.": "jobRef",
    "CUST. REF.": "customerRef",
    "NOTES": "notes",
    "CURR. ?": "currency",
    "CAN/US": "currency",
    "HYPERLINKS": "link",
}


def clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"\s+", " ", str(v).replace("\xa0", " ")).strip()


def to_number(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 4)
    m = re.search(r"-?\d+(?:\.\d+)?", str(v).replace(",", ""))
    return round(float(m.group()), 4) if m else None


def main(src: str):
    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    parts = {}
    for ws in wb.worksheets:
        prefix = ws.title.strip().upper()
        if prefix not in CATEGORY_NAMES:
            continue
        rows = ws.iter_rows(values_only=True)
        header = [clean(h).upper() for h in next(rows)]
        cols = {}
        for i, h in enumerate(header):
            key = HEADER_MAP.get(h)
            if key and key not in cols:
                cols[key] = i
        for row in rows:
            get = lambda k: row[cols[k]] if k in cols and cols[k] < len(row) else None
            pn = clean(get("partNumber")).upper()
            desc = clean(get("description"))
            if not pn or not desc or not re.match(r"^PB[A-Z]\d{5}$", pn):
                continue
            raw_cost = get("cost")
            cost = to_number(raw_cost)
            notes = clean(get("notes"))
            if isinstance(raw_cost, str) and cost is not None and not re.match(r"^\s*\$?\d", raw_cost.strip()):
                notes = (notes + f" | Cost noted as '{clean(raw_cost)}'").strip(" |")
            mfr = clean(get("mfrPartNumber")) or clean(get("mfrPartNumber2"))
            parts[pn] = {
                "id": pn,
                "partNumber": pn,
                "category": prefix,
                "description": desc,
                "mfrPartNumber": mfr,
                "cost": cost if cost is not None else 0,
                "altCost": to_number(get("altCost")),
                "currency": "USD" if "US" in clean(get("currency")).upper() else "CAD",
                "supplier": clean(get("supplier")),
                "altSupplier": clean(get("altSupplier")),
                "contact": clean(get("contact")),
                "jobRef": clean(get("jobRef")),
                "link": clean(get("link")),
                "notes": notes,
                "obsolete": bool(re.search(r"OBSOLETE|DO NOT USE", desc + " " + notes, re.I)),
            }
    out = Path(__file__).resolve().parent.parent / "data" / "seed" / "parts.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    ordered = [parts[k] for k in sorted(parts)]
    out.write_text(json.dumps({"categories": CATEGORY_NAMES, "parts": ordered}, indent=0))
    print(f"Wrote {len(ordered)} parts to {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
