# AI Import Flow Analysis & Enhancement Plan

## 🔍 **Current Flow Analysis**

### **Step 1: User Scans PDF**
- User uploads PDF layout
- Backend calls Python AI scanner
- Scanner extracts items with:
  ```json
  {
    "name": "Straight workstations",
    "category": "Workstations",
    "dimensions": "1200x600mm",  // ✅ Already Available!
    "count": 140,
    "area": "Open Office Area"
  }
  ```

### **Step 2: User Adds Description**
- User enters requirements in "Description" field:
  ```
  Example: "Use 25mm PLB with edge binding, 
  aluminum legs with powder coating"
  ```

### **Step 3: User Clicks "Import from Layout"**
- Frontend calls: `POST /quotations/:id/import-with-ai`
- Backend function: `importWithAI()` (Line 1429)

### **Step 4: AI Processes Data**
- Calls `analyzeQuotationRequirements()` (aiQuotationService)
- Matches scanned items to products/materials
- Returns mappings with:
  ```javascript
  {
    scannedItem: {...},
    productCategory: "Workstations",
    materialCategories: ["PLB", "Legs"],
    specifications: "..."
  }
  ```

### **Step 5: Backend Creates Items** (Lines 1539-1654)
Currently creates:
```javascript
{
  layoutDescription: "Open Office Area",
  description: "Straight workstations\n\n📦 Product Used:\n• ...\n\n🔧 Materials Used:\n• ...",
  selectedProducts: [{...}],
  selectedMaterials: [{...}],
  specifications: "...",
  quantity: 140,
  unitPrice: 5000,
  amount: 700000
}
```

---

## ❌ **Current Problem**

**Items come WITHOUT sub-item breakdown!**

Current format:
```javascript
{
  description: "Workstation\n\n📦 Product Used:\n• Table Top",  // Single string
  selectedProducts: [...],
  selectedMaterials: [...]
}
```

But we need:
```javascript
{
  description: "Workstation",
  specifications: {
    subItems: [  // ❌ NOT BEING CREATED!
      {
        description: "Table Top",
        dimensions: "1200x600mm",
        material: "25mm PLB with Edge Binding",
        quantity: 1,
        unitPrice: 3000
      },
      {
        description: "Leg",
        dimensions: "",
        material: "Aluminum with powder coating",
        quantity: 4,
        unitPrice: 500
      }
    ]
  }
}
```

---

## ✅ **Solution Plan (NO IMPLEMENTATION)**

### **Changes Needed:**

#### **1. AI Service Enhancement** (`aiQuotationService.js`)

**Current Output:**
```javascript
{
  scannedItem: {
    name: "Workstation",
    dimensions: "1200x600mm"
  },
  productCategory: "Workstations",
  materialCategories: ["PLB", "Legs"]
}
```

**New Output Required:**
```javascript
{
  scannedItem: {...},
  productCategory: "Workstations",
  components: [  // NEW: Detailed component breakdown
    {
      name: "Table Top",
      type: "product",
      productCategory: "Table Tops",
      dimensions: "1200x600mm",  // From scanned item
      materialSpec: "25mm PLB with Edge Binding",  // From user description
      quantity: 1
    },
    {
      name: "Leg",
      type: "material",
      materialCategory: "Furniture Legs",
      dimensions: "",
      materialSpec: "Aluminum with powder coating",
      quantity: 4
    },
    {
      name: "Privacy Screen",
      type: "product",
      productCategory: "Screens",
      dimensions: "450mm HT",
      materialSpec: "Soft Board Panelling",
      quantity: 1
    }
  ]
}
```

**How to Achieve:**
- Enhance AI prompt to break down each item into components
- Ask AI: "What are the main components of {{scannedItem}}?"
- Parse user description to extract material specs per component
- Match dimensions from scanned data to appropriate components

---

#### **2. Backend Controller Enhancement** (`quotationController.js` Line 1539-1654)

**Current Code:**
```javascript
// Builds flat item with combined description
quotationItems.push({
  description: itemDescription,  // Combined string
  selectedProducts: [...],
  selectedMaterials: [...]
});
```

**New Code Required:**
```javascript
// Build sub-items array
const subItems = [];

for (const component of mapping.components) {
  // Fetch product or material based on component type
  let unitPrice = 0;
  
  if (component.type === 'product') {
    const products = await fetchProductsFromCategory(component.productCategory, Product);
    const bestProduct = await selectBestProduct(component, products, userDescription);
    unitPrice = bestProduct?.price || 0;
  } else if (component.type === 'material') {
    const materials = await fetchMaterialsFromCategory(component.materialCategory, RawMaterial);
    const bestMaterial = materials[0];
    unitPrice = bestMaterial?.price || 0;
  }
  
  // Create sub-item
  subItems.push({
    description: component.name,
    dimensions: component.dimensions || '',      // NEW ✓
    material: component.materialSpec || '',      // NEW ✓
    quantity: component.quantity || 1,
    unitPrice: unitPrice,
    amount: unitPrice * (component.quantity || 1),
    isText: false
  });
}

// Create quotation item with sub-items
quotationItems.push({
  layoutDescription: mapping.scannedItem.area,
  dimensions: mapping.scannedItem.dimensions,  // Overall dimensions
  description: mapping.scannedItem.name,       // Simple name
  specifications: {
    subItems: subItems  // NEW: Detailed breakdown ✓
  },
  quantity: mapping.scannedItem.count,
  unitPrice: subItems.reduce((sum, sub) => sum + sub.amount, 0),
  amount: subItems.reduce((sum, sub) => sum + sub.amount, 0) * mapping.scannedItem.count
});
```

---

#### **3. AI Prompt Engineering** (`aiQuotationService.js`)

**Add New Prompt Section:**
```javascript
const COMPONENT_BREAKDOWN_PROMPT = `
For each scanned furniture item, break it down into individual components.

Example:
Input: "Workstation - 1200x600mm"
User Description: "Use 25mm PLB with edge binding, aluminum legs with powder coating, privacy screen with soft board"

Output:
{
  "components": [
    {
      "name": "Table Top",
      "type": "product",
      "productCategory": "Table Tops",
      "dimensions": "1200x600mm",
      "materialSpec": "25mm PLB with Edge Binding of 2mm PVC",
      "quantity": 1
    },
    {
      "name": "Quadra Aluminium Leg",
      "type": "material",
      "materialCategory": "Furniture Legs",
      "dimensions": "",
      "materialSpec": "With powder coating",
      "quantity": 4
    },
    {
      "name": "Privacy Screen",
      "type": "product",
      "productCategory": "Screens",
      "dimensions": "450mm HT",
      "materialSpec": "Soft Board Panelling",
      "quantity": 1
    }
  ]
}

Rules:
1. Extract dimensions from scanned data
2. Extract material specs from user description
3. Determine typical quantity (e.g., 4 legs for table, 1 top)
4. Match to product/material categories
`;
```

---

## 📊 **Data Flow Diagram**

```
┌─────────────────────────┐
│  AI Scanner (Python)    │
│  Extracts:              │
│  - Name                 │
│  - Dimensions ✓         │
│  - Count                │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  User Description       │
│  "Use 25mm PLB with     │
│   edge binding..."      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  AI Service             │
│  analyzeQuotation()     │
│  + NEW: breakdownInto   │
│    Components()         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Component Mapping       │
│ {                       │
│   name: "Table Top"     │
│   dimensions: "1200x600"│ ← From scanner
│   material: "PLB..."    │ ← From description
│   quantity: 1           │ ← AI logic
│   price: 3000           │ ← From catalog
│ }                       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Quotation Item          │
│ {                       │
│   specifications: {     │
│     subItems: [         │
│       {                 │
│         description: "Table Top",
│         dimensions: "1200x600mm",  ✓
│         material: "25mm PLB...",   ✓
│         unitPrice: 3000            ✓
│       }                 │
│     ]                   │
│   }                     │
│ }                       │
└─────────────────────────┘
```

---

## 🎯 **Implementation Steps**

### **Step 1: Enhance AI Service** (aiQuotationService.js)
- Add `breakdownIntoComponents()` function
- Enhance prompt with component breakdown logic
- Parse user description for material specs
- Extract dimensions from scanned data per component

### **Step 2: Update Backend Controller** (quotationController.js)
- Modify `importWithAI()` function (Lines 1539-1654)
- Build `subItems` array from component mappings
- Fetch products/materials per component
- Calculate prices per component
- Create item with `specifications.subItems`

### **Step 3: Test Data Flow**
- Upload sample PDF with workstation
- Add description: "Use 25mm PLB with edge binding, aluminum legs"
- Click "Import from Layout"
- Verify sub-items populate with:
  - ✓ Component names
  - ✓ Dimensions (from scan)
  - ✓ Material specs (from description)
  - ✓ Individual rates

---

## 📝 **Example Input/Output**

### **Input:**

**Scanned JSON:**
```json
{
  "name": "Straight workstations",
  "dimensions": "1200x600mm",
  "count": 10
}
```

**User Description:**
```
Use 25mm PLB table top with 2mm PVC edge binding.
Quadra aluminum legs with powder coating (4 per workstation).
Add privacy screen 450mm height with soft board panelling.
```

### **Expected Output:**

**Quotation Item:**
```javascript
{
  layoutDescription: "Open Office Area",
  dimensions: "1200x600mm",
  description: "Straight workstations",
  specifications: {
    subItems: [
      {
        description: "Table Top",
        dimensions: "1200x600mm",
        material: "25mm PLB with 2mm PVC Edge Binding",
        quantity: 1,
        unitPrice: 3500,
        amount: 3500
      },
      {
        description: "Quadra Aluminium Leg",
        dimensions: "",
        material: "With powder coating",
        quantity: 4,
        unitPrice: 600,
        amount: 2400
      },
      {
        description: "Privacy Screen",
        dimensions: "450mm HT",
        material: "Soft Board Panelling",
        quantity: 1,
        unitPrice: 1800,
        amount: 1800
      }
    ]
  },
  quantity: 10,
  unitPrice: 7700,  // Sum of sub-items
  amount: 77000     // 7700 × 10
}
```

---

## ⚠️ **Challenges to Consider**

1. **AI Accuracy:** AI might not perfectly extract material specs from free text
   - **Solution:** Add validation/review step after import

2. **Dimension Mapping:** Which dimension belongs to which component?
   - **Solution:** Use AI logic (larger dimension = table top, smaller = screen)

3. **Quantity Logic:** How many legs? How many screens?
   - **Solution:** Use furniture type knowledge base (table = 4 legs)

4. **Material Matching:** Description says "PLB" but catalog has "Pre-Laminated Board"
   - **Solution:** AI fuzzy matching with synonyms

---

## ✅ **Expected Result**

After clicking "Import from Layout":
- All items appear with sub-items
- Each sub-item has:
  - ✓ Component name
  - ✓ Dimensions (from scan)
  - ✓ Material spec (from description)
  - ✓ Quantity (AI-determined)
  - ✓ Rate (from catalog)

User can then:
- Edit any field
- Add/remove components
- Save and view with beautiful formatting

---

**Status:** 📋 **PLAN READY**  
**Next Step:** Implementation  
**Estimated Complexity:** Medium (AI prompt engineering + data restructuring)
