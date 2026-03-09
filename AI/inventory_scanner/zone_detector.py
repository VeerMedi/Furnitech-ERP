"""
Zone Detection Module for Floor Plan Analysis
Extracts room boundaries and zones using OpenCV contour detection.
"""

import cv2
import numpy as np
import logging
from typing import List, Dict, Any, Tuple
import uuid

logger = logging.getLogger(__name__)


class ZoneDetector:
    """
    Detects room boundaries and zones in floor plan images using computer vision.
    Uses edge detection, contour detection, and geometric filtering.
    """

    def __init__(self,
                 min_zone_area: int = 5000,
                 rectangularity_threshold: float = 0.5):
        """
        Initialize the zone detector.

        Args:
            min_zone_area: Minimum area in square pixels for a zone
            rectangularity_threshold: Minimum rectangularity score (0-1)
        """
        self.min_zone_area = min_zone_area
        self.rectangularity_threshold = rectangularity_threshold

    def detect_zones(self, image_path: str) -> List[Dict[str, Any]]:
        """
        Detect zones/rooms in a floor plan image.

        Args:
            image_path: Path to the floor plan image

        Returns:
            List of zone dictionaries with polygons and metadata
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                logger.error(f"Failed to load image: {image_path}")
                return []

            # Detect room boundaries
            contours = self._extract_room_contours(image)

            # Filter and process contours
            zones = self._process_contours(contours, image.shape)

            logger.info(f"Detected {len(zones)} zones in {image_path}")
            return zones

        except Exception as e:
            logger.error(f"Zone detection failed: {e}")
            return []

    def _extract_room_contours(self, image: np.ndarray) -> List[np.ndarray]:
        """
        Extract room contours using edge detection and morphological operations.

        Args:
            image: Input image (BGR format from cv2.imread)

        Returns:
            List of contours (numpy arrays)
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Edge detection using Canny
        edges = cv2.Canny(blurred, 50, 150, apertureSize=3)

        # Morphological operations to close gaps in walls
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)

        # Find contours
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        return contours

    def _process_contours(self, contours: List[np.ndarray], image_shape: Tuple) -> List[Dict[str, Any]]:
        """
        Process and filter contours into zone objects.

        Args:
            contours: List of contours from cv2.findContours
            image_shape: Shape of the original image (height, width, channels)

        Returns:
            List of zone dictionaries
        """
        zones = []
        image_height, image_width = image_shape[:2]

        for contour in contours:
            # Calculate area
            area = cv2.contourArea(contour)

            # Filter by minimum area
            if area < self.min_zone_area:
                continue

            # Get bounding rectangle
            x, y, w, h = cv2.boundingRect(contour)

            # Skip if contour is nearly the entire image (probably outer boundary)
            if area > 0.9 * (image_width * image_height):
                continue

            # Calculate rectangularity (how rectangular is the contour)
            rect_area = w * h
            rectangularity = area / rect_area if rect_area > 0 else 0

            # Filter by rectangularity (rooms are usually rectangular)
            if rectangularity < self.rectangularity_threshold:
                continue

            # Approximate polygon
            perimeter = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)

            # Convert polygon to list of [x, y] points
            polygon = [[int(point[0][0]), int(point[0][1])] for point in approx]

            # Create zone object
            zone = {
                'zone_id': f"zone_{uuid.uuid4().hex[:8]}",
                'zone_name': None,  # Will be labeled by OCR
                'polygon': polygon,
                'bbox': [int(x), int(y), int(x + w), int(y + h)],
                'area_sqpx': int(area),
                'centroid': [int(x + w / 2), int(y + h / 2)],
                'rectangularity': round(rectangularity, 2),
                'labels': []  # Will be populated by label_zones_with_ocr
            }

            zones.append(zone)

        # Sort zones by area (largest first)
        zones.sort(key=lambda z: z['area_sqpx'], reverse=True)

        return zones

    def label_zones_with_ocr(self, image_path: str, zones: List[Dict], ocr_results: List[Dict]) -> List[Dict]:
        """
        Match OCR text to zones to identify room names.

        Args:
            image_path: Path to the image (for reference)
            zones: List of zone dictionaries
            ocr_results: OCR results with text and bounding boxes

        Returns:
            Zones with labels populated
        """
        if not ocr_results:
            logger.warning("No OCR results provided for zone labeling")
            return zones

        # Match OCR text to zones based on spatial overlap
        for zone in zones:
            zone_bbox = zone['bbox']  # [x1, y1, x2, y2]

            # Find OCR text within this zone
            zone_texts = []
            for ocr in ocr_results:
                ocr_centroid = ocr.get('centroid', [0, 0])

                # Check if OCR text centroid is inside zone bbox
                if self._point_in_bbox(ocr_centroid, zone_bbox):
                    zone_texts.append({
                        'text': ocr['text'],
                        'confidence': ocr.get('confidence', 0)
                    })

            zone['labels'] = zone_texts

            # Try to extract a zone name from labels
            zone_name = self._extract_zone_name(zone_texts)
            zone['zone_name'] = zone_name

        return zones

    def _point_in_bbox(self, point: List[float], bbox: List[int]) -> bool:
        """
        Check if a point is inside a bounding box.

        Args:
            point: [x, y] coordinates
            bbox: [x1, y1, x2, y2] bounding box

        Returns:
            True if point is inside bbox
        """
        x, y = point
        x1, y1, x2, y2 = bbox
        return x1 <= x <= x2 and y1 <= y <= y2

    def _extract_zone_name(self, labels: List[Dict]) -> str:
        """
        Extract a meaningful zone name from OCR labels.

        Args:
            labels: List of label dicts with 'text' and 'confidence'

        Returns:
            Best guess for zone name, or generic name
        """
        if not labels:
            return "Unnamed Zone"

        # Keywords that indicate room names
        room_keywords = [
            'CONFERENCE', 'MEETING', 'CABIN', 'WORKSTATION', 'RECEPTION',
            'OFFICE', 'ROOM', 'AREA', 'DESK', 'EXECUTIVE', 'MANAGER',
            'BILLING', 'QA', 'QC', 'SAFETY', 'PLANNING', 'HR', 'ADMIN',
            'CAFETERIA', 'PANTRY', 'RESTROOM', 'STORAGE', 'SERVER'
        ]

        # Find labels that contain room keywords
        candidate_names = []
        for label in labels:
            text = label['text'].upper()
            for keyword in room_keywords:
                if keyword in text:
                    candidate_names.append({
                        'text': label['text'],
                        'confidence': label['confidence']
                    })
                    break

        if candidate_names:
            # Return the most confident room name
            candidate_names.sort(key=lambda x: x['confidence'], reverse=True)
            return candidate_names[0]['text']

        # Fallback: return the longest label (likely to be descriptive)
        if labels:
            labels_sorted = sorted(labels, key=lambda x: len(x['text']), reverse=True)
            return labels_sorted[0]['text']

        return "Unnamed Zone"

    def create_default_zone(self, image_path: str) -> List[Dict]:
        """
        Create a default zone covering the entire image.
        Used as fallback when zone detection fails.

        Args:
            image_path: Path to the image

        Returns:
            List with a single default zone
        """
        try:
            image = cv2.imread(image_path)
            if image is None:
                # If image can't be loaded, use arbitrary large dimensions
                height, width = 2000, 2000
            else:
                height, width = image.shape[:2]

            default_zone = {
                'zone_id': 'zone_default',
                'zone_name': 'Entire Floor Plan',
                'polygon': [[0, 0], [width, 0], [width, height], [0, height]],
                'bbox': [0, 0, width, height],
                'area_sqpx': width * height,
                'centroid': [width // 2, height // 2],
                'rectangularity': 1.0,
                'labels': []
            }

            logger.info("Created default zone covering entire image")
            return [default_zone]

        except Exception as e:
            logger.error(f"Failed to create default zone: {e}")
            return []


# Convenience function
def detect_zones(image_path: str,
                 min_zone_area: int = 5000,
                 rectangularity_threshold: float = 0.5) -> List[Dict[str, Any]]:
    """
    Convenience function to detect zones in a single image.

    Args:
        image_path: Path to the floor plan image
        min_zone_area: Minimum area for a zone
        rectangularity_threshold: Minimum rectangularity score

    Returns:
        List of zone dictionaries
    """
    detector = ZoneDetector(min_zone_area, rectangularity_threshold)
    return detector.detect_zones(image_path)
