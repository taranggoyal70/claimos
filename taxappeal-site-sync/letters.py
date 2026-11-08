#!/usr/bin/env python3
"""First contact with owners: one letter per QUALIFIED case on the company board, each carrying a claim code the
owner types on /check (or quotes by email) to reach their case without typing an address.

    python3 letters.py        # letters/<today>/<code>.html (+ .pdf through the gstack browse binary when installed),
                              # letters/<today>/letters.csv for the mail merge, claim_codes upserted in the site database
Needs: naive (logged in, org Claim OS), TRACK_SECRET in ../taxappeal-site/.env, python3. A PERSON prints and mails the
letters; nothing here sends anything. Mailing addresses come from Find's full candidates.jsonl (org files); the board
card only carries the owner's name.
"""
import csv, datetime, hashlib, html, json, re, subprocess, sys
from pathlib import Path
from string import Template
from mirror_board import BOARD_OWNER, APP, naive, case_block

HERE = Path(__file__).resolve().parent
SITE = "claimos-site-mds8vwd4myby.vercel.app"
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # 32 symbols, no 0/O/1/I: 5 bits a char, 40 bits a code
MAIL_TO = {"individual", "trust"}                # Find's owner types we write to; company, estate, bank, government, association are skipped
BROWSE = Path.home() / ".claude/skills/gstack/browse/dist/browse"   # headless Chromium; Chrome's own --print-to-pdf hangs on this Mac
CSV_COLS = ["name", "line1", "line2", "city_state_zip", "property", "county_value", "our_value", "savings_yr", "code"]


def secret():
    for line in (HERE.parent / "taxappeal-site" / ".env").read_text().splitlines():
        k, _, v = line.partition("=")
        if k.strip() == "TRACK_SECRET" and v.strip():
            return v.strip().strip("'\"")
    sys.exit("TRACK_SECRET missing from taxappeal-site/.env")


def code_for(case_id, key):
    return "".join(ALPHABET[b % 32] for b in hashlib.sha256((case_id + key).encode()).digest()[:8])


def qualified_cards():
    """case_id -> the card's case JSON, for every card whose note starts with Qualify's QUALIFIED verdict."""
    cards, no_json = {}, 0
    for status in ("todo", "doing", "blocked", "done"):
        for c in naive("board", "show", BOARD_OWNER, "--status", status)["data"]:
            if not (c.get("note") or "").strip().upper().startswith("QUALIFIED"):
                continue
            j = case_block(c.get("body"))
            if not j or not j.get("case_id"):
                no_json += 1
                continue
            cards.setdefault(j["case_id"], j)   # Qualify's replays leave several cards per case: one letter per case
    return cards, no_json


def find_records(case_ids):
    """case_id -> Find's full record (owner name, type, mailing address) from the newest published candidates.jsonl that has it."""
    cache = HERE / "letters" / ".cache"
    cache.mkdir(parents=True, exist_ok=True)
    files = sorted(naive("file", "list", "--search", "candidates.jsonl", "--limit", "50")["data"], key=lambda f: f["created_at"], reverse=True)
    found = {}
    for f in files:
        if len(found) == len(case_ids):
            break
        path = cache / f"{f['id']}.jsonl"
        if not path.exists():
            part = path.with_suffix(".part")
            with open(part, "wb") as out:
                subprocess.run(["naive", "file", "download", f["id"]], stdout=out, check=True)
            part.rename(path)
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                if line.strip():
                    j = json.loads(line, strict=False)
                    if j.get("case_id") in case_ids and j["case_id"] not in found:
                        found[j["case_id"]] = j
    return found


def money(n):
    return f"${round(float(n)):,}"


def title(s):
    return re.sub(r"\S+", lambda m: m.group().capitalize(), " ".join((s or "").split()))


def pdf(html_path, pdf_path):
    for args in (["goto", html_path.resolve().as_uri()], ["pdf", str(pdf_path.resolve())]):
        subprocess.run([str(BROWSE), *args], check=True, capture_output=True, timeout=60)


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    key = secret()
    cards, no_json = qualified_cards()
    records = find_records(set(cards))
    today = datetime.date.today()
    out = HERE / "letters" / today.isoformat()
    out.mkdir(parents=True, exist_ok=True)
    tpl = Template((HERE / "letter.html").read_text(encoding="utf-8"))
    rows, codes, skipped_type, no_record, pdfs = [], {}, 0, 0, 0
    for cid, j in sorted(cards.items()):
        rec = records.get(cid)
        if not rec:
            no_record += 1
            continue
        owner, m = rec.get("owner") or {}, (rec.get("owner") or {}).get("mailing_address") or {}
        if owner.get("type") not in MAIL_TO or not m.get("line1"):
            skipped_type += 1
            continue
        code = codes[cid] = code_for(cid, key)
        p, v, e = j.get("property", {}), j.get("values", {}), j.get("estimate", {})
        city_state_zip = f"{m.get('city') or ''}, {m.get('state') or ''} {m.get('zip') or ''}".strip(", ")
        unit = f" #{p['unit']}" if p.get("unit") else ""   # condo unit, written as /check shows it ("8515 Surf Dr #2")
        prop = f"{title(p.get('address'))}{unit}, {title(p.get('city') or rec['property'].get('city'))}, FL {rec['property'].get('zip') or ''}".rstrip()
        vals = dict(date=today.strftime("%B %-d, %Y"), property=prop, county=j.get("jurisdiction", {}).get("county", ""),
                    year=str(rec.get("jurisdiction", {}).get("tax_year") or cid.split("-")[2]), county_value=money(v["just_value"]),
                    our_value=money(e["defensible_value"]), savings=money(e["annual_savings"]), code=code, site=SITE, case_id=cid)
        vals = {k: html.escape(str(x)) for k, x in vals.items()}
        vals["mail"] = "<br>".join(html.escape(x) for x in (owner.get("name"), m.get("line1"), m.get("line2"), city_state_zip) if x)
        html_path = out / f"{code}.html"
        html_path.write_text(tpl.substitute(vals), encoding="utf-8")
        if BROWSE.exists():
            pdf(html_path, out / f"{code}.pdf")
            pdfs += 1
        rows.append([owner.get("name"), m.get("line1"), m.get("line2") or "", city_state_zip, prop, money(v["just_value"]),
                     money(e["defensible_value"]), money(e["annual_savings"]), code])
    assert len(set(codes.values())) == len(codes), "two cases share a claim code"
    with open(out / "letters.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(CSV_COLS)
        w.writerows(rows)
    new = 0
    if codes:
        vals = ",\n".join(f"({q(code)}, {q(cid)})" for cid, code in codes.items())
        new = len(naive("db", "query", "--app", APP, f"insert into claim_codes (code, case_id) values\n{vals}\non conflict (code) do nothing returning code")["rows"])
    print(f"letters: {len(rows)} written to {out} ({pdfs} pdf), claim_codes: {new} new; skipped: {no_json} cards without a case JSON, "
          f"{skipped_type} owner not individual/trust or no mailing address, {no_record} without a Find record")


if __name__ == "__main__":
    main()
