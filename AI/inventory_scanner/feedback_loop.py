"""
YOLO-LoRA Feedback Loop System
Automatically logs YOLO errors corrected by LoRA for retraining.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


class YOLOFeedbackLogger:
    """
    Logs YOLO errors identified by LoRA for future YOLO retraining.
    Creates a feedback loop where LoRA's corrections improve YOLO over time.
    """

    def __init__(self, log_dir: str = './logs/yolo_feedback'):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def log_scan_result(self,
                       image_path: str,
                       yolo_detections: List[Dict],
                       pass1_inventory: Dict,
                       lora_inventory: Dict,
                       structured_data: Optional[Dict] = None):
        """
        Log a complete scan result including YOLO errors.

        Args:
            image_path: Path to floor plan image
            yolo_detections: Original YOLO detections
            pass1_inventory: Pass 1 (GPT-4o) output
            lora_inventory: Pass 2 (LoRA) corrected output
            structured_data: Full YOLO preprocessing data
        """
        # Analyze errors
        errors = self._identify_yolo_errors(
            yolo_detections,
            pass1_inventory,
            lora_inventory
        )

        if not errors:
            logger.debug("No significant YOLO errors detected")
            return

        # Create log entry
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'image_path': image_path,
            'yolo_detections': yolo_detections,
            'pass1_inventory': pass1_inventory,
            'lora_corrections': lora_inventory,
            'structured_data': structured_data,
            'errors_detected': errors,
            'error_count': len(errors),
            'status': 'pending_review',  # needs human verification
            'verified': False
        }

        # Save log
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        log_file = self.log_dir / f"feedback_{timestamp}.json"

        with open(log_file, 'w') as f:
            json.dump(log_entry, f, indent=2)

        logger.info(f"Logged {len(errors)} YOLO errors to: {log_file}")

    def _identify_yolo_errors(self,
                             yolo_detections: List[Dict],
                             pass1_inventory: Dict,
                             lora_inventory: Dict) -> List[Dict]:
        """
        Identify specific YOLO errors by comparing with LoRA corrections.

        Returns:
            List of error dicts with type, details, and confidence
        """
        errors = []

        # Count YOLO detections by class
        yolo_counts = {}
        for det in yolo_detections:
            cls = det.get('class', 'unknown')
            yolo_counts[cls] = yolo_counts.get(cls, 0) + 1

        # Count LoRA inventory by category
        lora_items = lora_inventory.get('items', [])
        lora_workstations = sum(
            item.get('count', 0) for item in lora_items
            if 'workstation' in item.get('name', '').lower()
        )
        lora_tables = sum(
            item.get('count', 0) for item in lora_items
            if ('conference' in item.get('name', '').lower() or
                'meeting' in item.get('name', '').lower()) and
               'table' in item.get('name', '').lower()
        )
        lora_storage = sum(
            item.get('count', 0) for item in lora_items
            if item.get('category') == 'Storage'
        )

        # Error 1: Workstation vs Conference Table Confusion
        yolo_conf_tables = yolo_counts.get('conference_table', 0)
        yolo_workstations = (
            yolo_counts.get('workstation_single', 0) +
            yolo_counts.get('workstation_l_shaped', 0) +
            yolo_counts.get('workstation_cluster', 0)
        )

        if yolo_conf_tables > 0 and lora_workstations > (yolo_workstations + yolo_conf_tables):
            # LoRA found more workstations than YOLO detected in total
            errors.append({
                'type': 'misclassification',
                'subtype': 'table_to_workstation',
                'yolo_detected': {
                    'conference_tables': yolo_conf_tables,
                    'workstations': yolo_workstations
                },
                'lora_found': {
                    'workstations': lora_workstations,
                    'tables': lora_tables
                },
                'confidence': 'high',
                'priority': 'critical',
                'description': f"YOLO detected {yolo_conf_tables} conference table(s), but LoRA found {lora_workstations} workstations"
            })

        # Error 2: Missing Storage Items (False Negatives)
        yolo_storage = (
            yolo_counts.get('pedestal', 0) +
            yolo_counts.get('storage_low', 0) +
            yolo_counts.get('storage_full', 0) +
            yolo_counts.get('credenza', 0) +
            yolo_counts.get('overhead_storage', 0)
        )

        if lora_storage > yolo_storage + 2:  # LoRA found 3+ more storage items
            errors.append({
                'type': 'false_negative',
                'subtype': 'missing_storage',
                'yolo_detected': {'storage_items': yolo_storage},
                'lora_found': {'storage_items': lora_storage},
                'confidence': 'high',
                'priority': 'high',
                'description': f"YOLO missed {lora_storage - yolo_storage} storage items"
            })

        # Error 3: Over-detection (False Positives)
        yolo_total = sum(yolo_counts.values())
        lora_total_count = sum(item.get('count', 0) for item in lora_items)

        if yolo_total > lora_total_count * 1.3:  # YOLO detected 30% more items
            errors.append({
                'type': 'false_positive',
                'subtype': 'over_detection',
                'yolo_detected': {'total_items': yolo_total},
                'lora_found': {'total_items': lora_total_count},
                'confidence': 'medium',
                'priority': 'medium',
                'description': f"YOLO over-detected: {yolo_total} vs LoRA's {lora_total_count}"
            })

        # Error 4: Category Misclassification
        for cls in yolo_counts:
            if cls in ['office_chair', 'visitor_chair']:
                yolo_chairs = yolo_counts.get('office_chair', 0) + yolo_counts.get('visitor_chair', 0)
                lora_chairs = sum(
                    item.get('count', 0) for item in lora_items
                    if item.get('category') == 'Seating'
                )

                if abs(yolo_chairs - lora_chairs) / max(yolo_chairs, 1) > 0.3:  # >30% difference
                    errors.append({
                        'type': 'count_mismatch',
                        'subtype': 'chair_count',
                        'yolo_detected': {'chairs': yolo_chairs},
                        'lora_found': {'chairs': lora_chairs},
                        'confidence': 'medium',
                        'priority': 'low',
                        'description': f"Chair count mismatch: YOLO {yolo_chairs}, LoRA {lora_chairs}"
                    })

        return errors

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics on logged YOLO errors.

        Returns:
            Dict with error statistics
        """
        stats = {
            'total_logs': 0,
            'total_errors': 0,
            'verified_logs': 0,
            'pending_review': 0,
            'error_types': {},
            'priority_breakdown': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        }

        for log_file in self.log_dir.glob('feedback_*.json'):
            with open(log_file) as f:
                try:
                    log_data = json.load(f)
                    stats['total_logs'] += 1

                    if log_data.get('verified', False):
                        stats['verified_logs'] += 1
                    else:
                        stats['pending_review'] += 1

                    errors = log_data.get('errors_detected', [])
                    stats['total_errors'] += len(errors)

                    for error in errors:
                        error_type = error.get('type', 'unknown')
                        stats['error_types'][error_type] = stats['error_types'].get(error_type, 0) + 1

                        priority = error.get('priority', 'medium')
                        stats['priority_breakdown'][priority] += 1

                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"Error reading log file {log_file}: {e}")

        return stats

    def export_for_retraining(self, output_dir: str = './dataset_corrections', verified_only: bool = True):
        """
        Export verified corrections in YOLO format for retraining.

        Args:
            output_dir: Directory to save corrected dataset
            verified_only: Only export human-verified corrections

        Returns:
            Number of corrections exported
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        corrections_exported = 0

        for log_file in self.log_dir.glob('feedback_*.json'):
            with open(log_file) as f:
                try:
                    log_data = json.load(f)

                    # Skip if not verified (if verified_only=True)
                    if verified_only and not log_data.get('verified', False):
                        continue

                    # Extract corrections
                    image_path = log_data['image_path']
                    lora_corrections = log_data['lora_corrections']
                    errors = log_data['errors_detected']

                    # Create corrected annotation file
                    correction_file = output_path / f"correction_{corrections_exported:04d}.json"

                    correction_data = {
                        'image_path': image_path,
                        'corrected_inventory': lora_corrections,
                        'errors_fixed': errors,
                        'original_log': str(log_file)
                    }

                    with open(correction_file, 'w') as cf:
                        json.dump(correction_data, cf, indent=2)

                    corrections_exported += 1

                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"Error processing log file {log_file}: {e}")

        logger.info(f"Exported {corrections_exported} corrections to {output_path}")
        return corrections_exported

    def verify_correction(self, log_id: str, verified: bool = True, notes: str = ""):
        """
        Mark a correction as human-verified.

        Args:
            log_id: Timestamp ID of the log file
            verified: Whether the correction is verified
            notes: Human verification notes
        """
        log_file = self.log_dir / f"feedback_{log_id}.json"

        if not log_file.exists():
            logger.error(f"Log file not found: {log_file}")
            return

        with open(log_file) as f:
            log_data = json.load(f)

        log_data['verified'] = verified
        log_data['verification_notes'] = notes
        log_data['verified_at'] = datetime.now().isoformat()
        log_data['status'] = 'verified' if verified else 'rejected'

        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)

        logger.info(f"Marked log {log_id} as {'verified' if verified else 'rejected'}")


# Global feedback logger instance
feedback_logger = YOLOFeedbackLogger()


def log_yolo_feedback(image_path: str,
                     yolo_detections: List[Dict],
                     pass1_inventory: Dict,
                     lora_inventory: Dict,
                     structured_data: Optional[Dict] = None):
    """
    Convenience function to log YOLO feedback.

    Args:
        image_path: Path to floor plan image
        yolo_detections: YOLO detections
        pass1_inventory: Pass 1 output
        lora_inventory: LoRA corrected output
        structured_data: Full preprocessing data
    """
    feedback_logger.log_scan_result(
        image_path,
        yolo_detections,
        pass1_inventory,
        lora_inventory,
        structured_data
    )
