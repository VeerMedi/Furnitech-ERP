#!/usr/bin/env python3
"""
New Python Bridge for Suggestion-Based Automation
Handles API calls for the refined semi-automatic workflow
"""

import sys
import json
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import modules using absolute imports
from engine.suggestion_manager import get_suggestion_manager
from engine.role_mapper import RoleMapper
from tasks.task_assigner import get_task_assigner
from tasks.task_notifications import get_notification_service
from services.database_adapter import get_adapter
import rules.quotation_rules as quotation_rules
import rules.inventory_rules as inventory_rules
import rules.production_rules as production_rules
import rules.machine_rules as machine_rules

def trigger_event(data):
    """
    Trigger an automation event
    Generates suggestion based on event type
    """
    event_type = data.get('event_type')
    entity_id = data.get('entity_id')
    entity_data = data.get('entity_data', {})
    
    suggestion = None
    
    try:
        # Route to appropriate rule based on event type
        if event_type == 'quotation.approved':
            # Load quotation data if not provided
            if not entity_data:
                db = get_adapter()
                quotations = db.get_quotations()
                entity_data = next((q for q in quotations if q.get('id') == entity_id), None)
            
            if entity_data:
                suggestion = quotation_rules.on_quotation_approved(entity_data)
        
        elif event_type == 'inventory.low_stock':
            if not entity_data:
                db = get_adapter()
                inventory = db.get_inventory()
                entity_data = next((i for i in inventory if i.get('material_id') == entity_id), None)
            
            if entity_data:
                suggestion = inventory_rules.check_low_inventory(entity_data)
        
        elif event_type == 'production.completed':
            if not entity_data:
                db = get_adapter()
                production = db.get_production_orders()
                entity_data = next((p for p in production if p.get('order_id') == entity_id), None)
            
            if entity_data:
                suggestion = production_rules.on_production_completed(entity_data)
        
        elif event_type == 'machine.maintenance_due':
            if not entity_data:
                db = get_adapter()
                machines = db.get_machines()
                entity_data = next((m for m in machines if m.get('machine_id') == entity_id), None)
            
            if entity_data:
                suggestion = machine_rules.check_machine_maintenance_due(entity_data)
        
        else:
            return {
                'success': False,
                'error': f'Unknown event type: {event_type}'
            }
        
        if suggestion:
            # Store suggestion
            suggestion_mgr = get_suggestion_manager()
            stored_suggestion = suggestion_mgr.create_suggestion(suggestion)
            
            # Send notification to role
            notif_service = get_notification_service()
            notif_service.notify_suggestion_available(
                role=suggestion.get('role'),
                suggestion=suggestion
            )
            
            return {
                'success': True,
                'suggestion_created': True,
                'suggestion_id': stored_suggestion['id'],
                'suggestion': stored_suggestion
            }
        else:
            return {
                'success': True,
                'suggestion_created': False,
                'message': 'No suggestion needed for this event'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_suggestions(data):
    """Get pending suggestions, optionally filtered by role"""
    try:
        role = data.get('role')
        
        suggestion_mgr = get_suggestion_manager()
        suggestions = suggestion_mgr.get_pending_suggestions(role=role)
        
        return {
            'success': True,
            'suggestions': suggestions,
            'count': len(suggestions)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def confirm_suggestion(data):
    """Confirm or dismiss a suggestion"""
    try:
        suggestion_id = data.get('suggestion_id')
        confirmed = data.get('confirmed', True)
        
        suggestion_mgr = get_suggestion_manager()
        suggestion = suggestion_mgr.get_suggestion(suggestion_id)
        
        if not suggestion:
            return {
                'success': False,
                'error': 'Suggestion not found'
            }
        
        if confirmed:
            # Mark as confirmed
            suggestion_mgr.confirm_suggestion(suggestion_id)
            
            # Create task for the assigned role
            task_assigner = get_task_assigner()
            task = task_assigner.create_task(
                title=f"Execute: {suggestion.get('message', 'Automation Task')}",
                description=suggestion.get('message'),
                role=suggestion.get('role'),
                linked_entity=suggestion.get('entity_id'),
                entity_type=suggestion.get('entity_type'),
                action_type=suggestion.get('action'),
                metadata=suggestion.get('metadata', {})
            )
            
            # Send notification
            notif_service = get_notification_service()
            notif_service.notify_task_created(
                role=suggestion.get('role'),
                task=task
            )
            
            return {
                'success': True,
                'confirmed': True,
                'task_created': True,
                'task_id': task.id,
                'assigned_to_role': task.role
            }
        else:
            # Dismiss suggestion
            suggestion_mgr.dismiss_suggestion(suggestion_id)
            
            return {
                'success': True,
                'confirmed': False,
                'dismissed': True
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_tasks_by_role(data):
    """Get tasks for a specific role"""
    try:
        role = data.get('role')
        status = data.get('status')  # Optional: filter by status
        
        task_assigner = get_task_assigner()
        tasks = task_assigner.get_tasks_by_role(role, status=status)
        
        return {
            'success': True,
            'tasks': [task.to_dict() for task in tasks],
            'count': len(tasks)
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def complete_task(data):
    """Mark a task as completed"""
    try:
        task_id = data.get('task_id')
        completion_notes = data.get('completion_notes')
        
        task_assigner = get_task_assigner()
        success = task_assigner.complete_task(task_id, completion_notes)
        
        if success:
            task = task_assigner.get_task(task_id)
            
            # Send completion notification
            notif_service = get_notification_service()
            notif_service.notify_task_completed(
                role=task.role,
                task=task
            )
            
            return {
                'success': True,
                'task_id': task_id,
                'status': 'completed'
            }
        else:
            return {
                'success': False,
                'error': 'Task not found'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def get_role_dashboard(data):
    """Get complete dashboard data for a role"""
    try:
        role = data.get('role')
        
        task_assigner = get_task_assigner()
        suggestion_mgr = get_suggestion_manager()
        notif_service = get_notification_service()
        
        # Get tasks
        pending_tasks = task_assigner.get_pending_tasks(role=role)
        
        # Get suggestions
        suggestions = suggestion_mgr.get_pending_suggestions(role=role)
        
        # Get notifications
        notifications = notif_service.get_notifications_for_role(role, unread_only=True)
        
        # Get stats
        task_stats = task_assigner.get_task_stats(role=role)
        suggestion_stats = suggestion_mgr.get_suggestion_stats(role=role)
        
        return {
            'success': True,
            'role': role,
            'tasks': {
                'pending': [task.to_dict() for task in pending_tasks[:10]],  # Top 10
                'stats': task_stats
            },
            'suggestions': {
                'pending': suggestions[:5],  # Top 5
                'stats': suggestion_stats
            },
            'notifications': {
                'unread': [notif.to_dict() for notif in notifications[:10]],
                'unread_count': notif_service.get_unread_count(role)
            }
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# Command handlers
COMMANDS = {
    'trigger_event': trigger_event,
    'get_suggestions': get_suggestions,
    'confirm_suggestion': confirm_suggestion,
    'get_tasks_by_role': get_tasks_by_role,
    'complete_task': complete_task,
    'get_role_dashboard': get_role_dashboard
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
