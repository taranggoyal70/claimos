"""Printable hearing packet: HTML always, PDF when Chrome or Chromium is on the machine."""
import html
import shutil
import subprocess
import tempfile
from pathlib import Path

CHROMES = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
           "google-chrome", "chromium", "chromium-browser"]


def _m(v):
    return "—" if v is None else f"${v:,.0f}"


def _table(head, rows):
    th = "".join(f"<th>{html.escape(h)}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in r) + "</tr>" for r in rows)
    return f"<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>"


def to_html(p):
    s, sa, eq = p["subject"], p["sales_approach"], p["equity_approach"]
    parts = [
        f"<h1>Evidence: {html.escape(p['address'])}</h1>",
        f"<p class=meta>{html.escape(p['county'])} County, Florida · {p['roll_year']} roll · parcel "
        f"{html.escape(str(p['parcel_id']))}</p>",
        _table(["", "Value"], [
            ["County just value", _m(p["current_just_value"])],
            ["Petitioner's opinion of just value", _m(p["requested_just_value"])],
            ["Difference", _m(p["reduction"])],
        ]),
        "<h2>Subject property</h2>",
        _table(["Size (sq ft)*", "Year built", "Just value", "Value per sq ft"],
               [[f"{s['sqft']:,}", s.get("year_built", "—"), _m(s["just_value"]), f"${s['just_value'] / s['sqft']:,.2f}"]]),
    ]
    if sa:
        parts += [
            "<h2>Comparable sales</h2>",
            "<p>Arm's-length sales before January 1, closest in size to the subject.</p>",
            _table(["Address", "Parcel", "Sale date", "Sale price", "Price adj. to Jan 1", "Size (sq ft)*", "Year built", "Per sq ft"],
                   [[c.get("address", ""), c.get("parcel_id", ""), c["sale_date"], _m(c["sale_price"]),
                     _m(c["price_used"]), f"{c['sqft']:,}", c.get("year_built", ""), f"${c['per_sqft']:,.2f}"]
                    for c in sa["comps"]]),
            f"<p>Median ${sa['median_per_sqft']:,.2f} per sq ft × {s['sqft']:,} sq ft = market value "
            f"{_m(sa['indicated_market_value'])}. At the county's own assessment level of {sa['level']:.0%} "
            f"(median just value to sale price), that is a just value of {_m(sa['indicated_just_value'])}.</p>",
        ]
    if eq:
        parts += [
            "<h2>Assessments of similar homes</h2>",
            f"<p>{eq['peers']} similar homes in the same appraisal neighborhood are assessed at a median of "
            f"${eq['median_per_sqft']:,.2f} per sq ft; the subject is assessed at ${eq['subject_per_sqft']:,.2f}. "
            f"At the median, the subject's just value would be {_m(eq['indicated_just_value'])}.</p>",
        ]
    own = next((i["why"] for i in p["checklist"] if i["item"] == "The home's own sale history"), "")
    if own.endswith("Supports the appeal."):
        parts += ["<h2>The subject's own sale</h2>", f"<p>{html.escape(own)}</p>"]
    parts.append("<p class=note>* Sizes are the county's recorded areas, used the same way for the subject and every comparison.</p>")
    css = ("body{font:11pt/1.45 Georgia,serif;max-width:7.5in;margin:.5in auto;color:#111}"
           "h1{font-size:16pt;margin:0}h2{font-size:12.5pt;margin:18pt 0 6pt}.meta{color:#555;margin:2pt 0 12pt}"
           "table{border-collapse:collapse;width:100%;font-size:9.5pt}th,td{border:1px solid #bbb;padding:3pt 5pt;text-align:left}"
           "td:not(:first-child){white-space:nowrap}th{background:#f1f1f1}.note{font-size:9pt;color:#555}")
    return (f"<!doctype html><html><head><meta charset=utf-8><title>Evidence {html.escape(str(p['parcel_id']))}</title>"
            f"<style>{css}</style></head><body>{''.join(parts)}</body></html>")


def to_pdf(html_path: Path):
    """Returns the PDF path, or None when no Chrome is available (the HTML is still usable)."""
    chrome = next((c for c in CHROMES if Path(c).exists() or shutil.which(c)), None)
    if not chrome:
        return None
    pdf = html_path.with_suffix(".pdf")
    # Never reuse or lock the operator's interactive Chrome profile.
    with tempfile.TemporaryDirectory(prefix="claimos-pdf-profile-") as profile:
        subprocess.run([chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                        "--no-first-run", f"--user-data-dir={profile}",
                        f"--print-to-pdf={pdf}", html_path.resolve().as_uri()],
                       check=True, capture_output=True, timeout=60)
    return pdf
