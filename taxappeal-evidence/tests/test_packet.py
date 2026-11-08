import copy
import json
from datetime import date
from importlib import resources

from taxevidence import florida, packet

SAMPLE = json.loads(resources.files("taxevidence").joinpath("sample_case.json").read_text())


def case(**subject):
    c = copy.deepcopy(SAMPLE)
    c["subject"].update(subject)
    return c


def test_exchange_deadline_counts_back_15_days_excluding_hearing():
    assert florida.exchange_deadline(date(2026, 10, 20)) == date(2026, 10, 5)


def test_sample_is_ready_and_uses_only_valid_comps():
    p = packet.build(SAMPLE, hearing="2026-10-20")
    assert p["status"] == "ready"
    ids = {c["parcel_id"] for c in p["sales_approach"]["comps"]}
    assert ids == {"S-1", "S-2", "S-3", "S-4", "S-5"}  # after-Jan-1 and non-arm's-length sales dropped
    # median $229.78/sqft x 1,850 = $425,093 market x 0.85 level = $361,329 -> rounded down to $361,000
    assert p["requested_just_value"] == 361000
    assert p["reduction"] == 49000
    assert p["deadlines"] == {"petition": "2026-09-15", "hearing": "2026-10-20",
                              "exchange_evidence_by": "2026-10-05", "owner_items_by": "2026-09-30"}


def test_no_case_when_county_value_already_below_sales():
    assert packet.build(case(just_value=300000))["status"] == "no_case"


def test_own_sale_supporting_county_value_kills_the_case():
    p = packet.build(case(last_sale={"date": "2025-10-01", "price": 500000, "arms_length": True}))
    assert p["status"] == "no_case"


def test_equity_only_is_thin():
    c = copy.deepcopy(SAMPLE)
    c["sales"] = []
    p = packet.build(c)
    assert p["status"] == "thin"
    assert p["requested_just_value"] == 359000  # median peer $194.34/sqft x 1,850


def test_owner_request_lists_owner_items_and_disclaimer():
    text = packet.build(SAMPLE, hearing="2026-10-20")["owner_request"]
    assert "by 2026-09-30" in text
    assert "Photos of condition or damage" in text
    assert florida.DISCLAIMER in text
