# YOLO Training Dataset Structure

## 📁 Directory Layout

```
AI/
├── datasets/
│   └── furniture_floorplan/          ← Main dataset folder
│       ├── images/
│       │   ├── train/                ← PUT YOUR TRAINING IMAGES HERE (70%)
│       │   ├── val/                  ← PUT YOUR VALIDATION IMAGES HERE (20%)
│       │   └── test/                 ← PUT YOUR TEST IMAGES HERE (10%)
│       ├── labels/
│       │   ├── train/                ← PUT YOUR TRAINING LABELS HERE (.txt files)
│       │   ├── val/                  ← PUT YOUR VALIDATION LABELS HERE (.txt files)
│       │   └── test/                 ← PUT YOUR TEST LABELS HERE (.txt files)
│       └── furniture_data.yaml       ← Will be created automatically
│
├── models/                            ← Trained models saved here
│   ├── yolo/
│   └── lora_adapters/
│
├── test_data/                         ← Test PDFs for quick testing
│   └── ALT-10-Layout1.pdf            ← Your sample PDF
│
├── test_results/                      ← Analysis results saved here
│   └── result_ALT-10-Layout1.json
│
└── logs/                              ← Training and feedback logs
    ├── yolo_feedback/
    └── pass2_corrections/
```

---

## 📋 What Goes Where?

### 1. **Training Images** → `datasets/furniture_floorplan/images/train/`
- **Format:** `.jpg` or `.png`
- **Example:** `floorplan_001.jpg`, `layout_002.png`
- **Quantity:** 500-700 images (70% of total)

### 2. **Training Labels** → `datasets/furniture_floorplan/labels/train/`
- **Format:** `.txt` files (YOLO format)
- **Same name as image:** `floorplan_001.txt` for `floorplan_001.jpg`
- **Content:** One line per object
  ```
  <class_id> <x_center> <y_center> <width> <height>
  ```
  All values normalized 0-1

### 3. **Validation Images** → `datasets/furniture_floorplan/images/val/`
- **Quantity:** 150-200 images (20% of total)
- Used to check model performance during training

### 4. **Validation Labels** → `datasets/furniture_floorplan/labels/val/`
- Matching `.txt` files for validation images

### 5. **Test Images** → `datasets/furniture_floorplan/images/test/`
- **Quantity:** 50-100 images (10% of total)
- Final accuracy test after training

### 6. **Test Labels** → `datasets/furniture_floorplan/labels/test/`
- Matching `.txt` files for test images

---

## 🏷️ Class IDs (17 Furniture Types)

```
0:  workstation_single
1:  workstation_l_shaped
2:  workstation_cluster
3:  executive_desk
4:  conference_table
5:  meeting_table
6:  pedestal_mobile
7:  pedestal_fixed
8:  storage_low
9:  storage_mid
10: storage_overhead
11: credenza
12: filing_cabinet
13: chair_task
14: chair_visitor
15: chair_executive
16: sofa_lounge
```

---

## 📝 Label File Example

**For image:** `floorplan_001.jpg` (1920x1080 pixels)

**Create file:** `floorplan_001.txt`

**Contents:**
```
0 0.45 0.35 0.12 0.08    ← workstation_single at center (0.45, 0.35), size 0.12x0.08
4 0.75 0.60 0.15 0.10    ← conference_table at (0.75, 0.60), size 0.15x0.10
13 0.76 0.62 0.02 0.02   ← chair_task at (0.76, 0.62), size 0.02x0.02
13 0.74 0.62 0.02 0.02   ← another chair_task
```

**Normalized values:** All coordinates are 0-1 (divide by image width/height)

---

## 🎯 Quick Start Guide

### **Option 1: Annotate with Roboflow (Easiest)**

1. **Go to:** https://roboflow.com
2. **Create project:** "Furniture Detection"
3. **Upload images:** Your floor plan images
4. **Annotate:** Draw bounding boxes around furniture
5. **Export:** YOLO format
6. **Download:** Will give you train/val/test splits automatically
7. **Copy to:** `AI/datasets/furniture_floorplan/`

### **Option 2: Annotate with LabelImg (Desktop Tool)**

1. **Install:**
   ```bash
   pip install labelImg
   ```

2. **Run:**
   ```bash
   labelImg
   ```

3. **Setup:**
   - Open Dir: Select your images folder
   - Change Save Dir: Select labels folder
   - Select format: YOLO
   - Create classes file with 17 furniture types

4. **Annotate:**
   - Press 'W' to create bounding box
   - Draw around furniture
   - Select class
   - Press 'D' to next image

5. **Split data:**
   - Use the provided `split_dataset.py` script (see below)

---

## 🚀 After Placing Data

**Check if data is ready:**
```bash
cd AI
venv\Scripts\python check_dataset.py
```

**Start training:**
```bash
venv\Scripts\python train_yolo_kfold.py
```

**Expected training time:**
- 100 images: ~30 minutes
- 500 images: ~2-3 hours
- 1000 images: ~4-6 hours

---

## ✅ Dataset Checklist

Before training, ensure:
- [ ] Images placed in `images/train/`, `images/val/`, `images/test/`
- [ ] Labels placed in `labels/train/`, `labels/val/`, `labels/test/`
- [ ] Same number of images and labels in each folder
- [ ] Image and label filenames match (e.g., `img1.jpg` ↔ `img1.txt`)
- [ ] Train split: ~70% (500-700 images)
- [ ] Val split: ~20% (150-200 images)
- [ ] Test split: ~10% (50-100 images)
- [ ] All label files use 0-indexed class IDs (0-16)
- [ ] All coordinates normalized 0-1

---

## 📊 Minimum Requirements

| Level | Images | Expected Accuracy | Use Case |
|-------|--------|------------------|----------|
| Quick Test | 50-100 | ~60-70% | Test if training works |
| Basic | 200-300 | ~70-80% | Proof of concept |
| Production | 500-1000 | ~85-95% | Real deployment |
| Advanced | 1000+ | ~90-98% | High accuracy needed |

---

## 🆘 Need Help?

**I don't have images yet:**
- Use existing floor plan PDFs from your backend/invoices
- Extract images from PDFs and annotate them
- Or find sample datasets online

**I don't know how to annotate:**
- I can create a step-by-step annotation guide
- With screenshots for Roboflow or LabelImg

**I want to auto-split my data:**
- Use the `split_dataset.py` script (see below)
- Automatically splits 70/20/10

**My annotations are in different format:**
- I can help convert from other formats to YOLO format

---

## 📁 Current Status

✅ Directory structure created
✅ Test PDF analyzed successfully
✅ System working with API-only (no YOLO yet)

⏳ Waiting for: Annotated training data

Once you have 50-100 annotated images, you can start training!
