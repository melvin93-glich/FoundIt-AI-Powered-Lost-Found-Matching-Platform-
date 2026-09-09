from sentence_transformers import SentenceTransformer
import numpy as np

class TextEmbeddingService:
    def __init__(self):
        self.model = None

    def _load_model(self):
        if self.model is None:
            print("Loading BGE text model (BAAI/bge-small-en-v1.5)...")
            self.model = SentenceTransformer("BAAI/bge-small-en-v1.5")
            print("BGE text model loaded successfully.")

    def get_text_embedding(self, text: str) -> list:
        """
        Extracts normalized 384-dim text embedding using BAAI/bge-small-en-v1.5
        """
        try:
            if not text or not text.strip():
                return [0.0] * 384
            self._load_model()
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            print(f"Error extracting BGE text embedding: {e}")
            return [0.0] * 384

text_service = TextEmbeddingService()
