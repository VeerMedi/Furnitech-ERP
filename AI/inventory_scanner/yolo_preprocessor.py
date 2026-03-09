"""
YOLO Preprocessor - Main Orchestrator
Coordinates YOLO detection, zone extraction, OCR, and data linking.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from .yolo_inference import FurnitureDetector
from .zone_detector import ZoneDetector
from .ocr_extractor import OCRExtractor
from .data_linker import (
    link_detections_to_zones,
    link_ocr_to_detections,
    link_ocr_to_zones,
    get_linking_summary
)

logger = logging.getLogger(__name__)


class YOLOPreprocessor:
    """
    Main preprocessing orchestrator for the YOLO-enhanced pipeline.
    Runs YOLO detection, zone extraction, OCR, and links data spatially.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the YOLO preprocessor.

        Args:
            config: Configuration dict with settings. If None, loads from environment.
        """
        self.config = config or self._load_config_from_env()

        # Initialize components (lazy loading)
        self.furniture_detector = None
        self.zone_detector = None
        self.ocr_extractor = None

    def _load_config_from_env(self) -> Dict[str, Any]:
        """Load configuration from environment variables."""
        return {
            'enable_yolo': os.getenv('ENABLE_YOLO_PREPROCESSING', 'true').lower() == 'true',
            'enable_zone_detection': os.getenv('ENABLE_ZONE_DETECTION', 'true').lower() == 'true',
            'enable_ocr': os.getenv('ENABLE_OCR_PREPROCESSING', 'true').lower() == 'true',
            'yolo_model_path': os.getenv('YOLO_MODEL_PATH', './models/furniture_floorplan_v1.pt'),
            'yolo_confidence_threshold': float(os.getenv('YOLO_CONFIDENCE_THRESHOLD', '0.4')),
            'zone_min_area': int(os.getenv('ZONE_MIN_AREA', '5000')),
            'zone_rectangularity': float(os.getenv('ZONE_RECTANGULARITY_THRESHOLD', '0.5')),
            'ocr_gpu': os.getenv('OCR_GPU', 'true').lower() == 'true',
            'ocr_max_distance': float(os.getenv('OCR_MAX_LINK_DISTANCE', '100.0')),
            'fallback_to_image_only': os.getenv('FALLBACK_TO_IMAGE_ONLY', 'true').lower() == 'true',
        }

    def process(self, image_path: str) -> Dict[str, Any]:
        """
        Run the complete preprocessing pipeline.

        Args:
            image_path: Path to the floor plan image

        Returns:
            Structured data dict with yolo_detections, zones, ocr_text_snippets, metadata
        """
        start_time = time.time()

        # Initialize result structure
        structured_data = {
            'yolo_detections': [],
            'zones': [],
            'ocr_text_snippets': [],
            'metadata': {
                'yolo_success': False,
                'zone_success': False,
                'ocr_success': False,
                'fallback_mode': False,
                'preprocessing_time_ms': 0,
                'yolo_model': None,
                'ocr_engine': 'easyocr',
                'config': self.config
            }
        }

        # Validate image path
        if not os.path.exists(image_path):
            logger.error(f"Image not found: {image_path}")
            structured_data['metadata']['fallback_mode'] = True
            return structured_data

        logger.info(f"Starting preprocessing pipeline for: {image_path}")

        # Step 1: YOLO Detection
        if self.config['enable_yolo']:
            try:
                structured_data['yolo_detections'] = self._run_yolo_detection(image_path)
                structured_data['metadata']['yolo_success'] = len(structured_data['yolo_detections']) > 0
                structured_data['metadata']['yolo_model'] = self.config['yolo_model_path']
            except Exception as e:
                logger.error(f"YOLO detection failed: {e}. Continuing with empty detections.")
                structured_data['metadata']['yolo_success'] = False

        # Step 2: Zone Detection
        if self.config['enable_zone_detection']:
            try:
                structured_data['zones'] = self._run_zone_detection(image_path)
                structured_data['metadata']['zone_success'] = len(structured_data['zones']) > 0
            except Exception as e:
                logger.error(f"Zone detection failed: {e}. Creating default zone.")
                structured_data['zones'] = self._create_default_zone(image_path)
                structured_data['metadata']['zone_success'] = False

        # If zone detection failed or disabled, create default zone
        if not structured_data['zones']:
            structured_data['zones'] = self._create_default_zone(image_path)

        # Step 3: OCR Extraction
        if self.config['enable_ocr']:
            try:
                structured_data['ocr_text_snippets'] = self._run_ocr_extraction(image_path)
                structured_data['metadata']['ocr_success'] = len(structured_data['ocr_text_snippets']) > 0
            except Exception as e:
                logger.error(f"OCR extraction failed: {e}. Continuing without OCR.")
                structured_data['metadata']['ocr_success'] = False

        # Step 4: Link Data
        try:
            structured_data = self._link_data(structured_data)
        except Exception as e:
            logger.error(f"Data linking failed: {e}")

        # Step 5: Determine fallback mode
        if not structured_data['metadata']['yolo_success'] and not structured_data['metadata']['zone_success']:
            logger.warning("Critical preprocessing failures. Enabling fallback mode.")
            structured_data['metadata']['fallback_mode'] = True

        # Calculate preprocessing time
        elapsed_time = (time.time() - start_time) * 1000
        structured_data['metadata']['preprocessing_time_ms'] = round(elapsed_time, 1)

        logger.info(f"Preprocessing complete in {elapsed_time:.1f}ms. "
                   f"YOLO: {len(structured_data['yolo_detections'])}, "
                   f"Zones: {len(structured_data['zones'])}, "
                   f"OCR: {len(structured_data['ocr_text_snippets'])}")

        return structured_data

    def _run_yolo_detection(self, image_path: str):
        """Run YOLO furniture detection."""
        if not self.furniture_detector:
            self.furniture_detector = FurnitureDetector(
                model_path=self.config['yolo_model_path'],
                confidence_threshold=self.config['yolo_confidence_threshold']
            )

        detections = self.furniture_detector.detect(image_path)
        logger.info(f"YOLO detected {len(detections)} objects")
        return detections

    def _run_zone_detection(self, image_path: str):
        """Run zone/room boundary detection."""
        if not self.zone_detector:
            self.zone_detector = ZoneDetector(
                min_zone_area=self.config['zone_min_area'],
                rectangularity_threshold=self.config['zone_rectangularity']
            )

        zones = self.zone_detector.detect_zones(image_path)
        logger.info(f"Detected {len(zones)} zones")
        return zones

    def _run_ocr_extraction(self, image_path: str):
        """Run OCR text extraction."""
        if not self.ocr_extractor:
            self.ocr_extractor = OCRExtractor(
                use_gpu=self.config['ocr_gpu']
            )

        ocr_snippets = self.ocr_extractor.extract_text(image_path)
        logger.info(f"Extracted {len(ocr_snippets)} OCR text snippets")
        return ocr_snippets

    def _link_data(self, structured_data: Dict) -> Dict:
        """Link detections to zones and OCR text."""
        detections = structured_data['yolo_detections']
        zones = structured_data['zones']
        ocr_snippets = structured_data['ocr_text_snippets']

        # Link detections to zones
        if detections and zones:
            detections = link_detections_to_zones(detections, zones)
            structured_data['yolo_detections'] = detections

        # Link OCR to detections
        if detections and ocr_snippets:
            detections = link_ocr_to_detections(
                detections,
                ocr_snippets,
                max_distance=self.config['ocr_max_distance']
            )
            structured_data['yolo_detections'] = detections

        # Link OCR to zones (for room labels)
        if zones and ocr_snippets:
            zones = link_ocr_to_zones(zones, ocr_snippets)
            structured_data['zones'] = zones

        # Add linking summary to metadata
        summary = get_linking_summary(detections, zones)
        structured_data['metadata']['linking_summary'] = summary

        return structured_data

    def _create_default_zone(self, image_path: str):
        """Create a default zone covering the entire image."""
        if not self.zone_detector:
            self.zone_detector = ZoneDetector()

        default_zone = self.zone_detector.create_default_zone(image_path)
        logger.info("Created default zone for entire image")
        return default_zone

    def get_preprocessing_summary(self, structured_data: Dict) -> str:
        """
        Get a human-readable summary of preprocessing results.

        Args:
            structured_data: Structured data dict from process()

        Returns:
            Summary string
        """
        metadata = structured_data['metadata']
        num_detections = len(structured_data['yolo_detections'])
        num_zones = len(structured_data['zones'])
        num_ocr = len(structured_data['ocr_text_snippets'])

        summary = f"""
Preprocessing Summary:
- YOLO Detections: {num_detections} {'✓' if metadata['yolo_success'] else '✗'}
- Zones: {num_zones} {'✓' if metadata['zone_success'] else '✗'}
- OCR Snippets: {num_ocr} {'✓' if metadata['ocr_success'] else '✗'}
- Processing Time: {metadata['preprocessing_time_ms']:.1f}ms
- Fallback Mode: {'Yes' if metadata['fallback_mode'] else 'No'}
"""

        if 'linking_summary' in metadata:
            link_sum = metadata['linking_summary']
            summary += f"""
Linking Summary:
- Detections with Zones: {link_sum['detections_with_zones']}/{link_sum['total_detections']}
- Detections with OCR: {link_sum['detections_with_ocr']}/{link_sum['total_detections']}
- Zones with Labels: {link_sum['zones_with_labels']}/{link_sum['total_zones']}
"""

        return summary.strip()


# Convenience function
def preprocess_floor_plan(image_path: str, config: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Convenience function to preprocess a floor plan image.

    Args:
        image_path: Path to the floor plan image
        config: Optional configuration dict

    Returns:
        Structured data dict
    """
    preprocessor = YOLOPreprocessor(config)
    return preprocessor.process(image_path)
