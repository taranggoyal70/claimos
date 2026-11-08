"""Find's hand-off (a candidates.jsonl line, see taxappeal-find docs/HANDOFF.md) -> the case packet.build reads."""
import re


def _i(v):
    return None if v is None else int(round(v))


def adapt(p):
    pr, v, s, e = p["property"], p["values"], p["signals"], p["estimate"]
    own = s.get("own_sale")  # the home's own arm's-length sale before Jan 1, when Find saw one
    return {
        "case_id": p["case_id"],
        "county": p["jurisdiction"]["county"],
        "roll_year": p["jurisdiction"]["tax_year"],
        "county_level": s.get("county_level"),
        "annual_savings": e.get("annual_savings"),
        "petition_deadline": p["filing_window"].get("closes"),
        "subject": {
            "parcel_id": pr["parcel_id"],
            "address": ", ".join(filter(None, [re.sub(r"\s+", " ", pr["address"]).strip(), pr.get("city")])),
            "sqft": _i(pr["sqft"]),
            "year_built": _i(pr.get("effective_year_built")),
            "just_value": _i(v["just_value"]),
            "last_sale": {"date": own["month"] + "-01", "price": _i(own["price"]), "arms_length": True} if own else None,
        },
        # Find's comps are already arm's-length sales before the valuation date; it gives the month only
        "sales": [{"parcel_id": c["parcel_id"], "address": c.get("address", ""), "sale_date": c["sale_month"] + "-01",
                   "sale_price": _i(c["price"]), "adjusted_price": _i(c.get("price_adjusted_to_valuation_date")),
                   "sqft": _i(c["sqft"]), "record": c.get("record"), "arms_length": True}
                  for c in p["evidence"]["sales"]],
        "peers": [{"parcel_id": n["parcel_id"], "sqft": _i(n["sqft"]), "just_value": _i(n["just_value"])}
                  for n in p["evidence"]["neighbors"]],
    }
