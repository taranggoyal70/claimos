#!/usr/bin/env python3
"""Mirror every case card on the company board into the site database's `cases` table.

Runs on a laptop or the Mac mini with the Naive CLI logged in (not inside an agent: the board has
hundreds of cards with full bodies and the agent's board_read cannot page, so a model overflows).
    python3 mirror_board.py            # mirror and print the stage counts
Also the other direction: every consented site sign-up (`signups`) gets a `Sign up ·` card on the board (status
blocked; a row whose (email, date) already stands in a website card's body is skipped, and `--key signup:<row id>`
makes the add itself idempotent), and when a new sign-up matched a case the Find card gets a comment, the
`authorization:` hand-off line, and `cases.owner_email` is set; the owner gets the owner script by email through a
`Message · <address> · <case_id>` card assigned to signup. `python3 mirror_dryrun.py` runs the same pass with every write stubbed.
Needs: naive (logged in, org Claim OS), python3. Uses sync.py next to this file.
"""
import json, re, subprocess, sys, tempfile, os
from pathlib import Path

BOARD_OWNER = "agt_84kdvn48drb35vhrpnzd71ex21"      # the CEO's company board
APP = "app_nkhc92xe21cyzfd5qakpkcj4g4"              # claimos-site
HERE = Path(__file__).resolve().parent
SIGNUP_FIELDS = ("email", "address", "phone", "call_ok", "consent", "verdict", "case_id", "claim_code")   # the card body, in order
# signup.system.md's owner script: every new website sign-up gets it through a `Message ·` card assigned to signup
# (HANDOFF-ESCALATE.md, "Telling the owner something"), which emails the body as written and marks the Sign up card `sent:`.
OWNER_SCRIPT = """Thank you for signing up with Claim OS for {addr}.

Could you reply to confirm that you are the owner of record, and whether you received this year's TRIM notice (the proposed-value letter the county mails in August)?

What happens next: we check the county's value against comparable sales for free. If the home looks over-assessed, we send you a short agreement and the county's authorization form (DR-486POA, https://floridarevenue.com/property/Documents/dr486poa.pdf) to sign, and we only get paid if the value goes down, on the terms in the agreement. Photos of damage or repair quotes help but are optional; you can send them later.
{call}
Claim OS is a private company and is not affiliated with any government agency.
the Claim OS team"""


def naive(*args):
    out = subprocess.run(["naive", *args], capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"naive {' '.join(args)} failed: {out.stderr.strip()[:300]}")
    return json.loads(out.stdout, strict=False)


def case_block(body):
    m = re.search(r"```json\s*(\{.*?\})\s*```", body or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1), strict=False)
    except json.JSONDecodeError:
        return None


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def cards(status):
    """Every card in a column: `board show` pages (has_more / next_cursor), so follow the cursor."""
    out, after = [], None
    while True:
        page = naive("board", "show", BOARD_OWNER, "--status", status, "--limit", "100", *(["--after", after] if after else []))
        out += page["data"]
        if not page.get("has_more"):
            return out
        after = page["next_cursor"]


def mirror_signups(find_card, known, website):
    """Site sign-ups -> board. The board is the cursor, no column needed: a row whose (email, date) main() already read
    in a website card's body is done; `--key` makes the add idempotent on the platform too (it returns the card that key
    already made), and such a returned card, being in `known`, gets no comment."""
    rows = naive("db", "query", "--app", APP, "select * from signups where consent order by created_at")["rows"]
    new = 0
    for s in rows:
        if (s["email"], s["created_at"]) in website:
            continue
        addr = ", ".join(x for x in (s["address"], s.get("city")) if x) + (f" {s['zip']}" if s.get("zip") else "")
        body = "\n".join(f"{k}: {'' if s.get(k) is None else s[k]}" for k in SIGNUP_FIELDS) + f"\nsource: website\ndate: {s['created_at']}"
        card = naive("board", "add", BOARD_OWNER, "--title", f"Sign up · {addr}", "--body", body, "--status", "blocked", "--key", f"signup:{s['id']}")
        if card["id"] in known:
            continue
        new += 1
        call = f"\nA colleague will call you at {s['phone']}.\n" if s.get("call_ok") and s.get("phone") else ""
        msg = naive("board", "add", BOARD_OWNER, "--title", f"Message · {addr} · {s.get('case_id') or 'no case'}", "--status", "todo",
                    "--assignee", "signup", "--key", f"message:signup:{s['id']}", "--body", f"to: {s['email']}\n" + OWNER_SCRIPT.format(addr=addr, call=call))
        if s.get("case_id"):
            # never steal a case another owner (or the demo seed) already holds; the owner signed, so the tracker shows the sign-up step
            naive("db", "query", "--app", APP,
                  f"update cases set owner_email = {q(s['email'])}, stage = 'signup', updated_at = now() where case_id = {q(s['case_id'])} and owner_email is null")
            if s["case_id"] in find_card:
                naive("board", "comment", BOARD_OWNER, find_card[s["case_id"]], "--body",
                      f"owner signed up via the website: {s['email']} · {s['created_at'][:10]}")
                # the hand-off line the coordinator, Escalate and Collect parse; the site offers no fee or appeal choices yet
                naive("board", "comment", BOARD_OWNER, find_card[s["case_id"]], "--body",
                      f"authorization: case_id {s['case_id']} · scope vab_petition · fee none · partial_above none · reopen_risk no")
        print(f"sign up card {card['id']} · message card {msg['id']} · {addr} · case {s.get('case_id') or 'none'}", file=sys.stderr)
    print(f"signups: {len(rows)} consented, {new} new card(s)", file=sys.stderr)


def main():
    lines, known, find_card, website = [], set(), {}, set()
    for status in ("todo", "doing", "blocked", "done"):
        for c in cards(status):
            known.add(c["id"])
            body = c.get("body") or ""
            if "source: website" in body:     # a website Sign up card; its email/date lines name the signups row
                website.add(tuple(re.findall(r"^(?:email|date): (.*)$", body, re.M)))
            j = case_block(body)
            if not j or not j.get("case_id"):
                continue
            if c.get("title", "").startswith("FL ") or j["case_id"] not in find_card:   # Find's own card, else any card of the case
                find_card[j["case_id"]] = c["id"]
            p, v, e, jur = j.get("property", {}), j.get("values", {}), j.get("estimate", {}), j.get("jurisdiction", {})
            row = [j["case_id"], c.get("title", ""), p.get("address", ""), jur.get("county", ""),
                   str(v.get("just_value", "")), str(e.get("defensible_value", "")), str(e.get("annual_savings", "")),
                   c.get("status", ""), c.get("assignee") or "", c.get("updated_at", ""), (c.get("note") or "")[:20]]
            lines.append("\t".join(x.replace("\t", " ").replace("\n", " ") for x in row))
    print(f"board: {len(known)} cards read, {len(lines)} case cards", file=sys.stderr)
    with tempfile.NamedTemporaryFile("w", suffix=".tsv", delete=False, encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n"); tsv = f.name
    sql = subprocess.run([sys.executable, "-I", str(HERE / "sync.py"), "cases", tsv], capture_output=True, text=True)
    os.unlink(tsv)
    if sql.returncode != 0:
        sys.exit(f"sync.py cases failed: {sql.stderr.strip()[:300]}")
    res = naive("db", "query", "--app", APP, sql.stdout)
    print("upserted:", res.get("rows"), file=sys.stderr)
    mirror_signups(find_card, known, website)
    counts = naive("db", "query", "--app", APP, "select stage, count(*) from cases group by 1 order by 2 desc")
    print(json.dumps(counts.get("rows")))


if __name__ == "__main__":
    main()
