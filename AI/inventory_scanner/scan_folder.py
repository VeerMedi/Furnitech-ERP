import os
import json
import sys
from pathlib import Path

# Add AI directory to path to handle imports
current_dir = Path(__file__).parent.absolute()
ai_dir = current_dir.parent
sys.path.append(str(ai_dir))

try:
    from inventory_scanner.pdf_processor import convert_pdf_to_images
    from inventory_scanner.core import analyze_image
except ImportError:
    from pdf_processor import convert_pdf_to_images
    from core import analyze_image

INPUT_DIR = current_dir / 'pdf_inputs'
RESULTS_DIR = current_dir / 'scan_results'

def merge_page_items(all_pages_data):
    """
    Merge items from all pages into a single cumulative inventory.
    Combines items from all pages and creates an overall summary.

    Args:
        all_pages_data: List of page analysis results

    Returns:
        dict: Cumulative result with all items merged
    """
    cumulative_items = []
    total_quantity = 0

    for page_data in all_pages_data:
        page_num = page_data['page_number']
        analysis = page_data['analysis']

        if not analysis.get('success'):
            print(f"  [Warning] Page {page_num} analysis failed, skipping...")
            continue

        page_items = analysis.get('data', {}).get('items', [])

        # Add page reference to each item
        for item in page_items:
            item['source_page'] = page_num
            cumulative_items.append(item)
            total_quantity += item.get('count', 0)

    # Create cumulative summary
    cumulative_result = {
        "items": cumulative_items,
        "summary": {
            "total_items": len(cumulative_items),
            "total_quantity": total_quantity,
            "total_pages_scanned": len(all_pages_data)
        }
    }

    return cumulative_result

def main():
    if not INPUT_DIR.exists():
        print(f"Input directory not found: {INPUT_DIR}")
        return

    RESULTS_DIR.mkdir(exist_ok=True)

    pdf_files = list(INPUT_DIR.glob('*.pdf'))
    if not pdf_files:
        print(f"No PDF files found in {INPUT_DIR}")
        return

    print(f"Found {len(pdf_files)} PDF(s) to process.")

    for pdf_file in pdf_files:
        print(f"\n{'='*60}")
        print(f"Processing: {pdf_file.name}")
        print(f"{'='*60}")

        images = convert_pdf_to_images(str(pdf_file))

        # Store per-page results for detailed analysis
        file_results = {
            "file_name": pdf_file.name,
            "pages": []
        }

        # Process each page
        for img_entry in images:
            page_num = img_entry['page']
            print(f"\n[Page {page_num}] Analyzing...")

            analysis = analyze_image(img_entry['image_base64'])

            # Show page results
            if analysis.get('success'):
                items_found = analysis.get('data', {}).get('summary', {}).get('total_items', 0)
                qty_found = analysis.get('data', {}).get('summary', {}).get('total_quantity', 0)
                print(f"   [OK] Page {page_num}: Found {items_found} item types, {qty_found} total units")

                # Show debug info if available
                debug_info = analysis.get('debug', {})
                if debug_info.get('pass3_applied'):
                    dims_updated = debug_info.get('pass3_dimensions_updated', 0)
                    print(f"   [Pass 3] Updated {dims_updated} dimensions")
            else:
                print(f"   [ERROR] Page {page_num}: Analysis failed - {analysis.get('error', 'Unknown error')}")

            file_results['pages'].append({
                "page_number": page_num,
                "analysis": analysis
            })

        # Create cumulative result combining all pages
        print(f"\n[Merging] Creating cumulative result...")
        cumulative_result = merge_page_items(file_results['pages'])

        # Add metadata
        cumulative_result['metadata'] = {
            "file_name": pdf_file.name,
            "total_pages": len(images),
            "scan_timestamp": None  # Will be added by caller if needed
        }

        # Add debug/pass info from first successful page
        for page_data in file_results['pages']:
            if page_data['analysis'].get('success'):
                debug_info = page_data['analysis'].get('debug', {})
                if debug_info:
                    cumulative_result['debug'] = {
                        "pass1_model": debug_info.get('pass1_model'),
                        "pass2_model": debug_info.get('pass2_model'),
                        "pass3_model": debug_info.get('pass3_model'),
                        "pass3_enabled": debug_info.get('pass3_applied', False)
                    }
                break

        # Save detailed per-page results
        detailed_result_path = RESULTS_DIR / f"{pdf_file.stem}_detailed.json"
        with open(detailed_result_path, 'w') as f:
            json.dump(file_results, f, indent=2)

        # Save cumulative result (main result file)
        result_path = RESULTS_DIR / f"{pdf_file.stem}_result.json"

        # Wrap cumulative result in standard format for backend compatibility
        final_result = {
            "file_name": pdf_file.name,
            "pages": [{
                "page_number": 1,
                "analysis": {
                    "success": True,
                    "data": cumulative_result,
                    "debug": cumulative_result.get('debug', {})
                }
            }]
        }

        with open(result_path, 'w') as f:
            json.dump(final_result, f, indent=2)

        # Print summary
        print(f"\n{'='*60}")
        print(f"[COMPLETE] SCAN COMPLETE: {pdf_file.name}")
        print(f"{'='*60}")
        print(f"[Stats] Total Item Types: {cumulative_result['summary']['total_items']}")
        print(f"[Stats] Total Units: {cumulative_result['summary']['total_quantity']}")
        print(f"[Stats] Pages Scanned: {cumulative_result['summary']['total_pages_scanned']}")
        print(f"\n[Files] Results saved:")
        print(f"   Main result: {result_path}")
        print(f"   Detailed per-page: {detailed_result_path}")
        print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
