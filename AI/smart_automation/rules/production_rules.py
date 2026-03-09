"""
Production Rules Module
Handles production-triggered automation workflows
"""

from typing import Dict, Any, Optional
from engine.ai_suggestion_generator import generate_suggestion
from engine.role_mapper import RoleMapper

def on_production_completed(production_order: Dict[str, Any]) -> Optional[Dict]:
    """
    Triggered when production order is completed
    Generate suggestion to create dispatch order
    
    Args:
        production_order: Production order data with status, quotation_id, etc.
    
    Returns:
        Suggestion dictionary for dispatch order creation
    """
    order_id = production_order.get('order_id') or production_order.get('id')
    quotation_id = production_order.get('quotation_id')
    customer_name = production_order.get('customer_name', 'Unknown Customer')
    items = production_order.get('items', [])
    completion_date = production_order.get('actual_completion') or production_order.get('completion_date')
    
    # Only suggest if actually completed
    if production_order.get('status') != 'completed':
        return None
    
    # Generate suggestion for dispatch order
    suggestion = generate_suggestion(
        action_type='create_dispatch_order',
        entity_id=order_id,
        entity_type='production_order',
        metadata={
            'order_id': order_id,
            'quotation_id': quotation_id,
            'customer_name': customer_name,
            'items': items,
            'completion_date': completion_date
        },
        role=RoleMapper.get_role_for_action('create_dispatch_order')
    )
    
    return suggestion

def check_production_delay(production_order: Dict[str, Any]) -> Optional[Dict]:
    """
    Check if production is delayed
    Generate alert notification
    """
    from datetime import datetime
    
    order_id = production_order.get('order_id')
    expected_completion = production_order.get('expected_completion')
    status = production_order.get('status')
    
    # Skip if already completed or not started
    if status not in ['in_progress']:
        return None
    
    # In real system, calculate actual delay
    # For now, assume delay if progress < expected
    suggestion = generate_suggestion(
        action_type='production_delay_alert',
        entity_id=order_id,
        entity_type='production_order',
        metadata={
            'order_id': order_id,
            'expected_completion': expected_completion,
            'delay_days': 3  # Example
        },
        role='PRODUCTION'
    )
    
    return suggestion
