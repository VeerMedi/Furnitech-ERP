"""
Role Mapper Module
Maps automation tasks to appropriate user roles
"""

from typing import Dict, List, Optional

# Role definitions matching ERP structure
ROLES = {
    'POC': 'Point of Contact',
    'SALES': 'Sales',
    'DESIGN': 'Design',
    'PRODUCTION': 'Production',
    'INVENTORY': 'Inventory Manager',
    'PM': 'Project Manager',
    'ACCOUNTS': 'Accounts',
    'TRANSPORT': 'Transport'
}

# Entity type to role mapping
ENTITY_ROLE_MAPPING = {
    'quotation': 'SALES',
    'production_order': 'PRODUCTION',
    'purchase_request': 'INVENTORY',
    'dispatch_order': 'TRANSPORT',
    'maintenance_ticket': 'PM',
    'inventory_item': 'INVENTORY',
    'machine': 'PM',
    'inquiry': 'SALES',
    'payment': 'ACCOUNTS',
    'design_request': 'DESIGN'
}

# Action type to role mapping
ACTION_ROLE_MAPPING = {
    'create_production_order': 'PRODUCTION',
    'create_purchase_request': 'INVENTORY',
    'create_dispatch_order': 'TRANSPORT',
    'create_maintenance_ticket': 'PM',
    'approve_quotation': 'SALES',
    'process_payment': 'ACCOUNTS',
    'create_design': 'DESIGN',
    'assign_employee': 'SALES'
}

class RoleMapper:
    """Maps tasks and actions to appropriate roles"""
    
    @staticmethod
    def get_role_for_entity(entity_type: str) -> Optional[str]:
        """Get role responsible for an entity type"""
        return ENTITY_ROLE_MAPPING.get(entity_type)
    
    @staticmethod
    def get_role_for_action(action_type: str) -> Optional[str]:
        """Get role responsible for an action"""
        return ACTION_ROLE_MAPPING.get(action_type)
    
    @staticmethod
    def get_role_display_name(role_code: str) -> str:
        """Get display name for role"""
        return ROLES.get(role_code, role_code)
    
    @staticmethod
    def get_all_roles() -> List[str]:
        """Get list of all role codes"""
        return list(ROLES.keys())
    
    @staticmethod
    def determine_role(entity_type: str = None, action_type: str = None) -> str:
        """
        Determine appropriate role based on entity type or action type
        Priority: action_type > entity_type
        """
        if action_type:
            role = RoleMapper.get_role_for_action(action_type)
            if role:
                return role
        
        if entity_type:
            role = RoleMapper.get_role_for_entity(entity_type)
            if role:
                return role
        
        # Default to POC if cannot determine
        return 'POC'
    
    @staticmethod
    def can_role_perform_action(role: str, action_type: str) -> bool:
        """Check if a role can perform a specific action"""
        required_role = RoleMapper.get_role_for_action(action_type)
        return role == required_role if required_role else False

# Singleton instance
_role_mapper = RoleMapper()

def get_role_mapper() -> RoleMapper:
    """Get global role mapper instance"""
    return _role_mapper
