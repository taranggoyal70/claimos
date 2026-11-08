import json

from taxevidence import cli
from test_packet import SAMPLE


def test_reads_json_jsonl_and_folders(tmp_path):
    (tmp_path / "a.json").write_text(json.dumps(SAMPLE))
    (tmp_path / "b.jsonl").write_text(json.dumps(SAMPLE) + "\n" + json.dumps(SAMPLE) + "\n")
    assert len(cli.read_cases(tmp_path)) == 3
    assert len(cli.read_cases(tmp_path / "a.json")) == 1


def test_build_writes_packet_files(tmp_path):
    cli.main(["build", str(cli.Path(__file__).parent.parent / "taxevidence" / "sample_case.json"),
              "--out", str(tmp_path), "--no-pdf", "--hearing", "2026-10-20"])
    d = tmp_path / "FL-Lee-2026-SAMPLE-0001"
    assert json.loads((d / "packet.json").read_text())["status"] == "ready"
    assert (d / "packet.html").exists() and (d / "owner_request.txt").exists()
