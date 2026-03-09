# JSON File Setup Guide - Pre-fed Results

## ✅ Current Status
All existing JSON files have been fixed and are ready to use!

## 📝 How to Add New Pre-fed JSON Files

### Step 1: Prepare Your JSON Data
Your JSON must have this exact structure:

```json
{
  "file_name": "YourLayout.pdf",
  "pages": [{
    "page_number": 1,
    "analysis": {
      "success": true,
      "data": {
        "items": [
          {
            "name": "Item name",
            "category": "Workstations/Seating/Tables/Storage/Equipment",
            "area": "Area name",
            "raw_label": "Label from PDF",
            "dimensions": "1500x600x750mm or not_shown",
            "count": 10,
            "status": "new/existing/known",
            "confidence": 0.95,
            "notes": "Additional notes",
            "source_page": 1
          }
        ],
        "summary": {
          "total_items": 1,
          "total_quantity": 10,
          "total_pages_scanned": 1
        },
        "metadata": {
          "file_name": "YourLayout.pdf",
          "total_pages": 1,
          "scan_timestamp": "2026-02-09T10:00:00Z"
        }
      }
    }
  }]
}
```

### Step 2: Name Your File Correctly

**IMPORTANT**: Filename MUST end with `_result.json`

✅ **Correct Examples:**
- `MyLayout_result.json`
- `Office_Floor_Plan_result.json`
- `1234567890_Conference_Room_result.json` (with timestamp)

❌ **Wrong Examples:**
- `MyLayout.json` (missing _result)
- `MyLayout_detailed.json` (will be ignored)

### Step 3: Save to Correct Location
Place your file here:
```
AI/inventory_scanner/scan_results/YourFileName_result.json
```

### Step 4: Upload Matching PDF
When you upload a PDF via the system, name it to match your JSON:

**Example:**
- JSON file: `MyLayout_result.json`
- PDF upload: `MyLayout.pdf` ✅
- Also works: `mylayout.pdf` ✅ (case insensitive)
- Also works: `My-Layout.pdf` ✅ (special chars ignored)

## 🔍 How to Test

1. **Prepare your JSON** (correct structure + `_result.json` suffix)
2. **Place in scan_results/**
3. **Upload matching PDF** via your application
4. **Check console logs** for:
   ```
   🔍 Checking for pre-existing JSON: YourLayout.pdf
   ✅ Found existing JSON: YourLayout_result.json
   ⚡ Using demo mode - skipping AI scan
   📊 Total items found (from existing JSON): 25
   ```

## 🛠️ Auto-Fix Tool

If you have JSON files in wrong format, use the auto-fix script:

```bash
cd AI/inventory_scanner/scan_results
node convert_all.js
```

This will:
- ✅ Check all JSON files
- ✅ Convert arrays to proper structure
- ✅ Rename files to add `_result.json` suffix
- ✅ Create backups before changes

## ⚡ Quick Start Template

Copy this template for new JSON files:

```bash
# 1. Create new file
nano AI/inventory_scanner/scan_results/MyNewLayout_result.json

# 2. Paste this structure:
{
  "file_name": "MyNewLayout.pdf",
  "pages": [{
    "page_number": 1,
    "analysis": {
      "success": true,
      "data": {
        "items": [
          // Add your items here
        ],
        "summary": {
          "total_items": 0,
          "total_quantity": 0,
          "total_pages_scanned": 1
        },
        "metadata": {
          "file_name": "MyNewLayout.pdf",
          "total_pages": 1,
          "scan_timestamp": "2026-02-09T15:00:00Z"
        }
      }
    }
  }]
}

# 3. Upload MyNewLayout.pdf → Instant results!
```

## 🚨 Common Issues & Fixes

### Issue 1: "No matching JSON found, proceeding with AI scan"
**Cause:** Filename doesn't match or wrong format

**Fix:**
- Check filename ends with `_result.json` ✅
- Check PDF name matches JSON name (ignoring timestamp)
- Run `node convert_all.js` to auto-fix

### Issue 2: "Existing JSON invalid, falling back to AI scan"
**Cause:** JSON structure is wrong

**Fix:**
- Check `pages` array exists
- Check `analysis.data.items` array exists
- Run `node convert_all.js` to auto-fix

### Issue 3: Still scanning even with correct JSON
**Cause:** Backend not updated or server not restarted

**Fix:**
```bash
# Restart backend server
cd backend
npm restart
```

## 📊 Current Pre-fed Files Ready to Use

These PDFs will now fetch pre-fed JSON instantly:
- ✅ `028_SFL_MUM_L07_LT01_INTERIOR LAYOUT-OPTION 06.1_R0_18.08.2025-Model.pdf`
- ✅ `Layout2.pdf`
- ✅ `Bargarh.pdf`
- ✅ `Bargarh - Layout (1).pdf`

Upload any of these and results will be instant! 🚀

---

**Need Help?** Run the convert script or check console logs for debugging.
