"""
retriever.py
Exposes retrieve_similar_failures() — the RAG "tool" the agent calls to
find similar past payment failures and their historical retry outcomes.

Usage:
    from retriever import retrieve_similar_failures

    result = retrieve_similar_failures("Bank server did not respond in time")
    print(result["summary"])
    print(result["cases"])
"""

import os
import chromadb
from sentence_transformers import SentenceTransformer
from collections import Counter

CHROMA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "data", "chroma_db"
)
COLLECTION_NAME = "failure_cases"
EMBED_MODEL = "all-MiniLM-L6-v2"

# Loaded once, reused across calls (avoids reloading the model every call)
_model = None
_collection = None


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBED_MODEL)
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = client.get_collection(COLLECTION_NAME)
    return _collection


def retrieve_similar_failures(query_text: str, k: int = 5, filter_outcome: str = None):
    """
    Retrieve the k most similar past failure cases to query_text.

    Args:
        query_text: the raw gateway error text of the current failed transaction.
        k: number of similar cases to retrieve.
        filter_outcome: optional, "recovered" or "failed_again" — restrict
                         retrieval to only cases with this outcome.

    Returns:
        {
            "cases": [ {id, error_text, similarity, category, retry_action_taken,
                        outcome, ...metadata}, ... ],
            "summary": human-readable string summarizing the retrieval,
            "category_votes": {category: count, ...},
            "best_action_by_success_rate": {action: success_rate, ...},
            "top_similarity": float
        }
    """
    model = _get_model()
    collection = _get_collection()

    query_embedding = model.encode([query_text])[0].tolist()

    where_clause = {"outcome": filter_outcome} if filter_outcome else None

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        where=where_clause,
    )

    cases = []
    if results["ids"] and results["ids"][0]:
        for i in range(len(results["ids"][0])):
            distance = results["distances"][0][i]  # cosine distance (lower = more similar)
            similarity = round(1 - distance, 4)
            meta = results["metadatas"][0][i]
            cases.append({
                "id": results["ids"][0][i],
                "error_text": results["documents"][0][i],
                "similarity": similarity,
                **meta,
            })

    if not cases:
        return {
            "cases": [],
            "summary": "No similar past failures found.",
            "category_votes": {},
            "best_action_by_success_rate": {},
            "top_similarity": 0.0,
        }

    # --- Aggregate signals for the agent ---
    category_votes = dict(Counter(c["category"] for c in cases))
    top_category = max(category_votes, key=category_votes.get)

    # success rate per retry_action_taken, among retrieved cases
    action_stats = {}
    for c in cases:
        action = c["retry_action_taken"]
        action_stats.setdefault(action, {"total": 0, "recovered": 0})
        action_stats[action]["total"] += 1
        if c["outcome"] == "recovered":
            action_stats[action]["recovered"] += 1

    best_action_by_success_rate = {
        action: round(stats["recovered"] / stats["total"], 2)
        for action, stats in action_stats.items()
    }

    recovered_count = sum(1 for c in cases if c["outcome"] == "recovered")
    top_similarity = cases[0]["similarity"]

    summary = (
        f"Found {len(cases)} similar past failures (top similarity {top_similarity}). "
        f"{category_votes.get(top_category, 0)}/{len(cases)} were '{top_category}'. "
        f"{recovered_count}/{len(cases)} were eventually recovered. "
        f"Retry-action success rates among matches: {best_action_by_success_rate}."
    )

    return {
        "cases": cases,
        "summary": summary,
        "category_votes": category_votes,
        "best_action_by_success_rate": best_action_by_success_rate,
        "top_similarity": top_similarity,
    }


if __name__ == "__main__":
    # Quick manual test
    test_queries = [
        "Bank server did not respond in time",
        "Card expired - decline code 54",
        "NPCI: UPI PIN retries exceeded",
    ]
    for q in test_queries:
        print("=" * 70)
        print("QUERY:", q)
        result = retrieve_similar_failures(q, k=5)
        print(result["summary"])