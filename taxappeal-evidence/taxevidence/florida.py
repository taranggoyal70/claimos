"""Florida desk: what a Value Adjustment Board petition needs as evidence, and by when."""
from datetime import date, timedelta

# s. 194.011(4)(a), F.S., as amended effective 2025-09-01 (DOR bulletin PTO BUL 25-02): petitioner and
# property appraiser each send their evidence at least 15 calendar days before the hearing, counted back
# from the hearing day, which is not included. Late evidence can be excluded.
EXCHANGE_DAYS = 15
OWNER_BUFFER_DAYS = 5  # owner items are due this many days before the exchange, to assemble and send

APPRAISER_SITE = {"Lee": "https://www.leepa.org"}

RULES = [
    "Evidence exchange: send our evidence to the property appraiser at least 15 calendar days before the "
    "hearing (s. 194.011(4)(a), F.S., effective 2025-09-01; DOR PTO BUL 25-02). Late evidence can be excluded.",
    "Boards weigh nearby comparable sales most; online estimates (Zillow/Redfin) are not evidence.",
    "We are a paid, unlicensed agent, so the owner must give us a power of attorney (DR-486POA) filed with "
    "the petition; the DR-486A written authorization is only for unpaid helpers (Rules 12D-9.015, 12D-9.018, F.A.C.).",
]

DISCLAIMER = "We are a private company and are not affiliated with any government agency."


def exchange_deadline(hearing: date) -> date:
    return hearing - timedelta(days=EXCHANGE_DAYS)


def checklist(case, sales, equity, own_sale_note):
    """Every item the packet needs: where it comes from and whether we have it."""
    county = case["county"]
    site = APPRAISER_SITE.get(county, f"the {county} County Property Appraiser's site")
    return [
        _item("County record for the home", "public", "have",
              "Just value, assessed value, exemptions, size and year built from the county roll."),
        _item("Comparable sales", "public", "have" if sales else "missing",
              "At least 3 arm's-length sales before Jan 1, similar size and age, same neighborhood."),
        _item("Similar homes' assessments", "public", "have" if equity else "missing",
              "Value per sq ft of similar homes in the same appraisal neighborhood."),
        _item("The home's own sale history", "public", "have" if own_sale_note else "check",
              own_sale_note or "No recent arm's-length sale of the home on the roll."),
        _item("Building permits and county photos", "public", "check",
              f"Look up on {site}: confirms no unrecorded renovation and shows condition."),
        _item("Photos of condition or damage", "owner", "ask_owner",
              "Roof, interior, flood or storm damage: anything that lowers value and is not in the county record."),
        _item("Repair estimates or insurance claim", "owner", "ask_owner",
              "Dated quotes or adjuster reports for damage that existed on Jan 1."),
        _item("Recent appraisal or closing statement", "owner", "ask_owner",
              "A professional appraisal near Jan 1, or the closing statement if the owner bought recently."),
        _item("Corrections to the county record", "owner", "ask_owner",
              "Living area, bedrooms, pool, garage. The roll's size is the county's effective area and can "
              "include garages and porches, so confirm it with the owner before quoting it."),
        _item("Owner's power of attorney (DR-486POA)", "sign_up", "blocks_filing",
              "Required with the petition because we are a paid, unlicensed agent."),
    ]


def owner_request(packet):
    """Plain-text message asking the owner for what only they can provide. Sending it is Comms' job."""
    asks = [i for i in packet["checklist"] if i["status"] == "ask_owner"]
    due = packet["deadlines"]["owner_items_by"]
    lines = [
        f"Subject: Documents for your {packet['roll_year']} property tax appeal: {packet['address']}",
        "",
        "Hello,",
        "",
        f"We're preparing the evidence for your appeal of the {packet['county']} County value of "
        f"{packet['address']}. The county values it at ${packet['current_just_value']:,}"
        + (f"; nearby sales point to about ${packet['requested_just_value']:,}." if packet["requested_just_value"] else "."),
        "",
        f"If you have any of the following, please reply with them {'by ' + due if due else 'as soon as you can'}:",
        *[f"- {i['item']}: {i['why']}" for i in asks],
        "",
        "Anything you can't find is fine to skip; the comparable sales carry most of the weight.",
        "",
        DISCLAIMER,
    ]
    return "\n".join(lines)


def _item(item, source, status, why):
    return {"item": item, "source": source, "status": status, "why": why}
