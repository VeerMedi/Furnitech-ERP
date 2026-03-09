"""
AI Suggestion Generator Module
Converts automation rule triggers into natural language suggestions
"""

from typing import Dict, Any, Optional
from datetime import datetime

class AISuggestionGenerator:
    """Generate natural language suggestions for automation actions"""
    
    # Message templates for different action types
    TEMPLATES = {
        'create_production_order': "Quotation {entity_id} has been approved. Would you like to create a Production Order?",
        'create_purchase_request': "Stock for {item_name} is low ({current_stock} units remaining). Should I create a Purchase Request?",
        'create_dispatch_order': "Production for Order #{entity_id} is complete. Create Dispatch Order?",
        'create_maintenance_ticket': "Machine {machine_name} has exceeded maintenance threshold ({run_hours} hours). Create Maintenance Ticket?",
        'low_inventory_alert': "Inventory level for {item_name} is below minimum threshold. Current: {current_stock}, Minimum: {minimum_threshold}.",
        'production_delay_alert': "Production Order #{entity_id} is delayed. Estimated delay: {delay_days} days.",
        'quotation_expiring': "Quotation {entity_id} for {customer_name} expires in {days_remaining} days."
    }
    
    @staticmethod
    def generate_suggestion(
        action_type: str,
        entity_id: str,
        entity_type: str,
        metadata: Dict[str, Any] = None,
        role: str = None
    ) -> Dict[str, Any]:
        """
        Generate an AI suggestion
        
        Args:
            action_type: Type of action to suggest (e.g., 'create_production_order')
            entity_id: ID of the entity triggering the suggestion
            entity_type: Type of entity (e.g., 'quotation', 'inventory_item')
            metadata: Additional context data for the suggestion
            role: Target role for this suggestion
        
        Returns:
            Suggestion dictionary with message, action, metadata
        """
        metadata = metadata or {}
        
        # Get message template
        template = AISuggestionGenerator.TEMPLATES.get(
            action_type,
            f"Action required for {entity_type} {entity_id}. Proceed with {action_type}?"
        )
        
        # Format message with metadata
        try:
            message = template.format(entity_id=entity_id, **metadata)
        except KeyError:
            # Fallback if metadata doesn't match template
            message = f"Action required for {entity_type} {entity_id}."
        
        suggestion = {
            'id': f"SUG-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'message': message,
            'action': action_type,
            'entity_id': entity_id,
            'entity_type': entity_type,
            'role': role,
            'metadata': metadata,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'priority': AISuggestionGenerator._determine_priority(action_type, metadata)
        }
        
        return suggestion
    
    @staticmethod
    def _determine_priority(action_type: str, metadata: Dict) -> str:
        """Determine suggestion priority based on action type and context"""
        # Critical actions
        if 'critical' in action_type or metadata.get('urgent'):
            return 'high'
        
        # Low stock is high priority
        if action_type == 'create_purchase_request':
            current = metadata.get('current_stock', 100)
            minimum = metadata.get('minimum_threshold', 50)
            if current < minimum * 0.5:  # Less than 50% of minimum
                return 'high'
        
        # Machine maintenance is medium-high
        if action_type == 'create_maintenance_ticket':
            return 'medium'
        
        # Default
        return 'medium'
    
    @staticmethod
    def generate_multi_suggestion(suggestions_data: list) -> list:
        """Generate multiple suggestions at once"""
        return [
            AISuggestionGenerator.generate_suggestion(**data)
            for data in suggestions_data
        ]
    
    @staticmethod
    def enhance_with_context(suggestion: Dict, additional_context: Dict) -> Dict:
        """Enhance an existing suggestion with additional context"""
        suggestion['metadata'].update(additional_context)
        
        # Re-generate message if needed
        if 'message_template' in additional_context:
            suggestion['message'] = additional_context['message_template'].format(
                entity_id=suggestion['entity_id'],
                **suggestion['metadata']
            )
        
        return suggestion

# Singleton instance
_suggestion_generator = AISuggestionGenerator()

def generate_suggestion(action_type: str, entity_id: str, entity_type: str, 
                       metadata: Dict = None, role: str = None) -> Dict:
    """Generate an AI suggestion (convenience function)"""
    return _suggestion_generator.generate_suggestion(
        action_type, entity_id, entity_type, metadata, role
    )

def get_suggestion_generator() -> AISuggestionGenerator:
    """Get global suggestion generator instance"""
    return _suggestion_generator
