# YOLO Training Guide: Avoiding Overfitting with LoRA Feedback Loop

## Overview
This guide covers training a custom YOLOv8 model for furniture detection on floor plans with strategies to prevent overfitting. It includes integration with LoRA feedback for continuous improvement.

---

## Part 1: YOLO Training with Anti-Overfitting Strategies

### Dataset Requirements

**Minimum Dataset Size:**
- **500-1000 images** minimum for initial training
- **Diversity is key**: Different styles, scales, drawing types
- **Balanced classes**: At least 50 examples per furniture class

**Data Collection Sources:**
1. Real floor plan drawings (current projects)
2. CAD-generated synthetic plans
3. Public architectural datasets
4. Data augmentation (see below)

### Data Annotation

**Tool Recommendation:** Roboflow (https://roboflow.com)
- Easy labeling interface
- Automatic train/val/test split
- Built-in augmentation
- Direct YOLOv8 export

**Annotation Guidelines:**
```yaml
Classes (17 total):
  0: workstation_single
  1: workstation_l_shaped
  2: workstation_cluster
  3: executive_desk
  4: conference_table
  5: meeting_table_small
  6: office_chair
  7: visitor_chair
  8: sofa
  9: pedestal
  10: storage_low
  11: storage_full
  12: credenza
  13: overhead_storage
  14: reception_desk
  15: cafeteria_table
  16: zone_boundary
```

**Things to Watch:**
- **Consistent labeling**: Ensure the same furniture type is always labeled the same class
- **Tight bounding boxes**: Include only the furniture, not surrounding space
- **Occlusion handling**: Label partially visible items
- **Edge cases**: Label furniture at drawing boundaries

---

## Part 2: Anti-Overfitting Strategies

### 1. Data Augmentation

**Augmentation Pipeline:**
```python
# train_yolo.py
from ultralytics import YOLO

# Augmentation config (in dataset.yaml)
augmentation_config = {
    'hsv_h': 0.015,       # Hue (color variation)
    'hsv_s': 0.4,         # Saturation
    'hsv_v': 0.2,         # Value (brightness)
    'degrees': 5.0,       # Rotation (+/- degrees)
    'translate': 0.1,     # Translation (fraction of image)
    'scale': 0.2,         # Scaling (+/- fraction)
    'shear': 2.0,         # Shear (degrees)
    'perspective': 0.0001,# Perspective transform
    'flipud': 0.0,        # Vertical flip (disabled for floor plans)
    'fliplr': 0.5,        # Horizontal flip (50% chance)
    'mosaic': 0.5,        # Mosaic augmentation (combines 4 images)
    'mixup': 0.1,         # MixUp (blends 2 images)
    'copy_paste': 0.1     # Copy-paste augmentation
}
```

**Why These Settings:**
- **Rotation**: Floor plans can be oriented differently
- **No vertical flip**: Floor plans have orientation
- **Mosaic**: Helps model learn multi-scale features
- **MixUp**: Prevents overfitting to backgrounds

### 2. Train/Val/Test Split

**Recommended Split:**
```
Train: 70% (700 images if 1000 total)
Val:   20% (200 images)
Test:  10% (100 images - NEVER used during training)
```

**Critical Rules:**
- **No data leakage**: Test set must be completely separate
- **Similar distribution**: Each split should have similar class distribution
- **Time-based split** (if applicable): Use newer floor plans for testing

### 3. Early Stopping

**Configuration:**
```python
# Early stopping to prevent overfitting
model.train(
    data='furniture_dataset.yaml',
    epochs=300,           # Max epochs
    patience=50,          # Stop if no improvement for 50 epochs
    save=True,
    save_period=10,       # Save checkpoint every 10 epochs

    # Learning rate schedule
    lrf=0.01,             # Final learning rate (1% of initial)
    lr0=0.01,             # Initial learning rate
    momentum=0.937,
    weight_decay=0.0005,  # L2 regularization

    # Other hyperparameters
    warmup_epochs=3.0,
    warmup_momentum=0.8,
    warmup_bias_lr=0.1,
)
```

**How It Works:**
- Training stops if validation mAP doesn't improve for 50 epochs
- Model automatically loads the best checkpoint (highest mAP)
- Prevents overtraining on the training set

### 4. Regularization Techniques

**A. Dropout (implicit in YOLO)**
```python
# YOLOv8 has built-in dropout in the head
# No explicit configuration needed
```

**B. Weight Decay (L2 Regularization)**
```python
weight_decay=0.0005  # Penalizes large weights
```

**C. Label Smoothing**
```python
# Prevents overconfidence
label_smoothing=0.1  # Reduces target from 1.0 to 0.9
```

### 5. Model Size Selection

**Avoid Overfitting with Appropriate Capacity:**

| Model | Parameters | Speed | When to Use |
|-------|-----------|-------|-------------|
| YOLOv8n (nano) | 3.2M | ~2ms | < 300 training images |
| YOLOv8s (small) | 11.2M | ~3ms | 300-600 training images |
| **YOLOv8m (medium)** | **25.9M** | ~5ms | **600-1000+ images ✅ RECOMMENDED** |
| YOLOv8l (large) | 43.7M | ~8ms | > 2000 images |
| YOLOv8x (xlarge) | 68.2M | ~12ms | > 5000 images |

**Rule of Thumb:**
- **100-200 images per parameter** is safe
- With 700 training images, YOLOv8m (25.9M params) has 700/25,900,000 ≈ 37 images/param (borderline)
- **YOLOv8s might be safer** with < 1000 images
- **Use validation loss to decide**: If train loss << val loss → overfitting

### 6. Cross-Validation (Advanced)

**K-Fold Cross-Validation:**
```python
# train_yolo_kfold.py
from ultralytics import YOLO
from sklearn.model_selection import KFold
import numpy as np

def kfold_yolo_training(dataset_images, k=5):
    """
    K-fold cross-validation for YOLO training.

    Args:
        dataset_images: List of image paths
        k: Number of folds
    """
    kfold = KFold(n_splits=k, shuffle=True, random_state=42)

    results = []

    for fold, (train_idx, val_idx) in enumerate(kfold.split(dataset_images)):
        print(f"\n========== FOLD {fold + 1}/{k} ==========")

        # Split dataset
        train_images = [dataset_images[i] for i in train_idx]
        val_images = [dataset_images[i] for i in val_idx]

        # Create fold-specific dataset
        create_fold_dataset(train_images, val_images, fold)

        # Train model
        model = YOLO('yolov8m.pt')
        results_fold = model.train(
            data=f'furniture_dataset_fold{fold}.yaml',
            epochs=100,
            patience=20,
            project=f'runs/detect/fold{fold}'
        )

        results.append(results_fold)

    # Average metrics across folds
    avg_map = np.mean([r.results_dict['metrics/mAP50(B)'] for r in results])
    print(f"\nAverage mAP@50 across {k} folds: {avg_map:.3f}")

    return results
```

**Why K-Fold:**
- More robust evaluation
- Detects overfitting across different train/val splits
- Useful with limited data

---

## Part 3: Training Script with Anti-Overfitting

**Complete Training Script:**
```python
# AI/inventory_scanner/train_yolo.py

from ultralytics import YOLO
import yaml
from pathlib import Path

def train_furniture_detector(
    data_yaml='furniture_dataset.yaml',
    model_size='m',  # n, s, m, l, x
    epochs=300,
    patience=50,
    image_size=1280,
    batch_size=16
):
    """
    Train YOLO furniture detector with anti-overfitting strategies.

    Args:
        data_yaml: Path to dataset YAML
        model_size: Model size (n/s/m/l/x)
        epochs: Maximum epochs
        patience: Early stopping patience
        image_size: Training image size
        batch_size: Batch size
    """

    # Load pretrained model
    model = YOLO(f'yolov8{model_size}.pt')

    # Training hyperparameters optimized to prevent overfitting
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        patience=patience,
        batch=batch_size,
        imgsz=image_size,

        # Anti-overfitting settings
        augment=True,
        degrees=5.0,
        translate=0.1,
        scale=0.2,
        shear=2.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=0.5,
        mixup=0.1,
        copy_paste=0.1,

        # Regularization
        weight_decay=0.0005,
        label_smoothing=0.1,

        # Learning rate schedule
        lr0=0.01,
        lrf=0.01,
        momentum=0.937,

        # Validation
        val=True,
        plots=True,
        save=True,
        save_period=10,

        # Hardware
        device=0,  # GPU 0, or 'cpu'
        workers=8,

        # Output
        project='runs/detect',
        name='furniture_detector_v1',
        exist_ok=False,
        pretrained=True,
        optimizer='auto',  # Adam or SGD
        verbose=True,
        seed=42,
        deterministic=True,
    )

    # Evaluate on test set
    metrics = model.val(data=data_yaml, split='test')

    print("\n========== TRAINING COMPLETE ==========")
    print(f"Best mAP@50: {results.results_dict['metrics/mAP50(B)']:.3f}")
    print(f"Test mAP@50: {metrics.results_dict['metrics/mAP50(B)']:.3f}")

    # Check for overfitting
    train_loss = results.results_dict['train/box_loss']
    val_loss = results.results_dict['val/box_loss']

    if val_loss > train_loss * 1.5:
        print("\n⚠️  WARNING: Possible overfitting detected!")
        print(f"   Train loss: {train_loss:.4f}")
        print(f"   Val loss: {val_loss:.4f}")
        print(f"   Ratio: {val_loss/train_loss:.2f}x")
        print("\n   Recommendations:")
        print("   1. Use smaller model (try YOLOv8s instead of YOLOv8m)")
        print("   2. Increase augmentation intensity")
        print("   3. Reduce training epochs")
        print("   4. Add more training data")

    return model, results


if __name__ == "__main__":
    # Train model
    model, results = train_furniture_detector(
        data_yaml='furniture_dataset.yaml',
        model_size='m',  # Medium model
        epochs=300,
        patience=50
    )

    # Export for deployment
    model.export(format='onnx')  # For faster inference
    print(f"\nModel exported to: runs/detect/furniture_detector_v1/weights/best.onnx")
```

---

## Part 4: Monitoring for Overfitting

### Metrics to Watch

**During Training:**
```python
# Plot training curves
from ultralytics.utils.plotting import plot_results

plot_results('runs/detect/furniture_detector_v1')
```

**Key Indicators of Overfitting:**
1. **Train vs Val Loss Divergence**:
   - Train loss keeps decreasing
   - Val loss stops decreasing or increases
   - **Solution**: Stop training earlier (reduce patience)

2. **mAP@50 Gap**:
   - Train mAP@50 >> Val mAP@50 (> 10% difference)
   - **Solution**: Use smaller model or more data

3. **Class-Specific Overfitting**:
   - Some classes have perfect precision/recall on train
   - But poor performance on val
   - **Solution**: Add more examples of those classes

### Validation Curves to Monitor

```python
# Check these plots in runs/detect/furniture_detector_v1/
# 1. results.png - Overall training curves
# 2. confusion_matrix.png - Val set confusion
# 3. PR_curve.png - Precision-Recall curve
# 4. F1_curve.png - F1 score vs confidence threshold
```

**Healthy Training:**
- Train and val curves follow similar trajectory
- Both decrease steadily
- Gap between them stays < 10-15%

**Overfitting:**
- Train curve continues down
- Val curve flattens or goes up
- Large gap (> 20%) between train/val

---

## Part 5: LoRA-YOLO Feedback Loop

### Concept: Continuous Improvement

**The Feedback Loop:**
```
1. YOLO detects objects in floor plan
       ↓
2. Pass 1 LLM uses YOLO hints
       ↓
3. Pass 2 LoRA verifies and corrects
       ↓
4. LoRA identifies YOLO errors
       ↓
5. Log corrections for YOLO retraining
       ↓
6. Retrain YOLO with corrected labels
       ↓
(Loop back to step 1)
```

### Implementation

**A. Error Logging System:**
```python
# AI/inventory_scanner/feedback_logger.py

import json
from datetime import datetime
from pathlib import Path

class YOLOFeedbackLogger:
    """
    Logs YOLO errors identified by LoRA for future retraining.
    """

    def __init__(self, log_dir='./logs/yolo_feedback'):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def log_yolo_error(self,
                       image_path: str,
                       yolo_detections: list,
                       lora_corrections: dict,
                       error_type: str):
        """
        Log a YOLO error corrected by LoRA.

        Args:
            image_path: Path to floor plan image
            yolo_detections: Original YOLO detections
            lora_corrections: LoRA's corrected output
            error_type: Type of error (false_positive, false_negative, misclassification)
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'image_path': image_path,
            'error_type': error_type,
            'yolo_detections': yolo_detections,
            'lora_corrections': lora_corrections,
            'status': 'pending_review'
        }

        # Save log
        log_file = self.log_dir / f"yolo_error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_file, 'w') as f:
            json.dump(log_entry, f, indent=2)

    def get_correction_statistics(self):
        """Get statistics on YOLO errors."""
        error_types = {'false_positive': 0, 'false_negative': 0, 'misclassification': 0}

        for log_file in self.log_dir.glob('*.json'):
            with open(log_file) as f:
                log_data = json.load(f)
                error_type = log_data.get('error_type', 'unknown')
                if error_type in error_types:
                    error_types[error_type] += 1

        return error_types
```

**B. Retraining Pipeline:**
```python
# AI/inventory_scanner/yolo_retrain.py

from ultralytics import YOLO
import json
from pathlib import Path

def retrain_yolo_with_corrections(
    base_model_path='./models/furniture_floorplan_v1.pt',
    feedback_logs_dir='./logs/yolo_feedback',
    output_path='./models/furniture_floorplan_v2.pt'
):
    """
    Retrain YOLO model using LoRA corrections.

    Args:
        base_model_path: Current YOLO model
        feedback_logs_dir: Directory with LoRA correction logs
        output_path: Where to save retrained model
    """

    # 1. Parse feedback logs
    corrections = []
    for log_file in Path(feedback_logs_dir).glob('*.json'):
        with open(log_file) as f:
            log_data = json.load(f)

            # Extract corrections
            if log_data['status'] == 'verified':  # Only use human-verified corrections
                corrections.append({
                    'image': log_data['image_path'],
                    'corrected_labels': log_data['lora_corrections']
                })

    print(f"Found {len(corrections)} verified corrections")

    # 2. Update dataset with corrections
    update_yolo_dataset_with_corrections(corrections, 'furniture_dataset_corrected.yaml')

    # 3. Fine-tune YOLO on corrected dataset
    model = YOLO(base_model_path)

    results = model.train(
        data='furniture_dataset_corrected.yaml',
        epochs=50,  # Shorter retraining
        patience=10,
        resume=False,
        lr0=0.001,  # Lower learning rate for fine-tuning
        weight_decay=0.001,  # Higher regularization
        augment=True,
        save=True,
        project='runs/retrain',
        name='yolo_v2_with_lora_corrections'
    )

    # 4. Validate improvements
    val_metrics = model.val()
    print(f"\nRetrained model mAP@50: {val_metrics.results_dict['metrics/mAP50(B)']:.3f}")

    # 5. Save improved model
    model.export(format='pt', output=output_path)
    print(f"Saved improved model to: {output_path}")

    return model

def update_yolo_dataset_with_corrections(corrections, output_yaml):
    """
    Update YOLO dataset YAML with corrected annotations.
    """
    # Implementation: Parse corrections and update label files
    # This would modify the .txt label files to fix YOLO errors
    pass
```

**C. Automatic Correction Detection:**
```python
# Add to lora_inference.py

def detect_yolo_errors(self, yolo_detections, lora_inventory):
    """
    Compare YOLO detections with LoRA output to find errors.

    Returns:
        List of error dicts
    """
    errors = []

    # Create mapping of yolo classes to inventory items
    yolo_class_counts = {}
    for det in yolo_detections:
        cls = det['class']
        yolo_class_counts[cls] = yolo_class_counts.get(cls, 0) + 1

    # Check for mismatches
    lora_items = lora_inventory.get('items', [])

    # Example: YOLO detected "conference_table" but LoRA found "workstations"
    yolo_tables = yolo_class_counts.get('conference_table', 0)
    lora_workstations = sum(item['count'] for item in lora_items
                           if 'workstation' in item['name'].lower())

    if yolo_tables > 0 and lora_workstations > yolo_tables * 3:
        errors.append({
            'type': 'misclassification',
            'yolo_detected': f"{yolo_tables} conference_table(s)",
            'lora_found': f"{lora_workstations} workstations",
            'confidence': 'high'
        })

    # Check for false negatives (LoRA found items YOLO missed)
    lora_storage = [item for item in lora_items if item['category'] == 'Storage']
    yolo_storage = yolo_class_counts.get('pedestal', 0) + yolo_class_counts.get('storage_low', 0)

    if len(lora_storage) > yolo_storage + 2:
        errors.append({
            'type': 'false_negative',
            'yolo_detected': f"{yolo_storage} storage items",
            'lora_found': f"{len(lora_storage)} storage items",
            'confidence': 'medium'
        })

    return errors
```

---

## Part 6: Training Workflow

### Initial Training (Week 1-2)

1. **Collect & Annotate**: 500-1000 floor plans
2. **Train YOLOv8m**: With full augmentation
3. **Validate**: Check for overfitting
4. **Deploy**: Set `ENABLE_YOLO_PREPROCESSING=true`

### Feedback Collection (Week 3-4)

5. **Run on real data**: Process 100+ floor plans
6. **LoRA corrections**: LoRA fixes YOLO errors
7. **Log errors**: System automatically logs corrections
8. **Human review**: Verify LoRA corrections (important!)

### Retraining (Week 5)

9. **Parse logs**: Extract verified corrections
10. **Update dataset**: Add corrected labels
11. **Retrain YOLO**: Fine-tune with corrections
12. **A/B test**: Compare v1 vs v2 performance
13. **Deploy v2**: If better, replace v1

### Continuous Loop

Repeat steps 5-13 monthly or when 100+ corrections accumulated.

---

## Expected Improvements

### Without LoRA Feedback:
- Initial YOLO mAP@50: **0.70-0.75**
- Workstation detection: **80-85%**
- Storage detection: **60-70%**

### With LoRA Feedback (After 2-3 cycles):
- Improved YOLO mAP@50: **0.80-0.85**
- Workstation detection: **90-95%**
- Storage detection: **85-90%**

**Key Insight:** LoRA acts as an expert annotator, continuously improving YOLO's training data without human intervention.

---

## Anti-Overfitting Checklist

✅ Use data augmentation
✅ Train/val/test split (70/20/10)
✅ Early stopping (patience=50)
✅ Weight decay (L2 regularization)
✅ Label smoothing
✅ Appropriate model size (YOLOv8m for 700+ images)
✅ Monitor train vs val curves
✅ K-fold cross-validation (optional)
✅ Test on unseen data regularly
✅ LoRA feedback for data quality improvement

---

## Next Steps

1. **Start with YOLOv8s** if you have < 800 images
2. **Monitor overfitting indicators** during training
3. **Deploy LoRA immediately** to start collecting corrections
4. **Retrain YOLO quarterly** with accumulated corrections
5. **Track metrics** over time to measure improvements

This approach ensures YOLO continuously learns from its mistakes via LoRA's corrections, creating a self-improving system! 🔄
