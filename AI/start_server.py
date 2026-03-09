#!/usr/bin/env python3
"""
Vlite AI Services - Unified API Server
Starts all AI services as a single HTTP server on port 5000
"""

import os
import sys
import json
import subprocess
import traceback
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get AI directory path
AI_DIR = Path(__file__).parent.absolute()

# Service paths
CUSTOMER_INSIGHTS_PATH = AI_DIR / 'customer_insights'
SMART_AUTOMATION_PATH = AI_DIR / 'smart_automation'
AI_SUPPORT_PATH = AI_DIR / 'ai_support'
RAG_ANALYTICS_PATH = AI_DIR / 'AI Reports' / 'Analytics'
INVENTORY_SCANNER_PATH = AI_DIR / 'inventory_scanner'

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Get Port from Env
PORT = int(os.getenv('PORT', 5000))

# Color codes for terminal output
class Colors:
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    OKCYAN = '\033[96m'

def log_info(message):
    print(f"{Colors.OKCYAN}[INFO]{Colors.ENDC} {message}")

def log_success(message):
    print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {message}")

def log_error(message):
    print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {message}")

def execute_python_bridge(script_path, command, *args):
    """Execute a Python bridge script and return JSON result"""
    try:
        # Build command
        cmd = ['python', str(script_path), command]
        cmd.extend(args)
        
        # Execute
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(script_path.parent)
        )
        
        if result.returncode == 0:
            # Parse JSON from stdout
            output_lines = result.stdout.strip().split('\n')
            for line in reversed(output_lines):
                line = line.strip()
                if line.startswith('{') or line.startswith('['):
                    return json.loads(line)
            return {'success': False, 'error': 'No valid JSON output'}
        else:
            return {'success': False, 'error': result.stderr or 'Command failed'}
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Request timeout'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

# ============================================================================
# CUSTOMER INSIGHTS ENDPOINTS
# ============================================================================

@app.route('/api/insights/overview', methods=['GET'])
def insights_overview():
    """Get dashboard overview KPIs"""
    try:
        org_id = request.args.get('organizationId', 'test_org')
        result = execute_python_bridge(
            CUSTOMER_INSIGHTS_PATH / 'api' / 'python_bridge.py',
            'overview',
            org_id
        )
        log_info(f"Customer Insights Overview - Org: {org_id}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Overview error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/insights/buying-patterns', methods=['GET'])
def insights_buying_patterns():
    """Get buying pattern analysis"""
    try:
        org_id = request.args.get('organizationId', 'test_org')
        result = execute_python_bridge(
            CUSTOMER_INSIGHTS_PATH / 'api' / 'python_bridge.py',
            'buying-patterns',
            org_id
        )
        log_info(f"Buying Patterns - Org: {org_id}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Buying patterns error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/insights/clv', methods=['GET'])
def insights_clv():
    """Get Customer Lifetime Value rankings"""
    try:
        org_id = request.args.get('organizationId', 'test_org')
        result = execute_python_bridge(
            CUSTOMER_INSIGHTS_PATH / 'api' / 'python_bridge.py',
            'clv',
            org_id
        )
        log_info(f"CLV Analysis - Org: {org_id}")
        return jsonify(result)
    except Exception as e:
        log_error(f"CLV error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/insights/preferences', methods=['GET'])
def insights_preferences():
    """Get customer preference analysis"""
    try:
        org_id = request.args.get('organizationId', 'test_org')
        result = execute_python_bridge(
            CUSTOMER_INSIGHTS_PATH / 'api' / 'python_bridge.py',
            'preferences',
            org_id
        )
        log_info(f"Preferences - Org: {org_id}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Preferences error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/insights/ai', methods=['GET'])
def insights_ai():
    """Get AI-generated insights"""
    try:
        org_id = request.args.get('organizationId', 'test_org')
        result = execute_python_bridge(
            CUSTOMER_INSIGHTS_PATH / 'api' / 'python_bridge.py',
            'ai-insights',
            org_id
        )
        log_info(f"AI Insights - Org: {org_id}")
        return jsonify(result)
    except Exception as e:
        log_error(f"AI Insights error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# SMART AUTOMATION ENDPOINTS
# ============================================================================

@app.route('/api/automation/trigger', methods=['POST'])
def automation_trigger():
    """Trigger an automation event"""
    try:
        data = request.get_json()
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'trigger_event',
            json.dumps(data)
        )
        log_info(f"Automation Trigger - Event: {data.get('event_type')}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Trigger error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation/suggestions', methods=['GET'])
def automation_suggestions():
    """Get all pending suggestions"""
    try:
        role = request.args.get('role')
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'get_suggestions',
            json.dumps({'role': role})
        )
        log_info(f"Get Suggestions - Role: {role}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Suggestions error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation/confirm', methods=['POST'])
def automation_confirm():
    """Confirm or dismiss a suggestion"""
    try:
        data = request.get_json()
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'confirm_suggestion',
            json.dumps(data)
        )
        log_info(f"Confirm Suggestion - ID: {data.get('suggestion_id')}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Confirm error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation/tasks/<role>', methods=['GET'])
def automation_tasks(role):
    """Get tasks for a role"""
    try:
        status = request.args.get('status')
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'get_tasks_by_role',
            json.dumps({'role': role, 'status': status})
        )
        log_info(f"Get Tasks - Role: {role}, Status: {status}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Tasks error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation/tasks/complete', methods=['POST'])
def automation_complete_task():
    """Mark a task as completed"""
    try:
        data = request.get_json()
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'complete_task',
            json.dumps(data)
        )
        log_info(f"Complete Task - ID: {data.get('task_id')}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Complete task error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/automation/dashboard/<role>', methods=['GET'])
def automation_dashboard(role):
    """Get dashboard summary for a role"""
    try:
        result = execute_python_bridge(
            SMART_AUTOMATION_PATH / 'api' / 'python_bridge_new.py',
            'get_role_dashboard',
            json.dumps({'role': role})
        )
        log_info(f"Dashboard - Role: {role}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Dashboard error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# AI SUPPORT ENDPOINTS
# ============================================================================

@app.route('/api/ai/support/query', methods=['POST'])
def ai_support_query():
    """Process support query"""
    try:
        data = request.get_json()
        result = execute_python_bridge(
            AI_SUPPORT_PATH / 'support_bridge.py',
            'process_query',
            json.dumps(data)
        )
        log_info(f"Support Query - User: {data.get('user_id')}, Role: {data.get('role')}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Query error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/support/welcome', methods=['GET'])
def ai_support_welcome():
    """Get welcome data"""
    try:
        role = request.args.get('role')
        result = execute_python_bridge(
            AI_SUPPORT_PATH / 'support_bridge.py',
            'get_welcome_data',
            json.dumps({'role': role})
        )
        log_info(f"Welcome Data - Role: {role}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Welcome error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/support/consulting', methods=['GET'])
def ai_support_consulting():
    """Get consulting insights"""
    try:
        role = request.args.get('role')
        priority = request.args.get('priority')
        result = execute_python_bridge(
            AI_SUPPORT_PATH / 'support_bridge.py',
            'get_consulting',
            json.dumps({'role': role, 'priority': priority})
        )
        log_info(f"Consulting - Role: {role}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Consulting error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ai/support/categories', methods=['GET'])
def ai_support_categories():
    """Get FAQ categories"""
    try:
        role = request.args.get('role')
        result = execute_python_bridge(
            AI_SUPPORT_PATH / 'support_bridge.py',
            'get_categories',
            json.dumps({'role': role})
        )
        log_info(f"Categories - Role: {role}")
        return jsonify(result)
    except Exception as e:
        log_error(f"Categories error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# RAG ANALYTICS ENDPOINTS
# ============================================================================

@app.route('/api/ai-chat/query', methods=['POST'])
def rag_analytics_query():
    """RAG query endpoint"""
    try:
        data = request.get_json()
        tenant_id = data.get('tenant_id', data.get('organizationId', 'test_org'))
        question = data.get('question', data.get('message', ''))
        
        if not question:
            return jsonify({'success': False, 'error': 'Question is required'}), 400
        
        result = execute_python_bridge(
            RAG_ANALYTICS_PATH / 'query_rag_api.py',
            tenant_id,
            question
        )
        
        log_info(f"RAG Query - Tenant: {tenant_id}, Question: {question[:50]}...")
        return jsonify(result)
    except Exception as e:
        log_error(f"RAG query error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/api/ai-chat/save", methods=["POST"])
def save_chat():
    try:
        data = request.json

        # Optional: persist later
        return jsonify({
            "success": True,
            "message": "Chat saved (noop)"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ============================================================================
# INVENTORY SCANNER ENDPOINTS
# ============================================================================

@app.route('/api/inventory/scan', methods=['POST'])
def inventory_scan():
    """Scan inventory from image"""
    try:
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            return jsonify({'success': False, 'error': 'Image data required'}), 400

        sys.path.append(str(INVENTORY_SCANNER_PATH))
        from scanner_bridge import process_scan_request
        
        result = process_scan_request(image_data)
        
        log_info(f"Inventory Scan Request Processed")
        return jsonify(result)
    except Exception as e:
        log_error(f"Inventory scan error: {str(e)}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'services': {
            'customer_insights': 'active',
            'smart_automation': 'active',
            'ai_support': 'active',
            'rag_analytics': 'active',
            'inventory_scanner': 'active'
        }
    })

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'Vlite AI Services API Server',
        'version': '1.0.0',
        'endpoints': {
            'customer_insights': [
                'GET /api/insights/overview',
                'GET /api/insights/buying-patterns',
                'GET /api/insights/clv',
                'GET /api/insights/preferences',
                'GET /api/insights/ai'
            ],
            'smart_automation': [
                'POST /api/automation/trigger',
                'GET /api/automation/suggestions',
                'POST /api/automation/confirm',
                'GET /api/automation/tasks/:role',
                'POST /api/automation/tasks/complete',
                'GET /api/automation/dashboard/:role'
            ],
            'ai_support': [
                'POST /api/ai/support/query',
                'GET /api/ai/support/welcome',
                'GET /api/ai/support/consulting',
                'GET /api/ai/support/categories'
            ],
            'rag_analytics': [
                'POST /api/ai-chat/query'
            ],
            'inventory_scanner': [
                'POST /api/inventory/scan'
            ]
        }
    })

def main():
    """Main function to start the server"""
    print(f"\n{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.BOLD}{'🚀 VLITE AI SERVICES - UNIFIED API SERVER'.center(80)}{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*80}{Colors.ENDC}\n")
    
    log_info(f"Starting server on http://localhost:{PORT}")
    log_success("All AI services are now accessible via HTTP")
    
    print(f"\n{Colors.OKCYAN}Available Services:{Colors.ENDC}")
    print(f"  • Customer Insights:  /api/insights/*")
    print(f"  • Smart Automation:   /api/automation/*")
    print(f"  • AI Support:         /api/ai/support/*")
    print(f"  • RAG Analytics:      /api/ai-chat/query")
    print(f"  • Inventory Scanner:  /api/inventory/scan")
    print(f"\n{Colors.OKCYAN}Health Check:{Colors.ENDC} GET http://localhost:{PORT}/health")
    print(f"{Colors.OKCYAN}API Documentation:{Colors.ENDC} GET http://localhost:{PORT}/\n")
    
    print(f"{Colors.WARNING}Press CTRL+C to stop the server{Colors.ENDC}\n")
    
    # Start Flask server
    app.run(
        host='0.0.0.0',
        port=PORT,
        debug=False,
        threaded=True
    )

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        log_info("\nServer stopped by user")
        sys.exit(0)
    except Exception as e:
        log_error(f"Server error: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
