"""
Data Linking Module
Links YOLO detections to zones and OCR text snippets based on spatial relationships.
"""

import logging
import math
from typing import List, Dict, Any
from shapely.geometry import Point, Polygon

logger = logging.getLogger(__name__)


def link_detections_to_zones(detections: List[Dict], zones: List[Dict]) -> List[Dict]:
    """
    Assign each detection to a zone based on spatial containment.
    Uses point-in-polygon testing with detection centroid.

    Args:
        detections: List of YOLO detection dictionaries
        zones: List of zone dictionaries with polygons

    Returns:
        Detections with zone_id and zone_name populated
    """
    if not zones:
        logger.warning("No zones provided for detection linking")
        return detections

    logger.info(f"Linking {len(detections)} detections to {len(zones)} zones")

    assigned_count = 0

    for detection in detections:
        centroid = detection.get('centroid', [0, 0])
        point = Point(centroid[0], centroid[1])

        # Try to find a zone containing this detection
        assigned = False
        for zone in zones:
            try:
                # Create polygon from zone
                zone_polygon = Polygon(zone['polygon'])

                if zone_polygon.contains(point):
                    detection['zone_id'] = zone['zone_id']
                    detection['zone_name'] = zone.get('zone_name', 'Unnamed Zone')
                    assigned = True
                    assigned_count += 1
                    break

            except Exception as e:
                logger.warning(f"Error checking polygon containment: {e}")
                continue

        # If no zone found, mark as "Open Area"
        if not assigned:
            detection['zone_id'] = 'zone_unassigned'
            detection['zone_name'] = 'Open Area'

    logger.info(f"Assigned {assigned_count}/{len(detections)} detections to zones")

    return detections


def link_ocr_to_detections(detections: List[Dict],
                           ocr_snippets: List[Dict],
                           max_distance: float = 100.0) -> List[Dict]:
    """
    Link OCR text to nearby detections based on proximity.
    Associates dimension text with furniture items.

    Args:
        detections: List of YOLO detection dictionaries
        ocr_snippets: List of OCR text dictionaries
        max_distance: Maximum distance (pixels) for linking

    Returns:
        Detections with ocr_text and ocr_confidence populated
    """
    if not ocr_snippets:
        logger.warning("No OCR snippets provided for detection linking")
        return detections

    logger.info(f"Linking {len(ocr_snippets)} OCR snippets to {len(detections)} detections")

    linked_count = 0

    for detection in detections:
        det_centroid = detection.get('centroid', [0, 0])

        # Find closest OCR snippet
        closest_snippet = None
        min_distance = max_distance

        for snippet in ocr_snippets:
            ocr_centroid = snippet.get('centroid', [0, 0])

            # Calculate Euclidean distance
            distance = euclidean_distance(det_centroid, ocr_centroid)

            if distance < min_distance:
                min_distance = distance
                closest_snippet = snippet

        # Link if found within threshold
        if closest_snippet:
            detection['ocr_text'] = closest_snippet['text']
            detection['ocr_confidence'] = closest_snippet['confidence']
            detection['ocr_distance'] = round(min_distance, 1)
            linked_count += 1

    logger.info(f"Linked {linked_count}/{len(detections)} detections to OCR text")

    return detections


def link_ocr_to_zones(zones: List[Dict], ocr_snippets: List[Dict]) -> List[Dict]:
    """
    Link OCR text to zones to identify room names and labels.
    Used by ZoneDetector.label_zones_with_ocr() as well.

    Args:
        zones: List of zone dictionaries
        ocr_snippets: List of OCR text dictionaries

    Returns:
        Zones with labels populated
    """
    if not ocr_snippets:
        logger.warning("No OCR snippets provided for zone labeling")
        return zones

    logger.info(f"Linking {len(ocr_snippets)} OCR snippets to {len(zones)} zones")

    for zone in zones:
        zone_bbox = zone.get('bbox', [0, 0, 0, 0])

        # Find OCR text within this zone
        zone_texts = []
        for snippet in ocr_snippets:
            ocr_centroid = snippet.get('centroid', [0, 0])

            # Check if OCR text centroid is inside zone bbox
            if point_in_bbox(ocr_centroid, zone_bbox):
                zone_texts.append({
                    'text': snippet['text'],
                    'confidence': snippet['confidence'],
                    'pattern_type': snippet.get('pattern_type', 'label')
                })

        zone['labels'] = zone_texts

        # Try to extract a zone name from labels
        if not zone.get('zone_name') or zone['zone_name'] == "Unnamed Zone":
            zone_name = extract_zone_name(zone_texts)
            zone['zone_name'] = zone_name

    return zones


def euclidean_distance(point1: List[float], point2: List[float]) -> float:
    """
    Calculate Euclidean distance between two points.

    Args:
        point1: [x, y] coordinates
        point2: [x, y] coordinates

    Returns:
        Distance in pixels
    """
    x1, y1 = point1[:2]
    x2, y2 = point2[:2]

    distance = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    return distance


def point_in_bbox(point: List[float], bbox: List[int]) -> bool:
    """
    Check if a point is inside a bounding box.

    Args:
        point: [x, y] coordinates
        bbox: [x1, y1, x2, y2] bounding box

    Returns:
        True if point is inside bbox
    """
    x, y = point[:2]
    x1, y1, x2, y2 = bbox[:4]
    return x1 <= x <= x2 and y1 <= y <= y2


def extract_zone_name(labels: List[Dict]) -> str:
    """
    Extract a meaningful zone name from OCR labels.

    Args:
        labels: List of label dicts with 'text', 'confidence', and 'pattern_type'

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

    # Priority 1: Labels explicitly marked as room_label
    room_labels = [l for l in labels if l.get('pattern_type') == 'room_label']
    if room_labels:
        room_labels.sort(key=lambda x: x['confidence'], reverse=True)
        return room_labels[0]['text']

    # Priority 2: Labels containing room keywords
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
        candidate_names.sort(key=lambda x: x['confidence'], reverse=True)
        return candidate_names[0]['text']

    # Priority 3: Longest label (likely to be descriptive)
    non_dimension_labels = [
        l for l in labels
        if l.get('pattern_type') not in ['dimensions', 'furniture_code']
    ]

    if non_dimension_labels:
        labels_sorted = sorted(non_dimension_labels, key=lambda x: len(x['text']), reverse=True)
        return labels_sorted[0]['text']

    return "Unnamed Zone"


def get_linking_summary(detections: List[Dict], zones: List[Dict]) -> Dict[str, Any]:
    """
    Get summary statistics of linking results.

    Args:
        detections: List of detection dictionaries
        zones: List of zone dictionaries

    Returns:
        Summary dict with statistics
    """
    summary = {
        'total_detections': len(detections),
        'total_zones': len(zones),
        'detections_with_zones': 0,
        'detections_with_ocr': 0,
        'zones_with_labels': 0,
        'detections_by_zone': {}
    }

    for detection in detections:
        if detection.get('zone_id') and detection['zone_id'] != 'zone_unassigned':
            summary['detections_with_zones'] += 1

            zone_name = detection.get('zone_name', 'Unknown')
            summary['detections_by_zone'][zone_name] = summary['detections_by_zone'].get(zone_name, 0) + 1

        if detection.get('ocr_text'):
            summary['detections_with_ocr'] += 1

    for zone in zones:
        if zone.get('labels') and len(zone['labels']) > 0:
            summary['zones_with_labels'] += 1

    return summary
