import copy
from test_packet import SAMPLE
from taxevidence import packet

def test_reviewed_document_is_bound_to_case_parcel_and_year():
    case = copy.deepcopy(SAMPLE)
    case["authorization"] = {"reviewed": True, "case_id": case["case_id"], "parcel_id": case["subject"]["parcel_id"],
                             "roll_year": case["roll_year"], "signer": "Test signer", "document_sha256": "a" * 64}
    output = packet.build(case)
    assert next(item for item in output["checklist"] if item["source"] == "sign_up")["status"] == "have"
    assert output["authorization"]["document_sha256"] == "a" * 64
    for field, value in [("case_id", "another"), ("parcel_id", "another"), ("roll_year", 2020), ("document_sha256", "bad"), ("reviewed", False)]:
        wrong = copy.deepcopy(case)
        wrong["authorization"][field] = value
        result = packet.build(wrong)
        assert next(item for item in result["checklist"] if item["source"] == "sign_up")["status"] == "blocks_filing"
