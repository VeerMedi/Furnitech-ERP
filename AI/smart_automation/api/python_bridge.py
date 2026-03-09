#!/usr/bin/env python3
"""
Python Bridge for Node.js Integration
Helper script to run automation engine from Node.js
"""

import sys
import json
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine import automation_config
from recommendation import recommender
from services import database_adapter

def run_automation_test():
    """Run full automation test suite"""
    from engine import mock_event_generator
    generator = mock_event_generator.MockEventGenerator()
    events = generator.generate_all_test_events()
    
    results = {}
    from engine import rules_engine
    for event_name, event_data in events.items():
        result = rules_engine.trigger_event(event_data['type'], event_data['data'])
        results[event_name] = result
    
    return {
        'success': True,
        'events_triggered': len(events),
        'results': results
    }

def get_employee_recommendation(inquiry_id):
    """Get employee recommendation for inquiry"""
    db = database_adapter.get_db_adapter()
    inquiry = db.get_inquiry_by_id(inquiry_id)
    if not inquiry:
        return {'success': False, 'error': f'Inquiry {inquiry_id} not found'}
    
    employees = db.get_employees()
    recommendation = recommender.recommend_for_inquiry(employees, inquiry)
    
    return {'success': True, 'recommendation': recommendation}

def get_mock_employees():
    """Get all mock employees"""
    db = database_adapter.get_db_adapter()
    employees = db.get_employees()
    return {'success': True, 'count': len(employees), 'employees': employees}

def get_mock_inquiries():
    """Get all mock inquiries"""
    db = database_adapter.get_db_adapter()
    inquiries = db.get_inquiries()
    return {'success': True, 'count': len(inquiries), 'inquiries': inquiries}

def get_automation_logs(limit=100):
    """Get automation logs"""
    logs = automation_config.get_logs(limit)
    return {'success': True, 'count': len(logs), 'logs': logs}

def get_automation_config():
    """Get current automation configuration"""
    config = automation_config.get_config()
    return {'success': True, 'config': config}

def toggle_rule(rule_key, enabled):
    """Toggle automation rule on/off"""
    success = automation_config.toggle_rule(rule_key, enabled)
    return {
        'success': success,
        'rule_key': rule_key,
        'enabled': enabled,
        'message': f"Rule '{rule_key}' {'enabled' if enabled else 'disabled'}" if success else f"Rule '{rule_key}' not found"
    }

def reset_mock_data():
    """Reset mock data to defaults"""
    db = database_adapter.get_db_adapter()
    success = db.reset_mock_data()
    return {'success': success, 'message': 'Mock data reset successfully' if success else 'Failed to reset mock data'}

# CLI interface
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command specified'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == 'run-test':
            result = run_automation_test()
        elif command == 'recommend':
            inquiry_id = sys.argv[2] if len(sys.argv) > 2 else None
            result = get_employee_recommendation(inquiry_id)
        elif command == 'get-employees':
            result = get_mock_employees()
        elif command == 'get-inquiries':
            result = get_mock_inquiries()
        elif command == 'get-logs':
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 100
            result = get_automation_logs(limit)
        elif command == 'get-config':
            result = get_automation_config()
        elif command == 'toggle-rule':
            rule_key = sys.argv[2] if len(sys.argv) > 2 else None
            enabled = sys.argv[3].lower() == 'true' if len(sys.argv) > 3 else True
            result = toggle_rule(rule_key, enabled)
        elif command == 'reset-data':
            result = reset_mock_data()
        else:
            result = {'error': f'Unknown command: {command}'}
        
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
