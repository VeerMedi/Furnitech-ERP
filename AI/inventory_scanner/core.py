import os
import json
import requests
import base64
import tempfile
from dotenv import load_dotenv
from pathlib import Path
from .prompts import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, VERIFICATION_PROMPT_TEMPLATE, DIMENSION_EXTRACTION_PROMPT
from .prompts import SYSTEM_PROMPT_YOLO, USER_PROMPT_TEMPLATE_YOLO, VERIFICATION_PROMPT_TEMPLATE_YOLO, DIMENSION_EXTRACTION_PROMPT_YOLO
from .prompts import format_yolo_data_for_prompt, format_ocr_hints_for_pass3

# YOLO preprocessing imports (optional - used only if enabled)
try:
    from .yolo_preprocessor import YOLOPreprocessor
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[WARNING] YOLO preprocessing modules not available. Install dependencies: pip install ultralytics opencv-python-headless easyocr shapely")

# LoRA imports (optional - used only if enabled for Pass 2)
try:
    from .lora_inference import LoRAVerifier
    from .feedback_loop import log_yolo_feedback
    LORA_AVAILABLE = True
except ImportError:
    LORA_AVAILABLE = False
    print("[WARNING] LoRA modules not available. Install dependencies: pip install transformers peft bitsandbytes accelerate")

# Load .env from the same directory as this file
current_dir = Path(__file__).parent
load_dotenv(current_dir / '.env')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

def get_llm_response(messages, model, api_key, base_url, headers=None):
    """Helper to call LLM"""
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 4096,
        "response_format": { "type": "json_object" }
    }

    if not headers:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

    response = requests.post(base_url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()['choices'][0]['message']['content']

def has_unknown_dimensions(inventory_data):
    """Check if any items have unknown dimensions"""
    items = inventory_data.get('items', [])
    return any(item.get('dimensions', '').lower() == 'unknown' for item in items)

def get_unknown_dimension_items(inventory_data):
    """Get list of items with unknown dimensions"""
    items = inventory_data.get('items', [])
    return [item for item in items if item.get('dimensions', '').lower() == 'unknown']

def is_valid_dimension_extraction(dimension, extraction_note):
    """
    Validate if a dimension extraction is legitimate (not guessed/assumed).

    Args:
        dimension: The dimension string
        extraction_note: The extraction note explaining where it was found

    Returns:
        bool: True if valid, False if suspicious/guessed
    """
    if not dimension or not extraction_note:
        return False

    dimension_lower = dimension.lower()
    note_lower = extraction_note.lower()

    # Red flags in extraction notes (indicates guessing)
    red_flag_phrases = [
        'standard', 'typical', 'common', 'usual', 'normal',
        'estimated', 'estimate', 'approximate', 'approx',
        'based on', 'appears', 'seems', 'looks like',
        'probably', 'likely', 'possibly', 'maybe',
        'assuming', 'assume', 'inferred', 'infer',
        'scale', 'relative', 'compared to',
        'default', 'generic'
    ]

    # Check if extraction note contains red flags
    for phrase in red_flag_phrases:
        if phrase in note_lower:
            print(f"[WARNING] REJECTED dimension '{dimension}': Note contains red flag '{phrase}'")
            return False

    # Extraction note must be specific (contain location details)
    specific_keywords = [
        'written', 'label', 'text', 'number', 'saw', 'visible',
        'edge', 'inside', 'above', 'below', 'next to', 'near',
        'line', 'arrow', 'legend', 'table', 'annotation'
    ]

    has_specific_keyword = any(keyword in note_lower for keyword in specific_keywords)
    if not has_specific_keyword:
        print(f"[WARNING] REJECTED dimension '{dimension}': Note lacks specific location details")
        return False

    # Note must not be too short (lazy extraction)
    if len(extraction_note.strip()) < 15:
        print(f"[WARNING] REJECTED dimension '{dimension}': Note too short/vague")
        return False

    return True

def merge_dimension_updates(pass2_inventory, dimension_updates):
    """
    Merge Pass 3 dimension updates into Pass 2 inventory.
    Matches items by name + area + category, updates only dimensions field.
    Validates each dimension to ensure it's not guessed/assumed.

    Args:
        pass2_inventory: The Pass 2 inventory JSON
        dimension_updates: The Pass 3 dimension updates JSON

    Returns:
        tuple: (updated_inventory, count_of_updates)
    """
    updated_count = 0
    rejected_count = 0
    updates_map = {}

    # Create lookup map for quick matching (with validation)
    for update in dimension_updates.get('dimension_updates', []):
        dimension = update.get('dimensions', '')
        extraction_note = update.get('extraction_note', '')

        # Validate before adding to map
        if not is_valid_dimension_extraction(dimension, extraction_note):
            rejected_count += 1
            continue

        key = (
            update.get('name', '').lower().strip(),
            update.get('area', '').lower().strip(),
            update.get('category', '').lower().strip()
        )
        updates_map[key] = update

    # Update matching items
    for item in pass2_inventory.get('items', []):
        if item.get('dimensions', '').lower() == 'unknown':
            key = (
                item.get('name', '').lower().strip(),
                item.get('area', '').lower().strip(),
                item.get('category', '').lower().strip()
            )

            if key in updates_map:
                update = updates_map[key]
                item['dimensions'] = update['dimensions']

                # Append extraction note to existing notes
                extraction_note = update.get('extraction_note', 'Extracted in Pass 3')
                current_notes = item.get('notes', '')
                item['notes'] = f"{current_notes} | Pass 3: {extraction_note}".strip(' |')

                # Optionally boost confidence if dimensions were found
                if item.get('confidence', 0) < 0.9:
                    item['confidence'] = min(item['confidence'] + 0.1, 1.0)

                updated_count += 1

    if rejected_count > 0:
        print(f"[WARNING]  Pass 3 Validation: Rejected {rejected_count} suspicious/guessed dimensions")

    return pass2_inventory, updated_count


def analyze_image_with_yolo(image_data_base64, enable_yolo=True):
    """
    Enhanced analysis with YOLO preprocessing for object detection.
    Runs YOLO detection, zone extraction, and OCR before LLM passes.

    Args:
        image_data_base64: Base64 encoded image data
        enable_yolo: If True, run YOLO preprocessing. If False, fallback to image-only.

    Returns:
        Dict with success, data, and debug information
    """
    # Check if YOLO should be used and is available
    use_yolo = (
        enable_yolo and
        YOLO_AVAILABLE and
        os.getenv('ENABLE_YOLO_PREPROCESSING', 'false').lower() == 'true'
    )

    structured_data = None
    image_temp_path = None

    # Step 1: YOLO Preprocessing (if enabled)
    if use_yolo:
        try:
            # Save base64 image to temporary file for YOLO processing
            image_bytes = base64.b64decode(image_data_base64)
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as temp_file:
                temp_file.write(image_bytes)
                image_temp_path = temp_file.name

            print("[DETECT] Running YOLO preprocessing...")
            preprocessor = YOLOPreprocessor()
            structured_data = preprocessor.process(image_temp_path)

            # Check if preprocessing was successful
            if structured_data['metadata'].get('fallback_mode', False):
                print("[WARNING]  YOLO preprocessing failed. Falling back to image-only mode.")
                use_yolo = False
                structured_data = None
            else:
                print(f"[OK] YOLO preprocessing complete: "
                      f"{len(structured_data['yolo_detections'])} detections, "
                      f"{len(structured_data['zones'])} zones, "
                      f"{len(structured_data['ocr_text_snippets'])} OCR snippets")

        except Exception as e:
            print(f"[WARNING]  YOLO preprocessing error: {e}. Falling back to image-only mode.")
            use_yolo = False
            structured_data = None

        finally:
            # Clean up temp file
            if image_temp_path and os.path.exists(image_temp_path):
                try:
                    os.remove(image_temp_path)
                except:
                    pass

    # Step 2: Select prompts based on YOLO availability
    if use_yolo and structured_data:
        system_prompt = SYSTEM_PROMPT_YOLO
        # Format YOLO data for prompts
        yolo_formatted = format_yolo_data_for_prompt(structured_data)
        user_prompt = USER_PROMPT_TEMPLATE_YOLO.format(**yolo_formatted)
        verification_prompt_template = VERIFICATION_PROMPT_TEMPLATE_YOLO
        dimension_prompt_template = DIMENSION_EXTRACTION_PROMPT_YOLO
        print("[DATA] Using YOLO-enhanced prompts")
    else:
        system_prompt = SYSTEM_PROMPT
        user_prompt = USER_PROMPT_TEMPLATE
        verification_prompt_template = VERIFICATION_PROMPT_TEMPLATE
        dimension_prompt_template = DIMENSION_EXTRACTION_PROMPT
        print("[DOC] Using standard image-only prompts")

    # Step 3: Setup API configuration
    model_pass1 = "gpt-4o"
    model_pass2 = "gpt-4o"  # default fallback

    if OPENROUTER_API_KEY:
        api_key = OPENROUTER_API_KEY
        base_url = "https://openrouter.ai/api/v1/chat/completions"
        model_pass1 = os.getenv("OPENROUTER_MODEL_PASS1", "openai/gpt-4o")
        model_pass2 = os.getenv("OPENROUTER_MODEL_PASS2", "anthropic/claude-sonnet-4")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://vlite-furnitures.com",
            "X-Title": "Vlite Inventory Scanner"
        }
    elif OPENAI_API_KEY:
        api_key = OPENAI_API_KEY
        base_url = "https://api.openai.com/v1/chat/completions"
        model_pass1 = "gpt-4o"
        model_pass2 = "gpt-4o"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    else:
        return {
            "success": False,
            "error": "No API Key found. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in .env"
        }

    try:
        # Step 4: Pass 1 - Initial Scan (GPT-4o with or without YOLO data)
        print(f"[PROCESSING] Pass 1: Initial scan using {model_pass1}...")
        messages_pass1 = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": user_prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
            ]}
        ]

        content1 = get_llm_response(messages_pass1, model_pass1, api_key, base_url, headers)
        initial_inventory = json.loads(content1)
        print(f"[OK] Pass 1 complete: Found {initial_inventory.get('summary', {}).get('total_items', 0)} item types")

        # Step 5: Pass 2 - Verification (LoRA local model or Claude Sonnet 4 API)
        use_lora = (
            LORA_AVAILABLE and
            os.getenv('USE_LORA_PASS2', 'false').lower() == 'true'
        )

        if use_lora:
            # Use LoRA local model for Pass 2 verification
            print("[PROCESSING] Pass 2: Verification using LoRA-tuned local model...")
            try:
                lora_verifier = LoRAVerifier(
                    adapter_path=os.getenv('LORA_ADAPTER_PATH', './models/lora_adapters/furniture_verification_v1'),
                    use_4bit=os.getenv('LORA_USE_4BIT', 'true').lower() == 'true'
                )

                content2 = lora_verifier.verify(
                    image_data_base64,
                    initial_inventory,
                    structured_data if use_yolo else None
                )
                final_inventory = json.loads(content2)
                print(f"[OK] Pass 2 complete (LoRA): Verified {final_inventory.get('summary', {}).get('total_items', 0)} item types")

                # Log YOLO feedback if enabled
                if os.getenv('ENABLE_YOLO_FEEDBACK', 'true').lower() == 'true' and use_yolo and structured_data:
                    log_yolo_feedback(
                        image_temp_path if image_temp_path else 'temp_image.png',
                        structured_data.get('yolo_detections', []),
                        initial_inventory,
                        final_inventory,
                        structured_data
                    )
                    print("[LOG] Logged YOLO feedback for retraining")

            except Exception as e:
                # Fallback to API if LoRA fails
                print(f"[WARNING]  LoRA verification failed: {e}")
                if os.getenv('LORA_FALLBACK_TO_API', 'true').lower() == 'true':
                    print(f"[PROCESSING] Falling back to API verification with {model_pass2}...")
                    use_lora = False
                else:
                    raise

        if not use_lora:
            # Use API (Claude Sonnet 4 or GPT-4o) for Pass 2 verification
            print(f"[PROCESSING] Pass 2: Verification using {model_pass2}...")

            # Format verification prompt with YOLO data if available
            if use_yolo and structured_data:
                yolo_summary = f"""
YOLO Detections: {len(structured_data['yolo_detections'])}
Zones: {len(structured_data['zones'])}
OCR Snippets: {len(structured_data['ocr_text_snippets'])}

""" + yolo_formatted['structured_data_summary']
                verification_prompt = verification_prompt_template.format(
                    previous_result=json.dumps(initial_inventory,indent=2),
                    yolo_summary=yolo_summary
                )
            else:
                verification_prompt = verification_prompt_template.format(
                    previous_result=json.dumps(initial_inventory, indent=2)
                )

            messages_pass2 = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
                ]},
                {"role": "assistant", "content": content1},
                {"role": "user", "content": verification_prompt}
            ]

            content2 = get_llm_response(messages_pass2, model_pass2, api_key, base_url, headers)
            final_inventory = json.loads(content2)
            print(f"[OK] Pass 2 complete: Verified {final_inventory.get('summary', {}).get('total_items', 0)} item types")

        # Step 6: Pass 3 - Dimension Extraction (optional, with OCR hints if available)
        pass3_applied = False
        pass3_updated_count = 0
        model_pass3 = os.getenv("OPENROUTER_MODEL_PASS3", model_pass1)

        if os.getenv("ENABLE_PASS3_DIMENSION_EXTRACTION", "true").lower() == "true":
            if has_unknown_dimensions(final_inventory):
                print(f"[PROCESSING] Pass 3: Dimension extraction using {model_pass3}...")

                # Format dimension prompt with OCR hints if available
                if use_yolo and structured_data:
                    ocr_hints = format_ocr_hints_for_pass3(structured_data)
                    dimension_prompt = dimension_prompt_template.format(
                        pass2_result=json.dumps(final_inventory, indent=2),
                        ocr_dimension_hints=ocr_hints
                    )
                else:
                    dimension_prompt = dimension_prompt_template.format(
                        pass2_result=json.dumps(final_inventory, indent=2)
                    )

                messages_pass3 = [
                    {"role": "system", "content": "You are an expert OCR specialist for architectural drawings and furniture dimensions."},
                    {"role": "user", "content": [
                        {"type": "text", "text": dimension_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
                    ]}
                ]

                try:
                    content3 = get_llm_response(messages_pass3, model_pass3, api_key, base_url, headers)
                    dimension_updates = json.loads(content3)

                    if dimension_updates.get('dimension_updates'):
                        final_inventory, pass3_updated_count = merge_dimension_updates(final_inventory, dimension_updates)
                        pass3_applied = True
                        print(f"[OK] Pass 3 complete: Updated {pass3_updated_count} dimensions")
                    else:
                        print("[OK] Pass 3 complete: No new dimensions found")
                except Exception as e:
                    print(f"[WARNING]  Pass 3 failed: {e}. Using Pass 2 results.")

        # Step 7: Add YOLO metadata to output (if used)
        if use_yolo and structured_data:
            if 'metadata' not in final_inventory:
                final_inventory['metadata'] = {}

            final_inventory['metadata']['preprocessing'] = {
                'yolo_detections_count': len(structured_data['yolo_detections']),
                'zones_detected': len(structured_data['zones']),
                'ocr_snippets_found': len(structured_data['ocr_text_snippets']),
                'preprocessing_time_ms': structured_data['metadata'].get('preprocessing_time_ms', 0),
                'yolo_model': structured_data['metadata'].get('yolo_model', 'unknown')
            }

        # Step 8: Return results
        return {
            "success": True,
            "data": final_inventory,
            "debug": {
                "pass1_model": model_pass1,
                "pass2_model": "LoRA (local)" if use_lora else model_pass2,
                "pass3_model": model_pass3,
                "pass3_applied": pass3_applied,
                "pass3_dimensions_updated": pass3_updated_count,
                "pass1_count": initial_inventory.get('summary', {}).get('total_items'),
                "pass2_count": final_inventory.get('summary', {}).get('total_items'),
                "yolo_used": use_yolo,
                "yolo_available": YOLO_AVAILABLE,
                "lora_used": use_lora,
                "lora_available": LORA_AVAILABLE
            }
        }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"API Request Error: {str(e)}"}
    except json.JSONDecodeError:
        return {"success": False, "error": "Failed to parse LLM response as JSON"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected Error: {str(e)}"}


def analyze_image(image_data_base64):
    """
    Sends the image to LLMs for 2-pass analysis:
    - Pass 1: GPT-4o (Initial Scan)
    - Pass 2: Claude 3.5 Sonnet (Verification & Validation)
    """
    model_pass1 = "gpt-4o"
    model_pass2 = "gpt-4o" # default fallback
    
    if OPENROUTER_API_KEY:
        api_key = OPENROUTER_API_KEY
        base_url = "https://openrouter.ai/api/v1/chat/completions"
        # Define models for dual-pass strategy - allowing overrides from .env
        model_pass1 = os.getenv("OPENROUTER_MODEL_PASS1", "openai/gpt-4o")
        model_pass2 = os.getenv("OPENROUTER_MODEL_PASS2", "anthropic/claude-sonnet-4")
        
        # specific header for OpenRouter
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "https://vlite-furnitures.com",
            "X-Title": "Vlite Inventory Scanner"
        }
    elif OPENAI_API_KEY:
        api_key = OPENAI_API_KEY
        base_url = "https://api.openai.com/v1/chat/completions"
        model_pass1 = "gpt-4o"
        model_pass2 = "gpt-4o" # OpenAI key doesn't support Claude
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    else:
        return {
            "success": False,
            "error": "No API Key found. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in .env"
        }

    try:
        # --- PASS 1: INITIAL SCAN (GPT-4o) ---
        print(f"Starting Pass 1 Analysis with {model_pass1}...")
        pass1_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "text", "text": USER_PROMPT_TEMPLATE},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
            ]}
        ]
        
        content1 = get_llm_response(pass1_messages, model_pass1, api_key, base_url, headers)
        initial_inventory = json.loads(content1)
        
        # --- PASS 2: VERIFICATION (Claude 3.5 Sonnet) ---
        print(f"Starting Pass 2 Verification with {model_pass2}...")
        verification_text = VERIFICATION_PROMPT_TEMPLATE.format(previous_result=json.dumps(initial_inventory, indent=2))
        
        pass2_messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "text", "text": USER_PROMPT_TEMPLATE}, # Context
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}} # Re-send image (stateless)
            ]},
            {"role": "assistant", "content": content1}, # History
            {"role": "user", "content": verification_text} # Verification Request
        ]
        
        content2 = get_llm_response(pass2_messages, model_pass2, api_key, base_url, headers)
        final_inventory = json.loads(content2)

        # --- PASS 3: DIMENSION EXTRACTION (Optional, only if enabled and needed) ---
        enable_pass3 = os.getenv("ENABLE_PASS3_DIMENSION_EXTRACTION", "false").lower() == "true"

        pass3_applied = False
        pass3_updated_count = 0
        model_pass3 = None

        if enable_pass3 and has_unknown_dimensions(final_inventory):
            try:
                print(f"Detected items with unknown dimensions. Starting Pass 3 Dimension Extraction...")

                model_pass3 = os.getenv("OPENROUTER_MODEL_PASS3", "openai/gpt-4o")

                # Prepare Pass 3 prompt
                dimension_prompt_text = DIMENSION_EXTRACTION_PROMPT.format(
                    pass2_result=json.dumps(final_inventory, indent=2)
                )

                pass3_messages = [
                    {"role": "system", "content": "You are an expert OCR specialist for architectural drawings. Extract dimension text with extreme precision."},
                    {"role": "user", "content": [
                        {"type": "text", "text": dimension_prompt_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
                    ]}
                ]

                # Call Pass 3 model
                content3 = get_llm_response(pass3_messages, model_pass3, api_key, base_url, headers)
                dimension_updates = json.loads(content3)

                # Merge dimension updates back into final_inventory
                final_inventory, pass3_updated_count = merge_dimension_updates(final_inventory, dimension_updates)
                pass3_applied = True

                print(f"Pass 3 completed: {pass3_updated_count} dimensions updated")

            except Exception as e:
                print(f"Pass 3 failed (non-critical): {str(e)}")
                print("Continuing with Pass 2 results...")

        return {
            "success": True,
            "data": final_inventory,
            "debug": {
                "pass1_model": model_pass1,
                "pass2_model": model_pass2,
                "pass3_model": model_pass3,
                "pass3_applied": pass3_applied,
                "pass3_dimensions_updated": pass3_updated_count,
                "pass1_count": initial_inventory.get('summary', {}).get('total_items'),
                "pass2_count": final_inventory.get('summary', {}).get('total_items')
            }
        }

    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"API Request Error: {str(e)}"}
    except json.JSONDecodeError:
        return {"success": False, "error": "Failed to parse LLM response as JSON"}
    except Exception as e:
        return {"success": False, "error": f"Unexpected Error: {str(e)}"}
