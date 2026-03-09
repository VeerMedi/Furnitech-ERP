#!/usr/bin/env python3
import os
import sys
import json
import requests
from dotenv import load_dotenv

# Load environment variables
from pathlib import Path
import logging
import tempfile

# Setup debug logging to file (cross-platform)
log_dir = tempfile.gettempdir()
log_file = os.path.join(log_dir, 'quotation_debug.log')
logging.basicConfig(filename=log_file, level=logging.DEBUG,
                    format='%(asctime)s - %(levelname)s - %(message)s')

logging.info("Script started")

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)
logging.info(f"Loaded .env from {env_path}")

# Configuration from .env
API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL = os.getenv("QUOTATION_AI_MODEL", "openai/gpt-4o") # Default to GPT-4o if not set
API_URL = "https://openrouter.ai/api/v1/chat/completions"

def analyze_requirements(data):
    """
    Analyzes quotation requirements using OpenRouter API.
    Expects data dictionary with:
    - userDescription
    - scannedItems
    - productCategories
    - materialCategories
    """
    
    user_description = data.get('userDescription', '')
    scanned_items = data.get('scannedItems', [])
    product_categories = data.get('productCategories', [])
    material_categories = data.get('materialCategories', [])
    
    # Construct the Enhanced Prompt with Component Breakdown
    prompt = f"""You are an expert furniture quotation specialist. Analyze the user's requirements and map scanned items to appropriate product and material categories.

USER REQUIREMENTS/INSTRUCTIONS:
"{user_description}"

SCANNED ITEMS FROM LAYOUT PDF:
{json.dumps(scanned_items, indent=2)}

AVAILABLE PRODUCT CATEGORIES:
{json.dumps(product_categories, indent=2)}

AVAILABLE MATERIAL CATEGORIES:
{json.dumps(material_categories, indent=2)}

TASK:
For each scanned item, you must:
1. BREAK DOWN the item into individual COMPONENTS (e.g., for a workstation: table top, legs, privacy screen, pedestal)
2. For EACH component, determine:
   - Component name (e.g., "Table Top", "Quadra Aluminium Leg", "Privacy Screen")
   - Dimensions: Extract from scanned item's dimensions field. Apply intelligently:
     * If scanned item has "1200x600mm", assign larger dimension to table top
     * Smaller/height dimensions go to screens, pedestals, etc.
     * Leave blank if component has no specific dimension
   - Material specification: Parse from user description (e.g., "25mm PLB with 2mm PVC Edge Binding")
   - Type: "product" or "material"
   - Category: Match to available product/material categories
   - Quantity per item: Use furniture knowledge (e.g., table needs 4 legs, 1 top)

IMPORTANT RULES:
- ALWAYS break down into components. Don't create flat items.
- Extract dimensions from scanned data (dimensions field)
- Parse material specs from user description (look for keywords like "PLB", "powder coating", "soft board")
- Use logical quantities (4 legs for table, 2 pedestals for sharing workstation, etc.)
- If user mentions specific materials, assign them to correct components
- Return ONLY valid JSON

EXAMPLE:
Input:
- Scanned: {{"name": "Workstation", "dimensions": "1200x600mm", "count": 10}}
- User: "Use 25mm PLB table top with 2mm PVC edge binding, quadra aluminum legs with powder coating, privacy screen 450mm height with soft board panelling, sharing pedestal 400x500x725mm in PLB"

Output:
{{
  "mappings": [
    {{
      "scannedItem": {{
        "name": "Workstation",
        "dimensions": "1200x600mm",
        "count": 10,
        "area": "Open Office Area"
      }},
      "productCategory": "Workstations",
      "components": [
        {{
          "name": "Table Top",
          "type": "product",
          "productCategory": "Table Tops",
          "dimensions": "1200x600mm",
          "materialSpec": "25mm PLB with 2mm PVC Edge Binding",
          "quantity": 1
        }},
        {{
          "name": "Quadra Aluminium Leg",
          "type": "material",
          "materialCategory": "Furniture Legs",
          "dimensions": "",
          "materialSpec": "Aluminium with powder coating",
          "quantity": 4
        }},
        {{
          "name": "Privacy Screen",
          "type": "product",
          "productCategory": "Screens",
          "dimensions": "450mm HT",
          "materialSpec": "Soft Board Panelling",
          "quantity": 1
        }},
        {{
          "name": "Sharing Pedestal",
          "type": "product",
          "productCategory": "Storage",
          "dimensions": "400x500x725mm",
          "materialSpec": "PLB",
          "quantity": 2
        }}
      ],
      "specifications": "Workstation with integrated storage and privacy",
      "reasoning": "Broken down into individual components for detailed costing"
    }}
  ]
}}

OUTPUT FORMAT:
{{
  "mappings": [
    {{
      "scannedItem": {{
        "name": "...",
        "category": "...",
        "dimensions": "...",
        "count": N
      }},
      "productCategory": "exact match from available categories",
      "components": [
        {{
          "name": "Component Name",
          "type": "product" or "material",
          "productCategory": "category if type=product",
          "materialCategory": "category if type=material",
          "dimensions": "extracted from scan or user description",
          "materialSpec": "parsed from user description",
          "quantity": N
        }}
      ],
      "specifications": "overall specifications",
      "reasoning": "why these components were chosen"
    }}
  ]
}}
"""

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vlite-furnitures.com",
        "X-Title": "Vlite Furnitures ERP"
    }
    
    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "system", 
                "content": "You are a furniture quotation expert. Always respond with valid JSON only. Do not include markdown code fence blocks."
            },
            {
                "role": "user", 
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "response_format": { "type": "json_object" } 
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Clean up if markdown block is present despite instructions
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "")
        elif content.startswith("```"):
            content = content.replace("```", "")
            
        return json.loads(content)
        
    except requests.exceptions.RequestException as e:
        return {"error": f"API Request Failed: {str(e)}", "success": False}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON response from AI: {str(e)}", "raw_response": content, "success": False}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}", "success": False}

if __name__ == "__main__":
    # Read input from stdin
    try:
        if not API_KEY:
            logging.error("API_KEY not found in environment variables")
            print(json.dumps({"error": "API_KEY missing", "success": False}))
            sys.exit(1)
            
        logging.info(f"API_KEY present: {API_KEY[:5]}...")
        
        logging.info("Waiting for stdin...")
        input_data = sys.stdin.read()
        logging.info(f"Received input data: {len(input_data)} bytes")
        
        if not input_data:
            logging.error("No input provided via stdin")
            print(json.dumps({"error": "No input provided", "success": False}))
            sys.exit(1)
            
        data = json.loads(input_data)
        logging.info("Input JSON parsed successfully. Starting analysis...")
        
        result = analyze_requirements(data)
        logging.info("Analysis complete.")
        
        # Ensure result has success flag if not set by error handler
        if "success" not in result:
             result["success"] = True
             
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": f"Script execution failed: {str(e)}", "success": False}))
        sys.exit(1)
