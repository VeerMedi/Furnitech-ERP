"""
Helper script to check if your dataset is ready for training
Validates images, labels, and folder structure
"""

import sys
from pathlib import Path

print("=" * 80)
print("YOLO DATASET VALIDATION")
print("=" * 80)

dataset_path = Path("datasets/furniture_floorplan")

if not dataset_path.exists():
    print("[ERROR] Dataset folder not found!")
    print(f"Expected: {dataset_path.absolute()}")
    sys.exit(1)

print(f"\n[OK] Dataset folder found: {dataset_path}")

# Check structure
print("\n[1] Checking folder structure...")
print("-" * 80)

required_folders = [
    "images/train",
    "images/val",
    "images/test",
    "labels/train",
    "labels/val",
    "labels/test"
]

missing = []
for folder in required_folders:
    folder_path = dataset_path / folder
    if folder_path.exists():
        print(f"[OK] {folder}")
    else:
        print(f"[MISSING] {folder}")
        missing.append(folder)

if missing:
    print(f"\n[ERROR] Missing folders: {', '.join(missing)}")
    sys.exit(1)

# Count images and labels
print("\n[2] Counting images and labels...")
print("-" * 80)

splits = ['train', 'val', 'test']
total_images = 0
total_labels = 0

for split in splits:
    images_dir = dataset_path / 'images' / split
    labels_dir = dataset_path / 'labels' / split

    images = list(images_dir.glob('*.jpg')) + list(images_dir.glob('*.png'))
    labels = list(labels_dir.glob('*.txt'))

    total_images += len(images)
    total_labels += len(labels)

    print(f"{split.upper():6s}: {len(images):4d} images, {len(labels):4d} labels", end="")

    if len(images) == 0:
        print(" [EMPTY]")
    elif len(images) != len(labels):
        print(f" [MISMATCH - {abs(len(images) - len(labels))} difference]")
    else:
        print(" [OK]")

print(f"\nTOTAL:  {total_images:4d} images, {total_labels:4d} labels")

if total_images == 0:
    print("\n[ERROR] No images found!")
    print("\nPlease add images to:")
    print(f"  - {dataset_path / 'images/train'}")
    print(f"  - {dataset_path / 'images/val'}")
    print(f"  - {dataset_path / 'images/test'}")
    sys.exit(1)

# Check matching filenames
print("\n[3] Checking image-label pairs...")
print("-" * 80)

mismatches = []
for split in splits:
    images_dir = dataset_path / 'images' / split
    labels_dir = dataset_path / 'labels' / split

    images = {img.stem: img for img in images_dir.glob('*.*') if img.suffix in ['.jpg', '.png']}
    labels = {lbl.stem: lbl for lbl in labels_dir.glob('*.txt')}

    # Find images without labels
    missing_labels = set(images.keys()) - set(labels.keys())
    # Find labels without images
    missing_images = set(labels.keys()) - set(images.keys())

    if missing_labels:
        print(f"{split.upper()}: {len(missing_labels)} images without labels")
        if len(missing_labels) <= 5:
            for name in list(missing_labels)[:5]:
                print(f"  - {name}")

    if missing_images:
        print(f"{split.upper()}: {len(missing_images)} labels without images")
        if len(missing_images) <= 5:
            for name in list(missing_images)[:5]:
                print(f"  - {name}")

    if not missing_labels and not missing_images:
        print(f"{split.upper()}: [OK] All pairs matched")

# Check label format
print("\n[4] Validating label format...")
print("-" * 80)

sample_labels = list((dataset_path / 'labels/train').glob('*.txt'))[:5]

if not sample_labels:
    print("[WARNING] No labels to validate")
else:
    errors = []
    for label_file in sample_labels:
        try:
            with open(label_file, 'r') as f:
                lines = f.readlines()

            for i, line in enumerate(lines, 1):
                parts = line.strip().split()

                if len(parts) != 5:
                    errors.append(f"{label_file.name}:{i} - Wrong format (expected 5 values)")
                    continue

                class_id, x, y, w, h = parts

                # Check class ID
                if not class_id.isdigit() or int(class_id) > 16:
                    errors.append(f"{label_file.name}:{i} - Invalid class_id: {class_id} (must be 0-16)")

                # Check coordinates
                try:
                    x, y, w, h = float(x), float(y), float(w), float(h)
                    if not (0 <= x <= 1 and 0 <= y <= 1 and 0 <= w <= 1 and 0 <= h <= 1):
                        errors.append(f"{label_file.name}:{i} - Values not normalized (must be 0-1)")
                except ValueError:
                    errors.append(f"{label_file.name}:{i} - Invalid numbers")

        except Exception as e:
            errors.append(f"{label_file.name} - Read error: {e}")

    if errors:
        print(f"[WARNING] Found {len(errors)} validation errors:")
        for error in errors[:10]:
            print(f"  - {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")
    else:
        print(f"[OK] Validated {len(sample_labels)} sample labels")

# Recommendations
print("\n[5] Dataset Quality Assessment")
print("-" * 80)

train_count = len(list((dataset_path / 'images/train').glob('*.*')))

if train_count < 50:
    print("[WARNING] Very small dataset!")
    print(f"  Current: {train_count} training images")
    print(f"  Minimum: 50 images (for quick test)")
    print(f"  Recommended: 500+ images (for production)")
elif train_count < 200:
    print("[INFO] Small dataset - good for testing")
    print(f"  Current: {train_count} training images")
    print(f"  Expected accuracy: ~60-70%")
    print(f"  For better accuracy: 500+ images")
elif train_count < 500:
    print("[OK] Decent dataset size")
    print(f"  Current: {train_count} training images")
    print(f"  Expected accuracy: ~70-85%")
else:
    print("[EXCELLENT] Good dataset size!")
    print(f"  Current: {train_count} training images")
    print(f"  Expected accuracy: ~85-95%")

# Final verdict
print("\n" + "=" * 80)
print("VERDICT")
print("=" * 80)

if total_images == 0:
    print("[NOT READY] No training data found")
    print("\nAdd images and labels to start training")
elif total_images < 50:
    print("[NOT READY] Too few images")
    print(f"\nCurrent: {total_images} images")
    print("Minimum: 50 images for quick test")
elif total_images != total_labels:
    print("[NOT READY] Images and labels count mismatch")
    print("\nEnsure every image has a matching label file")
elif errors:
    print("[WARNING] Ready but has label format errors")
    print("\nFix label formatting before training")
else:
    print("[READY] Dataset is ready for training!")
    print("\nNext step:")
    print("  python train_yolo_kfold.py")

print("\n" + "=" * 80)
