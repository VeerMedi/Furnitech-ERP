import os, json
from datetime import datetime

USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'true').lower() == 'true'
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MOCK_DATA_DIR = os.path.join(BASE_DIR, 'mock_data')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOGS_DIR, exist_ok=True)

AUTOMATION_RULES = {
    'quotation_approved': {'id': 'RULE001', 'name': 'Quotation Approved → Create Production Order', 'event_type': 'quotation.approved', 'enabled': True, 'actions': ['create_production_order', 'assign_tasks', 'log_automation'], 'priority': 1, 'description': 'Automatically create production order when quotation is approved'},
    'low_stock': {'id': 'RULE002', 'name': 'Low Stock → Generate Purchase Request', 'event_type': 'inventory.low_stock', 'enabled': True, 'actions': ['generate_purchase_request', 'notify_manager', 'log_automation'], 'priority': 2, 'description': 'Generate purchase request when inventory falls below threshold'},
    'new_inquiry': {'id': 'RULE003', 'name': 'New Inquiry → Run Employee Recommendation', 'event_type': 'inquiry.created', 'enabled': True, 'actions': ['run_employee_recommendation', 'log_automation'], 'priority': 3, 'description': 'Automatically recommend best employee for new inquiry'},
    'production_completed': {'id': 'RULE004', 'name': 'Production Completed → Generate Dispatch Document', 'event_type': 'production.completed', 'enabled': True, 'actions': ['generate_dispatch_doc', 'notify_logistics', 'log_automation'], 'priority': 4, 'description': 'Generate dispatch document when production is completed'},
    'machine_overuse': {'id': 'RULE005', 'name': 'Machine Overuse → Create Maintenance Alert', 'event_type': 'machine.usage_threshold', 'enabled': True, 'actions': ['create_maintenance_alert', 'notify_maintenance_team', 'log_automation'], 'priority': 5, 'description': 'Create maintenance alert when machine exceeds usage threshold'}
}

EVENT_TYPES = {'quotation.approved': 'quotation_approved', 'inventory.low_stock': 'low_stock', 'inquiry.created': 'new_inquiry', 'production.completed': 'production_completed', 'machine.usage_threshold': 'machine_overuse'}

def get_rule(rule_key):
    return AUTOMATION_RULES.get(rule_key)

def get_all_rules():
    return AUTOMATION_RULES

def toggle_rule(rule_key, enabled):
    if rule_key in AUTOMATION_RULES:
        AUTOMATION_RULES[rule_key]['enabled'] = enabled
        return True
    return False

def is_rule_enabled(rule_key):
    rule = AUTOMATION_RULES.get(rule_key)
    return rule['enabled'] if rule else False

def get_config():
    return {'use_mock_data': USE_MOCK_DATA, 'base_dir': BASE_DIR, 'mock_data_dir': MOCK_DATA_DIR, 'logs_dir': LOGS_DIR, 'rules': AUTOMATION_RULES, 'timestamp': datetime.now().isoformat()}

def save_log(log_entry):
    log_file = os.path.join(LOGS_DIR, 'automation_logs.json')
    logs = []
    if os.path.exists(log_file):
        try:
            with open(log_file, 'r') as f:
                logs = json.load(f)
        except:
            logs = []
    logs.append({**log_entry, 'timestamp': datetime.now().isoformat()})
    logs = logs[-1000:]
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)
    return True

def get_logs(limit=100):
    log_file = os.path.join(LOGS_DIR, 'automation_logs.json')
    if not os.path.exists(log_file):
        return []
    try:
        with open(log_file, 'r') as f:
            logs = json.load(f)
        return logs[-limit:]
    except:
        return []
