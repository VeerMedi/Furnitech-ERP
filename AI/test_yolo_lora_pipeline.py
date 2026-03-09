"""
Test the complete inventory scanner pipeline with a sample PDF
Tests: PDF processing → Image extraction → 3-pass analysis → Results
"""

import os
import sys
from pathlib import Path

print("=" * 80)
print("PDF INVENTORY SCANNER - FULL PIPELINE TEST")
print("=" * 80)

# Check if running from venv
if 'venv' not in sys.executable:
    print("\n[WARNING] Not running from venv!")
    print("Please run: venv/Scripts/python test_yolo_lora_pipeline.py")
    print("\nContinuing anyway...\n")

# Test 1: Check for sample PDFs
print("\n[1] Looking for sample PDF files...")
print("-" * 80)

pdf_search_paths = [
    'test_data',
    'samples',
    'data',
    'datasets',
    '.',
]

sample_pdfs = []
for path in pdf_search_paths:
    if Path(path).exists():
        pdfs = list(Path(path).glob('*.pdf'))
        sample_pdfs.extend(pdfs)

if sample_pdfs:
    print(f"[OK] Found {len(sample_pdfs)} PDF(s):")
    for i, pdf in enumerate(sample_pdfs[:5], 1):
        print(f"  {i}. {pdf}")

    if len(sample_pdfs) > 5:
        print(f"  ... and {len(sample_pdfs) - 5} more")
else:
    print("[INFO] No PDFs found in common locations")
    print("\nYou can:")
    print("  1. Place a floor plan PDF in ./test_data/ folder")
    print("  2. Or provide path when prompted")

# Test 2: Import scanner modules
print("\n[2] Testing scanner modules...")
print("-" * 80)

try:
    from inventory_scanner.pdf_processor import extract_images_from_pdf
    print("[OK] PDF processor imported")
except ImportError as e:
    print(f"[ERROR] Failed to import PDF processor: {e}")
    sys.exit(1)

try:
    from inventory_scanner.core import analyze_image, analyze_image_with_yolo
    print("[OK] Core analysis functions imported")
except ImportError as e:
    print(f"[ERROR] Failed to import core: {e}")
    sys.exit(1)

# Test 3: Check API keys
print("\n[3] Checking API configuration...")
print("-" * 80)

from dotenv import load_dotenv
load_dotenv('inventory_scanner/.env')

openai_key = os.getenv('OPENAI_API_KEY')
openrouter_key = os.getenv('OPENROUTER_API_KEY')

if openrouter_key:
    print("[OK] OpenRouter API key found")
    print(f"   Pass 1: {os.getenv('OPENROUTER_MODEL_PASS1', 'openai/gpt-4o')}")
    print(f"   Pass 2: {os.getenv('OPENROUTER_MODEL_PASS2', 'anthropic/claude-sonnet-4')}")
elif openai_key:
    print("[OK] OpenAI API key found")
    print("   Pass 1: gpt-4o")
    print("   Pass 2: gpt-4o")
else:
    print("[ERROR] No API keys found!")
    print("\nPlease set API keys in inventory_scanner/.env:")
    print("  OPENROUTER_API_KEY=your_key_here")
    print("  OR")
    print("  OPENAI_API_KEY=your_key_here")
    sys.exit(1)

# Test 4: Get PDF to process
print("\n[4] Select PDF to process...")
print("-" * 80)

if sample_pdfs:
    print("\nFound PDFs:")
    for i, pdf in enumerate(sample_pdfs[:10], 1):
        print(f"  {i}. {pdf.name}")

    if len(sample_pdfs) <= 10:
        print(f"  0. Enter custom path")

    choice = input("\nSelect PDF number (or 0 for custom): ").strip()

    if choice == '0':
        pdf_path = input("Enter PDF path: ").strip()
        pdf_path = Path(pdf_path)
    else:
        try:
            idx = int(choice) - 1
            pdf_path = sample_pdfs[idx]
        except (ValueError, IndexError):
            print("[ERROR] Invalid selection")
            sys.exit(1)
else:
    pdf_path = input("Enter PDF path: ").strip()
    pdf_path = Path(pdf_path)

if not pdf_path.exists():
    print(f"[ERROR] PDF not found: {pdf_path}")
    sys.exit(1)

print(f"\n[OK] Selected: {pdf_path}")
print(f"   Size: {pdf_path.stat().st_size / 1024:.1f} KB")

# Test 5: Extract images from PDF
print("\n[5] Extracting images from PDF...")
print("-" * 80)

try:
    images = extract_images_from_pdf(str(pdf_path))

    if not images:
        print("[ERROR] No images extracted from PDF")
        print("\nPossible reasons:")
        print("  - PDF is empty")
        print("  - PDF contains only vector graphics (not raster images)")
        print("  - PDF is corrupted")
        sys.exit(1)

    print(f"[OK] Extracted {len(images)} image(s)")

    # Show image info
    for i, img_data in enumerate(images, 1):
        size_kb = len(img_data) / 1024
        print(f"  Image {i}: {size_kb:.1f} KB")

except Exception as e:
    print(f"[ERROR] Failed to extract images: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Select which image to analyze
print("\n[6] Select image to analyze...")
print("-" * 80)

if len(images) == 1:
    selected_image = images[0]
    print("[AUTO] Only one image, selecting automatically")
else:
    print(f"\nExtracted {len(images)} images from PDF")
    print("Which image would you like to analyze?")

    for i in range(len(images)):
        print(f"  {i+1}. Image {i+1}")
    print(f"  0. Analyze all images")

    choice = input("\nSelect: ").strip()

    if choice == '0':
        print("[INFO] Will analyze all images (this may take time)")
        selected_image = None  # Flag to analyze all
    else:
        try:
            idx = int(choice) - 1
            selected_image = images[idx]
            print(f"[OK] Selected image {idx + 1}")
        except (ValueError, IndexError):
            print("[ERROR] Invalid selection, using first image")
            selected_image = images[0]

# Test 7: Run analysis
print("\n[7] Running inventory analysis...")
print("-" * 80)

import base64
import json

def analyze_single_image(image_data, image_num=1):
    """Analyze a single image"""
    print(f"\nAnalyzing image {image_num}...")
    print("-" * 40)

    # Convert to base64
    image_base64 = base64.b64encode(image_data).decode('utf-8')

    try:
        # Run analysis
        result = analyze_image_with_yolo(image_base64, enable_yolo=True)

        if result.get('success'):
            data = result['data']
            debug = result['debug']

            print(f"\n[SUCCESS] Analysis complete!")
            print(f"  Pass 1 Model: {debug['pass1_model']}")
            print(f"  Pass 2 Model: {debug['pass2_model']}")
            print(f"  YOLO Used: {debug.get('yolo_used', False)}")
            print(f"  LoRA Used: {debug.get('lora_used', False)}")

            # Show summary
            summary = data.get('summary', {})
            print(f"\n[INVENTORY SUMMARY]")
            print(f"  Total Items: {summary.get('total_items', 0)}")
            print(f"  Total Quantity: {summary.get('total_quantity', 0)}")

            # Show items
            items = data.get('items', [])
            if items:
                print(f"\n[ITEMS DETECTED] ({len(items)} types)")
                for item in items[:10]:  # Show first 10
                    name = item.get('name', 'Unknown')
                    quantity = item.get('quantity', 0)
                    category = item.get('category', 'Unknown')
                    dimensions = item.get('dimensions', 'Unknown')
                    confidence = item.get('confidence', 0)

                    print(f"  - {name}: {quantity} units")
                    print(f"    Category: {category} | Dimensions: {dimensions}")
                    print(f"    Confidence: {confidence:.2f}")

                if len(items) > 10:
                    print(f"  ... and {len(items) - 10} more items")

            # Save results
            output_dir = Path('test_results')
            output_dir.mkdir(exist_ok=True)

            output_file = output_dir / f'result_{pdf_path.stem}_img{image_num}.json'
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)

            print(f"\n[SAVED] Results saved to: {output_file}")

            return result

        else:
            print(f"[ERROR] Analysis failed: {result.get('error', 'Unknown error')}")
            return None

    except Exception as e:
        print(f"[ERROR] Exception during analysis: {e}")
        import traceback
        traceback.print_exc()
        return None

# Analyze selected image(s)
if selected_image is None:
    # Analyze all images
    print(f"\nAnalyzing all {len(images)} images...")
    results = []
    for i, img_data in enumerate(images, 1):
        result = analyze_single_image(img_data, i)
        results.append(result)

        if i < len(images):
            print("\n" + "=" * 80)

    successful = sum(1 for r in results if r and r.get('success'))
    print(f"\n[BATCH COMPLETE] {successful}/{len(images)} images analyzed successfully")

else:
    # Analyze single image
    result = analyze_single_image(selected_image)

# Test 8: Summary
print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)

print("\n[NEXT STEPS]")
print("1. Check results in: ./test_results/")
print("2. Review detected items and accuracy")
print("3. If results look good, system is working!")
print("")
print("To improve accuracy:")
print("  - Train YOLO model (see TRAINING_NEXT_STEPS.md)")
print("  - Train LoRA adapter after collecting correction logs")
print("  - Enable YOLO preprocessing in .env")

print("\n" + "=" * 80)
