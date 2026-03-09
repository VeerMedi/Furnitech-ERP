"""
Script to uninstall CPU-only PyTorch and install CUDA-enabled version
"""

import subprocess
import sys

print("=" * 80)
print("PYTORCH GPU/CUDA INSTALLATION")
print("=" * 80)

# Step 1: Uninstall existing CPU-only PyTorch
print("\n[1] Uninstalling CPU-only PyTorch packages...")
print("-" * 80)

packages_to_remove = [
    'torch',
    'torchvision',
    'torchaudio'
]

for package in packages_to_remove:
    print(f"Uninstalling {package}...")
    try:
        subprocess.run(
            [sys.executable, '-m', 'pip', 'uninstall', '-y', package],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"[OK] {package} uninstalled")
    except subprocess.CalledProcessError as e:
        print(f"[WARNING] Failed to uninstall {package}: {e.stderr}")

# Step 2: Install CUDA-enabled PyTorch
print("\n[2] Installing CUDA-enabled PyTorch...")
print("-" * 80)

# For CUDA 11.8 (most compatible)
cuda_118_command = [
    sys.executable, '-m', 'pip', 'install',
    'torch', 'torchvision', 'torchaudio',
    '--index-url', 'https://download.pytorch.org/whl/cu118'
]

# For CUDA 12.1 (newer)
cuda_121_command = [
    sys.executable, '-m', 'pip', 'install',
    'torch', 'torchvision', 'torchaudio',
    '--index-url', 'https://download.pytorch.org/whl/cu121'
]

print("\nWhich CUDA version do you have?")
print("1. CUDA 11.8 (Recommended - most compatible)")
print("2. CUDA 12.1 (Newer)")
print("3. Auto-detect (will try 11.8 first)")

# For automation, we'll try CUDA 11.8 first (most compatible)
print("\n[AUTO] Installing PyTorch with CUDA 11.8 support...")
try:
    result = subprocess.run(
        cuda_118_command,
        check=True,
        capture_output=True,
        text=True
    )
    print("[OK] PyTorch with CUDA 11.8 installed successfully")
    print(result.stdout)
except subprocess.CalledProcessError as e:
    print(f"[ERROR] Installation failed: {e.stderr}")
    print("\nTrying CUDA 12.1 version...")
    try:
        result = subprocess.run(
            cuda_121_command,
            check=True,
            capture_output=True,
            text=True
        )
        print("[OK] PyTorch with CUDA 12.1 installed successfully")
    except subprocess.CalledProcessError as e2:
        print(f"[ERROR] CUDA 12.1 installation also failed: {e2.stderr}")
        sys.exit(1)

# Step 3: Verify CUDA installation
print("\n[3] Verifying CUDA installation...")
print("-" * 80)

try:
    import torch

    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")

    if torch.cuda.is_available():
        print(f"[OK] CUDA version: {torch.version.cuda}")
        print(f"[OK] GPU device: {torch.cuda.get_device_name(0)}")
        print(f"[OK] GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")

        # Test CUDA computation
        print("\n[4] Testing CUDA computation...")
        test_tensor = torch.randn(1000, 1000).cuda()
        result = test_tensor @ test_tensor.t()
        print("[OK] CUDA computation test passed!")

    else:
        print("[ERROR] CUDA not available after installation!")
        print("\nPossible issues:")
        print("1. NVIDIA GPU driver not installed")
        print("   Download from: https://www.nvidia.com/download/index.aspx")
        print("")
        print("2. CUDA toolkit not installed")
        print("   Download from: https://developer.nvidia.com/cuda-downloads")
        print("")
        print("3. GPU not detected by system")
        print("   Check Device Manager (Windows) or nvidia-smi (Linux)")

except ImportError:
    print("[ERROR] Failed to import torch after installation!")
    sys.exit(1)

print("\n" + "=" * 80)
print("INSTALLATION COMPLETE")
print("=" * 80)
