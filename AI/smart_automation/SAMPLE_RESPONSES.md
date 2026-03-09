# Smart Automation - Sample API Responses

This document shows real output from the Smart Automation Engine APIs.

## 1. GET /smart-automation/automation/config

```json
{
  "success": true,
  "config": {
    "use_mock_data": true,
    "base_dir": "/Users/rahulnema/Desktop/Vlite-Furnitures/smart_automation",
    "mock_data_dir": "/Users/rahulnema/Desktop/Vlite-Furnitures/smart_automation/mock_data",
    "logs_dir": "/Users/rahulnema/Desktop/Vlite-Furnitures/smart_automation/logs",
    "rules": {
      "quotation_approved": {
        "id": "RULE001",
        "name": "Quotation Approved → Create Production Order",
        "event_type": "quotation.approved",
        "enabled": true,
        "actions": ["create_production_order", "assign_tasks", "log_automation"],
        "priority": 1,
        "description": "Automatically create production order when quotation is approved"
      },
      "low_stock": {
        "id": "RULE002",
        "name": "Low Stock → Generate Purchase Request",
        "event_type": "inventory.low_stock",
        "enabled": true,
        "actions": ["generate_purchase_request", "notify_manager", "log_automation"],
        "priority": 2,
        "description": "Generate purchase request when inventory falls below threshold"
      }
      // ... other rules
    },
    "timestamp": "2025-12-16T11:52:24.123456"
  }
}
```

## 2. POST /smart-automation/recommendation/for-inquiry

**Request:**
```json
{
  "inquiry_id": "INQ001"
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": {
    "recommended": {
      "id": "EMP004",
      "name": "Sneha Reddy",
      "email": "sneha.reddy@vlite.com",
      "department": "Sales",
      "specializations": ["Office Solutions", "Ergonomic Furniture", "Modular Furniture"],
      "region": "South India",
      "scores": {
        "final_score": 0.556,
        "performance_score": 0.815,
        "load_score": 2.3,
        "normalized_load_score": 0.35,
        "specialization_match": 1.0
      },
      "workload": {
        "pending_tasks": 2,
        "active_quotations": 1,
        "open_leads": 4
      },
      "performance": {
        "conversion_rate": 0.78,
        "avg_response_hours": 2.8,
        "total_deals_closed": 67,
        "customer_satisfaction": 4.8
      },
      "availability": "available",
      "reasoning": "High performance (score: 0.81) • Low workload (7 total items) • Perfect match for Office Solutions • Currently available"
    },
    "alternatives": [
      {
        "id": "EMP009",
        "name": "Sanjay Desai",
        "scores": {
          "final_score": 0.462
        },
        "reasoning": "High performance (score: 0.77) • Low workload (4 total items) • No direct category match • Currently available"
      },
      {
        "id": "EMP007",
        "name": "Karan Mehta",
        "scores": {
          "final_score": 0.416
        },
        "reasoning": "Good performance (score: 0.72) • Moderate workload (13 total items) • Partial match for Office Solutions • Currently available"
      }
    ],
    "inquiry": {
      "id": "INQ001",
      "customer_name": "ABC Corporation",
      "product_category": "Office Solutions",
      "region": "North India",
      "estimated_value": 850000,
      "priority": "high"
    },
    "total_candidates_evaluated": 10
  }
}
```

## 3. POST /smart-automation/automation/trigger-event

**Request:**
```json
{
  "event_type": "quotation.approved",
  "event_data": {
    "quotation_id": "QUOT2025123",
    "customer_name": "Tech Corp",
    "approved_by": "Manager"
  }
}
```

**Response:**
```json
{
  "success": true,
  "event_type": "quotation.approved",
  "result": [
    {
      "rule": "quotation_approved",
      "event": {
        "type": "quotation.approved",
        "data": {
          "quotation_id": "QUOT2025123",
          "customer_name": "Tech Corp",
          "approved_by": "Manager"
        },
        "timestamp": "2025-12-16T11:52:24.378027",
        "id": "EVT_20251216115224378027"
      },
      "results": [
        {
          "action": "create_production_order",
          "production_order": {
            "id": "PROD_20251216115224",
            "quotation_id": "QUOT2025123",
            "customer_name": "Tech Corp",
            "status": "scheduled",
            "created_at": "2025-12-16T11:52:24.378027",
            "automated": true
          },
          "message": "Production order PROD_20251216115224 created for quotation QUOT2025123"
        },
        {
          "action": "assign_tasks",
          "message": "Tasks assigned for production order PROD_20251216115224",
          "assigned_to": "Workshop A"
        },
        {
          "action": "log_automation",
          "message": "Automation logged",
          "logged_at": "2025-12-16T11:52:24.378027"
        }
      ]
    }
  ]
}
```

## 4. GET /smart-automation/automation/logs

**Response:**
```json
{
  "success": true,
  "count": 10,
  "logs": [
    {
      "action_type": "create_production_order",
      "context": {
        "quotation_id": "QUOT2025001",
        "customer_name": "Test Customer",
        "total_value": 150000
      },
      "result": {
        "action": "create_production_order",
        "production_order": {
          "id": "PROD_20251216115224",
          "status": "scheduled"
        }
      },
      "status": "success",
      "timestamp": "2025-12-16T11:52:24.123456"
    },
    {
      "action_type": "generate_purchase_request",
      "context": {
        "material": {
          "material_id": "MAT001",
          "name": "Teak Wood (Premium Grade)",
          "current_stock": 250,
          "reorder_level": 300
        }
      },
      "result": {
        "action": "generate_purchase_request",
        "purchase_request": {
          "id": "PR_20251216115224",
          "material_id": "MAT001",
          "quantity_requested": 450,
          "priority": "high"
        }
      },
      "status": "success",
      "timestamp": "2025-12-16T11:52:24.234567"
    }
    // ... more log entries
  ]
}
```

## 5. POST /smart-automation/automation/toggle-rule

**Request:**
```json
{
  "rule_key": "quotation_approved",
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "rule_key": "quotation_approved",
  "enabled": false,
  "message": "Rule 'quotation_approved' disabled"
}
```

## 6. GET /smart-automation/mock/employees

**Response:**
```json
{
  "success": true,
  "count": 10,
  "employees": [
    {
      "id": "EMP001",
      "name": "Rajesh Kumar",
      "email": "rajesh.kumar@vlite.com",
      "department": "Sales",
      "specializations": ["Modular Furniture", "Office Solutions", "Custom Woodwork"],
      "workload": {
        "pending_tasks": 5,
        "active_quotations": 3,
        "open_leads": 8
      },
      "performance": {
        "conversion_rate": 0.68,
        "avg_response_hours": 4.2,
        "total_deals_closed": 45,
        "customer_satisfaction": 4.5
      },
      "capacity": {
        "max_concurrent_leads": 15,
        "availability": "available"
      },
      "region": "North India"
    }
    // ... 9 more employees
  ]
}
```

## 7. POST /smart-automation/automation/run-test

**Response:**
```json
{
  "success": true,
  "events_triggered": 5,
  "results": {
    "quotation_approved": [
      {
        "rule": "quotation_approved",
        "event": { /* event details */ },
        "results": [ /* action results */ ]
      }
    ],
    "low_stock": [ /* ... */ ],
    "new_inquiry": [ /* ... */ ],
    "production_completed": [ /* ... */ ],
    "machine_overuse": [ /* ... */ ]
  }
}
```

## 8. POST /smart-automation/mock/reset

**Response:**
```json
{
  "success": true,
  "message": "Mock data reset successfully"
}
```

---

## Error Response Example

```json
{
  "success": false,
  "error": "Inquiry INQ999 not found"
}
```

---

All responses follow a consistent format with:
- `success`: boolean indicating if operation succeeded
- `data`: the actual response data (varies by endpoint)
- `error`: error message if `success` is false
