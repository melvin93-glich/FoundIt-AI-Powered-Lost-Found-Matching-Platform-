import os
import sys
import json
import time
import asyncio
from typing import List, Dict, Any

# Ensure backend root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai.text_model import text_service
from ai.clip_model import clip_service
from ai.matching import cosine_similarity, calculate_context_score, compute_total_match_score

def run_evaluation():
    sample_file = os.path.join(os.path.dirname(__file__), "sample_pairs.json")
    if not os.path.exists(sample_file):
        print(f"Error: {sample_file} not found.")
        return

    with open(sample_file, "r", encoding="utf-8") as f:
        samples = json.load(f)

    total_queries = len(samples)
    precisions_at_1 = []
    precisions_at_3 = []
    recalls_at_1 = []
    recalls_at_3 = []
    average_precisions = []
    latencies_ms = []

    for sample in samples:
        src = sample["source_item"]
        candidates = sample["candidate_items"]

        t_start = time.time()

        # Compute query text
        query_text = f"{src.get('title', '')} {src.get('description', '')} {src.get('category', '')} {' '.join(src.get('detected_objects', []))} {src.get('extracted_text', '')}".strip()
        src_text_emb = text_service.get_text_embedding(query_text)
        src_img_emb = [0.0] * 512

        scored = []
        for cand in candidates:
            cand_text = f"{cand.get('title', '')} {cand.get('description', '')} {cand.get('category', '')} {' '.join(cand.get('detected_objects', []))} {cand.get('extracted_text', '')}".strip()
            cand_text_emb = text_service.get_text_embedding(cand_text)
            cand_img_emb = [0.0] * 512

            txt_sim = cosine_similarity(src_text_emb, cand_text_emb)
            img_sim = cosine_similarity(src_img_emb, cand_img_emb)
            ctx_score = calculate_context_score(src, cand)
            total_score = compute_total_match_score(img_sim, txt_sim, ctx_score)

            scored.append({
                "candidate": cand,
                "score": total_score,
                "is_relevant": cand.get("is_relevant", False)
            })

        latency = (time.time() - t_start) * 1000.0
        latencies_ms.append(latency)

        # Sort descending by score
        scored.sort(key=lambda x: x["score"], reverse=True)

        # Relevant item count
        relevant_total = sum(1 for c in candidates if c.get("is_relevant", False))
        if relevant_total == 0:
            continue

        # Precision@1, Recall@1
        top_1 = scored[:1]
        rel_at_1 = sum(1 for x in top_1 if x["is_relevant"])
        precisions_at_1.append(rel_at_1 / 1.0)
        recalls_at_1.append(rel_at_1 / relevant_total)

        # Precision@3, Recall@3
        top_3 = scored[:3]
        rel_at_3 = sum(1 for x in top_3 if x["is_relevant"])
        precisions_at_3.append(rel_at_3 / min(3, len(scored)))
        recalls_at_3.append(rel_at_3 / relevant_total)

        # Average Precision (AP) for mAP calculation
        hits = 0
        sum_precisions = 0.0
        for i, item in enumerate(scored):
            if item["is_relevant"]:
                hits += 1
                sum_precisions += hits / (i + 1)
        ap = sum_precisions / relevant_total if relevant_total > 0 else 0.0
        average_precisions.append(ap)

    p_at_1 = sum(precisions_at_1) / len(precisions_at_1) if precisions_at_1 else 0.0
    p_at_3 = sum(precisions_at_3) / len(precisions_at_3) if precisions_at_3 else 0.0
    r_at_1 = sum(recalls_at_1) / len(recalls_at_1) if recalls_at_1 else 0.0
    r_at_3 = sum(recalls_at_3) / len(recalls_at_3) if recalls_at_3 else 0.0
    mAP = sum(average_precisions) / len(average_precisions) if average_precisions else 0.0
    avg_latency = sum(latencies_ms) / len(latencies_ms) if latencies_ms else 0.0

    results = {
        "evaluation_summary": {
            "total_queries": total_queries,
            "precision_at_1": round(p_at_1, 4),
            "precision_at_3": round(p_at_3, 4),
            "recall_at_1": round(r_at_1, 4),
            "recall_at_3": round(r_at_3, 4),
            "mean_average_precision_mAP": round(mAP, 4),
            "average_end_to_end_latency_ms": round(avg_latency, 2)
        }
    }

    out_file = os.path.join(os.path.dirname(__file__), "results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Print Clean Formatted ASCII Table to stdout
    print("\n" + "=" * 62)
    print("        FOUNDIT AI MATCHING ENGINE BENCHMARK REPORT        ")
    print("=" * 62)
    print(f" Total Evaluation Queries Tested : {total_queries}")
    print("-" * 62)
    print(f"  Metric                           | Value               ")
    print("-" * 62)
    print(f"  Precision@1                      | {p_at_1 * 100:.1f}% ({p_at_1:.4f})")
    print(f"  Precision@3                      | {p_at_3 * 100:.1f}% ({p_at_3:.4f})")
    print(f"  Recall@1                         | {r_at_1 * 100:.1f}% ({r_at_1:.4f})")
    print(f"  Recall@3                         | {r_at_3 * 100:.1f}% ({r_at_3:.4f})")
    print(f"  Mean Average Precision (mAP)     | {mAP * 100:.1f}% ({mAP:.4f})")
    print(f"  Average Match Latency            | {avg_latency:.2f} ms")
    print("-" * 62)
    print(f" Results exported to: {out_file}")
    print("=" * 62 + "\n")

if __name__ == "__main__":
    run_evaluation()
