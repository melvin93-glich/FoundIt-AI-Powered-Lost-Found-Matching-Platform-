from ultralytics import YOLO
from PIL import Image
import io
import requests
from typing import List

class YOLOService:
    def __init__(self):
        self.model = None

    def _load_model(self):
        if self.model is None:
            print("Loading YOLOv8n model...")
            self.model = YOLO("yolov8n.pt")
            print("YOLOv8n loaded successfully.")

    def detect_objects(self, image_input) -> List[str]:
        """
        Runs YOLOv8n object detection on image and returns list of unique detected object labels.
        """
        try:
            self._load_model()
            if isinstance(image_input, str) and (image_input.startswith("http://") or image_input.startswith("https://")):
                response = requests.get(image_input, timeout=10)
                image = Image.open(io.BytesIO(response.content)).convert("RGB")
            elif isinstance(image_input, bytes):
                image = Image.open(io.BytesIO(image_input)).convert("RGB")
            elif isinstance(image_input, Image.Image):
                image = image_input
            else:
                return []

            results = self.model(image, verbose=False)
            labels = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    label = self.model.names[cls_id]
                    if label not in labels:
                        labels.append(label)
            return labels
        except Exception as e:
            print(f"YOLO detection failed: {e}")
            return []

yolo_service = YOLOService()
