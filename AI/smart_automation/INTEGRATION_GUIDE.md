# Smart Automation - Integration Guide

## Quick Integration Steps

### 1. Backend Integration

Add these lines to your main `/backend/server.js`:

```javascript
// Import smart automation routes
const smartAutomationRoutes = require('../smart_automation/api');

// Mount smart automation routes (after other middleware)
app.use('/smart-automation', smartAutomationRoutes);
```

### 2. Frontend Routes

Add routes to your React Router configuration:

```javascript
import SmartAutomation from './components/SmartAutomation';
import EmployeeRecommendation from './components/EmployeeRecommendation';

// In your router
<Route path="/automation" element={<SmartAutomation />} />
```

### 3. Dashboard Integration

Add Smart Automation panel to dashboard:

```javascript
import SmartAutomation from './components/SmartAutomation';

// In your dashboard component
<SmartAutomation />
```

### 4. AI Assistant Integration

Update `AIAssistant.jsx` to add employee recommendation button:

```javascript
// Add state for recommendation modal
const [showRecommendation, setShowRecommendation] = useState(false);
const [selectedInquiry, setSelectedInquiry] = useState(null);

// Add button in header section
<button 
  onClick={() => {
    setSelectedInquiry('INQ001'); // Or get from inquiry list
    setShowRecommendation(true);
  }}
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  🎯 Suggest Best Employee
</button>

// Add modal
{showRecommendation && (
  <EmployeeRecommendation 
    inquiryId={selectedInquiry}
    onClose={() => setShowRecommendation(false)}
  />
)}
```

## API Testing

Test all endpoints after integration:

```bash
# 1. Health check
curl http://localhost:5000/smart-automation/health

# 2. Run automation test
curl -X POST http://localhost:5000/smart-automation/automation/run-test

# 3. Get logs
curl http://localhost:5000/smart-automation/automation/logs

# 4. Get employee recommendation
curl -X POST http://localhost:5000/smart-automation/recommendation/for-inquiry \
  -H "Content-Type: application/json" \
  -d '{"inquiry_id": "INQ001"}'

# 5. Toggle rule
curl -X POST http://localhost:5000/smart-automation/automation/toggle-rule \
  -H "Content-Type: application/json" \
  -d '{"rule_key": "quotation_approved", "enabled": false}'
```

## Sidebar Menu Addition

Add to `Sidebar.jsx`:

```javascript
{
  name: 'Smart Automation',
  icon: '🤖',
  path: '/automation'
}
```

## Environment Variables

Add to `.env` if needed:

```bash
USE_MOCK_DATA=true  # Set to false for production
```

## Troubleshooting

### Python not found
```bash
# Check Python version
python3 --version

# If not found, install Python 3
```

### Import errors
Ensure all Python files use correct relative imports:
```python
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
```

### API returns 500
Check backend logs and ensure Python bridge is executable:
```bash
chmod +x /Users/rahulnema/Desktop/Vlite-Furnitures/smart_automation/api/python_bridge.py
```

## Complete Integration Example

See `/smart_automation/README.md` for full documentation.

## Next Steps

1. ✅ Test automation engine: `cd smart_automation && python3 test_automation.py`
2. ✅ Integrate routes to backend
3. ✅ Add frontend components to dashboard
4. ✅ Test all API endpoints
5. ✅ Switch to real database mode when ready
