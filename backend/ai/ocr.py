import easyocr
from PIL import Image
import io
import requests
import numpy as np

class OCRService:
    def __init__(self):
        self.reader = None

    def _load_reader(self):
        if self.reader is None:
            print("Loading EasyOCR reader...")
            self.reader = easyocr.Reader(['en'], gpu=False)
            print("EasyOCR reader initialized.")

    def extract_text(self, image_input) -> str:
        """
        Extracts visible text strings from an image (useful for serial numbers, name tags, brand names).
        """
        try:
            self._load_reader()
            if isinstance(image_input, str) and (image_input.startswith("http://") or image_input.startswith("https://")):
                response = requests.get(image_input, timeout=10)
                image_np = np.array(Image.open(io.BytesIO(response.content)).convert("RGB"))
            elif isinstance(image_input, bytes):
                image_np = np.array(Image.open(io.BytesIO(image_input)).convert("RGB"))
            elif isinstance(image_input, Image.Image):
                image_np = np.array(image_input.convert("RGB"))
            else:
                return ""

            results = self.reader.readtext(image_np)
            extracted_words = [res[1] for res in results if res[2] > 0.3]
            return " ".join(extracted_words)
        except Exception as e:
            print(f"OCR extraction failed: {e}")
            return ""

ocr_service = OCRService()
