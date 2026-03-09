# AI Layout Scanner - Quotation Auto-Import Flow

## 🎯 Overview
This feature automatically extracts furniture inventory from PDF layout drawings and populates quotation items using AI-powered scanning.

## 🚀 How It Works

### Flow Diagram:
```
User uploads PDF → Backend saves to AI scanner → Python script runs → 
AI analyzes layout → Results saved as JSON → Backend returns data → 
Frontend converts to items → Quotation populated
```

### Step-by-Step Process:

1. **User Action** (Frontend)
   - User edits a quotation
   - Navigates to "Attachments" section
   - Clicks "Scan PDF Layout" button
   - Selects a furniture layout PDF file

2. **Upload & Save** (Backend)
   - PDF received at `/api/quotations/scan-layout`
   - File saved to `AI/inventory_scanner/pdf_inputs/`
   - Filename: `{timestamp}_{sanitized_original_name}.pdf`

3. **AI Processing** (Python)
   - Python script `scan_folder.py` executed
   - Uses **GPT-4o** for initial scan (Pass 1)
   - Uses **Claude Sonnet 4** for verification (Pass 2)
   - Extracts:
     - Furniture items (workstations, tables, chairs, storage)
     - Quantities and dimensions
     - Room/area assignments
     - Categories and status

4. **Results Generation**
   - JSON saved to `AI/inventory_scanner/scan_results/`
   - Filename: `{pdf_filename}_result.json`
   - Contains structured inventory data

5. **Data Conversion** (Frontend)
   - `scanResultsConverter.js` parses JSON
   - Matches items with product database
   - Assigns prices based on product matches
   - Converts to quotation item format

6. **Auto-Population**
   - Items added to quotation form
   - Existing items preserved
   - toast notification shows success
   - User can edit items as needed

## 📁 File Structure

```
backend/
├── routes/quotations.js              # Added scanner endpoint
├── controllers/quotationController.js # scanLayoutPDF function
AI/
└── inventory_scanner/
    ├── core.py                        # AI analysis engine
    ├── prompts.py                     # AI instructions
    ├── scan_folder.py                 # Main scanner script
    ├── pdf_inputs/                    # Uploaded PDFs
    └── scan_results/                  # Generated JSON results

frontend-org/
└── src/
    ├── pages/quotations/QuotationForm.jsx  # Scanner UI & integration
    └── utils/scanResultsConverter.js       # JSON → Items converter
```

## 🔧 API Endpoint

### POST `/api/quotations/scan-layout`

**Request:**
- Content-Type: `multipart/form-data`
- Body: PDF file (`file` field)
- Auth: Required (authenticate middleware)

**Response:**
```json
{
  "success": true,
  "message": "Layout scanned successfully",
  "data": {
    "file_name": "layout.pdf",
    "pages": [{
      "page_number": 1,
      "analysis": {
        "success": true,
        "data": {
          "items": [
            {
              "name": "Straight workstation",
              "category": "Workstations",
              "area": "Workstation Area 1 (12 PAX)",
              "dimensions": "1050x600mm",
              "count": 12,
              "status": "unknown",
              "confidence": 0.9,
              "notes": "..."
            }
          ],
          "summary": {
            "total_items": 24,
            "total_quantity": 81
          }
        }
      }
    }]
  },
  "metadata": {
    "filename": "1738836000_layout.pdf",
    "resultFile": "1738836000_layout_result.json",
    "timestamp": "2026-02-05T08:46:40.000Z"
  }
}
```

## 💡 Features

### AI Scanner Capabilities:
- ✅ **Furniture Detection**: Workstations, tables, chairs, storage, cabinets
- ✅ **Dimension Extraction**: Reads dimensions from layout (W×D×H)
- ✅ **Quantity Counting**: Counts individual items and PAX capacity
- ✅ **Area Mapping**: Associates items with rooms/zones
- ✅ **Multi-Pass Verification**: 2-stage AI analysis for accuracy
- ✅ **Category Classification**: Auto-categorizes furniture types

### Frontend Features:
- 🎨 **Visual Scanner Button**: Purple-themed, prominent in Attachments
- ⏳ **Loading States**: "Scanning..." indicator with animation
- 🔔 **Progress Notifications**: Toast messages for status updates
- 🔗 **Product Matching**: Auto-assigns prices from product database
- 📊 **Summary Display**: Shows total items and quantities found
- ♻️ **Item Merging**: Preserves existing quotation items

## 🧪 Testing

### Test with Sample PDF:
```bash
# Example layout file
AI/inventory_scanner/pdf_inputs/OFFICE LAYOUT (1).pdf
```

### Expected Result:
- Items extracted: ~24 line items
- Total units: ~81 pieces
- Processing time: 30-60 seconds

### Verification Checklist:
- [ ] PDF saved to `pdf_inputs/`
- [ ] Python script executed successfully
- [ ] JSON generated in `scan_results/`
- [ ] Items populated in quotation form
- [ ] Prices matched from product database
- [ ] Existing items preserved

## ⚠️ Error Handling

### Common Issues:

1. **"Python script failed"**
   - Check Python 3 is installed
   - Verify API keys in `.env`
   - Check dependencies: `pip install -r requirements.txt`

2. **"No items found"**
   - PDF may not contain furniture layout
   - Check scan result JSON manually
   - Try with a different layout

3. **"Timeout error"**
   - AI processing can take 30-90 seconds
   - Increase timeout in frontend (currently 2 minutes)

4. **"Product matching failed"**
   - Products may not exist in database
   - Items will have ₹0 price (user can edit)

## 🔐 Security

- Authentication required for scanning
- File size limit: 20MB
- Only PDF files accepted
- Temporary files kept for debugging (optional cleanup)

## 🎓 Usage Instructions

### For Users:
1. Open any quotation in edit mode
2. Scroll to "Attachments" section (right sidebar)
3. Click "🤖 AI Layout Scanner"
4. Click "Scan PDF Layout" and select a layout PDF
5. Wait 30-60 seconds for AI processing
6. Items automatically appear in the quotation table
7. Review, edit prices if needed, and save

### For Developers:
- Scanner logic: `backend/controllers/quotationController.js` → `scanLayoutPDF`
- Converter logic: `frontend-org/src/utils/scanResultsConverter.js`
- AI prompts: `AI/inventory_scanner/prompts.py`
- Modify categories/rules in prompts file for custom extraction

## 📈 Future Enhancements

- [ ] Multi-page PDF support
- [ ] Image upload (JPG/PNG) in addition to PDF
- [ ] Real-time progress updates via WebSocket
- [ ] Manual review/edit UI for scanned items
- [ ] Confidence threshold filtering
- [ ] Bulk PDF scanning
- [ ] Auto-save scanned quotations as drafts

## 🛠️ Maintenance

### Cleaning Up Files:
```bash
# Clear old scanned PDFs (optional)
rm AI/inventory_scanner/pdf_inputs/*.pdf

# Clear old results (optional)
rm AI/inventory_scanner/scan_results/*.json
```

### Monitoring:
- Check backend logs for Python script output
- Review JSON files in `scan_results/` for accuracy
- Monitor API key usage (OpenRouter/OpenAI)

---

**Created:** 2026-02-05  
**Author:** Antigravity AI Assistant  
**Version:** 1.0
