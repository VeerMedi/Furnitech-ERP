import sys
import json
import traceback
import os
from pathlib import Path

# Add parent directory to path to allow imports if needed,
# though relative imports should work if run as a module
sys.path.append(str(Path(__file__).parent.parent))

try:
    from inventory_scanner.core import analyze_image, analyze_image_with_yolo
except ImportError:
    # Fallback if running directly from this folder
    from core import analyze_image, analyze_image_with_yolo

def process_scan_request(image_data, use_yolo=None):
    """
    Main entry point called by start_server.py

    Args:
        image_data: Base64 encoded image data
        use_yolo: Optional boolean to explicitly enable/disable YOLO.
                  If None, checks ENABLE_YOLO_PREPROCESSING from .env

    Returns:
        Dict with success, data, and debug information
    """
    if not image_data:
        return {"success": False, "error": "No image data provided"}

    # Basic validation of base64 string could verify header "data:image/..."
    # but the core logic handles the f-string formatting.
    # If the client sends "data:image/png;base64,..." we might need to strip it.

    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]

    # Determine whether to use YOLO
    # Priority: explicit parameter > environment variable > default (False for backward compat)
    if use_yolo is None:
        # Check environment variable
        use_yolo =  os.getenv('ENABLE_YOLO_PREPROCESSING', 'false').lower() == 'true'

    # Route to appropriate analysis function
    if use_yolo:
        print("🚀 Using YOLO-enhanced analysis pipeline")
        return analyze_image_with_yolo(image_data, enable_yolo=True)
    else:
        print("📄 Using standard image-only analysis pipeline")
        return analyze_image(image_data)
