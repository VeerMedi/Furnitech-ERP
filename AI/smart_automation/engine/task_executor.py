"""
Task Executor Module
Execute automated tasks based on triggered events
"""

import json
from datetime import datetime
from typing import Dict, Any
from . import automation_config

class TaskExecutor:
    def __init__(self):
        """Initialize task executor"""
        self.handlers = {
            'create_production_order': self.create_production_order,
            'assign_tasks': self.assign_tasks,
            'generate_purchase_request': self.generate_purchase_request,
            'notify_manager': self.notify_manager,
            'run_employee_recommendation': self.run_employee_recommendation,
            'generate_dispatch_doc': self.generate_dispatch_doc,
            'notify_logistics': self.notify_logistics,
            'create_maintenance_alert': self.create_maintenance_alert,
            'notify_maintenance_team': self.notify_maintenance_team,
            'log_automation': self.log_automation
        }
    
    def execute(self, action_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task action"""
        handler = self.handlers.get(action_name)
        if handler:
            return handler(context)
        return {'error': f'Unknown action: {action_name}'}
    
    def create_production_order(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create a production order"""
        quotation_id = context.get('quotation_id', 'UNKNOWN')
        production_order_id = f"PROD_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            'action': 'create_production_order',
            'production_order': {
                'id': production_order_id,
                'quotation_id': quotation_id,
                'customer_name': context.get('customer_name', 'N/A'),
                'status': 'scheduled',
                'created_at': datetime.now().isoformat(),
                'automated': True
            },
            'message': f'Production order {production_order_id} created for quotation {quotation_id}'
        }
    
    def assign_tasks(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assign tasks for production"""
        return {
            'action': 'assign_tasks',
            'message': f"Tasks assigned for production order {context.get('production_order_id', 'N/A')}",
            'assigned_to': 'Workshop A'
        }
    
    def generate_purchase_request(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate purchase request for low stock"""
        material = context.get('material', {})
        pr_id = f"PR_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        quantity_requested = (material.get('reorder_level', 0) - material.get('current_stock', 0)) + 150
        
        return {
            'action': 'generate_purchase_request',
            'purchase_request': {
                'id': pr_id,
                'material_id': material.get('material_id', 'N/A'),
                'material_name': material.get('name', 'N/A'),
                'quantity_requested': quantity_requested,
                'current_stock': material.get('current_stock', 0),
                'reorder_level': material.get('reorder_level', 0),
                'priority': 'high' if material.get('status') == 'critical_low' else 'medium',
                'created_at': datetime.now().isoformat(),
                'automated': True
            },
            'message': f'Purchase request {pr_id} created for {material.get("name", "material")}'
        }
    
    def notify_manager(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Notify manager"""
        return {
            'action': 'notify_manager',
            'message': 'Manager notified',
            'notification_sent': True
        }
    
    def run_employee_recommendation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger employee recommendation"""
        return {
            'action': 'run_employee_recommendation',
            'inquiry_id': context.get('inquiry_id', 'N/A'),
            'message': 'Employee recommendation triggered',
            'recommendation_generated': True
        }
    
    def generate_dispatch_doc(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate dispatch document"""
        dispatch_id = f"DISP_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            'action': 'generate_dispatch_doc',
            'dispatch_document': {
                'id': dispatch_id,
                'production_id': context.get('production_id', 'N/A'),
                'customer_name': context.get('customer_name', 'N/A'),
                'status': 'ready_for_dispatch',
                'created_at': datetime.now().isoformat(),
                'automated': True
            },
            'message': f'Dispatch document {dispatch_id} created'
        }
    
    def notify_logistics(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Notify logistics team"""
        return {
            'action': 'notify_logistics',
            'message': 'Logistics team notified',
            'notification_sent': True
        }
    
    def create_maintenance_alert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create maintenance alert"""
        machine = context.get('machine', {})
        alert_id = f"MAINT_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return {
            'action': 'create_maintenance_alert',
            'maintenance_alert': {
                'id': alert_id,
                'machine_id': machine.get('machine_id', 'N/A'),
                'machine_name': machine.get('name', 'N/A'),
                'hours_used': machine.get('hours_used', 0),
                'threshold': machine.get('maintenance_threshold', 0),
                'priority': 'urgent',
                'created_at': datetime.now().isoformat(),
                'automated': True
            },
            'message': f'Maintenance alert {alert_id} created for {machine.get("name", "machine")}'
        }
    
    def notify_maintenance_team(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Notify maintenance team"""
        return {
            'action': 'notify_maintenance_team',
            'message': 'Maintenance team notified',
            'notification_sent': True
        }
    
    def log_automation(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Log automation action"""
        automation_config.save_log({
            'action_type': context.get('event_type', 'unknown'),
            'context': context,
            'status': 'success'
        })
        
        return {
            'action': 'log_automation',
            'message': 'Automation logged',
            'logged_at': datetime.now().isoformat()
        }
