"""Deterministic DSA Evidence Extraction & Adaptive Progression Intelligence.

Extracts candidate algorithmic assertions, validates Big-O optimality against problem
ground truth, maintains structured state, and prevents amnesic / regressive questioning.
"""

import re
from typing import Any


def normalize_big_o(s: str | None) -> str:
    """Normalize Big-O notation for deterministic comparison: 'O( N log N )' -> 'O(NlogN)'."""
    if not s:
        return ""
    clean = re.sub(r"\s+", "", s.strip())
    # Standardize casing for N
    clean = clean.replace("o(", "O(").replace("(n)", "(N)")
    return clean


def extract_big_o_complexities(text: str) -> tuple[str | None, str | None]:
    """Extracts (time_complexity, space_complexity) from candidate utterance."""
    # Find all Big-O patterns: O(1), O(N), O(N^2), O(NlogN), O(2^N), O(min(N,M)), etc.
    matches = re.findall(r"O\s*\(\s*[^)]+\s*\)", text, re.IGNORECASE)
    if not matches:
        return None, None

    normalized_matches = [normalize_big_o(m) for m in matches]
    text_lower = text.lower()

    # If text explicitly associates matches with time vs space
    time_c = None
    space_c = None

    for m, norm_m in zip(matches, normalized_matches):
        pos = text.find(m)
        surrounding = text_lower[max(0, pos - 35) : min(len(text_lower), pos + len(m) + 35)]
        if "space" in surrounding or "memory" in surrounding or "auxiliary" in surrounding:
            if not space_c:
                space_c = norm_m
        elif "time" in surrounding or "runtime" in surrounding:
            if not time_c:
                time_c = norm_m

    # Fallback to positional ordering if not explicitly labeled
    if not time_c and normalized_matches:
        time_c = normalized_matches[0]
    if not space_c and len(normalized_matches) > 1:
        if normalized_matches[1] != time_c:
            space_c = normalized_matches[1]
        elif len(normalized_matches) > 2:
            space_c = normalized_matches[2]

    return time_c, space_c


def extract_candidate_dsa_evidence(
    candidate_text: str,
    current_dsa_state: dict[str, Any] | None = None,
    problem_spec: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Deterministically extracts candidate's algorithmic approach, data structures,

    Big-O complexity, correctness reasoning, and intent.
    """
    state = dict(current_dsa_state or {})
    prob = dict(problem_spec or {})
    optimal_time = normalize_big_o(prob.get("optimal_time_complexity", "O(N)"))
    optimal_space = normalize_big_o(prob.get("optimal_space_complexity", "O(1)"))

    text = candidate_text.strip()
    text_lower = text.lower()

    # 1. Big-O Complexity Extraction
    stated_time, stated_space = extract_big_o_complexities(text)
    if stated_time:
        state["time_complexity"] = stated_time
    if stated_space:
        state["space_complexity"] = stated_space

    # 2. Algorithm & Data Structure Identification
    algo_keywords = {
        "sliding_window": ["sliding window", "window of", "expand the window", "shrink the window", "window bounds"],
        "two_pointers": ["two pointer", "two pointers", "left and right pointer", "fast and slow pointer"],
        "hash_map": ["hash map", "hashmap", "hash table", "frequency map", "dictionary", "unordered_map", "lookup table"],
        "hash_set": ["hash set", "hashset", "lookup set", "visited set"],
        "binary_search": ["binary search", "search space", "bisect", "divide and conquer"],
        "dynamic_programming": ["dynamic programming", "dp table", "memoization", "memoize", "tabulation", "subproblem"],
        "monotonic_stack": ["monotonic stack", "monotonically increasing", "monotonically decreasing"],
        "stack": ["stack", "lifo", "push and pop"],
        "heap": ["heap", "min heap", "max heap", "priority queue"],
        "queue": ["queue", "deque", "fifo"],
        "dfs": ["dfs", "depth first", "recursion", "backtracking"],
        "bfs": ["bfs", "breadth first", "level order"],
        "tree": ["binary tree", "bst", "trie", "prefix tree"],
        "sorting": ["sort", "quicksort", "mergesort", "tim sort"],
        "brute_force": ["brute force", "nested loop", "nested loops", "quadratic pairs", "check all pairs", "every substring", "all combinations"],
    }

    found_algos = set(state.get("identified_algorithms", []))
    for algo, kws in algo_keywords.items():
        if any(kw in text_lower for kw in kws):
            found_algos.add(algo)
    state["identified_algorithms"] = sorted(list(found_algos))

    # 3. Detect Approach Change / Pivot
    pivot_phrases = [
        "actually", "instead of", "switch to", "pivot to", "rather than",
        "won't work", "will take too much", "let me change", "better to use",
    ]
    is_pivoting = any(p in text_lower for p in pivot_phrases)
    if is_pivoting and state.get("proposed_approach"):
        prev = state["proposed_approach"]
        # If new algorithmic technique mentioned, mark pivot
        new_techniques = [k for k in ["sliding_window", "monotonic_stack", "binary_search", "hash_map", "two_pointers"] if k in found_algos]
        if new_techniques:
            state["previous_approach"] = prev
            state["approach_switched"] = True
            corr_list = state.setdefault("candidate_corrections", [])
            corr_list.append(f"Pivoted from {prev} to new approach using {', '.join(new_techniques)}")

    # 4. Formulate Stated Approach Description & Category
    has_brute_keywords = any(kw in text_lower for kw in ["brute force", "naive", "baseline", "all pairs", "all substrings", "nested loop"])
    has_optimal_keywords = any(kw in text_lower for kw in ["optimal", "optimize", "optimal approach", "linear time", "most efficient", "we can do better"])

    stated_tc_norm = normalize_big_o(stated_time)

    # Determine Approach Category & Optimality Status
    # Case A: Optimal approach identified
    is_sliding_opt = "sliding_window" in found_algos or "two_pointers" in found_algos
    matches_optimal_tc = bool(stated_tc_norm and stated_tc_norm == optimal_time)

    if (is_sliding_opt or matches_optimal_tc or has_optimal_keywords) and not (has_brute_keywords and not has_optimal_keywords):
        # Verify if candidate is falsely claiming a suboptimal approach is optimal
        if stated_tc_norm and stated_tc_norm != optimal_time:
            # Check if stated_tc_norm is worse (e.g. O(N^2) or O(NlogN) when optimal is O(N))
            if any(worse in stated_tc_norm for worse in ["N^2", "N2", "2^N", "N!"]) or ("NlogN" in stated_tc_norm and "log" not in optimal_time):
                if has_optimal_keywords or "optimal" in text_lower:
                    state["approach_category"] = "brute_force"
                    state["optimality_status"] = "flawed_claim"
                    state["proposed_approach"] = f"Flawed claim: Stated {stated_tc_norm} as optimal using {', '.join(found_algos)}"
                else:
                    state["approach_category"] = "brute_force"
                    state["optimality_status"] = "suboptimal"
            else:
                state["approach_category"] = "optimal"
                state["optimality_status"] = "optimal"
                state["proposed_approach"] = f"{', '.join(k.replace('_', ' ').title() for k in found_algos if k != 'brute_force')} approach ({stated_tc_norm})"
        else:
            state["approach_category"] = "optimal"
            state["optimality_status"] = "optimal"
            desc = text[:150]
            if is_sliding_opt:
                state["proposed_approach"] = f"Two-pointer sliding window with {'hash map' if 'hash_map' in found_algos else 'frequency tracking'}"
            elif found_algos:
                state["proposed_approach"] = f"{', '.join(k.replace('_', ' ').title() for k in found_algos if k != 'brute_force')}"
            else:
                state["proposed_approach"] = desc

    elif has_brute_keywords:
        state["approach_category"] = "brute_force"
        state["optimality_status"] = "suboptimal"
        if not state.get("proposed_approach"):
            state["proposed_approach"] = f"Brute force checking all candidate configurations ({stated_tc_norm or 'O(N^2)'})"

    # 5. Correctness Reasoning & Invariants
    invariant_kws = [
        "left pointer", "right pointer", "window bounds", "window expands", "window contracts",
        "pointer advances", "update the index", "monotonically", "base case", "no duplicates",
        "hash map stores", "last seen index", "shrink", "valid window",
    ]
    found_invariants = [kw for kw in invariant_kws if kw in text_lower]
    if found_invariants:
        state["invariants_discussed"] = sorted(list(set(state.get("invariants_discussed", []) + found_invariants)))
        state["correctness_reasoning"] = f"Explains: {', '.join(found_invariants)}"

    # 6. Edge Cases
    edge_kws = {
        "empty_input": ["empty string", "empty array", "empty list", "null", "none", "len is 0", "length 0"],
        "single_element": ["single character", "single element", "one character", "length 1"],
        "all_duplicates": ["all duplicates", "all identical", "repeated characters", "all the same"],
        "all_unique": ["all unique", "no repeating", "distinct characters"],
        "boundary_scale": ["large n", "10^5", "overflow", "negative values"],
    }
    found_edges = set(state.get("edge_cases_discussed", []))
    for ec, kws in edge_kws.items():
        if any(kw in text_lower for kw in kws):
            found_edges.add(ec)
    state["edge_cases_discussed"] = sorted(list(found_edges))

    # 7. Repetition Detection
    repetition_phrases = [
        "already explained", "already answered", "already stated", "as i mentioned earlier",
        "as i said earlier", "like i mentioned before", "like i said", "as previously stated",
    ]
    if any(rp in text_lower for rp in repetition_phrases):
        state["repetition_noticed"] = True

    # 8. Request to Code
    code_requests = [
        "ready to code", "write the code", "open the editor", "start coding",
        "can i implement", "should i write the solution", "start implementing",
    ]
    if any(cr in text_lower for cr in code_requests):
        state["wants_to_code"] = True

    return state

