#!/usr/bin/env python3
"""
Python Bridge for AI Support API
Handles command-line interface for Node.js integration
"""

import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from enhanced_support_engine import get_enhanced_engine
    USE_ENHANCED = True
except ImportError:
    from support_engine import get_support_engine
    USE_ENHANCED = False

def process_query(data: dict) -> dict:
    """Process support query"""
    try:
        user_id = data.get('user_id', 'anonymous')
        role = data.get('role', 'poc')
        message = data.get('message', '')
        
        if not message:
            return {'success': False, 'error': 'message is required'}
        
        # Use enhanced engine if available, otherwise fallback
        if USE_ENHANCED:
            engine = get_enhanced_engine()
        else:
            engine = get_support_engine()
        
        result = engine.process_query(user_id, role, message)
        return result
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_welcome_data(data):
    """Get welcome message and quick actions"""
    try:
        role = data.get('role', 'poc')
        
        engine = get_support_engine()
        result = engine.get_welcome_data(role)
        
        return {
            'success': True,
            **result
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_consulting(data):
    """Get consulting insights"""
    try:
        role = data.get('role', 'poc')
        priority = data.get('priority')
        
        engine = get_support_engine()
        tips = engine.get_consulting_insights(role, priority)
        
        return {
            'success': True,
            'tips': tips,
            'count': len(tips)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_categories(data):
    """Get FAQ categories"""
    try:
        role = data.get('role')
        
        engine = get_support_engine()
        categories = engine.get_faq_categories(role)
        
        return {
            'success': True,
            'categories': categories,
            'count': len(categories)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# Command handlers
COMMANDS = {
    'process_query': process_query,
    'get_welcome_data': get_welcome_data,
    'get_consulting': get_consulting,
    'get_categories': get_categories
}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'Command required'}))
        sys.exit(1)
    
    command = sys.argv[1]
    data = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    if command not in COMMANDS:
        print(json.dumps({'success': False, 'error': f'Unknown command: {command}'}))
        sys.exit(1)
    
    try:
        result = COMMANDS[command](data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
