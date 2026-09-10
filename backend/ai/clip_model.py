import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import requests
import numpy as np

class CLIPService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

    def _load_model(self):
        if self.model is None:
            print("Loading CLIP model (openai/clip-vit-base-patch32)...")
            self.model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
            self.processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
            print("CLIP model loaded successfully.")

    def get_image_embedding(self, image_input) -> list:
        """
        Accepts PIL Image, image bytes, or image URL. Returns 512-dim normalized embedding list.
        """
        try:
            self._load_model()
            if isinstance(image_input, str) and (image_input.startswith("http://") or image_input.startswith("https://")):
                response = requests.get(image_input, timeout=10)
                image = Image.open(io.BytesIO(response.content)).convert("RGB")
            elif isinstance(image_input, bytes):
                image = Image.open(io.BytesIO(image_input)).convert("RGB")
            elif isinstance(image_input, Image.Image):
                image = image_input.convert("RGB")
            else:
                # Return dummy zero vector if image unavailable
                return [0.0] * 512

            inputs = self.processor(images=image, return_tensors="pt").to(self.device)
            with torch.no_grad():
                features = self.model.get_image_features(**inputs)
                if hasattr(features, "image_embeds"):
                    image_features = features.image_embeds
                elif hasattr(features, "pooler_output"):
                    image_features = features.pooler_output
                else:
                    image_features = features
                # Normalize embedding
                image_features = image_features / torch.norm(image_features, p=2, dim=-1, keepdim=True)
            
            return image_features.cpu().numpy()[0].tolist()
        except Exception as e:
            print(f"Error extracting CLIP embedding: {e}")
            return [0.0] * 512

clip_service = CLIPService()
