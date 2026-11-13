"""Problem statements for the DSA catalog: constraints and structured examples.

    python tools/dsa_statements.py apply          # write constraints + examples into the catalog, then the frontend bank
    python tools/dsa_statements.py check          # report problems with missing or placeholder statements

Constraints are hand-written in dsa_statement_data.py. Examples are derived from the first visible canonical tests, so they
can never disagree with what the code runner checks. Problems the harness cannot drive use MANUAL_EXAMPLES instead.
"""

from __future__ import annotations

import json
import sys

import dsa_data
from dsa_statement_data import CONSTRAINTS, MANUAL_EXAMPLES

MAX_EXAMPLES = 2
MAX_EXAMPLE_CHARS = 700
PLACEHOLDER_MARKERS = ("Optimal Big-O time and space complexity required", "Handle empty, single element")


def is_design_problem(meta: dict) -> bool:
    """MinStack, LRUCache and TimeMap feed an operations list and an arguments list instead of plain arguments."""
    return not meta.get("args") or str(meta.get("entry_point", ""))[:1].isupper()


def derive_examples(item: dict) -> list[dict[str, str]]:
    meta = item["metadata_json"]
    if item["id"] in MANUAL_EXAMPLES:
        return [dict(e) for e in MANUAL_EXAMPLES[item["id"]]]
    names = ["operations", "arguments"] if is_design_problem(meta) else [a["name"] for a in meta["args"]]
    examples: list[dict[str, str]] = []
    for tc in meta.get("test_cases", []):
        if tc.get("hidden"):
            continue
        lines = [ln for ln in str(tc["input"]).splitlines() if ln.strip()]
        if len(lines) != len(names):
            continue
        text = ", ".join(f"{n} = {v}" for n, v in zip(names, lines))
        if len(text) > MAX_EXAMPLE_CHARS or len(str(tc["expected"])) > MAX_EXAMPLE_CHARS:
            continue
        examples.append({"input": text, "output": str(tc["expected"])})
        if len(examples) == MAX_EXAMPLES:
            break
    return examples


def apply_statements(items: list[dict]) -> list[str]:
    missing = []
    for it in items:
        meta = it["metadata_json"]
        constraints = CONSTRAINTS.get(it["id"])
        if not constraints:
            missing.append(it["id"])
            continue
        meta["constraints"] = list(constraints)
        meta["examples"] = derive_examples(it)
    return missing


def check(items: list[dict]) -> list[str]:
    bad = []
    for it in items:
        meta = it.get("metadata_json", {})
        cons = meta.get("constraints") or []
        if len(cons) < 2:
            bad.append(f'{it["id"]}: needs at least 2 constraints')
        if any(m in c for c in cons for m in PLACEHOLDER_MARKERS):
            bad.append(f'{it["id"]}: placeholder constraints')
        exs = meta.get("examples") or []
        if not exs:
            bad.append(f'{it["id"]}: no examples')
        for e in exs:
            if not (isinstance(e, dict) and e.get("input") and e.get("output")):
                bad.append(f'{it["id"]}: example is not {{input, output}}: {str(e)[:60]}')
    return bad


def sync_frontend_statements(items: list[dict]) -> int:
    """Copy constraints and examples into the frontend bank (matched by id), leaving everything else untouched."""
    text = dsa_data.FRONTEND_BANK.read_text(encoding="utf-8")
    start = text.index("export const DSA_PROBLEMS: DsaProblem[] = [")
    arr_start = text.index("= [", start) + 2
    depth, i, in_str, esc = 0, arr_start, False, False
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
        p["constraints"] = list(src["metadata_json"]["constraints"])
        p["examples"] = [dict(e) for e in src["metadata_json"]["examples"]]
        changed += 1
    dsa_data.FRONTEND_BANK.write_text(
        text[:arr_start] + json.dumps(problems, indent=2, ensure_ascii=False) + text[i + 1 :], encoding="utf-8"
    )
    return changed


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    data = dsa_data.load_catalog()
    if cmd == "apply":
        missing = apply_statements(data)
        if missing:
            sys.exit(f"no constraints written for: {', '.join(missing)}")
        problems = check(data)
        if problems:
            sys.exit("\n".join(problems[:40]))
        dsa_data.save_catalog(data)
        print("catalog updated:", len(data), "problems")
        print("frontend bank updated:", sync_frontend_statements(data))
    elif cmd == "check":
        problems = check(data)
        print(f"{len(data)} problems, {len(problems)} issues")
        for line in problems[:40]:
            print(" -", line)
        sys.exit(1 if problems else 0)
    else:
        sys.exit("usage: dsa_statements.py apply|check")
