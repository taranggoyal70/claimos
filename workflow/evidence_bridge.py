"""stdin/stdout bridge to Fra's actual Evidence package. No provider actions."""
import base64
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "taxappeal-evidence"))
from taxevidence import packet, render

def main():
    request = json.load(sys.stdin)
    result = packet.build(request["case"], hearing=request.get("hearing"))
    html = render.to_html(result)
    pdf = None
    if request.get("pdf", True):
        with tempfile.TemporaryDirectory(prefix="claimos-evidence-") as folder:
            source = Path(folder) / "packet.html"
            source.write_text(html, encoding="utf-8")
            try:
                output = render.to_pdf(source)
                if output:
                    pdf = base64.b64encode(output.read_bytes()).decode("ascii")
            except Exception as error:
                # HTML/JSON remain genuine artifacts if Chrome is unavailable.
                print("PDF unavailable: " + type(error).__name__, file=sys.stderr)
    json.dump({"packet": result, "html": html, "pdfBase64": pdf}, sys.stdout, allow_nan=False)

if __name__ == "__main__":
    main()
