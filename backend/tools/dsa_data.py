"""Maintenance tooling for the DSA problem catalog (the single source of truth for problem tests).

    python tools/dsa_data.py check          # report problems with missing or unparsable tests
    python tools/dsa_data.py canonicalize   # rewrite prose tests into {"input": <one JSON arg per line>, "expected": <JSON>}
    python tools/dsa_data.py sync-frontend  # copy the canonical tests into frontend/src/lib/dsaProblemBank.ts

A test is canonical when `input` holds one JSON value per line (one per function argument, in order) and
`expected` holds the JSON result. Hidden tests carry "hidden": true and are never sent to the browser.
"""

from __future__ import annotations

import ast
import json
import pathlib
import pprint
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
CATALOG = ROOT / "backend" / "app" / "orchestrator" / "question_bank" / "dsa_catalog.py"
FRONTEND_BANK = ROOT / "frontend" / "src" / "lib" / "dsaProblemBank.ts"

_PROSE = re.compile(r"^(?P<args>.*?),?\s*expected\s*[:=]?\s*(?P<exp>.+)$", re.I | re.S)
_ARG_SPLIT = re.compile(r",\s*(?=[A-Za-z_]\w*\s*=)")


def to_json_text(raw: str) -> str | None:
    """Python-ish literal text -> compact JSON, or None when it is not a plain literal."""
    t = raw.strip().rstrip(".")
    for candidate in (t, t.replace("'", '"')):
        try:
            return json.dumps(json.loads(candidate), separators=(",", ":"))
        except Exception:
            pass
    try:
        return json.dumps(ast.literal_eval(t), separators=(",", ":"))
    except Exception:
        return None


def parse_prose_test(text: str) -> tuple[str, str] | None:
    """'nums = [1,2], k = 2, expected [1]' -> ('[1,2]\\n2', '[1]'). None when it cannot be done cleanly."""
    m = _PROSE.match(text or "")
    if not m:
        return None
    lines = []
    for seg in filter(None, _ARG_SPLIT.split(m.group("args").strip())):
        eq = seg.find("=")
        js = to_json_text(seg[eq + 1 :] if eq >= 0 else seg)
        if js is None:
            return None
        lines.append(js)
    exp = to_json_text(m.group("exp"))
    if not lines or exp is None:
        return None
    return "\n".join(lines), exp


def load_catalog() -> list[dict]:
    ns: dict = {}
    exec(compile(CATALOG.read_text(encoding="utf-8"), str(CATALOG), "exec"), ns)
    return ns["DSA_CATALOG"]


def save_catalog(items: list[dict]) -> None:
    header = '"""DSA & Problem Solving Curated Question Catalog.\nTotal Validated Problems: %d\n\nTests are canonical: see backend/tools/dsa_data.py.\n"""\n\nfrom typing import Any\n\n' % len(items)
    body = "DSA_CATALOG: list[dict[str, Any]] = " + pprint.pformat(items, width=118, sort_dicts=False) + "\n"
    CATALOG.write_text(header + body, encoding="utf-8")


def is_canonical(tc: dict) -> bool:
    if not isinstance(tc, dict) or not str(tc.get("expected", "")).strip():
        return False
    return all(to_json_text(line) is not None for line in str(tc.get("input", "")).splitlines() if line.strip()) and bool(str(tc.get("input", "")).strip())


def canonicalize(items: list[dict]) -> tuple[int, list[str]]:
    fixed, failed = 0, []
    for it in items:
        meta = it.setdefault("metadata_json", {})
        tests = meta.get("test_cases", [])
        out = []
        for tc in tests:
            if is_canonical(tc):
                out.append(tc)
                continue
            parsed = parse_prose_test(str(tc.get("input", "")))
            if parsed is None:
                failed.append(f'{it["id"]}: {str(tc.get("input"))[:70]}')
                continue
            new = {k: v for k, v in tc.items() if k not in ("input", "expected")}
            new["input"], new["expected"] = parsed
            out.append(new)
            fixed += 1
        meta["test_cases"] = out
        # examples stay human-readable prose
    return fixed, failed


def check(items: list[dict]) -> list[str]:
    bad = []
    for it in items:
        if it.get("metadata_json", {}).get("runnable") is False:
            continue  # intentionally excluded until the harness can drive it
        tests = it.get("metadata_json", {}).get("test_cases", [])
        if not tests:
            bad.append(f'{it["id"]}: no tests')
        for i, tc in enumerate(tests):
            if not is_canonical(tc):
                bad.append(f'{it["id"]} test {i + 1}: not canonical')
    return bad


def sync_frontend(items: list[dict]) -> int:
    """Replace testCases in the frontend bank with the canonical (visible) tests, matched by problem id."""
    text = FRONTEND_BANK.read_text(encoding="utf-8")
    start = text.index("export const DSA_PROBLEMS: DsaProblem[] = [")
    arr_start = text.index("= [", start) + 2
    depth, i = 0, arr_start
    in_str, esc = False, False
    while i < len(text):
        ch = text[i]
        if in_str:
            esc = (not esc) and ch == "\\"
            if ch == '"' and not esc:
                in_str = False
        elif ch == '"':
            in_str = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                break
        i += 1
    problems = json.loads(text[arr_start : i + 1])
    by_id = {it["id"]: it for it in items}
    changed = 0
    for p in problems:
        src = by_id.get(p["id"])
        if not src:
            continue
        tests = [t for t in src["metadata_json"].get("test_cases", []) if not t.get("hidden")]
        p["testCases"] = [
            {
                "id": n + 1,
                "label": f"Test Case {n + 1}",
                "input": t["input"],
                "args": t["input"].splitlines(),
                "expectedOutput": t["expected"],
                "isHidden": False,
            }
            for n, t in enumerate(tests)
        ]
        changed += 1
    FRONTEND_BANK.write_text(text[:arr_start] + json.dumps(problems, indent=2, ensure_ascii=False) + text[i + 1 :], encoding="utf-8")
    return changed


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    data = load_catalog()
    if cmd == "check":
        problems = check(data)
        print(f"{len(data)} problems, {len(problems)} issues")
        for line in problems[:40]:
            print(" -", line)
        sys.exit(1 if problems else 0)
    if cmd == "canonicalize":
        n, failed = canonicalize(data)
        save_catalog(data)
        print(f"canonicalized {n} tests; {len(failed)} could not be parsed")
        for line in failed:
            print(" -", line)
    elif cmd == "sync-frontend":
        print("frontend problems updated:", sync_frontend(load_catalog()))
    else:
        sys.exit("usage: dsa_data.py check|canonicalize|sync-frontend")
