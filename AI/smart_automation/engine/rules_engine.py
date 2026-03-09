"""
Rules Engine Module
Evaluate and execute automation rules
"""

from typing import Dict, Any, List
from . import automation_config
from . import event_bus
from . import task_executor

class RulesEngine:
    def __init__(self):
        """Initialize rules engine"""
        self.executor = task_executor.TaskExecutor()
        self.setup_event_handlers()
    
    def setup_event_handlers(self):
        """Setup event handlers for all rules"""
        for rule_key, rule in automation_config.AUTOMATION_RULES.items():
            event_type = rule['event_type']
            event_bus.subscribe(event_type, self.create_handler(rule_key))
    
    def create_handler(self, rule_key):
        """Create event handler for a rule"""
        def handler(event_type, event_data):
            return self.handle_event(rule_key, event_type, event_data)
        return handler
    
    def handle_event(self, rule_key: str, event_type: str, event_data: Dict) -> Dict:
        """Handle an event for a specific rule"""
        rule = automation_config.get_rule(rule_key)
        
        if not rule or not rule['enabled']:
            return {'rule': rule_key, 'status': 'disabled'}
        
        # Execute all actions for this rule
        results = []
        for action in rule['actions']:
            result = self.executor.execute(action, {**event_data, 'event_type': event_type})
            results.append(result)
        
        return {
            'rule': rule_key,
            'event': {
                'type': event_type,
                'data': event_data,
                'timestamp': automation_config.datetime.now().isoformat(),
                'id': event_bus.get_event_bus().get_event_id()
            },
            'results': results
        }

# Global rules engine instance
_rules_engine = RulesEngine()

def trigger_event(event_type: str, event_data: Dict) -> List[Dict]:
    """Trigger an event"""
    return event_bus.publish(event_type, event_data)

def get_rules_engine():
    """Get global rules engine instance"""
    return _rules_engine
