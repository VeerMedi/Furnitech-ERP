"""
Helper script to automatically split your dataset into train/val/test
Usage: python split_dataset.py --source raw_data/ --split 70 20 10
"""

import argparse
import shutil
import random
from pathlib import Path

def split_dataset(source_dir, output_dir, train_ratio=0.7, val_ratio=0.2, test_ratio=0.1):
    """
    Split images and labels into train/val/test folders

    Args:
        source_dir: Folder containing images/ and labels/ subdirectories
        output_dir: Output folder (will create train/val/test structure)
        train_ratio: Percentage for training (default 0.7)
        val_ratio: Percentage for validation (default 0.2)
        test_ratio: Percentage for test (default 0.1)
    """

    source = Path(source_dir)
    output = Path(output_dir)

    # Find images and labels
    images_source = source / 'images'
    labels_source = source / 'labels'

    if not images_source.exists():
        print(f"[ERROR] Images folder not found: {images_source}")
        return False

    if not labels_source.exists():
        print(f"[ERROR] Labels folder not found: {labels_source}")
        return False

    # Get all images
    images = list(images_source.glob('*.jpg')) + list(images_source.glob('*.png'))

    if not images:
        print("[ERROR] No images found!")
        return False

    print(f"Found {len(images)} images")

    # Check for matching labels
    valid_pairs = []
    for img in images:
        label_file = labels_source / f"{img.stem}.txt"
        if label_file.exists():
            valid_pairs.append((img, label_file))
        else:
            print(f"[WARNING] Missing label for: {img.name}")

    print(f"Found {len(valid_pairs)} valid image-label pairs")

    if not valid_pairs:
        print("[ERROR] No valid pairs found!")
        return False

    # Shuffle
    random.seed(42)
    random.shuffle(valid_pairs)

    # Calculate splits
    total = len(valid_pairs)
    train_end = int(total * train_ratio)
    val_end = train_end + int(total * val_ratio)

    train_pairs = valid_pairs[:train_end]
    val_pairs = valid_pairs[train_end:val_end]
    test_pairs = valid_pairs[val_end:]

    print(f"\nSplit:")
    print(f"  Train: {len(train_pairs)} ({len(train_pairs)/total*100:.1f}%)")
    print(f"  Val:   {len(val_pairs)} ({len(val_pairs)/total*100:.1f}%)")
    print(f"  Test:  {len(test_pairs)} ({len(test_pairs)/total*100:.1f}%)")

    # Create output directories
    for split in ['train', 'val', 'test']:
        (output / 'images' / split).mkdir(parents=True, exist_ok=True)
        (output / 'labels' / split).mkdir(parents=True, exist_ok=True)

    # Copy files
    def copy_pairs(pairs, split_name):
        print(f"\nCopying {split_name}...")
        for img, label in pairs:
            # Copy image
            img_dest = output / 'images' / split_name / img.name
            shutil.copy2(img, img_dest)

            # Copy label
            label_dest = output / 'labels' / split_name / label.name
            shutil.copy2(label, label_dest)

        print(f"  [OK] Copied {len(pairs)} pairs")

    copy_pairs(train_pairs, 'train')
    copy_pairs(val_pairs, 'val')
    copy_pairs(test_pairs, 'test')

    print(f"\n[SUCCESS] Dataset split complete!")
    print(f"Output: {output.absolute()}")

    return True


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Split dataset into train/val/test')
    parser.add_argument('--source', '-s', default='raw_data',
                       help='Source folder with images/ and labels/ (default: raw_data)')
    parser.add_argument('--output', '-o', default='datasets/furniture_floorplan',
                       help='Output folder (default: datasets/furniture_floorplan)')
    parser.add_argument('--split', nargs=3, type=float, default=[70, 20, 10],
                       help='Train/Val/Test split percentages (default: 70 20 10)')

    args = parser.parse_args()

    # Convert percentages to ratios
    train, val, test = [x/100 for x in args.split]

    if abs(sum([train, val, test]) - 1.0) > 0.01:
        print("[ERROR] Split percentages must sum to 100!")
        exit(1)

    print("=" * 80)
    print("DATASET SPLITTING TOOL")
    print("=" * 80)
    print(f"\nSource: {args.source}")
    print(f"Output: {args.output}")
    print(f"Split:  Train={train*100:.0f}% Val={val*100:.0f}% Test={test*100:.0f}%")
    print()

    success = split_dataset(args.source, args.output, train, val, test)

    if success:
        print("\n[NEXT STEP] Verify dataset:")
        print("  python check_dataset.py")
    else:
        print("\n[FAILED] Dataset splitting failed")
        exit(1)
