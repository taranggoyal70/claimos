#!/usr/bin/env python3
"""Find's CSV and board cards -> SQL for the claimos-site database. Needs no secret: it only prints
SQL, which the site-sync agent runs through the Naive `apps` tool (db_query).

  python3 sync.py plan  candidates.csv summary.json             run id, rows, digest + the SQL that says whether the run is already in
  python3 sync.py sql   candidates.csv summary.json DIR [--skip N]   DIR/001.sql ... one upsert per 200 rows (skip the first N rows: resume)
  python3 sync.py cases cards.tsv                               one upsert into cases from the lines the agent wrote (see the prompt)
"""
import csv
import hashlib
import json
import os
import sys

COLS = ["case_id", "county", "tax_year", "parcel_id", "address", "unit", "city", "zip", "use", "homestead",
        "just_value", "assessed_value", "defensible_value", "annual_savings", "neighbor_ratio", "sales_ratio",
        "tier", "filing_closes", "filing_status"]
CAST = {"tax_year": "int", "homestead": "boolean", "just_value": "numeric", "assessed_value": "numeric",
        "defensible_value": "numeric", "annual_savings": "numeric", "neighbor_ratio": "numeric",
        "sales_ratio": "numeric", "filing_closes": "date"}
CHUNK = 200          # ~40 KB of SQL: the model passes each chunk as one tool argument
TAG = "$tsv$"        # dollar-quote tag; asserted absent from the data
ADDR_KEY = "upper(regexp_replace(trim(address), '\\s+', ' ', 'g')) || '|' || coalesce(zip, '')"  # the brief's rule
CARD_COLS = ["case_id", "title", "address", "county", "just_value", "defensible_value", "annual_savings", "status", "assignee", "updated_at", "note"]
RANK = {"find": 0, "qualify": 1, "signup": 2, "evidence": 3, "file": 4, "waiting": 5, "appeal": 6, "won": 7, "stopped": -1}


def stage(title, status, assignee, note=""):
    """The loop step a card stands for: the title prefix says which desk wrote it, the status how far it got,
    and on a closed Find card the note's first word is the desk's verdict (QUALIFIED / REJECTED / EVIDENCE ready)."""
    t, a, n = title.strip().lower(), (assignee or "").strip().lower(), (note or "").strip().upper()
    if t.startswith("waiting on"):                         # Escalate writes the outcome into the card's note
        if n.startswith("WON"):
            return "won"
        if n.startswith("APPEAL"):
            return "appeal"
        if n.startswith("STOPPED"):
            return "stopped"
        return "waiting"
    if t.startswith("sign up"):
        return "signup"
    if t.startswith("collect"):                            # Escalate opens a Collect card only after a win
        return "won"
    if t.startswith("file"):
        return "waiting" if status == "done" else "file"   # File closed its card = the petition went in
    if status == "done":
        if n.startswith("REJECTED"):
            return "stopped"                               # Qualify said no
        if n.startswith("QUALIFIED"):
            return "qualify"                               # Qualify said yes; waiting for the owner
        return "file"                                      # Evidence handed it to File
    if a == "evidence":
        return "evidence"
    if a == "file":
        return "file"
    if status == "blocked":
        return "stopped"                                   # parked by the board, nobody holds it
    return "find"


def substatus(title, status, note=""):
    """What the owner sees under the step: on a Collect card the note says INVOICE · … or PAID · …; else the card status."""
    n = (note or "").strip().upper()
    if title.strip().lower().startswith("collect"):
        if n.startswith("PAID"):
            return "paid"
        if n.startswith("INVOICE"):
            return "invoice"
    return status


def q(s):
    return "'" + s.replace("'", "''") + "'"


def clean(v):
    return (v or "").replace("\t", " ").replace("\r", " ").replace("\n", " ")


def read(csv_path, summary_path):
    with open(summary_path, encoding="utf-8") as f:
        run_id = json.load(f, strict=False)["run_id"]
    rows = {}
    with open(csv_path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("case_id") and r["case_id"] not in rows:   # first occurrence wins: a stable order for --skip
                rows[r["case_id"]] = r
    return run_id, list(rows.values())


def plan(csv_path, summary_path):
    run_id, rows = read(csv_path, summary_path)
    pairs = sorted({(r["county"], int(r["tax_year"])) for r in rows})
    where = "(county, tax_year) in (" + ", ".join(f"({q(c)}, {y})" for c, y in pairs) + ")"
    print(json.dumps({
        "run_id": run_id,
        "rows": len(rows),
        "counties": [f"{c} {y}" for c, y in pairs],
        "digest": hashlib.md5(",".join(sorted(r["case_id"] for r in rows)).encode()).hexdigest(),
        "check_sql": f"select (select count(*) from candidates where run_id = {q(run_id)}) as run_rows, "
                     f"count(*) as county_rows, md5(string_agg(case_id, ',' order by case_id collate \"C\")) as digest "
                     f"from candidates where {where}",
        "skip_when": "run_rows = rows (already imported) or digest = digest (same case ids already in)",
    }, indent=1))


def sql(csv_path, summary_path, out_dir, skip=0):
    run_id, rows = read(csv_path, summary_path)
    os.makedirs(out_dir, exist_ok=True)
    raw = ", ".join(f"split_part(l, E'\\t', {i + 1}) as {c}" for i, c in enumerate(COLS))
    sel = ", ".join("case_id" if c == "case_id" else f"nullif({c}, '')::{CAST[c]}" if c in CAST else f"nullif({c}, '')" for c in COLS)
    upd = ", ".join(f"{c} = excluded.{c}" for c in COLS[1:] + ["run_id", "imported_at", "addr_key"])
    for n, i in enumerate(range(skip, len(rows), CHUNK), 1):
        chunk = rows[i:i + CHUNK]
        tsv = "\n".join("\t".join(clean(r.get(c)) for c in COLS) for r in chunk)
        assert TAG not in tsv, "data contains the dollar-quote tag"
        stmt = (f"with raw as (select {raw} from regexp_split_to_table({TAG}\n{tsv}\n{TAG}, E'\\n') as l where l <> ''),\n"
                f"ins as (insert into candidates ({', '.join(COLS)}, run_id, imported_at, addr_key)\n"
                f"  select {sel}, {q(run_id)}, now(), {ADDR_KEY} from raw\n"
                f"  on conflict (case_id) do update set {upd} returning 1)\n"
                f"select count(*) as upserted from ins")
        path = os.path.join(out_dir, f"{n:03d}.sql")
        with open(path, "w", encoding="utf-8") as f:
            f.write(stmt)
        print(f"{path}\t{len(chunk)} rows")


def cases(tsv_path):
    rows = {}
    with open(tsv_path, encoding="utf-8") as f:
        for line in f:
            parts = line.rstrip("\r\n").split("\t")
            if parts == [""] or parts[0] == "case_id":   # blank or a header the model added anyway
                continue
            assert len(parts) == len(CARD_COLS), f"expected {len(CARD_COLS)} tab-separated fields, got {len(parts)}: {line!r}"
            st = stage(parts[1], parts[7].strip(), parts[8], parts[10])
            parts[7] = substatus(parts[1], parts[7].strip(), parts[10])   # the status column carries invoice/paid
            prev = rows.get(parts[0])
            # several cards share a case (Find's, the File hand-off, Collect): keep the furthest step; on a tie the Collect card wins
            if prev is None or RANK[st] > RANK[prev[1]] or (RANK[st] == RANK[prev[1]] and parts[1].strip().lower().startswith("collect")):
                rows[parts[0]] = (parts, st)
    assert rows, "no card lines"
    vals = ",\n".join("(" + ", ".join(q(p.strip()) for p in r) + ", " + q(st) + ")" for r, st in rows.values())
    print(f"with raw ({', '.join(CARD_COLS)}, stage) as (values\n{vals}),\n"
          f"ins as (insert into cases (case_id, address, county, county_value, requested_value, annual_savings, stage, status, updated_at)\n"
          f"  select case_id, nullif(address, ''), nullif(county, ''), nullif(just_value, '')::numeric, nullif(defensible_value, '')::numeric,\n"
          f"    nullif(annual_savings, '')::numeric, stage, status, updated_at::timestamptz from raw\n"
          f"  on conflict (case_id) do update set address = excluded.address, county = excluded.county, county_value = excluded.county_value,\n"
          f"    requested_value = excluded.requested_value, annual_savings = excluded.annual_savings, stage = excluded.stage,\n"
          f"    status = excluded.status, updated_at = excluded.updated_at returning 1)\n"
          f"select count(*) as upserted from ins")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["plan"] and len(a) == 3:
        plan(a[1], a[2])
    elif a[:1] == ["sql"] and len(a) in (4, 6):
        sql(a[1], a[2], a[3], int(a[5]) if a[4:5] == ["--skip"] else 0)
    elif a[:1] == ["cases"] and len(a) == 2:
        cases(a[1])
    else:
        sys.exit(__doc__)
