#!/bin/bash
# Test script for new automation API endpoints

BASE_URL="http://localhost:3001/api/automation"

echo "========================================="
echo "Smart Automation API Test Suite"
echo "========================================="
echo ""

# Test 1: Get suggestions
echo "Test 1: GET /api/automation/suggestions"
echo "-----------------------------------------"
curl -s "$BASE_URL/suggestions" | python3 -m json.tool
echo ""
echo ""

# Test 2: Trigger quotation approval
echo "Test 2: POST /api/automation/trigger"
echo "-----------------------------------------"
curl -s -X POST "$BASE_URL/trigger" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "quotation.approved",
    "entity_id": "Q-105"
  }' | python3 -m json.tool
echo ""
echo ""

# Test 3: Get suggestions again (should have new one)
echo "Test 3: GET /api/automation/suggestions (after trigger)"
echo "-----------------------------------------"
curl -s "$BASE_URL/suggestions" | python3 -m json.tool | head -30
echo ""
echo ""

# Test 4: Get Production tasks
echo "Test 4: GET /api/automation/tasks/PRODUCTION"
echo "-----------------------------------------"
curl -s "$BASE_URL/tasks/PRODUCTION" | python3 -m json.tool | head -30
echo ""
echo ""

# Test 5: Get dashboard for Production role
echo "Test 5: GET /api/automation/dashboard/PRODUCTION"
echo "-----------------------------------------"
curl -s "$BASE_URL/dashboard/PRODUCTION" | python3 -m json.tool | head -50
echo ""

echo "========================================="
echo "✅ All API tests completed!"
echo "========================================="
