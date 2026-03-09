"""
Quick test to verify GPU/CUDA is working in venv
"""

import sys

print("=" * 80)
print("GPU/CUDA VERIFICATION TEST")
print("=" * 80)

# Test PyTorch
print("\n[1] Testing PyTorch...")
try:
    import torch
    print(f"[OK] PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")

    if torch.cuda.is_available():
        print(f"[OK] CUDA version: {torch.version.cuda}")
        print(f"[OK] GPU device: {torch.cuda.get_device_name(0)}")
        print(f"[OK] GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

        # Test CUDA computation
        print("\nTesting CUDA computation...")
        x = torch.randn(1000, 1000).cuda()
        y = torch.randn(1000, 1000).cuda()
        z = x @ y
        print(f"[OK] Matrix multiplication on GPU successful!")
        print(f"    Result shape: {z.shape}")

        # Memory check
        print(f"\nGPU Memory allocated: {torch.cuda.memory_allocated(0) / 1e9:.2f} GB")
        print(f"GPU Memory cached: {torch.cuda.memory_reserved(0) / 1e9:.2f} GB")

    else:
        print("[ERROR] CUDA not available!")
        print("\nTroubleshooting:")
        print("1. Check if NVIDIA GPU driver is installed: nvidia-smi")
        print("2. Check if CUDA toolkit is installed")
        print("3. Reinstall PyTorch with CUDA support")
        sys.exit(1)

except ImportError as e:
    print(f"[ERROR] PyTorch not installed: {e}")
    sys.exit(1)

# Test Ultralytics (YOLO)
print("\n[2] Testing Ultralytics (YOLO)...")
try:
    from ultralytics import YOLO
    print("[OK] Ultralytics imported successfully")

    # Check if we can load a model
    print("Testing model loading (will download yolov8n.pt if needed)...")
    model = YOLO('yolov8n.pt')
    print(f"[OK] Model loaded: {model.task}")

except ImportError as e:
    print(f"[WARNING] Ultralytics not installed: {e}")
    print("   Install: pip install ultralytics")

# Test transformers (for LoRA)
print("\n[3] Testing Transformers (for LoRA)...")
try:
    import transformers
    print(f"[OK] Transformers version: {transformers.__version__}")
except ImportError as e:
    print(f"[WARNING] Transformers not installed: {e}")

# Test PEFT (LoRA)
print("\n[4] Testing PEFT (LoRA implementation)...")
try:
    import peft
    print(f"[OK] PEFT version: {peft.__version__}")
except ImportError as e:
    print(f"[WARNING] PEFT not installed: {e}")

# Test bitsandbytes (for 4-bit quantization)
print("\n[5] Testing bitsandbytes (4-bit quantization)...")
try:
    import bitsandbytes as bnb
    print(f"[OK] bitsandbytes version: {bnb.__version__}")
except ImportError as e:
    print(f"[WARNING] bitsandbytes not installed: {e}")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)

if torch.cuda.is_available():
    print("\n[SUCCESS] GPU/CUDA is working!")
    print("You can now:")
    print("  1. Train YOLO: python train_yolo_kfold.py")
    print("  2. Train LoRA: python train_lora_kfold.py")
else:
    print("\n[WARNING] CPU-only mode")
    print("Training will be much slower without GPU")
