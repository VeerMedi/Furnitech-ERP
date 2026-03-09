"""
Python Bridge for Customer Insights API
Handles command-line interface for Node.js integration
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from engine import clv_calculator, buying_pattern_analyzer, preference_extractor, ai_insights_generator
from services.database_adapter import get_adapter

def get_overview():
    """Get dashboard overview KPIs"""
    db = get_adapter()
    customers = db.get_customers()
    patterns = buying_pattern_analyzer.get_buying_patterns_overview()
    clv_data = clv_calculator.calculate_clv()
    preferences = preference_extractor.get_all_preferences()
    
    # Calculate metrics
    total_customers = len(customers)
    avg_clv = sum(c['clv'] for c in clv_data) / len(clv_data) if clv_data else 0
    repeat_rate = patterns['repeat_customer_rate']
    
    # Top preferences
    top_cats = preferences['popular_categories'][:3]
    top_prefs = [cat['category'] for cat in top_cats]
    
    return {
        "success": True,
        "data": {
            "total_customers": total_customers,
            "avg_lifetime_value": round(avg_clv, 2),
            "top_preferences": top_prefs,
            "repeat_customer_rate": repeat_rate
        }
    }

def get_buying_patterns():
    """Get buying patterns for charts"""
    patterns = buying_pattern_analyzer.get_buying_patterns_overview()
    return {
        "success": True,
        "data": patterns
    }

def get_clv():
    """Get CLV data for top customers"""
    clv_data = clv_calculator.calculate_clv()
    return {
        "success": True,
        "data": clv_data
    }

def get_preferences():
    """Get preference analysis"""
    preferences = preference_extractor.get_all_preferences()
    return {
        "success": True,
        "data": preferences
    }

def get_ai_insights():
    """Get AI-generated insights"""
    insights = ai_insights_generator.generate_all_insights()
    return {
        "success": True,
        "data": insights
    }

def main():
    """Main entry point for command-line execution"""
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python_bridge.py <command> <organizationId>"}))
        return
    
    command = sys.argv[1]
    organization_id = sys.argv[2]
    
    # Set organization context for database adapter
    import os
    os.environ['ORGANIZATION_ID'] = organization_id
    
    try:
        if command == "overview":
            result = get_overview()
        elif command == "buying-patterns":
            result = get_buying_patterns()
        elif command == "clv":
            result = get_clv()
        elif command == "preferences":
            result = get_preferences()
        elif command == "ai-insights":
            result = get_ai_insights()
        else:
            result = {"success": False, "error": f"Unknown command: {command}"}
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
