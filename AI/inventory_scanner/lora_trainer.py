"""
LoRA Training Module for Furniture Inventory Verification
Trains a LoRA adapter on a base vision-language model for Pass 2 verification tasks.
"""

import os
import json
import torch
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class LoRATrainer:
    """
    Trains LoRA adapter for furniture inventory verification.
    Specializes in:
    - Workstation vs conference table disambiguation
    - Storage item detection (pedestals, credenzas)
    - Dimension validation
    - YOLO-LLM agreement resolution
    """

    def __init__(self,
                 base_model: str = "meta-llama/Llama-3.2-11B-Vision-Instruct",
                 output_dir: str = "./models/lora_adapters"):
        """
        Initialize LoRA trainer.

        Args:
            base_model: HuggingFace model ID to use as base
            output_dir: Directory to save trained adapters
        """
        self.base_model_name = base_model
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.model = None
        self.tokenizer = None
        self.lora_config = None

    def setup_model(self, use_4bit: bool = True):
        """
        Load base model with LoRA configuration.

        Args:
            use_4bit: Use 4-bit quantization (recommended for memory efficiency)
        """
        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor, BitsAndBytesConfig
            from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

            logger.info(f"Loading base model: {self.base_model_name}")

            # Quantization config for memory efficiency
            if use_4bit:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_quant_type="nf4",
                    bnb_4bit_compute_dtype=torch.float16,
                    bnb_4bit_use_double_quant=True
                )
            else:
                bnb_config = None

            # Load base model
            self.model = AutoModelForVision2Seq.from_pretrained(
                self.base_model_name,
                quantization_config=bnb_config,
                device_map="auto",
                trust_remote_code=True
            )

            # Load processor (handles both text and images)
            self.tokenizer = AutoProcessor.from_pretrained(
                self.base_model_name,
                trust_remote_code=True
            )

            # LoRA configuration optimized for verification tasks
            self.lora_config = LoraConfig(
                r=32,  # LoRA rank (higher = more capacity, 16-64 typical)
                lora_alpha=64,  # Scaling factor (usually 2x rank)
                target_modules=[
                    "q_proj", "k_proj", "v_proj", "o_proj",  # Attention
                    "gate_proj", "up_proj", "down_proj"  # FFN
                ],
                lora_dropout=0.05,
                bias="none",
                task_type="CAUSAL_LM",
                modules_to_save=["vision_model"]  # Also adapt vision encoder
            )

            # Prepare model for kbit training if using quantization
            if use_4bit:
                self.model = prepare_model_for_kbit_training(self.model)

            # Apply LoRA
            self.model = get_peft_model(self.model, self.lora_config)

            # Print trainable parameters
            trainable_params = sum(p.numel() for p in self.model.parameters() if p.requires_grad)
            total_params = sum(p.numel() for p in self.model.parameters())
            logger.info(f"Trainable parameters: {trainable_params:,} / {total_params:,} "
                       f"({100 * trainable_params / total_params:.2f}%)")

        except ImportError as e:
            logger.error(f"Missing dependencies. Install: pip install transformers peft bitsandbytes accelerate")
            raise

    def prepare_training_data(self,
                             correction_logs_dir: str,
                             yolo_feedback_logs_dir: Optional[str] = None) -> List[Dict]:
        """
        Prepare training dataset from correction logs and YOLO feedback.

        Args:
            correction_logs_dir: Directory with Pass 2 correction logs
            yolo_feedback_logs_dir: Optional directory with YOLO error corrections

        Returns:
            List of training examples
        """
        training_examples = []

        # Load Pass 2 correction logs
        correction_logs = Path(correction_logs_dir)
        if correction_logs.exists():
            for log_file in correction_logs.glob("*.json"):
                with open(log_file) as f:
                    log_data = json.load(f)

                    # Each log contains: image, YOLO data, Pass 1 output, corrected Pass 2 output
                    example = {
                        'image_path': log_data['image_path'],
                        'yolo_detections': log_data.get('yolo_detections', []),
                        'zones': log_data.get('zones', []),
                        'ocr_snippets': log_data.get('ocr_snippets', []),
                        'pass1_inventory': log_data['pass1_output'],
                        'corrected_inventory': log_data['pass2_corrected'],
                        'corrections_made': log_data.get('corrections', []),
                        'error_types': self._classify_errors(
                            log_data['pass1_output'],
                            log_data['pass2_corrected']
                        )
                    }
                    training_examples.append(example)

        # Load YOLO feedback logs (errors where LoRA corrected YOLO)
        if yolo_feedback_logs_dir:
            feedback_logs = Path(yolo_feedback_logs_dir)
            if feedback_logs.exists():
                for log_file in feedback_logs.glob("*.json"):
                    with open(log_file) as f:
                        feedback_data = json.load(f)

                        # Focus on YOLO misclassifications
                        example = {
                            'image_path': feedback_data['image_path'],
                            'yolo_detections': feedback_data['yolo_detections'],
                            'yolo_errors': feedback_data['yolo_errors'],
                            'lora_corrections': feedback_data['lora_corrections'],
                            'correction_type': 'yolo_override'
                        }
                        training_examples.append(example)

        logger.info(f"Prepared {len(training_examples)} training examples")
        return training_examples

    def _classify_errors(self, pass1_output: Dict, corrected_output: Dict) -> List[str]:
        """
        Classify types of errors corrected in Pass 2.

        Returns:
            List of error types: ['workstation_table_confusion', 'missing_storage', etc.]
        """
        error_types = []

        # Compare item counts by category
        pass1_items = pass1_output.get('items', [])
        pass2_items = corrected_output.get('items', [])

        # Check for workstation/table confusion
        pass1_tables = [i for i in pass1_items if 'table' in i.get('name', '').lower() and 'conference' in i.get('name', '').lower()]
        pass2_workstations = [i for i in pass2_items if 'workstation' in i.get('name', '').lower()]

        if len(pass1_tables) > 0 and len(pass2_workstations) > len([i for i in pass1_items if 'workstation' in i.get('name', '').lower()]):
            error_types.append('workstation_table_confusion')

        # Check for missing storage
        pass1_storage = [i for i in pass1_items if i.get('category') == 'Storage']
        pass2_storage = [i for i in pass2_items if i.get('category') == 'Storage']

        if len(pass2_storage) > len(pass1_storage) + 2:
            error_types.append('missing_storage')

        # Check for dimension corrections
        pass1_unknown = sum(1 for i in pass1_items if i.get('dimensions') == 'unknown')
        pass2_unknown = sum(1 for i in pass2_items if i.get('dimensions') == 'unknown')
        pass1_estimated = sum(1 for i in pass1_items if 'estimated' in i.get('notes', '').lower() or 'assumed' in i.get('notes', '').lower())

        if pass2_unknown > pass1_unknown + pass1_estimated:
            error_types.append('dimension_validation')

        # Check for count corrections
        pass1_total = sum(i.get('count', 0) for i in pass1_items)
        pass2_total = sum(i.get('count', 0) for i in pass2_items)

        if abs(pass2_total - pass1_total) / max(pass1_total, 1) > 0.15:  # >15% difference
            error_types.append('count_discrepancy')

        return error_types if error_types else ['no_errors']

    def format_training_prompt(self, example: Dict) -> str:
        """
        Format training example into prompt for LoRA.

        Args:
            example: Training example dict

        Returns:
            Formatted prompt string
        """
        # Create YOLO summary
        yolo_summary = f"YOLO detected {len(example.get('yolo_detections', []))} objects:\n"
        for det in example.get('yolo_detections', [])[:10]:  # Limit to first 10
            yolo_summary += f"- {det.get('class')} (conf: {det.get('confidence', 0):.2f})\n"

        # Create Pass 1 summary
        pass1_items = example.get('pass1_inventory', {}).get('items', [])
        pass1_summary = f"Pass 1 found {len(pass1_items)} item types:\n"
        for item in pass1_items[:5]:
            pass1_summary += f"- {item.get('name')} x{item.get('count', 0)}\n"

        # Create correction instructions
        error_types = example.get('error_types', [])
        instructions = "Verification checklist:\n"
        if 'workstation_table_confusion' in error_types:
            instructions += "- CRITICAL: Check for workstation vs conference table confusion\n"
        if 'missing_storage' in error_types:
            instructions += "- CRITICAL: Scan for missing storage items (pedestals, credenzas)\n"
        if 'dimension_validation' in error_types:
            instructions += "- CRITICAL: Validate dimensions are literally visible (not estimated)\n"
        if 'count_discrepancy' in error_types:
            instructions += "- CRITICAL: Verify item counts against PAX/NOS labels\n"

        prompt = f"""You are verifying furniture inventory from a floor plan.

{yolo_summary}

{pass1_summary}

{instructions}

Task: Cross-check Pass 1 inventory with YOLO detections and the image. Correct any errors.
Output a JSON inventory with corrections and notes explaining changes made.
"""

        return prompt

    def create_dataset(self, training_examples: List[Dict]):
        """
        Create HuggingFace dataset from training examples.

        Args:
            training_examples: List of training example dicts

        Returns:
            Dataset object
        """
        from datasets import Dataset
        from PIL import Image

        processed_examples = []

        for example in training_examples:
            # Load image
            image_path = example['image_path']
            if not os.path.exists(image_path):
                logger.warning(f"Image not found: {image_path}")
                continue

            image = Image.open(image_path).convert('RGB')

            # Format prompt
            prompt = self.format_training_prompt(example)

            # Target output (corrected inventory)
            target = json.dumps(example.get('corrected_inventory', {}), indent=2)

            processed_examples.append({
                'image': image,
                'prompt': prompt,
                'target': target,
                'error_types': example.get('error_types', [])
            })

        return Dataset.from_list(processed_examples)

    def train(self,
              training_data: List[Dict],
              validation_split: float = 0.1,
              epochs: int = 3,
              batch_size: int = 4,
              learning_rate: float = 2e-4,
              gradient_accumulation_steps: int = 4):
        """
        Train LoRA adapter on furniture verification tasks.

        Args:
            training_data: List of training examples
            validation_split: Fraction of data for validation
            epochs: Number of training epochs
            batch_size: Batch size per device
            learning_rate: Learning rate
            gradient_accumulation_steps: Gradient accumulation steps
        """
        from transformers import Trainer, TrainingArguments
        from datasets import Dataset

        # Create dataset
        dataset = self.create_dataset(training_data)

        # Split train/validation
        split_idx = int(len(dataset) * (1 - validation_split))
        train_dataset = dataset.select(range(split_idx))
        eval_dataset = dataset.select(range(split_idx, len(dataset)))

        logger.info(f"Training on {len(train_dataset)} examples, validating on {len(eval_dataset)}")

        # Training arguments
        training_args = TrainingArguments(
            output_dir=str(self.output_dir / "checkpoints"),
            num_train_epochs=epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            gradient_accumulation_steps=gradient_accumulation_steps,
            learning_rate=learning_rate,
            fp16=True,  # Mixed precision training
            logging_steps=10,
            eval_strategy="steps",
            eval_steps=50,
            save_steps=100,
            save_total_limit=3,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            warmup_steps=100,
            weight_decay=0.01,
            report_to="none"  # Can enable wandb/tensorboard
        )

        # Create trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
        )

        # Train
        logger.info("Starting LoRA training...")
        trainer.train()

        # Save final adapter
        self.save_adapter("furniture_verification_v1")

        logger.info("Training complete!")

    def save_adapter(self, adapter_name: str):
        """
        Save LoRA adapter weights (only ~10-50MB).

        Args:
            adapter_name: Name for the adapter
        """
        adapter_path = self.output_dir / adapter_name
        self.model.save_pretrained(adapter_path)
        self.tokenizer.save_pretrained(adapter_path)

        logger.info(f"Saved LoRA adapter to: {adapter_path}")

        # Save training metadata
        metadata = {
            'base_model': self.base_model_name,
            'lora_config': {
                'r': self.lora_config.r,
                'lora_alpha': self.lora_config.lora_alpha,
                'target_modules': self.lora_config.target_modules
            },
            'adapter_name': adapter_name
        }

        with open(adapter_path / 'adapter_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)


# Convenience function
def train_lora_adapter(correction_logs_dir: str,
                       yolo_feedback_dir: Optional[str] = None,
                       output_dir: str = "./models/lora_adapters",
                       epochs: int = 3):
    """
    Convenience function to train LoRA adapter.

    Args:
        correction_logs_dir: Directory with Pass 2 correction logs
        yolo_feedback_dir: Optional directory with YOLO error feedback
        output_dir: Where to save trained adapter
        epochs: Number of training epochs

    Returns:
        Path to saved adapter
    """
    trainer = LoRATrainer(output_dir=output_dir)
    trainer.setup_model(use_4bit=True)

    training_data = trainer.prepare_training_data(
        correction_logs_dir,
        yolo_feedback_dir
    )

    if len(training_data) < 100:
        logger.warning(f"Only {len(training_data)} training examples. "
                      f"Recommend at least 500 for good performance.")

    trainer.train(training_data, epochs=epochs)

    return output_dir
