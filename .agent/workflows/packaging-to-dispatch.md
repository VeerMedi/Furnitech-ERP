---
description: Auto-move order to Post-Production and create Dispatch flow
---

# Packaging to Dispatch Workflow

## **Objective:**
When packaging checkbox is checked in Pre-Production, automatically move order to Post-Production dashboard with dispatch functionality.

---

## **Implementation Steps:**

### **Step 1: Pre-Production - Auto Move on Packaging Complete**
**File:** `frontend-org/src/pages/PreProductionOrderDetails.jsx`

- Modify `handleStatusChange` function
- When `stepKey === 'packaging'` and checkbox is being **checked** (not unchecked):
  - Update orderStatus to `'IN_PRODUCTION'` or create new status `'READY_FOR_DISPATCH'`
  - This will make order appear in Post-Production dashboard

**Logic:**
```javascript
const handleStatusChange = async (field, stepKey, currentVal) =>{
  if (!canUpdateStep(stepKey)) return;
  
  try {
    const updatedStatus = {
      ...order[field],
      [stepKey]: !currentVal
    };
    
    const updatePayload = { [field]: updatedStatus };
    
    // CHECK: If packaging is being marked as complete
    if (stepKey === 'packaging' && !currentVal === true) {
      // Move to Post-Production
      updatePayload.orderStatus = 'READY_FOR_DISPATCH';
      updatePayload.packagingStatus = 'COMPLETED';
      updatePayload.packagingCompletedDate = new Date();
    }
    
    await orderAPI.update(id, updatePayload);
    // ... rest of the code
  }
}
```

---

### **Step 2: Post-Production Dashboard - Show Ready Orders**
**File:** `frontend-org/src/pages/PostProductionDashboard.jsx`

- Filter logic already exists (lines 36-45)
- Ensure orders with `orderStatus === 'READY_FOR_DISPATCH'` OR `packagingStatus === 'COMPLETED'` are shown

**Current Filter:**
```javascript
const isReadyForPostProduction = (order) => {
  const woodPackaging = order.woodWorkflowStatus?.packaging;
  const steelPackaging = order.steelWorkflowStatus?.packaging;
  return woodPackaging || steelPackaging;
};
```

This should already work! ✅

---

### **Step 3: Post-Production Order Details - Add Dispatch Button**
**File:** `frontend-org/src/pages/PostProductionOrderDetails.jsx`

Currently, there's already a "Packaging & Dispatch" section starting at line 387.

**Add Dispatch Button:**
```jsx
{order.packagingStatus === 'COMPLETED' && (
  <button
    onClick={handleCreateDispatch}
    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    🚚 Create Dispatch / Delivery Order
  </button>
)}
```

**Handler:**
```javascript
const handleCreateDispatch = () => {
  // Navigate to Transport Delivery Order with pre-filled data
  navigate('/transport/delivery-orders/create', {
    state: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      deliveryAddress: order.deliveryAddress
    }
  });
};
```

---

### **Step 4: Transport - Create Delivery Order with Auto-fill**
**File:** `frontend-org/src/pages/CreateDeliveryOrder.jsx`

Check if this file exists, otherwise create it.

**Auto-fill Logic:**
```javascript
useEffect(() => {
  if (location.state) {
    const { orderId, orderNumber, customer, items, deliveryAddress } = location.state;
    
    setFormData({
      ...formData,
      order: orderId,
      orderNumber: orderNumber,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      deliveryAddress: deliveryAddress,
      items: items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        specifications: item.specifications
      })),
      // Vehicle and Driver fields remain empty for manual input
      vehicleNumber: '',
      driverName: '',
      driverPhone: ''
    });
  }
}, [location.state]);
```

---

## **Testing Steps:**

1. Go to Pre-Production Order Details
2. Check the **Packaging** checkbox
3. Verify order moves to **Post-Production Dashboard**
4. Open order in Post-Production Details
5. Click **"Create Dispatch"** button
6. Verify **Create Delivery Order** form opens with:
   - ✅ Order details auto-filled
   - ✅ Customer details auto-filled
   - ✅ Product items auto-filled
   - ⬜ Vehicle fields empty (manual)
   - ⬜ Driver fields empty (manual)
7. Fill vehicle and driver info
8. Click **"Create Delivery"**
9. Verify delivery order is created successfully

---

## **Files to Modify:**

1. ✅ `frontend-org/src/pages/PreProductionOrderDetails.jsx` - Auto move on packaging
2. ✅ `frontend-org/src/pages/PostProductionDashboard.jsx` - Filter (already working)
3. ✅ `frontend-org/src/pages/PostProductionOrderDetails.jsx` - Add Dispatch button
4. ✅ `frontend-org/src/pages/CreateDeliveryOrder.jsx` - Auto-fill form

---

## **Database Changes:**
None required! Using existing fields:
- `orderStatus`
- `packagingStatus`
- `packagingCompletedDate`
