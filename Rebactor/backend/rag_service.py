"""
RAG (Retrieval-Augmented Generation) & Knowledge Base Engine for DevOps Incidents
Provides:
1. Incident Store: Persistent SQLite storage with TF-IDF / BM25 token similarity vectors.
2. Auto-Indexing: Saves newly resolved/diagnosed pipeline failures into the organizational knowledge base.
3. Relevant Incident Retrieval: Searches past incidents for similar error signatures to inject into the LLM prompt.
"""

import os
import sqlite3
import json
import math
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

DB_PATH = os.path.join(os.path.dirname(__file__), "incidents_kb.db")


class RetrievedIncident(BaseModel):
    incident_id: str
    repository: str
    workflow_name: str
    category: str
    failed_step: str
    root_cause: str
    resolution: str
    similarity_score: float
    recorded_at: str


def get_db_connection() -> sqlite3.Connection:
    """Initialize SQLite database for incident persistence and vector search."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                repository TEXT NOT NULL,
                run_id INTEGER,
                workflow_name TEXT NOT NULL,
                category TEXT NOT NULL,
                failed_step TEXT NOT NULL,
                error_tokens TEXT NOT NULL,
                plain_summary TEXT,
                root_cause TEXT NOT NULL,
                resolution TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
    return conn


def tokenize_error_log(text: str) -> List[str]:
    """Extract normalized alphanumeric tokens from error logs for similarity indexing."""
    if not text:
        return []
    # Clean ANSI codes
    cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", text)
    # Filter keywords, commands, error messages
    tokens = re.findall(r"[a-zA-Z0-9_\-\.\/]{3,}", cleaned.lower())
    # Exclude common noisy stopwords
    stopwords = {"the", "and", "for", "with", "from", "that", "this", "http", "https", "com", "github"}
    return [t for t in tokens if t not in stopwords]


def compute_cosine_similarity(tokens_a: List[str], tokens_b: List[str]) -> float:
    """Compute cosine similarity between two token sets."""
    if not tokens_a or not tokens_b:
        return 0.0

    counts_a: Dict[str, int] = {}
    for t in tokens_a:
        counts_a[t] = counts_a.get(t, 0) + 1

    counts_b: Dict[str, int] = {}
    for t in tokens_b:
        counts_b[t] = counts_b.get(t, 0) + 1

    common_tokens = set(counts_a.keys()).intersection(set(counts_b.keys()))
    if not common_tokens:
        return 0.0

    dot_product = sum(counts_a[t] * counts_b[t] for t in common_tokens)
    norm_a = math.sqrt(sum(v * v for v in counts_a.values()))
    norm_b = math.sqrt(sum(v * v for v in counts_b.values()))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot_product / (norm_a * norm_b)


def store_incident(
    repository: str,
    workflow_name: str,
    run_id: Optional[int],
    category: str,
    failed_step: str,
    raw_log: str,
    root_cause: str,
    resolution: str,
    plain_summary: Optional[str] = None,
) -> str:
    """Index an incident and its resolution into the organizational knowledge base."""
    incident_id = f"inc-{run_id or int(datetime.now().timestamp())}"
    tokens = tokenize_error_log(raw_log)
    created_at = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    with conn:
        conn.execute("""
            INSERT OR REPLACE INTO incidents 
            (id, repository, run_id, workflow_name, category, failed_step, error_tokens, plain_summary, root_cause, resolution, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            incident_id,
            repository,
            run_id,
            workflow_name,
            category,
            failed_step,
            json.dumps(tokens[:300]),  # Store top 300 keywords
            plain_summary,
            root_cause,
            resolution,
            created_at,
        ))
    return incident_id


def search_similar_incidents(
    raw_log: str,
    min_similarity: float = 0.35,
    top_k: int = 4,
    category_filter: Optional[str] = None,
) -> List[RetrievedIncident]:
    """Retrieve historical incidents from the vector knowledge base matching the failure log with hybrid cosine & keyword matching."""
    query_tokens = tokenize_error_log(raw_log)
    if not query_tokens:
        return []

    conn = get_db_connection()
    if category_filter:
        rows = conn.execute(
            "SELECT * FROM incidents WHERE category = ? ORDER BY created_at DESC LIMIT 100",
            (category_filter,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 100").fetchall()

    results: List[RetrievedIncident] = []
    query_text_lower = raw_log.lower()

    for r in rows:
        try:
            stored_tokens = json.loads(r["error_tokens"])
        except Exception:
            stored_tokens = []

        # Cosine similarity on token vector
        cos_score = compute_cosine_similarity(query_tokens, stored_tokens)

        # Keyword text overlap boost for root cause & failed step
        step_boost = 0.15 if r["failed_step"].lower() in query_text_lower else 0.0
        cause_keywords = [w for w in re.findall(r"\w{4,}", r["root_cause"].lower()) if w in query_text_lower]
        keyword_boost = min(0.25, len(cause_keywords) * 0.05)

        total_score = min(1.0, cos_score + step_boost + keyword_boost)

        if total_score >= min_similarity:
            results.append(
                RetrievedIncident(
                    incident_id=r["id"],
                    repository=r["repository"],
                    workflow_name=r["workflow_name"],
                    category=r["category"],
                    failed_step=r["failed_step"],
                    root_cause=r["root_cause"],
                    resolution=r["resolution"],
                    similarity_score=round(total_score, 2),
                    recorded_at=r["created_at"],
                )
            )

    results.sort(key=lambda x: x.similarity_score, reverse=True)
    return results[:top_k]


def get_rag_analytics() -> Dict[str, Any]:
    """Calculate RAG knowledge base statistics and MTTR insights."""
    conn = get_db_connection()
    total_count = conn.execute("SELECT count(*) as c FROM incidents").fetchone()["c"]

    categories = conn.execute("""
        SELECT category, count(*) as count 
        FROM incidents 
        GROUP BY category 
        ORDER BY count DESC
    """).fetchall()

    category_stats = [{"category": row["category"], "count": row["count"]} for row in categories]

    recent_rows = conn.execute(
        "SELECT id, repository, workflow_name, category, failed_step, plain_summary, resolution, created_at FROM incidents ORDER BY created_at DESC LIMIT 10"
    ).fetchall()

    return {
        "total_incidents": total_count,
        "category_distribution": category_stats,
        "recent_incidents": [dict(r) for r in recent_rows],
    }


def seed_knowledge_base():
    """Seed initial organizational incident memories if DB is empty."""
    conn = get_db_connection()
    count = conn.execute("SELECT count(*) as c FROM incidents").fetchone()["c"]
    if count == 0:
        store_incident(
            repository="abhishekvcet/Rebactor",
            workflow_name="CI Build & Test",
            run_id=101,
            category="Dependency Failure",
            failed_step="npm install / npm ci",
            raw_log="npm ERR! code ERESOLVE\nnpm ERR! ERESOLVE could not resolve\nnpm ERR! While resolving: @tailwindcss/turbopack",
            root_cause="Peer dependency version conflict between Next.js React 19 canary and Tailwind turbopack plugin.",
            resolution="Run `npm install --legacy-peer-deps` or upgrade package.json to compatible peer dependency versions.",
            plain_summary="Dependency installation crashed due to strict React 19 peer conflict in lockfile.",
        )
        store_incident(
            repository="abhishekvcet/Rebactor",
            workflow_name="Backend Test Suite",
            run_id=102,
            category="Test Failure",
            failed_step="pytest / test-runner",
            raw_log="FAIL tests/test_auth.py::test_login\nAssertionError: assert 401 == 200\nError: Unauthorized test credentials expired.",
            root_cause="Staging token or test environment secret expired in GitHub repository secrets.",
            resolution="Rotate and re-save `TEST_AUTH_SECRET` in GitHub Repo Settings > Secrets and Variables > Actions.",
            plain_summary="Authentication unit tests failed because test runner had expired mock secrets.",
        )
        print("[RAG KB] Seeded historical incident memory into knowledge base.")


# Auto seed on import
seed_knowledge_base()
