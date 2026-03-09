"""
YOLO Inference Module for Furniture Detection
Wraps Ultralytics YOLOv8 for detecting furniture in floor plan drawings.
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import uuid

logger = logging.getLogger(__name__)


class FurnitureDetector:
    """
    YOLO-based furniture detector for floor plan analysis.
    Detects furniture objects and returns structured bounding box data.
    """

    # Furniture class mappings (15-20 custom classes)
    FURNITURE_CLASSES = {
        0: 'workstation_single',
        1: 'workstation_l_shaped',
        2: 'workstation_cluster',
        3: 'executive_desk',
        4: 'conference_table',
        5: 'meeting_table_small',
        6: 'cafeteria_table',
        7: 'reception_desk',
        8: 'office_chair',
        9: 'visitor_chair',
        10: 'sofa',
        11: 'pedestal',
        12: 'storage_low',
        13: 'storage_full',
        14: 'credenza',
        15: 'overhead_storage',
        16: 'zone_boundary',
    }

    def __init__(self, model_path: Optional[str] = None, confidence_threshold: float = 0.4):
        """
        Initialize the furniture detector.

        Args:
            model_path: Path to custom trained YOLO model (.pt file)
            confidence_threshold: Minimum confidence for detections (0-1)
        """
        self.model_path = model_path or os.getenv('YOLO_MODEL_PATH', './models/furniture_floorplan_v1.pt')
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.model_loaded = False

    def load_model(self):
        """Load the YOLO model. Lazy loading on first use."""
        if self.model_loaded:
            return

        try:
            from ultralytics import YOLO

            if not os.path.exists(self.model_path):
                logger.warning(f"Custom YOLO model not found at {self.model_path}. Using YOLOv8m pretrained model as fallback.")
                # Fallback to pretrained YOLOv8m (will detect general objects)
                self.model = YOLO('yolov8m.pt')
            else:
                self.model = YOLO(self.model_path)
                logger.info(f"Loaded custom YOLO model from {self.model_path}")

            self.model_loaded = True

        except ImportError:
            logger.error("Ultralytics YOLO not installed. Run: pip install ultralytics")
            raise
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise

    def detect(self, image_path: str, imgsz: int = 1280) -> List[Dict[str, Any]]:
        """
        Run YOLO inference on a floor plan image.

        Args:
            image_path: Path to the image file
            imgsz: Input image size (default 1280 for high-res floor plans)

        Returns:
            List of detection dictionaries with structured data
        """
        if not self.model_loaded:
            self.load_model()

        try:
            # Run YOLO inference
            results = self.model(
                image_path,
                conf=self.confidence_threshold,
                imgsz=imgsz,
                verbose=False
            )

            # Parse results
            detections = self.parse_results(results)

            logger.info(f"YOLO detected {len(detections)} objects in {image_path}")
            return detections

        except Exception as e:
            logger.error(f"YOLO inference failed: {e}")
            return []

    def parse_results(self, results) -> List[Dict[str, Any]]:
        """
        Parse YOLO results into structured detection format.

        Args:
            results: YOLO results object

        Returns:
            List of detection dictionaries
        """
        detections = []

        # YOLO returns a list of Results objects (one per image)
        for result in results:
            boxes = result.boxes

            if boxes is None or len(boxes) == 0:
                continue

            # Extract box data
            for i, box in enumerate(boxes):
                # Get bbox coordinates [x1, y1, x2, y2]
                bbox = box.xyxy[0].cpu().numpy().tolist()

                # Get class and confidence
                class_id = int(box.cls[0].cpu().numpy())
                confidence = float(box.conf[0].cpu().numpy())

                # Get class name (use custom mapping or model names)
                class_name = self.get_class_name(class_id, result.names)

                # Calculate centroid
                x1, y1, x2, y2 = bbox
                centroid = [(x1 + x2) / 2, (y1 + y2) / 2]

                # Create detection dict
                detection = {
                    'detection_id': f"det_{uuid.uuid4().hex[:8]}",
                    'class': class_name,
                    'confidence': round(confidence, 3),
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'centroid': [round(centroid[0], 1), round(centroid[1], 1)],
                    'zone_id': None,  # Will be assigned by zone detector
                    'zone_name': None,
                    'ocr_text': None,  # Will be assigned by OCR linker
                    'ocr_confidence': None
                }

                detections.append(detection)

        return detections

    def get_class_name(self, class_id: int, model_names: Dict) -> str:
        """
        Get human-readable class name.

        Args:
            class_id: Numeric class ID
            model_names: Class name mapping from model

        Returns:
            Class name string
        """
        # Try custom furniture classes first
        if class_id in self.FURNITURE_CLASSES:
            return self.FURNITURE_CLASSES[class_id]

        # Fallback to model's own class names (for pretrained models)
        if class_id in model_names:
            return model_names[class_id]

        return f"unknown_class_{class_id}"

    def filter_by_confidence(self, detections: List[Dict], min_confidence: float) -> List[Dict]:
        """
        Filter detections by confidence threshold.

        Args:
            detections: List of detection dicts
            min_confidence: Minimum confidence score

        Returns:
            Filtered list of detections
        """
        filtered = [d for d in detections if d['confidence'] >= min_confidence]
        logger.info(f"Filtered detections: {len(detections)} -> {len(filtered)} (conf >= {min_confidence})")
        return filtered

    def get_detection_summary(self, detections: List[Dict]) -> Dict[str, int]:
        """
        Get summary statistics of detections by class.

        Args:
            detections: List of detection dicts

        Returns:
            Dict mapping class names to counts
        """
        summary = {}
        for detection in detections:
            class_name = detection['class']
            summary[class_name] = summary.get(class_name, 0) + 1

        return summary


# Convenience function for quick detection
def detect_furniture(image_path: str,
                     model_path: Optional[str] = None,
                     confidence_threshold: float = 0.4) -> List[Dict[str, Any]]:
    """
    Convenience function to detect furniture in a single image.

    Args:
        image_path: Path to the floor plan image
        model_path: Optional path to custom YOLO model
        confidence_threshold: Minimum confidence for detections

    Returns:
        List of detection dictionaries
    """
    detector = FurnitureDetector(model_path, confidence_threshold)
    return detector.detect(image_path)
