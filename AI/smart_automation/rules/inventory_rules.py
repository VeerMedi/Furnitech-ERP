"""
Inventory Rules Module
Handles inventory-triggered automation workflows
"""

from typing import Dict, Any, Optional, List
from engine.ai_suggestion_generator import generate_suggestion
from engine.role_mapper import RoleMapper

def check_low_inventory(inventory_item: Dict[str, Any]) -> Optional[Dict]:
    """
    Check if inventory item is below minimum threshold
    Generate suggestion to create purchase request
    
    Args:
        inventory_item: Inventory item data with current_stock and minimum_threshold
    
    Returns:
        Suggestion dictionary if stock is low
    """
    material_id = inventory_item.get('material_id') or inventory_item.get('id')
    material_name = inventory_item.get('name') or inventory_item.get('material_name')
    current_stock = inventory_item.get('current_stock', 0)
    minimum_threshold = inventory_item.get('minimum_threshold') or inventory_item.get('reorder_level', 0)
    reorder_quantity = inventory_item.get('reorder_quantity', 100)
    unit = inventory_item.get('unit', 'units')
    
    # Check if stock is below threshold
    if current_stock >= minimum_threshold:
        return None
    
    # Generate suggestion for purchase request
    suggestion = generate_suggestion(
        action_type='create_purchase_request',
        entity_id=material_id,
        entity_type='inventory_item',
        metadata={
            'item_name': material_name,
            'current_stock': current_stock,
            'minimum_threshold': minimum_threshold,
            'reorder_quantity': reorder_quantity,
            'unit': unit
        },
        role=RoleMapper.get_role_for_action('create_purchase_request')
    )
    
    return suggestion

def check_all_inventory_levels(inventory_items: List[Dict]) -> List[Dict]:
    """
    Check all inventory items and generate suggestions for low stock items
    
    Args:
        inventory_items: List of all inventory items
    
    Returns:
        List of suggestions for items below threshold
    """
    suggestions = []
    
    for item in inventory_items:
        suggestion = check_low_inventory(item)
        if suggestion:
            suggestions.append(suggestion)
    
    return suggestions

def check_critical_inventory(inventory_item: Dict[str, Any]) -> Optional[Dict]:
    """
    Check for critically low inventory (below 50% of minimum threshold)
    Higher priority suggestion
    """
    current_stock = inventory_item.get('current_stock', 0)
    minimum_threshold = inventory_item.get('minimum_threshold') or inventory_item.get('reorder_level', 0)
    
    # Critical if below 50% of minimum
    if current_stock < (minimum_threshold * 0.5):
        suggestion = check_low_inventory(inventory_item)
        if suggestion:
            suggestion['priority'] = 'high'
            suggestion['message'] = suggestion['message'].replace('is low', 'is critically low')
        return suggestion
    
    return None
