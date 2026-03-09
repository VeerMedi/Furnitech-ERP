"""
LoRA Inference Module for Pass 2 Verification
Uses trained LoRA adapter for furniture inventory verification.
"""

import os
import json
import torch
import base64
from io import BytesIO
from typing import Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class LoRAVerifier:
    """
    Inference class for LoRA-adapted furniture verification model.
    Replaces or augments Claude Sonnet 4 for Pass 2 verification.
    """

    def __init__(self,
                 adapter_path: str = "./models/lora_adapters/furniture_verification_v1",
                 use_4bit: bool = True):
        """
        Initialize LoRA verifier.

        Args:
            adapter_path: Path to trained LoRA adapter
            use_4bit: Use 4-bit quantization for inference
        """
        self.adapter_path = Path(adapter_path)
        self.use_4bit = use_4bit

        self.model = None
        self.processor = None
        self.base_model_name = None

        self._load_model()

    def _load_model(self):
        """Load base model with LoRA adapter."""
        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor, BitsAndBytesConfig
            from peft import PeftModel

            # Load metadata to get base model name
            metadata_path = self.adapter_path / 'adapter_metadata.json'
            if metadata_path.exists():
                with open(metadata_path) as f:
                    metadata = json.load(f)
                    self.base_model_name = metadata['base_model']
            else:
                # Default to Llama 3.2 Vision
                self.base_model_name = "meta-llama/Llama-3.2-11B-Vision-Instruct"
                logger.warning(f"Adapter metadata not found. Using default base model: {self.base_model_name}")

            logger.info(f"Loading base model: {self.base_model_name}")

            # Quantization config
            if self.use_4bit:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16
                )
            else:
                bnb_config = None

            # Load base model
            base_model = AutoModelForVision2Seq.from_pretrained(
                self.base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True
            )

            # Load LoRA adapter
            logger.info(f"Loading LoRA adapter from: {self.adapter_path}")
            self.model = PeftModel.from_pretrained(
                base_model,
                str(self.adapter_path),
                is_trainable=False
            )

            # Set to evaluation mode
            self.model.eval()

            # Load processor
            self.processor = AutoProcessor.from_pretrained(
                str(self.adapter_path),
                trust_remote_code=True
            )

            logger.info("LoRA model loaded successfully")

        except ImportError as e:
            logger.error(f"Missing dependencies: {e}. Install: pip install transformers peft bitsandbytes")
            raise
        except Exception as e:
            logger.error(f"Failed to load LoRA model: {e}")
            raise

    def verify(self,
               image_data_base64: str,
               pass1_inventory: Dict[str, Any],
               structured_data: Optional[Dict[str, Any]] = None) -> str:
        """
        Run Pass 2 verification using LoRA model.

        Args:
            image_data_base64: Base64 encoded image
            pass1_inventory: Pass 1 inventory output
            structured_data: Optional YOLO preprocessing data

        Returns:
            JSON string with verified inventory
        """
        try:
            from PIL import Image

            # Decode image
            image_bytes = base64.b64decode(image_data_base64)
            image = Image.open(BytesIO(image_bytes)).convert('RGB')

            # Format prompt
            prompt = self._format_verification_prompt(
                pass1_inventory,
                structured_data
            )

            # Prepare inputs
            inputs = self.processor(
                text=prompt,
                images=image,
                return_tensors="pt",
                padding=True
            ).to(self.model.device)

            # Generate
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=4096,
                    temperature=0.3,  # Lower temperature for more deterministic output
                    do_sample=True,
                    top_p=0.9,
                    pad_token_id=self.processor.tokenizer.eos_token_id
                )

            # Decode output
            response = self.processor.decode(outputs[0], skip_special_tokens=True)

            # Extract JSON from response
            verified_inventory = self._extract_json(response)

            return verified_inventory

        except Exception as e:
            logger.error(f"LoRA verification failed: {e}")
            raise

    def _format_verification_prompt(self,
                                    pass1_inventory: Dict,
                                    structured_data: Optional[Dict] = None) -> str:
        """
        Format verification prompt for LoRA model.

        Args:
            pass1_inventory: Pass 1 inventory output
            structured_data: Optional YOLO preprocessing data

        Returns:
            Formatted prompt string
        """
        prompt = "You are an expert furniture inventory verifier. Review the initial scan and correct any errors.\n\n"

        # Add YOLO context if available
        if structured_data:
            yolo_detections = structured_data.get('yolo_detections', [])
            prompt += f"YOLO PREPROCESSING detected {len(yolo_detections)} objects:\n"

            # Group by class
            class_counts = {}
            for det in yolo_detections:
                cls = det.get('class', 'unknown')
                class_counts[cls] = class_counts.get(cls, 0) + 1

            for cls, count in sorted(class_counts.items(), key=lambda x: x[1], reverse=True):
                prompt += f"- {cls}: {count}\n"

            prompt += "\n"

        # Add Pass 1 summary
        pass1_items = pass1_inventory.get('items', [])
        prompt += f"PASS 1 INVENTORY found {len(pass1_items)} item types:\n"

        # Group by category
        category_summary = {}
        for item in pass1_items:
            cat = item.get('category', 'Other')
            count = item.get('count', 0)
            category_summary[cat] = category_summary.get(cat, 0) + count

        for cat, count in sorted(category_summary.items(), key=lambda x: x[1], reverse=True):
            prompt += f"- {cat}: {count} items\n"

        prompt += "\n"

        # Add detailed items
        prompt += "DETAILED ITEMS:\n"
        for i, item in enumerate(pass1_items[:10], 1):  # Limit to first 10
            prompt += f"{i}. {item.get('name')}  | Count: {item.get('count')} | Category: {item.get('category')} | Dimensions: {item.get('dimensions', 'unknown')}\n"

        if len(pass1_items) > 10:
            prompt += f"... and {len(pass1_items) - 10} more items\n"

        prompt += "\n"

        # Add verification instructions
        prompt += """VERIFICATION CHECKLIST:
1. **Workstation vs Conference Table**: Check if Pass 1 misidentified multiple workstations as a single conference table. Look for:
   - Partitions/screens between desks
   - Individual desk shapes vs one continuous surface
   - PAX labels indicating multiple people

2. **Storage Items** (MOST COMMONLY MISSED):
   - Pedestals under workstations
   - Credenzas in executive cabins
   - Overhead, low-height, full-height storage
   - Storage racks

3. **Dimension Validation**:
   - Are dimensions literally visible in the image?
   - Reject any "estimated", "typical", "standard" dimensions
   - Set to "unknown" if not clearly visible

4. **Count Accuracy**:
   - Does count match PAX/NOS labels?
   - Are all visible items counted?

5. **YOLO Cross-Check** (if available):
   - Are there YOLO detections Pass 1 missed?
   - Are there items in Pass 1 that YOLO didn't detect? (Verify visually)

OUTPUT: Return ONLY a valid JSON object with this structure:
{
  "items": [...],
  "summary": {
    "total_items": <int>,
    "total_quantity": <int>
  },
  "verification_notes": "Brief explanation of corrections made"
}
"""

        return prompt

    def _extract_json(self, response: str) -> str:
        """
        Extract JSON from model response.

        Args:
            response: Raw model output

        Returns:
            Extracted JSON string
        """
        # Try to find JSON block
        import re

        # Look for JSON code block
        json_match = re.search(r'```json\n(.*?)\n```', response, re.DOTALL)
        if json_match:
            return json_match.group(1)

        # Look for raw JSON  (starting with { and ending with })
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            # Validate it's proper JSON
            try:
                json.loads(json_str)
                return json_str
            except json.JSONDecodeError:
                pass

        # If no JSON found, return the whole response and let caller handle it
        logger.warning("Could not extract JSON from LoRA response")
        return response

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about loaded model.

        Returns:
            Dict with model info
        """
        trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
        total_params = sum(p.numel() for p in self.model.parameters())

        return {
            'base_model': self.base_model_name,
            'adapter_path': str(self.adapter_path),
            'total_parameters': total_params,
            'trainable_parameters': trainable_params,
            'trainable_percentage': 100 * trainable_params / total_params if total_params > 0 else 0,
            'use_4bit': self.use_4bit,
            'device': str(self.model.device)
        }


# Convenience function
def verify_with_lora(image_data_base64: str,
                     pass1_inventory: Dict,
                     structured_data: Optional[Dict] = None,
                     adapter_path: str = "./models/lora_adapters/furniture_verification_v1") -> Dict:
    """
    Convenience function for LoRA verification.

    Args:
        image_data_base64: Base64 encoded image
        pass1_inventory: Pass 1 inventory output
        structured_data: Optional YOLO preprocessing data
        adapter_path: Path to LoRA adapter

    Returns:
        Verified inventory dict
    """
    verifier = LoRAVerifier(adapter_path=adapter_path)
    result_json = verifier.verify(image_data_base64, pass1_inventory, structured_data)

    try:
        return json.loads(result_json)
    except json.JSONDecodeError:
        logger.error("LoRA output was not valid JSON")
        raise
