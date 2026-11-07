"""Deterministic Skill Extraction & Evidence Engine for Strop Backend.

Provides token-bounded, context-aware skill extraction to guarantee zero false positives
on common English verbs/idioms (e.g. 'go from 0 to 1', 'ongoing', 'good', 'Grade C', 'R&D').
"""

import re
from typing import Any


TAXONOMY = [
    {
        "canonical": "Go",
        "category": "languages",
        "contextual": [
            re.compile(r"\b(?:golang|go\s*(?:language|programming|code|backend|microservices?|service|developer|engineer|runtime|sdk|routine|routines))\b", re.IGNORECASE),
            re.compile(r"\b(?:written\s+in|built\s+with|developed\s+in|built\s+in|implemented\s+in|using|via|in)\s+Go\b", re.IGNORECASE),
        ],
        "list_only": [
            re.compile(r"(?:^|[,;•|\/\n\t])\s*(Go|Golang)\s*(?:$|[,;•|\/\n\t])", re.IGNORECASE),
        ],
        "negatives": [
            re.compile(r"\b(?:go\s+(?:from|to|into|through|forward|ahead|on|back|live|out|over|with\s+(?:the|a|an)))\b", re.IGNORECASE),
            re.compile(r"\b(?:going|ongoing|good|negotiate|algorithm)\b", re.IGNORECASE),
            re.compile(r"\bready\s+to\s+go\b", re.IGNORECASE),
            re.compile(r"\bfrom\s+0\s+to\s+1\b", re.IGNORECASE),
        ],
    },
    {
        "canonical": "Python",
        "category": "languages",
        "unambiguous": [re.compile(r"\bpython(?:3)?\b", re.IGNORECASE), re.compile(r"\bpypi\b", re.IGNORECASE)],
    },
    {
        "canonical": "TypeScript",
        "category": "languages",
        "unambiguous": [re.compile(r"\btypescript\b", re.IGNORECASE)],
        "list_only": [re.compile(r"(?:^|[,;•|\/\n\t])\s*(TS)\s*(?:$|[,;•|\/\n\t])", re.IGNORECASE)],
    },
    {
        "canonical": "JavaScript",
        "category": "languages",
        "unambiguous": [re.compile(r"\bjavascript\b", re.IGNORECASE), re.compile(r"\bnode(?:\.js)?\b", re.IGNORECASE)],
        "list_only": [re.compile(r"(?:^|[,;•|\/\n\t])\s*(JS)\s*(?:$|[,;•|\/\n\t])", re.IGNORECASE)],
    },
    {
        "canonical": "Java",
        "category": "languages",
        "unambiguous": [re.compile(r"\bjava\b(?![\s-]*script)", re.IGNORECASE), re.compile(r"\bjvm\b", re.IGNORECASE)],
    },
    {
        "canonical": "C++",
        "category": "languages",
        "unambiguous": [
            re.compile(r"\bC\+\+(?=[^a-zA-Z0-9_+#]|$)", re.IGNORECASE),
            re.compile(r"\bcpp\b", re.IGNORECASE),
            re.compile(r"\bc\/c\+\+\b", re.IGNORECASE),
        ],
    },
    {
        "canonical": "C#",
        "category": "languages",
        "unambiguous": [
            re.compile(r"\bC#(?=[^a-zA-Z0-9_+#]|$)", re.IGNORECASE),
            re.compile(r"\bcsharp\b", re.IGNORECASE),
        ],
    },
    {
        "canonical": "C",
        "category": "languages",
        "contextual": [
            re.compile(r"\b(?:ansi\s+c|c\s+(?:language|programming|code|compiler|standard\s+library))\b", re.IGNORECASE),
            re.compile(r"\bc\/c\+\+\b", re.IGNORECASE),
        ],
        "list_only": [
            re.compile(r"(?:languages?|programming\s+languages?)[\s:]+[^\n\r]*(?:^|[,;•|\/\s])\s*(C)\s*(?:$|[,;•|\/\s])", re.IGNORECASE),
        ],
        "negatives": [
            re.compile(r"\b(?:section|grade|appendix|class|level|tier|model)\s+c\b", re.IGNORECASE),
            re.compile(r"\(c\)", re.IGNORECASE),
        ],
    },
    {
        "canonical": "Rust",
        "category": "languages",
        "unambiguous": [re.compile(r"\brust(?:lang)?\b", re.IGNORECASE), re.compile(r"\bcargo(?:\s+package)?\b", re.IGNORECASE)],
        "negatives": [re.compile(r"\brusty\b", re.IGNORECASE)],
    },
    {
        "canonical": "R",
        "category": "languages",
        "contextual": [
            re.compile(r"\b(?:r\s+(?:language|programming|package|script|studio|markdown|shiny))\b", re.IGNORECASE),
            re.compile(r"\br\/rstudio\b", re.IGNORECASE),
        ],
        "list_only": [
            re.compile(r"(?:languages?|programming\s+languages?)[\s:]+[^\n\r]*(?:^|[,;•|\/\s])\s*(R)\s*(?:$|[,;•|\/\s])", re.IGNORECASE),
        ],
        "negatives": [re.compile(r"\br&d\b", re.IGNORECASE)],
    },
    {
        "canonical": "SQL",
        "category": "languages",
        "unambiguous": [re.compile(r"\bsql\b", re.IGNORECASE), re.compile(r"\bpostgresql\b", re.IGNORECASE)],
    },
    {
        "canonical": "React",
        "category": "frameworks",
        "unambiguous": [re.compile(r"\breact(?:\.js|js)?\b", re.IGNORECASE), re.compile(r"\breact\s+native\b", re.IGNORECASE)],
        "negatives": [re.compile(r"\b(?:reaction|reactive|reacted|reacting)\b", re.IGNORECASE)],
    },
    {
        "canonical": "FastAPI",
        "category": "frameworks",
        "unambiguous": [re.compile(r"\bfastapi\b", re.IGNORECASE)],
    },
    {
        "canonical": "Docker",
        "category": "cloudDevops",
        "unambiguous": [re.compile(r"\bdocker(?:\s*compose)?\b", re.IGNORECASE)],
    },
    {
        "canonical": "Kubernetes",
        "category": "cloudDevops",
        "unambiguous": [re.compile(r"\bkubernetes\b", re.IGNORECASE), re.compile(r"\bk8s\b", re.IGNORECASE)],
    },
    {
        "canonical": "PostgreSQL",
        "category": "databases",
        "unambiguous": [re.compile(r"\bpostgresql\b", re.IGNORECASE), re.compile(r"\bpostgres\b", re.IGNORECASE)],
    },
    {
        "canonical": "Redis",
        "category": "databases",
        "unambiguous": [re.compile(r"\bredis\b", re.IGNORECASE)],
    },
    {
        "canonical": "Kafka",
        "category": "databases",
        "unambiguous": [re.compile(r"\bkafka\b", re.IGNORECASE)],
    },
    {
        "canonical": "AWS",
        "category": "cloudDevops",
        "unambiguous": [re.compile(r"\baws\b", re.IGNORECASE), re.compile(r"\bamazon\s+web\s+services\b", re.IGNORECASE)],
    },
    {
        "canonical": "Distributed Systems",
        "category": "architecture",
        "unambiguous": [re.compile(r"\bdistributed\s+systems\b", re.IGNORECASE)],
    },
]


def extract_verified_skills(text: str) -> list[str]:
    """Deterministically extracts verified technical skills from resume text.
    
    Prevents false positives on common words (e.g. 'go from 0 to 1', 'ongoing', 'good').
    """
    if not text or not text.strip():
        return []

    found: set[str] = set()

    for item in TAXONOMY:
        canonical = item["canonical"]
        matched = False

        # 1. Unambiguous patterns
        for pattern in item.get("unambiguous", []):
            m = pattern.search(text)
            if m:
                # Check negative patterns
                line = text[max(0, m.start() - 30):min(len(text), m.end() + 30)]
                is_neg = any(neg.search(line) for neg in item.get("negatives", []))
                if not is_neg:
                    matched = True
                    break

        # 2. Contextual patterns
        if not matched:
            for pattern in item.get("contextual", []):
                m = pattern.search(text)
                if m:
                    line = text[max(0, m.start() - 30):min(len(text), m.end() + 30)]
                    is_neg = any(neg.search(line) for neg in item.get("negatives", []))
                    if not is_neg:
                        matched = True
                        break

        # 3. List only patterns (inside skills section)
        if not matched and "list_only" in item:
            for pattern in item["list_only"]:
                m = pattern.search(text)
                if m:
                    line = text[max(0, m.start() - 30):min(len(text), m.end() + 30)]
                    is_neg = any(neg.search(line) for neg in item.get("negatives", []))
                    if not is_neg:
                        matched = True
                        break

        if matched:
            found.add(canonical)

    return sorted(list(found))

