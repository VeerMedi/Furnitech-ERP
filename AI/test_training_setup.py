"""
Test Training Setup - Check GPU, dependencies, and data availability
Before starting model training (YOLO or LoRA)
"""

import os
import sys
from pathlib import Path

print("=" * 80)
print("MODEL TRAINING SETUP TEST")
print("=" * 80)

# Test 1: Check Python version
print("\n[1] Python Environment")
print("-" * 80)
print(f"Python Version: {sys.version}")
print(f"Python Executable: {sys.executable}")

# Test 2: Check PyTorch and CUDA
print("\n[2] PyTorch & CUDA Setup")
print("-" * 80)

try:
    import torch
    print(f"[OK] PyTorch installed: {torch.__version__}")

    # Check CUDA availability
    cuda_available = torch.cuda.is_available()
    print(f"CUDA Available: {cuda_available}")

    if cuda_available:
        print(f"[OK] CUDA Version: {torch.version.cuda}")
        print(f"[OK] GPU Device: {torch.cuda.get_device_name(0)}")
        print(f"[OK] GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

        # Test CUDA functionality
        try:
            test_tensor = torch.randn(100, 100).cuda()
            result = test_tensor @ test_tensor.t()
            print("[OK] CUDA computation test passed")
        except Exception as e:
            print(f"[ERROR] CUDA computation test failed: {e}")
    else:
        print("[WARNING] CUDA not available - training will be VERY slow on CPU")
        print("   Install CUDA: https://developer.nvidia.com/cuda-downloads")

except ImportError:
    print("[ERROR] PyTorch not installed!")
    print("   Install: pip install torch torchvision")
    sys.exit(1)

# Test 3: Check Training Dependencies
print("\n[3] Training Dependencies")
print("-" * 80)

dependencies = {
    'YOLO Training': {
        'ultralytics': 'YOLO model training',
        'opencv-python-headless': 'Image processing',
        'easyocr': 'OCR preprocessing',
        'shapely': 'Geometric operations'
    },
    'LoRA Training': {
        'transformers': 'LLM models',
        'peft': 'LoRA implementation',
        'bitsandbytes': '4-bit quantization',
        'accelerate': 'Multi-GPU training',
        'datasets': 'Dataset handling'
    }
}

missing_packages = []

for category, packages in dependencies.items():
    print(f"\n{category}:")
    for package, description in packages.items():
        try:
            __import__(package)
            print(f"  [OK] {package:25s} - {description}")
        except ImportError:
            print(f"  [MISSING] {package:25s} - {description}")
            missing_packages.append(package)

if missing_packages:
    print(f"\n[WARNING] Missing packages: {', '.join(missing_packages)}")
    print(f"   Install: pip install {' '.join(missing_packages)}")
else:
    print("\n[OK] All training dependencies installed!")

# Test 4: Check Dataset Availability
print("\n[4] Training Data Availability")
print("-" * 80)

# Check YOLO dataset
yolo_dataset_paths = [
    'datasets/furniture_floorplan',
    'datasets/yolo_furniture',
    'data/yolo_dataset'
]

yolo_data_found = False
for path in yolo_dataset_paths:
    if Path(path).exists():
        print(f"[OK] YOLO dataset found at: {path}")
        # Check for images and labels
        images_dir = Path(path) / 'images'
        labels_dir = Path(path) / 'labels'

        if images_dir.exists() and labels_dir.exists():
            train_images = list(images_dir.glob('train/*.jpg')) + list(images_dir.glob('train/*.png'))
            train_labels = list(labels_dir.glob('train/*.txt'))

            print(f"   Training images: {len(train_images)}")
            print(f"   Training labels: {len(train_labels)}")

            if len(train_images) >= 100:
                print(f"   [OK] Sufficient training data ({len(train_images)} images)")
                yolo_data_found = True
            else:
                print(f"   [WARNING] Need more data (recommended: 500+ images)")
        break

if not yolo_data_found:
    print("[WARNING] YOLO training dataset not found")
    print("   Create dataset structure:")
    print("   datasets/furniture_floorplan/")
    print("     - images/")
    print("       - train/")
    print("       - val/")
    print("       - test/")
    print("     - labels/")
    print("       - train/")
    print("       - val/")
    print("       - test/")

# Check LoRA training data (correction logs)
lora_data_paths = [
    'logs/pass2_corrections',
    'logs/correction_logs',
    'data/lora_training'
]

lora_data_found = False
for path in lora_data_paths:
    if Path(path).exists():
        correction_files = list(Path(path).glob('*.json'))
        if correction_files:
            print(f"[OK] LoRA training data found at: {path}")
            print(f"   Correction logs: {len(correction_files)}")

            if len(correction_files) >= 100:
                print(f"   [OK] Sufficient training data ({len(correction_files)} examples)")
                lora_data_found = True
            else:
                print(f"   [WARNING] Need more data (recommended: 500+ examples)")
            break

if not lora_data_found:
    print("[WARNING] LoRA training data not found")
    print("   Correction logs should be in: logs/pass2_corrections/")
    print("   Format: JSON files with Pass 1 output + Pass 2 corrections")

# Test 5: Check Model Directories
print("\n[5] Model Directories")
print("-" * 80)

model_dirs = {
    './models': 'Base models directory',
    './models/yolo': 'YOLO models',
    './models/lora_adapters': 'LoRA adapters',
    './logs': 'Training logs',
    './logs/yolo_feedback': 'YOLO feedback logs'
}

for dir_path, description in model_dirs.items():
    if Path(dir_path).exists():
        print(f"[OK] {dir_path:30s} - {description}")
    else:
        print(f"[CREATE] {dir_path:30s} - {description}")
        Path(dir_path).mkdir(parents=True, exist_ok=True)
        print(f"   Created: {dir_path}")

# Test 6: Memory Requirements
print("\n[6] Memory Requirements Check")
print("-" * 80)

if torch.cuda.is_available():
    gpu_memory_gb = torch.cuda.get_device_properties(0).total_memory / 1e9

    print(f"Available GPU Memory: {gpu_memory_gb:.2f} GB")
    print()

    if gpu_memory_gb >= 24:
        print("[OK] Sufficient for YOLO training (YOLOv8m)")
        print("[OK] Sufficient for LoRA training (Llama 11B + 4-bit)")
    elif gpu_memory_gb >= 12:
        print("[OK] Sufficient for YOLO training (YOLOv8s/m)")
        print("[WARNING] May be tight for LoRA training - use 4-bit quantization")
    elif gpu_memory_gb >= 6:
        print("[OK] Sufficient for YOLO training (YOLOv8s)")
        print("[WARNING] Not enough for LoRA training with Llama 11B")
        print("   Consider using smaller model or CPU training")
    else:
        print("[WARNING] Limited GPU memory - training will be slow")
        print("   YOLO: Use YOLOv8n (nano) model")
        print("   LoRA: Not recommended on this GPU")
else:
    print("[WARNING] No GPU available - CPU training only")
    print("   YOLO training: ~10x slower")
    print("   LoRA training: Not recommended on CPU")

# Test 7: Check Base Models
print("\n[7] Base Models Availability")
print("-" * 80)

# YOLO base model
yolo_base = './models/yolov8m.pt'
if Path(yolo_base).exists():
    print(f"[OK] YOLO base model found: {yolo_base}")
else:
    print(f"[INFO] YOLO base model not found")
    print("   Will download automatically on first training")

# LoRA base model
lora_base = os.getenv('LORA_BASE_MODEL', 'meta-llama/Llama-3.2-11B-Vision-Instruct')
print(f"[INFO] LoRA base model: {lora_base}")
print("   Will download from HuggingFace on first training (~20 GB)")

# Summary
print("\n" + "=" * 80)
print("TRAINING READINESS SUMMARY")
print("=" * 80)

print("\n[YOLO Training Readiness]")
if not missing_packages and torch.cuda.is_available() and yolo_data_found:
    print("[OK] READY to train YOLO model")
    print("   GPU: Available")
    print("   Dependencies: Installed")
    print("   Dataset: Ready")
elif not yolo_data_found:
    print("[NOT READY] Missing training dataset")
    print("   Action: Annotate 500-1000 floor plan images")
elif not torch.cuda.is_available():
    print("[WARNING] Can train but will be slow (no GPU)")
else:
    print("[NOT READY] Missing dependencies or GPU")

print("\n[LoRA Training Readiness]")
if not missing_packages and lora_data_found:
    if torch.cuda.is_available() and gpu_memory_gb >= 12:
        print("[OK] READY to train LoRA adapter")
        print("   GPU: Available (sufficient memory)")
        print("   Dependencies: Installed")
        print("   Training data: Ready")
    else:
        print("[WARNING] Can train but may be slow/limited")
        if not torch.cuda.is_available():
            print("   Issue: No GPU available")
        else:
            print("   Issue: Limited GPU memory")
elif not lora_data_found:
    print("[NOT READY] Missing training data")
    print("   Action: Collect 100+ Pass 2 correction logs")
else:
    print("[NOT READY] Missing dependencies")

print("\n[NEXT STEPS]")
print("1. Choose which model to train:")
print("   - YOLO: For furniture detection preprocessing")
print("   - LoRA: For Pass 2 verification")
print()
print("2. If training YOLO:")
print("   python train_yolo_kfold.py")
print()
print("3. If training LoRA:")
print("   python train_lora_kfold.py")
print()
print("4. Both training scripts will use K-fold cross-validation")

print("\n" + "=" * 80)
print("SETUP TEST COMPLETE")
print("=" * 80)
