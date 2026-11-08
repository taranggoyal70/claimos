#!/usr/bin/env python3
"""mirror_board.main() with every write stubbed: reads the board and the database for real, prints each board add /
comment / SQL write it would have made, changes nothing.
    python3 mirror_dryrun.py        # a healthy second pass ends with `signups: N consented, 0 new card(s)`
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mirror_board as m

real = m.naive


def dry(*args):
    write = args[:2] in (("board", "add"), ("board", "comment")) or (
        args[:2] == ("db", "query") and not args[-1].lstrip().lower().startswith("select"))
    if not write:
        return real(*args)
    print("DRY would run: naive " + " ".join(a.replace("\n", " ")[:80] for a in args), file=sys.stderr)
    return {"id": "crd_dry", "rows": []}


m.naive = dry
m.main()
