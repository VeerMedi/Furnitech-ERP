import os
import fitz  # PyMuPDF
import base64
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the same directory as this file
current_dir = Path(__file__).parent
load_dotenv(current_dir / '.env')

def convert_pdf_to_images(pdf_path):
    """
    Converts a PDF file to a list of base64 encoded images (one per page).
    Returns:
        List[Dict]: [{'page': 1, 'image_base64': '...'}]
    """
    # Get resolution multiplier from .env (default to 2 if not set)
    resolution_multiplier = float(os.getenv("DIMENSION_SCAN_RESOLUTION_MULTIPLIER", "2"))

    results = []
    try:
        doc = fitz.open(pdf_path)
        for i in range(len(doc)):
            page = doc.load_page(i)
            # Use dynamic resolution from .env for better OCR of small text
            pix = page.get_pixmap(matrix=fitz.Matrix(resolution_multiplier, resolution_multiplier))
            img_data = pix.tobytes("png")
            base64_str = base64.b64encode(img_data).decode('utf-8')
            results.append({
                "page": i + 1,
                "image_base64": base64_str
            })
        doc.close()
    except Exception as e:
        print(f"Error processing PDF {pdf_path}: {e}")
        return []

    return results


def extract_images_from_pdf(pdf_path):
    """
    Extract raw image bytes from PDF pages (for testing/analysis).
    Returns:
        List[bytes]: List of PNG image data as bytes
    """
    resolution_multiplier = float(os.getenv("DIMENSION_SCAN_RESOLUTION_MULTIPLIER", "2"))

    images = []
    try:
        doc = fitz.open(pdf_path)
        for i in range(len(doc)):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=fitz.Matrix(resolution_multiplier, resolution_multiplier))
            img_data = pix.tobytes("png")
            images.append(img_data)
        doc.close()
    except Exception as e:
        print(f"Error extracting images from PDF {pdf_path}: {e}")
        return []

    return images
