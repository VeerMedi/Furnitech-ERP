"""
Quotation Rules Module
Handles quotation-triggered automation workflows
"""

from typing import Dict, Any, Optional
from engine.ai_suggestion_generator import generate_suggestion
from engine.role_mapper import RoleMapper

def on_quotation_approved(quotation_data: Dict[str, Any]) -> Optional[Dict]:
    """
    Triggered when a quotation is approved
    Generates suggestion to create production order
    
    Args:
        quotation_data: Quotation information including id, customer, items, etc.
    
    Returns:
        Suggestion dictionary for user confirmation
    """
    quotation_id = quotation_data.get('id') or quotation_data.get('quotation_id')
    customer_name = quotation_data.get('customer_name', 'Unknown Customer')
    total_value = quotation_data.get('total_value', 0)
    items = quotation_data.get('items', [])
    
    # Generate suggestion (DO NOT AUTO-EXECUTE)
    suggestion = generate_suggestion(
        action_type='create_production_order',
        entity_id=quotation_id,
        entity_type='quotation',
        metadata={
            'customer_name': customer_name,
            'total_value': total_value,
            'items_count': len(items),
            'items': items
        },
        role=RoleMapper.get_role_for_action('create_production_order')
    )
    
    return suggestion

def check_quotation_expiry(quotation_data: Dict[str, Any]) -> Optional[Dict]:
    """
    Check if quotation is about to expire
    Generate reminder notification
    """
    from datetime import datetime
    
    quotation_id = quotation_data.get('id')
    valid_until = quotation_data.get('valid_until')
    customer_name = quotation_data.get('customer_name')
    
    if not valid_until:
        return None
    
    # Simple expiry check (in real system, calculate days remaining)
    suggestion = generate_suggestion(
        action_type='quotation_expiring',
        entity_id=quotation_id,
        entity_type='quotation',
        metadata={
            'customer_name': customer_name,
            'valid_until': valid_until,
            'days_remaining': 7  # Example
        },
        role='SALES'
    )
    
    return suggestion
