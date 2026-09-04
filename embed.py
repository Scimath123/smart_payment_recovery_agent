

import pandas as pd
import chromadb
from sentence_transformers import SentenceTransformer

CORPUS_PATH = "data/failure_corpus.csv"
CHROMA_DIR = "data/chroma_db"
COLLECTION_NAME = "failure_cases"
EMBED_MODEL = "all-MiniLM-L6-v2"


def main():
    print("Loading corpus...")
    df = pd.read_csv(CORPUS_PATH)
    print(f"Loaded {len(df)} rows")

    model = SentenceTransformer(EMBED_MODEL)

    print("Embedding error_text column...")
    embeddings = model.encode(
        df["error_text"].tolist(),
        show_progress_bar=True,
        batch_size=64,
    )

    
    client = chromadb.PersistentClient(path=CHROMA_DIR)

    # Fresh collection each run — avoids stale/duplicate rows during dev
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    # Metadata fields stored alongside each vector.
    # Chroma metadata values must be str/int/float/bool (no NaN/None).
    metadata_cols = [
        "category", "retry_action_taken", "outcome",
        "amount_usd", "account_balance_usd", "cvv_retry_count",
        "velocity_score", "merchant_risk_score",
        "delay_before_retry_min", "auth_method", "channel",
        "merchant_category", "card_type",
    ]

    metadatas = []
    for _, row in df.iterrows():
        meta = {}
        for col in metadata_cols:
            val = row[col]
            if pd.isna(val):
                val = "" if isinstance(val, str) else 0.0
            if isinstance(val, (int, float, bool)):
                meta[col] = float(val) if not isinstance(val, bool) else bool(val)
            else:
                meta[col] = str(val)
        metadatas.append(meta)

    ids = df["transaction_id"].astype(str).tolist()
    documents = df["error_text"].tolist()

    print("Writing to Chroma collection (batched)...")
    batch_size = 500
    for start in range(0, len(df), batch_size):
        end = start + batch_size
        collection.add(
            ids=ids[start:end],
            embeddings=embeddings[start:end].tolist(),
            documents=documents[start:end],
            metadatas=metadatas[start:end],
        )

    print(f"Done. Collection '{COLLECTION_NAME}' now has {collection.count()} vectors.")
    print(f"Persisted at: {CHROMA_DIR}")


if __name__ == "__main__":
    main()