"""
Quick PDF test - provide PDF path as argument
Usage: python quick_pdf_test.py path/to/your/floorplan.pdf
"""

import sys
import os
from pathlib import Path

# Check arguments
if len(sys.argv) < 2:
    print("Usage: python quick_pdf_test.py <path_to_pdf>")
    print("\nExample:")
    print("  python quick_pdf_test.py test_data/floorplan.pdf")
    print("  python quick_pdf_test.py ../backend/invoices/invoice.pdf")
    sys.exit(1)

pdf_path = Path(sys.argv[1])

if not pdf_path.exists():
    print(f"[ERROR] PDF not found: {pdf_path}")
    sys.exit(1)

print("=" * 80)
print(f"TESTING PDF: {pdf_path.name}")
print("=" * 80)

# Import modules
print("\n[1] Importing modules...")
from inventory_scanner.pdf_processor import extract_images_from_pdf
from inventory_scanner.core import analyze_image_with_yolo
from dotenv import load_dotenv
import base64
import json

load_dotenv('inventory_scanner/.env')

# Check API key
if not os.getenv('OPENROUTER_API_KEY') and not os.getenv('OPENAI_API_KEY'):
    print("[ERROR] No API key found in .env")
    sys.exit(1)

# Extract images
print(f"\n[2] Extracting images from PDF...")
images = extract_images_from_pdf(str(pdf_path))

if not images:
    print("[ERROR] No images extracted")
    sys.exit(1)

print(f"[OK] Extracted {len(images)} page(s)")

# Analyze first page
print(f"\n[3] Analyzing page 1...")
image_data = images[0]
image_base64 = base64.b64encode(image_data).decode('utf-8')

result = analyze_image_with_yolo(image_base64, enable_yolo=True)

if result.get('success'):
    data = result['data']
    debug = result['debug']

    print(f"\n[SUCCESS] Analysis Complete!")
    print(f"  Pass 1: {debug['pass1_model']}")
    print(f"  Pass 2: {debug['pass2_model']}")
    print(f"  YOLO Used: {debug.get('yolo_used', False)}")
    print(f"  LoRA Used: {debug.get('lora_used', False)}")

    # Summary
    summary = data.get('summary', {})
    print(f"\n[INVENTORY]")
    print(f"  Total Items: {summary.get('total_items', 0)}")
    print(f"  Total Quantity: {summary.get('total_quantity', 0)}")

    # Items
    items = data.get('items', [])
    if items:
        print(f"\n[DETECTED ITEMS]")
        for item in items[:15]:
            print(f"  - {item.get('name', 'Unknown')}: {item.get('quantity', 0)} units")
            print(f"    {item.get('dimensions', 'Unknown')} | Confidence: {item.get('confidence', 0):.2f}")

    # Save
    output_dir = Path('test_results')
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f'result_{pdf_path.stem}.json'

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n[SAVED] {output_file}")

else:
    print(f"\n[ERROR] {result.get('error', 'Unknown error')}")
    sys.exit(1)

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
