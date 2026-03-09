"""
YOLO Training Script with K-Fold Cross-Validation
Trains furniture detection model with anti-overfitting strategies
"""

import os
import sys
from pathlib import Path
import yaml
import shutil
from datetime import datetime

print("=" * 80)
print("YOLO K-FOLD TRAINING WITH ANTI-OVERFITTING")
print("=" * 80)

# Configuration
DATASET_PATH = Path("datasets/furniture_floorplan")
K_FOLDS = 5
EPOCHS = 300
PATIENCE = 50
BATCH_SIZE = 16
IMG_SIZE = 1280
MODEL_SIZE = "yolov8m"  # Options: yolov8n, yolov8s, yolov8m, yolov8l, yolov8x

# Accuracy Thresholds
MIN_MAP50_THRESHOLD = 0.60      # Minimum acceptable mAP@0.5 (60%)
TARGET_MAP50 = 0.80             # Target mAP@0.5 to aim for (80%)
MIN_MAP5095_THRESHOLD = 0.40    # Minimum acceptable mAP@0.5:0.95 (40%)
FAIL_ON_LOW_ACCURACY = False    # Set True to exit if accuracy too low

# Furniture classes (17 classes)
FURNITURE_CLASSES = {
    0: 'workstation_single',
    1: 'workstation_l_shaped',
    2: 'workstation_cluster',
    3: 'executive_desk',
    4: 'conference_table',
    5: 'meeting_table',
    6: 'pedestal_mobile',
    7: 'pedestal_fixed',
    8: 'storage_low',
    9: 'storage_mid',
    10: 'storage_overhead',
    11: 'credenza',
    12: 'filing_cabinet',
    13: 'chair_task',
    14: 'chair_visitor',
    15: 'chair_executive',
    16: 'sofa_lounge'
}

# Check if dataset exists
if not DATASET_PATH.exists():
    print(f"[ERROR] Dataset not found at: {DATASET_PATH}")
    print("\nPlease create dataset structure:")
    print("datasets/furniture_floorplan/")
    print("  - images/")
    print("    - train/")
    print("    - val/")
    print("    - test/")
    print("  - labels/")
    print("    - train/")
    print("    - val/")
    print("    - test/")
    sys.exit(1)

# Check for ultralytics
try:
    from ultralytics import YOLO
    import torch
    print("[OK] Ultralytics and PyTorch imported")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
except ImportError as e:
    print(f"[ERROR] Missing dependencies: {e}")
    print("\nInstall with: pip install ultralytics torch torchvision")
    sys.exit(1)

# Check dataset size
images_train = list((DATASET_PATH / 'images' / 'train').glob('*.jpg')) + \
               list((DATASET_PATH / 'images' / 'train').glob('*.png'))
images_val = list((DATASET_PATH / 'images' / 'val').glob('*.jpg')) + \
             list((DATASET_PATH / 'images' / 'val').glob('*.png'))

print(f"\n[DATASET INFO]")
print(f"Training images: {len(images_train)}")
print(f"Validation images: {len(images_val)}")

print(f"\n[ACCURACY THRESHOLDS]")
print(f"Minimum mAP@0.5:      {MIN_MAP50_THRESHOLD:.2f} ({MIN_MAP50_THRESHOLD*100:.0f}%)")
print(f"Minimum mAP@0.5:0.95: {MIN_MAP5095_THRESHOLD:.2f} ({MIN_MAP5095_THRESHOLD*100:.0f}%)")
print(f"Target mAP@0.5:       {TARGET_MAP50:.2f} ({TARGET_MAP50*100:.0f}%)")
print(f"Fail on low accuracy: {'Yes' if FAIL_ON_LOW_ACCURACY else 'No (warning only)'}")

if len(images_train) < 100:
    print("[WARNING] Small dataset! Recommend 500+ images for good performance")
    print("   Using smaller model (yolov8s) for small datasets...")
    MODEL_SIZE = "yolov8s"
elif len(images_train) < 500:
    print("[INFO] Medium dataset - using yolov8s")
    MODEL_SIZE = "yolov8s"
else:
    print("[OK] Good dataset size - using yolov8m")

# Create YAML configuration
def create_yaml_config(fold=None):
    """Create YAML config for YOLO training"""

    if fold is None:
        # Standard train/val/test split
        data_yaml = {
            'path': str(DATASET_PATH.absolute()),
            'train': 'images/train',
            'val': 'images/val',
            'test': 'images/test',
            'nc': len(FURNITURE_CLASSES),
            'names': list(FURNITURE_CLASSES.values())
        }
        yaml_path = DATASET_PATH / 'furniture_data.yaml'
    else:
        # K-fold split
        data_yaml = {
            'path': str(DATASET_PATH.absolute()),
            'train': f'images/fold{fold}/train',
            'val': f'images/fold{fold}/val',
            'nc': len(FURNITURE_CLASSES),
            'names': list(FURNITURE_CLASSES.values())
        }
        yaml_path = DATASET_PATH / f'furniture_fold{fold}.yaml'

    with open(yaml_path, 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False, sort_keys=False)

    return yaml_path

# K-Fold Cross-Validation Setup
def create_kfold_splits(k=5):
    """Create K-fold splits from training data"""

    print(f"\n[K-FOLD SETUP] Creating {k}-fold splits...")

    # Get all training images
    all_images = list((DATASET_PATH / 'images' / 'train').glob('*.*'))
    all_images = [img for img in all_images if img.suffix.lower() in ['.jpg', '.png', '.jpeg']]

    total_images = len(all_images)
    fold_size = total_images // k

    print(f"Total training images: {total_images}")
    print(f"Images per fold: {fold_size}")

    # Create fold directories
    for fold in range(k):
        fold_dir = DATASET_PATH / 'images' / f'fold{fold}'
        (fold_dir / 'train').mkdir(parents=True, exist_ok=True)
        (fold_dir / 'val').mkdir(parents=True, exist_ok=True)

        fold_label_dir = DATASET_PATH / 'labels' / f'fold{fold}'
        (fold_label_dir / 'train').mkdir(parents=True, exist_ok=True)
        (fold_label_dir / 'val').mkdir(parents=True, exist_ok=True)

    # Split images into folds
    import random
    random.seed(42)
    random.shuffle(all_images)

    for fold in range(k):
        # Validation set for this fold
        val_start = fold * fold_size
        val_end = val_start + fold_size
        val_images = all_images[val_start:val_end]

        # Training set = all other images
        train_images = all_images[:val_start] + all_images[val_end:]

        # Copy/symlink images and labels to fold directories
        for img in train_images:
            img_name = img.name
            label_name = img.stem + '.txt'

            src_img = img
            dst_img = DATASET_PATH / 'images' / f'fold{fold}' / 'train' / img_name

            src_label = DATASET_PATH / 'labels' / 'train' / label_name
            dst_label = DATASET_PATH / 'labels' / f'fold{fold}' / 'train' / label_name

            # Use symlinks to save space (or copy if symlink not supported)
            try:
                if not dst_img.exists():
                    dst_img.symlink_to(src_img)
                if src_label.exists() and not dst_label.exists():
                    dst_label.symlink_to(src_label)
            except OSError:
                # Fallback to copy if symlink not supported
                shutil.copy(src_img, dst_img)
                if src_label.exists():
                    shutil.copy(src_label, dst_label)

        for img in val_images:
            img_name = img.name
            label_name = img.stem + '.txt'

            src_img = img
            dst_img = DATASET_PATH / 'images' / f'fold{fold}' / 'val' / img_name

            src_label = DATASET_PATH / 'labels' / 'train' / label_name
            dst_label = DATASET_PATH / 'labels' / f'fold{fold}' / 'val' / label_name

            try:
                if not dst_img.exists():
                    dst_img.symlink_to(src_img)
                if src_label.exists() and not dst_label.exists():
                    dst_label.symlink_to(src_label)
            except OSError:
                shutil.copy(src_img, dst_img)
                if src_label.exists():
                    shutil.copy(src_label, dst_label)

        print(f"  Fold {fold}: {len(train_images)} train, {len(val_images)} val")

    print("[OK] K-fold splits created")

# Training function
def train_single_fold(fold, yaml_path):
    """Train YOLO model on a single fold"""

    print(f"\n{'=' * 80}")
    print(f"TRAINING FOLD {fold}/{K_FOLDS}")
    print(f"{'=' * 80}")

    # Initialize model - check models/yolo/ directory first
    base_model_path = Path(f'models/yolo/{MODEL_SIZE}.pt')
    if base_model_path.exists():
        print(f"[OK] Using base model from: {base_model_path}")
        model = YOLO(str(base_model_path))
    else:
        print(f"[INFO] Base model not found in models/yolo/, will download {MODEL_SIZE}.pt")
        model = YOLO(f'{MODEL_SIZE}.pt')
        # Move downloaded model to models/yolo/ for future use
        if Path(f'{MODEL_SIZE}.pt').exists():
            shutil.move(f'{MODEL_SIZE}.pt', base_model_path)
            print(f"[OK] Moved base model to: {base_model_path}")

    # Training hyperparameters with anti-overfitting
    results = model.train(
        data=str(yaml_path),
        epochs=EPOCHS,
        patience=PATIENCE,  # Early stopping
        batch=BATCH_SIZE,
        imgsz=IMG_SIZE,

        # Anti-overfitting augmentation
        augment=True,
        mosaic=1.0,           # Mosaic augmentation (4 images)
        mixup=0.5,            # MixUp augmentation
        degrees=15.0,         # Rotation ±15°
        translate=0.1,        # Translation
        scale=0.1,            # Scale ±10%
        shear=0.0,            # Shear (disabled for floor plans)
        perspective=0.0,      # Perspective (disabled for floor plans)
        flipud=0.5,           # Vertical flip
        fliplr=0.5,           # Horizontal flip
        hsv_h=0.015,          # HSV-Hue augmentation
        hsv_s=0.7,            # HSV-Saturation
        hsv_v=0.4,            # HSV-Value

        # Regularization
        weight_decay=0.0005,  # L2 regularization
        label_smoothing=0.1,  # Label smoothing
        dropout=0.0,          # Dropout (YOLO handles internally)

        # Optimization
        optimizer='AdamW',    # AdamW optimizer (better than Adam)
        lr0=0.01,            # Initial learning rate
        lrf=0.01,            # Final learning rate (lr0 * lrf)
        momentum=0.937,      # SGD momentum

        # Other settings
        val=True,            # Validate during training
        save=True,           # Save checkpoints
        save_period=10,      # Save every 10 epochs
        plots=True,          # Generate plots
        device=0 if torch.cuda.is_available() else 'cpu',
        workers=8,           # Data loading workers
        project=f'runs/train_fold{fold}',
        name=f'{MODEL_SIZE}_furniture',
        exist_ok=True,
        pretrained=True,     # Use pretrained weights
        verbose=True
    )

    return results

# Accuracy validation function
def validate_accuracy(map50, map5095, model_name="Model"):
    """
    Check if trained model meets accuracy thresholds

    Args:
        map50: mAP@0.5 score (0-1)
        map5095: mAP@0.5:0.95 score (0-1)
        model_name: Name for display purposes

    Returns:
        bool: True if meets minimum thresholds
    """
    print("\n" + "=" * 80)
    print("ACCURACY VALIDATION")
    print("=" * 80)

    print(f"\n{model_name} Results:")
    print(f"  mAP@0.5:      {map50:.4f} ({map50*100:.2f}%)")
    print(f"  mAP@0.5:0.95: {map5095:.4f} ({map5095*100:.2f}%)")

    print(f"\nRequired Thresholds:")
    print(f"  MIN mAP@0.5:      {MIN_MAP50_THRESHOLD:.4f} ({MIN_MAP50_THRESHOLD*100:.0f}%)")
    print(f"  MIN mAP@0.5:0.95: {MIN_MAP5095_THRESHOLD:.4f} ({MIN_MAP5095_THRESHOLD*100:.0f}%)")
    print(f"  TARGET mAP@0.5:   {TARGET_MAP50:.4f} ({TARGET_MAP50*100:.0f}%)")

    # Check minimum thresholds
    meets_map50 = map50 >= MIN_MAP50_THRESHOLD
    meets_map5095 = map5095 >= MIN_MAP5095_THRESHOLD
    meets_target = map50 >= TARGET_MAP50

    print(f"\nValidation Results:")
    print(f"  mAP@0.5 >= {MIN_MAP50_THRESHOLD:.2f}:      {'[PASS]' if meets_map50 else '[FAIL]'}")
    print(f"  mAP@0.5:0.95 >= {MIN_MAP5095_THRESHOLD:.2f}: {'[PASS]' if meets_map5095 else '[FAIL]'}")
    print(f"  Reached TARGET {TARGET_MAP50:.2f}:   {'[YES]' if meets_target else '[NO]'}")

    meets_minimum = meets_map50 and meets_map5095

    if meets_target:
        print(f"\n[EXCELLENT] Model reached target accuracy!")
    elif meets_minimum:
        print(f"\n[GOOD] Model meets minimum requirements")
        if not meets_target:
            gap = (TARGET_MAP50 - map50) * 100
            print(f"  Tip: {gap:.1f}% away from target - consider more training data")
    else:
        print(f"\n[WARNING] Model below minimum threshold!")
        if not meets_map50:
            gap = (MIN_MAP50_THRESHOLD - map50) * 100
            print(f"  mAP@0.5 is {gap:.1f}% below minimum")
        if not meets_map5095:
            gap = (MIN_MAP5095_THRESHOLD - map5095) * 100
            print(f"  mAP@0.5:0.95 is {gap:.1f}% below minimum")
        print("\n  Recommendations:")
        print("  - Add more training images (target: 500+ images)")
        print("  - Check annotation quality")
        print("  - Increase epochs or reduce early stopping patience")

    if FAIL_ON_LOW_ACCURACY and not meets_minimum:
        print("\n[ERROR] FAIL_ON_LOW_ACCURACY=True - Training considered failed")
        return False

    return meets_minimum

# Main training workflow
def main():
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    print("\n[TRAINING MODE]")
    print("1. Standard Train/Val Split (Faster)")
    print("2. K-Fold Cross-Validation (Better, recommended)")

    mode = input("\nChoose mode (1 or 2): ").strip()

    if mode == '1':
        # Standard training
        print("\n[TRAINING] Standard train/val split...")
        yaml_path = create_yaml_config()
        results = train_single_fold(0, yaml_path)

        print("\n[TRAINING COMPLETE]")
        print(f"Model saved to: runs/train_fold0/{MODEL_SIZE}_furniture/weights/best.pt")

        # Extract accuracy metrics
        final_map50 = results.results_dict.get('metrics/mAP50(B)', 0)
        final_map5095 = results.results_dict.get('metrics/mAP50-95(B)', 0)

        # Validate accuracy
        accuracy_ok = validate_accuracy(final_map50, final_map5095, "Standard Training")

        # Copy best model to models directory
        best_model = Path(f'runs/train_fold0/{MODEL_SIZE}_furniture/weights/best.pt')
        if best_model.exists():
            output_path = Path(f'models/yolo/furniture_floorplan_{timestamp}.pt')
            shutil.copy(best_model, output_path)
            print(f"Best model copied to: {output_path}")

            # Also save as latest
            latest_path = Path('models/yolo/furniture_floorplan_latest.pt')
            shutil.copy(best_model, latest_path)
            print(f"Latest model: {latest_path}")

            # Exit if accuracy check failed and FAIL_ON_LOW_ACCURACY is True
            if not accuracy_ok and FAIL_ON_LOW_ACCURACY:
                print("\n[ABORTED] Model did not meet minimum accuracy requirements")
                sys.exit(1)

    elif mode == '2':
        # K-fold cross-validation
        print(f"\n[K-FOLD] Training with {K_FOLDS}-fold cross-validation...")

        # Create K-fold splits
        create_kfold_splits(K_FOLDS)

        # Train each fold
        fold_results = []
        for fold in range(K_FOLDS):
            yaml_path = create_yaml_config(fold)
            results = train_single_fold(fold, yaml_path)
            fold_results.append(results)

        # Average results across folds
        print("\n" + "=" * 80)
        print("K-FOLD CROSS-VALIDATION RESULTS")
        print("=" * 80)

        avg_map50 = sum([r.results_dict.get('metrics/mAP50(B)', 0) for r in fold_results]) / K_FOLDS
        avg_map5095 = sum([r.results_dict.get('metrics/mAP50-95(B)', 0) for r in fold_results]) / K_FOLDS

        print(f"\nAverage mAP@0.5: {avg_map50:.4f}")
        print(f"Average mAP@0.5:0.95: {avg_map5095:.4f}")

        # Find best fold
        best_fold = max(range(K_FOLDS),
                       key=lambda i: fold_results[i].results_dict.get('metrics/mAP50-95(B)', 0))

        print(f"\nBest fold: {best_fold}")
        print(f"Best mAP@0.5:0.95: {fold_results[best_fold].results_dict.get('metrics/mAP50-95(B)', 0):.4f}")

        # Validate average accuracy across all folds
        accuracy_ok = validate_accuracy(avg_map50, avg_map5095, "K-Fold Cross-Validation")

        # Copy best model
        best_model = Path(f'runs/train_fold{best_fold}/{MODEL_SIZE}_furniture/weights/best.pt')
        if best_model.exists():
            output_path = Path(f'models/yolo/furniture_floorplan_kfold_{timestamp}.pt')
            shutil.copy(best_model, output_path)
            print(f"\nBest model copied to: {output_path}")

            # Also save as latest
            latest_path = Path('models/yolo/furniture_floorplan_latest.pt')
            shutil.copy(best_model, latest_path)
            print(f"Latest model: {latest_path}")

            # Update .env file
            print("\n[CONFIG] Updating .env file...")
            env_path = Path('inventory_scanner/.env')
            if env_path.exists():
                with open(env_path, 'r') as f:
                    env_content = f.read()

                # Update YOLO_MODEL_PATH
                if 'YOLO_MODEL_PATH=' in env_content:
                    # Replace any existing path with the new one
                    import re
                    env_content = re.sub(
                        r'YOLO_MODEL_PATH=.*',
                        f'YOLO_MODEL_PATH=./{latest_path}',
                        env_content
                    )

                with open(env_path, 'w') as f:
                    f.write(env_content)

                print(f"[OK] Updated YOLO_MODEL_PATH to: {latest_path}")

            # Exit if accuracy check failed and FAIL_ON_LOW_ACCURACY is True
            if not accuracy_ok and FAIL_ON_LOW_ACCURACY:
                print("\n[ABORTED] Model did not meet minimum accuracy requirements")
                sys.exit(1)

    else:
        print("[ERROR] Invalid choice")
        sys.exit(1)

    print("\n" + "=" * 80)
    print("TRAINING COMPLETE!")
    print("=" * 80)
    print("\nNext steps:")
    print("1. Enable YOLO in .env: ENABLE_YOLO_PREPROCESSING=true")
    print("2. Test the model: python test_yolo_inference.py")
    print("3. Start server: python start_server.py")

if __name__ == '__main__':
    main()
