import json
from pathlib import Path

from taxevidence import cli, find_adapter, packet

LINE = json.loads((Path(__file__).parent / "find_line.json").read_text())  # a real Find candidates.jsonl line


def test_adapt_maps_find_fields_into_the_case_shape():
    c = find_adapter.adapt(LINE)
    assert (c["case_id"], c["county"], c["roll_year"]) == ("FL-13-2026-30166034000", "Bay", 2026)
    assert c["county_level"] == LINE["signals"]["county_level"] and c["annual_savings"] == 8207
    assert c["petition_deadline"] == "2026-09-09"
    assert c["subject"] == {"parcel_id": "30166034000", "address": "7903 NORTH LAGOON DR, PANAMA CITY BEACH",
                            "sqft": 4260, "year_built": 2023, "just_value": 1770859,
                            "last_sale": {"date": "2025-05-01", "price": 2080000, "arms_length": True}}
    s = c["sales"][0]
    assert s == {"parcel_id": "30166043005", "address": "8017 NORTH LAGOON DR", "sale_date": "2025-06-01",
                 "sale_price": 1275000, "adjusted_price": 1258349, "sqft": 4302, "record": "528527", "arms_length": True}
    assert c["peers"][0] == {"parcel_id": "30166044030", "sqft": 4256, "just_value": 1228140}
    assert len(c["sales"]) == len(LINE["evidence"]["sales"]) and len(c["peers"]) == len(LINE["evidence"]["neighbors"])


def test_adapted_case_builds_a_packet():
    p = packet.build(find_adapter.adapt(LINE))
    assert p["status"] in ("ready", "no_case") and p["sales_approach"]["comps"]
    assert p["requested_just_value"] % 1000 == 0


def test_adapt_cli_reads_jsonl_and_rejects_unknown_case(tmp_path, capsys):
    f = tmp_path / "candidates.jsonl"
    f.write_text(json.dumps(LINE) + "\n")
    cli.main(["adapt", str(f), "--case-id", "FL-13-2026-30166034000"])
    assert json.loads(capsys.readouterr().out)["county"] == "Bay"
    try:
        cli.main(["adapt", str(f), "--case-id", "nope"])
    except SystemExit as e:
        assert "nope" in str(e.code)
    else:
        raise AssertionError("missing case should exit")
