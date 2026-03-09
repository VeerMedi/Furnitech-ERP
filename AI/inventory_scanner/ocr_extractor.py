"""
OCR Extraction Module for Floor Plan Text
Extracts text snippets, especially dimensions, from floor plan images using EasyOCR.
"""

import re
import logging
from typing import List, Dict, Any, Optional
import os

logger = logging.getLogger(__name__)


class OCRExtractor:
    """
    Extracts text from floor plan images with focus on dimensions and labels.
    Uses EasyOCR for robust text detection with rotated text support.
    """

    def __init__(self, use_gpu: bool = True, languages: List[str] = None):
        """
        Initialize the OCR extractor.

        Args:
            use_gpu: Use GPU acceleration if available
            languages: List of language codes (default: ['en'])
        """
        self.use_gpu = use_gpu and self._check_gpu_available()
        self.languages = languages or ['en']
        self.reader = None
        self.reader_loaded = False

    def _check_gpu_available(self) -> bool:
        """Check if GPU is available for EasyOCR."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def load_reader(self):
        """Load the EasyOCR reader. Lazy loading on first use."""
        if self.reader_loaded:
            return

        try:
            import easyocr

            logger.info(f"Loading EasyOCR reader (GPU: {self.use_gpu}, Languages: {self.languages})")
            self.reader = easyocr.Reader(
                self.languages,
                gpu=self.use_gpu,
                verbose=False
            )
            self.reader_loaded = True
            logger.info("EasyOCR reader loaded successfully")

        except ImportError:
            logger.error("EasyOCR not installed. Run: pip install easyocr")
            raise
        except Exception as e:
            logger.error(f"Failed to load EasyOCR reader: {e}")
            raise

    def extract_text(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Extract all text from a floor plan image.

        Args:
            image_path: Path to the floor plan image

        Returns:
            List of OCR result dictionaries
        """
        if not self.reader_loaded:
            self.load_reader()

        try:
            # Run OCR
            results = self.reader.readtext(image_path)

            # Parse results
            ocr_snippets = self.parse_ocr_results(results)

            logger.info(f"Extracted {len(ocr_snippets)} text snippets from {image_path}")
            return ocr_snippets

        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return []

    def parse_ocr_results(self, results: List) -> List[Dict[str, Any]]:
        """
        Parse EasyOCR results into structured format.

        Args:
            results: Raw OCR results from EasyOCR (list of [bbox, text, confidence])

        Returns:
            List of structured OCR dictionaries
        """
        ocr_snippets = []

        for bbox, text, confidence in results:
            # Calculate centroid from bbox
            # bbox is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            x_coords = [point[0] for point in bbox]
            y_coords = [point[1] for point in bbox]
            centroid = [
                sum(x_coords) / len(x_coords),
                sum(y_coords) / len(y_coords)
            ]

            # Classify text pattern
            pattern_type = self.classify_text_pattern(text)

            snippet = {
                'text': text.strip(),
                'bbox': bbox,
                'centroid': [round(centroid[0], 1), round(centroid[1], 1)],
                'confidence': round(confidence, 3),
                'pattern_type': pattern_type
            }

            ocr_snippets.append(snippet)

        return ocr_snippets

    def classify_text_pattern(self, text: str) -> str:
        """
        Classify text into pattern types (dimensions, labels, etc.).

        Args:
            text: OCR text string

        Returns:
            Pattern type classification
        """
        text_upper = text.upper()

        # Dimension patterns
        if self.is_dimension_text(text):
            return 'dimensions'

        # PAX (occupancy) pattern
        if re.search(r'\d+\s*PAX', text_upper):
            return 'occupancy'

        # NOS (number of items) pattern
        if re.search(r'\d+\s*NOS', text_upper):
            return 'count'

        # Furniture codes
        if re.search(r'(WKS|WS|TBL|MT|ST|FHS|LHS|MHS|OHS)', text_upper):
            return 'furniture_code'

        # Room keywords
        room_keywords = [
            'CONFERENCE', 'MEETING', 'CABIN', 'WORKSTATION', 'RECEPTION',
            'OFFICE', 'ROOM', 'AREA', 'DESK', 'EXECUTIVE', 'MANAGER',
            'BILLING', 'QA', 'QC', 'SAFETY', 'PLANNING'
        ]
        if any(keyword in text_upper for keyword in room_keywords):
            return 'room_label'

        # Generic label
        return 'label'

    def is_dimension_text(self, text: str) -> bool:
        """
        Check if text matches dimension patterns.

        Args:
            text: Text string to check

        Returns:
            True if text appears to be a dimension
        """
        # Dimension patterns to match
        patterns = [
            r'\d{3,4}\s*[xX×]\s*\d{3,4}',  # 1500x600, 1500 x 600
            r'\d{3,4}\s*[xX×]\s*\d{3,4}\s*[xX×]\s*\d{3,4}',  # 1500x600x750
            r'\d{3,4}\s*mm',  # 1500mm
            r'(WKS|WS|TBL|MT|ST)\s*\d{3,4}\s*[xX×]\s*\d{3,4}',  # WKS 1500x600
            r'F\.?H\.?S|L\.?H\.?S|M\.?H\.?S|O\.?H\.?S',  # Storage codes
        ]

        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True

        return False

    def filter_dimension_text(self, ocr_snippets: List[Dict]) -> List[Dict]:
        """
        Filter OCR results to only dimension-related text.

        Args:
            ocr_snippets: List of OCR dictionaries

        Returns:
            Filtered list containing only dimension text
        """
        dimension_snippets = [
            snippet for snippet in ocr_snippets
            if snippet['pattern_type'] in ['dimensions', 'furniture_code']
        ]

        logger.info(f"Filtered dimension text: {len(dimension_snippets)}/{len(ocr_snippets)}")
        return dimension_snippets

    def extract_dimension_value(self, text: str) -> Optional[str]:
        """
        Extract standardized dimension value from text.

        Args:
            text: Text containing dimension

        Returns:
            Standardized dimension string (e.g., "1500x600x750mm") or None
        """
        # Pattern: 3-4 digits x 3-4 digits (x 3-4 digits)
        pattern = r'(\d{3,4})\s*[xX×]\s*(\d{3,4})(?:\s*[xX×]\s*(\d{3,4}))?'
        match = re.search(pattern, text)

        if match:
            width = match.group(1)
            depth = match.group(2)
            height = match.group(3) if match.group(3) else None

            if height:
                return f"{width}x{depth}x{height}mm"
            else:
                return f"{width}x{depth}mm"

        return None

    def get_ocr_summary(self, ocr_snippets: List[Dict]) -> Dict[str, Any]:
        """
        Get summary statistics of OCR extraction.

        Args:
            ocr_snippets: List of OCR dictionaries

        Returns:
            Summary dict with counts by pattern type
        """
        summary = {
            'total_snippets': len(ocr_snippets),
            'by_pattern': {}
        }

        for snippet in ocr_snippets:
            pattern = snippet['pattern_type']
            summary['by_pattern'][pattern] = summary['by_pattern'].get(pattern, 0) + 1

        return summary


# Convenience function
def extract_text_from_image(image_path: str,
                            use_gpu: bool = True,
                            filter_dimensions: bool = False) -> List[Dict[str, Any]]:
    """
    Convenience function to extract text from a single image.

    Args:
        image_path: Path to the floor plan image
        use_gpu: Use GPU acceleration if available
        filter_dimensions: If True, only return dimension-related text

    Returns:
        List of OCR dictionaries
    """
    extractor = OCRExtractor(use_gpu=use_gpu)
    snippets = extractor.extract_text(image_path)

    if filter_dimensions:
        snippets = extractor.filter_dimension_text(snippets)

    return snippets
