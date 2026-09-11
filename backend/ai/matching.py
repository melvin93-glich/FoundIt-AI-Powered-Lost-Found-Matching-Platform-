import numpy as np
from typing import Optional

# ---------------------------------------------------------------------------
# Weight presets — tune these to change the scoring formula in one place.
# ---------------------------------------------------------------------------

# Full multimodal scoring (both source AND candidate have an image embedding)
WEIGHTS_WITH_IMAGE = {
    "image":   0.60,
    "text":    0.25,
    "context": 0.15,
}

# Text-only fallback (at least one side has no image embedding)
# Text is the stronger signal when visuals are unavailable.
WEIGHTS_TEXT_ONLY = {
    "text":    0.70,
    "context": 0.30,
}


def has_image_embedding(embedding: list) -> bool:
    """Return True only when the embedding is a non-empty, non-zero vector.

    A zero-vector (all 0.0) is produced by the fallback path when CLIP
    is skipped, so it must be treated as "no image" — not as a real embedding.
    """
    if not embedding or len(embedding) == 0:
        return False
    arr = embedding if isinstance(embedding, (list, tuple)) else list(embedding)
    return any(v != 0.0 for v in arr)


def cosine_similarity(vec1: list, vec2: list) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = float(np.linalg.norm(v1))
    norm2 = float(np.linalg.norm(v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def calculate_context_score(source_item: dict, target_item: dict) -> float:
    """
    Calculates context match score based on location proximity, category exactness,
    and detected object tag overlap.
    Returns float between 0.0 and 1.0.
    """
    score = 0.0

    # 1. Category match (0.4 of context score)
    src_cat = str(source_item.get("category", "")).strip().lower()
    tgt_cat = str(target_item.get("category", "")).strip().lower()
    if src_cat and tgt_cat and src_cat == tgt_cat:
        score += 0.4

    # 2. Location match (0.4 of context score)
    src_loc = str(source_item.get("location", "")).strip().lower()
    tgt_loc = str(target_item.get("location", "")).strip().lower()
    if src_loc and tgt_loc:
        if src_loc == tgt_loc:
            score += 0.4
        elif src_loc in tgt_loc or tgt_loc in src_loc:
            score += 0.25

    # 3. Object tag overlaps (0.2 of context score)
    src_objs = set(source_item.get("detected_objects", []))
    tgt_objs = set(target_item.get("detected_objects", []))
    if src_objs and tgt_objs:
        if src_objs.intersection(tgt_objs):
            score += 0.2

    return min(1.0, score)


def compute_total_match_score(
    image_sim: Optional[float],
    text_sim: float,
    context_score: float,
    *,
    image_available: bool = True,
) -> float:
    """Compute the weighted total match score.

    Parameters
    ----------
    image_sim:
        CLIP cosine similarity between the two image embeddings.
        Ignored (and may be ``None``) when ``image_available=False``.
    text_sim:
        BGE text embedding cosine similarity.
    context_score:
        Location / category / tag heuristic score in [0, 1].
    image_available:
        ``True``  → both items have a real image embedding; use
                    WEIGHTS_WITH_IMAGE (0.60 / 0.25 / 0.15).
        ``False`` → at least one side has no image; use
                    WEIGHTS_TEXT_ONLY  (0.70 / 0.30).
    """
    if image_available and image_sim is not None:
        w = WEIGHTS_WITH_IMAGE
        total = w["image"] * image_sim + w["text"] * text_sim + w["context"] * context_score
    else:
        w = WEIGHTS_TEXT_ONLY
        total = w["text"] * text_sim + w["context"] * context_score

    return round(float(total), 4)
