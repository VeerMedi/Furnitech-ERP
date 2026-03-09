"""
Machine Rules Module
Handles machine maintenance automation workflows
"""

from typing import Dict, Any, Optional
from engine.ai_suggestion_generator import generate_suggestion
from engine.role_mapper import RoleMapper

def check_machine_maintenance_due(machine: Dict[str, Any]) -> Optional[Dict]:
    """
    Check if machine has exceeded maintenance threshold
    Generate suggestion to create maintenance ticket
    
    Args:
        machine: Machine data with run_hours and maintenance_threshold
    
    Returns:
        Suggestion dictionary for maintenance ticket
    """
    machine_id = machine.get('machine_id')
    machine_name = machine.get('name')
    run_hours = machine.get('run_hours') or machine.get('hours_used', 0)
    maintenance_threshold = machine.get('maintenance_threshold', 200)
    last_maintenance = machine.get('last_maintenance')
    status = machine.get('status')
    
    # Check if machine exceeded threshold or marked for maintenance
    if run_hours < maintenance_threshold and status != 'maintenance_required' and status != 'overused':
        return None
    
    # Generate suggestion for maintenance ticket
    suggestion = generate_suggestion(
        action_type='create_maintenance_ticket',
        entity_id=machine_id,
        entity_type='machine',
        metadata={
            'machine_name': machine_name,
            'machine_id': machine_id,
            'run_hours': run_hours,
            'maintenance_threshold': maintenance_threshold,
            'last_maintenance': last_maintenance,
            'hours_over_threshold': run_hours - maintenance_threshold if run_hours > maintenance_threshold else 0
        },
        role=RoleMapper.get_role_for_action('create_maintenance_ticket')
    )
    
    # Set high priority if significantly over threshold
    if run_hours > (maintenance_threshold * 1.2):
        suggestion['priority'] = 'high'
    
    return suggestion

def check_all_machines(machines: list) -> list:
    """
    Check all machines for maintenance requirements
    
    Args:
        machines: List of all machine records
    
    Returns:
        List of maintenance suggestions
    """
    suggestions = []
    
    for machine in machines:
        suggestion = check_machine_maintenance_due(machine)
        if suggestion:
            suggestions.append(suggestion)
    
    return suggestions
