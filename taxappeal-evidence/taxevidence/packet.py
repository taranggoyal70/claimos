"""Evidence step: one qualified case in, the packet the File step submits out.

Input is the normalized case described in the README ("Input"); find_adapter maps Find's hand-off into it.
"""
from datetime import date, timedelta
from statistics import median

from . import florida

MIN_COMPS, MAX_COMPS = 3, 5
OWN_SALE_LOOKBACK = timedelta(days=730)


def _date(v):
    return v if isinstance(v, date) else date.fromisoformat(v)


def pick_comps(subject, sales, valuation_date):
    """Arm's-length sales before the valuation date; closest in size (10% steps) first, then most recent."""
    usable = [s for s in sales
              if s.get("arms_length", True) and s.get("sqft") and _date(s["sale_date"]) < valuation_date]
    usable.sort(key=lambda s: (round(abs(s["sqft"] / subject["sqft"] - 1), 1), -_date(s["sale_date"]).toordinal()))
    return usable[:MAX_COMPS]


def sales_approach(subject, sales, valuation_date, level):
    rows = []
    for c in pick_comps(subject, sales, valuation_date):
        price = c.get("adjusted_price") or c["sale_price"]  # Find's time-adjusted price to Jan 1, when present
        rows.append({**c, "price_used": price, "per_sqft": round(price / c["sqft"], 2)})
    if len(rows) < MIN_COMPS:
        return None
    m = median(r["per_sqft"] for r in rows)
    market = m * subject["sqft"]
    return {"comps": rows, "median_per_sqft": round(m, 2), "indicated_market_value": round(market),
            "level": level, "indicated_just_value": round(market * level)}


def equity_approach(subject, peers):
    peers = [p for p in peers if p.get("sqft") and p.get("just_value")]
    if not peers:
        return None
    m = median(p["just_value"] / p["sqft"] for p in peers)
    return {"peers": len(peers), "median_per_sqft": round(m, 2),
            "subject_per_sqft": round(subject["just_value"] / subject["sqft"], 2),
            "indicated_just_value": round(m * subject["sqft"])}


def own_sale_note(subject, valuation_date, level):
    sale = subject.get("last_sale")
    if not sale or not sale.get("arms_length", True) or _date(sale["date"]) < valuation_date - OWN_SALE_LOOKBACK:
        return None
    implied = round(sale["price"] * level)
    if implied < subject["just_value"]:
        return f"Sold {sale['date']} for ${sale['price']:,}; at the county's level that is ${implied:,}, below its value. Supports the appeal."
    return f"WARNING: sold {sale['date']} for ${sale['price']:,}; at the county's level that is ${implied:,}, which supports the county's value."


def build(case, hearing=None):
    s = case["subject"]
    vdate = date(case["roll_year"], 1, 1)
    level = case.get("county_level") or 1.0  # Find's measured value-to-price level; 1.0 = no reduction (conservative)
    sales = sales_approach(s, case.get("sales", []), vdate, level)
    equity = equity_approach(s, case.get("peers", []))
    basis = sales or equity
    requested = basis["indicated_just_value"] // 1000 * 1000 if basis else None
    own = own_sale_note(s, vdate, level)

    if requested is None or not sales:
        status = "thin"  # boards weigh sales; equity alone is support, not a case
    elif requested >= s["just_value"] or (own or "").startswith("WARNING"):
        status = "no_case"
    else:
        status = "ready"

    exchange_by = florida.exchange_deadline(_date(hearing)) if hearing else None
    packet = {
        "case_id": case["case_id"],
        "county": case["county"],
        "roll_year": case["roll_year"],
        "parcel_id": s["parcel_id"],
        "address": s["address"],
        "status": status,
        "current_just_value": s["just_value"],
        "requested_just_value": requested,
        "reduction": s["just_value"] - requested if requested else None,
        "annual_savings_estimate": case.get("annual_savings"),  # Find's number; it knows caps and exemptions
        "subject": s,
        "sales_approach": sales,
        "equity_approach": equity,
        "deadlines": {
            "petition": case.get("petition_deadline"),
            "hearing": str(hearing) if hearing else None,
            "exchange_evidence_by": str(exchange_by) if exchange_by else None,
            "owner_items_by": str(exchange_by - timedelta(days=florida.OWNER_BUFFER_DAYS)) if exchange_by else None,
        },
        "rules": florida.RULES,
    }
    packet["checklist"] = florida.checklist(case, sales, equity, own)
    packet["owner_request"] = florida.owner_request(packet)
    return packet
