"""taxevidence build <cases> --out <dir> [--hearing YYYY-MM-DD] · taxevidence adapt <candidates.jsonl> --case-id <id> · taxevidence demo"""
import argparse
import json
import re
import sys
from importlib import resources
from pathlib import Path

from . import find_adapter, packet, render


def load_cases(text):
    """One JSON case, a JSON list, or JSONL."""
    try:
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        return [json.loads(line) for line in text.splitlines() if line.strip()]


def read_cases(path):
    """A case file, or every .json/.jsonl file in a folder."""
    p = Path(path)
    files = sorted(p.glob("*.json*")) if p.is_dir() else [p]
    return [c for f in files for c in load_cases(f.read_text())]


def write(p, out: Path, pdf=True):
    d = out / re.sub(r"[^A-Za-z0-9_.-]", "_", str(p["case_id"]))
    d.mkdir(parents=True, exist_ok=True)
    (d / "packet.json").write_text(json.dumps(p, indent=2, default=str))
    (d / "owner_request.txt").write_text(p["owner_request"])
    h = d / "packet.html"
    h.write_text(render.to_html(p))
    pdf_path = render.to_pdf(h) if pdf and p["status"] != "no_case" else None
    return d, pdf_path


def run(cases, out, hearing, pdf):
    for case in cases:
        p = packet.build(case, hearing=hearing)
        d, pdf_path = write(p, Path(out), pdf)
        req = f"${p['requested_just_value']:,}" if p["requested_just_value"] else "—"
        print(f"{p['status']:8} {p['address']} · county ${p['current_just_value']:,} → {req}"
              f" · exchange by {p['deadlines']['exchange_evidence_by'] or 'hearing − 15 days'} · {pdf_path or d}")


def main(argv=None):
    ap = argparse.ArgumentParser(prog="taxevidence")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build packets for cases (JSON, JSON list or JSONL)")
    b.add_argument("cases")
    b.add_argument("--out", default="data/out")
    b.add_argument("--hearing", help="hearing date, YYYY-MM-DD; sets the evidence-exchange deadline")
    b.add_argument("--no-pdf", action="store_true")
    f = sub.add_parser("adapt", help="one case from Find's candidates.jsonl -> the case JSON `build` reads (stdout)")
    f.add_argument("candidates")
    f.add_argument("--case-id", required=True)
    d = sub.add_parser("demo", help="build the packet for the bundled sample case (fake data)")
    d.add_argument("--out", default="data/demo")
    a = ap.parse_args(argv)
    if a.cmd == "build":
        run(read_cases(a.cases), a.out, a.hearing, not a.no_pdf)
    elif a.cmd == "adapt":
        line = next((p for p in read_cases(a.candidates) if p.get("case_id") == a.case_id), None)
        if line is None:
            sys.exit(f"case {a.case_id} is not in {a.candidates}")
        print(json.dumps(find_adapter.adapt(line), indent=1))
    else:
        sample = resources.files("taxevidence").joinpath("sample_case.json").read_text()
        run(load_cases(sample), a.out, "2026-10-20", True)


if __name__ == "__main__":
    main()
