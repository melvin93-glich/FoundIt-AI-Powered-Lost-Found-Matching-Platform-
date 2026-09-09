import numpy as np

def cosine_similarity(vec1: list, vec2: list) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def calculate_context_score(source_item: dict, target_item: dict) -> float:
    """
    Calculates context match score based on location proximity, category exactness, and date proximity.
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
        intersection = src_objs.intersection(tgt_objs)
        if intersection:
            score += 0.2

    return min(1.0, score)

def compute_total_match_score(image_sim: float, text_sim: float, context_score: float) -> float:
    """
    Formula: score = 0.6*image_similarity + 0.25*text_similarity + 0.15*context_score
    """
    total = (0.6 * image_sim) + (0.25 * text_sim) + (0.15 * context_score)
    return round(float(total), 4)
