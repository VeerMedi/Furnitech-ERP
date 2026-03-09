"""
Role Context Builder
Provides role-specific context and suggestions
"""

from typing import Dict, List

class RoleContextBuilder:
    """Builds context based on user role"""
    
    # Role-specific focus areas
    ROLE_CONTEXT = {
        'sales': {
            'focus_areas': ['Leads', 'Quotations', 'Customer Relations', 'Conversions'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with quotations, lead management, and sales optimization.',
            'quick_actions': [
                'How to manage quotations',
                'How to view inquiries',
                'System navigation tips for Sales'
            ]
        },
        'production': {
            'focus_areas': ['Production Orders', 'WIP', 'Machine Usage', 'Team Management'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with production orders, work-in-progress, and machine management.',
            'quick_actions': [
                'How to check production status',
                'How to use the production dashboard',
                'Tips for production management'
            ]
        },
        'inventory': {
            'focus_areas': ['Stock Levels', 'Reorder Management', 'Vendor Management', 'Material Usage'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with inventory management, stock levels, and vendor relations.',
            'quick_actions': [
                'How to check stock levels',
                'How to manage inventory alerts',
                'System tips for inventory'
            ]
        },
        'transport': {
            'focus_areas': ['Dispatch Orders', 'Packing', 'Shipping', 'Logistics'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with dispatch orders, packing processes, and shipping logistics.',
            'quick_actions': [
                'How to manage dispatches',
                'How to use the transport module',
                'Navigation tips for Logistics'
            ]
        },
        'pm': {
            'focus_areas': ['Overall Operations', 'Task Management', 'Team Coordination', 'Analytics'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with overall operations, team management, and business insights.',
            'quick_actions': [
                'How to track all system tasks',
                'Where to find operations analytics',
                'System management guidelines'
            ]
        },
        'design': {
            'focus_areas': ['Design Projects', 'Custom Orders', 'Material Selection', 'Client Approvals'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with design projects, custom orders, and material selection.',
            'quick_actions': [
                'How to manage design tasks',
                'How to upload CAD drawings',
                'Workflow tips for Designers'
            ]
        },
        'accounts': {
            'focus_areas': ['Payments', 'Invoicing', 'Vendor Payments', 'Financial Reports'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with payments, invoicing, and financial management.',
            'quick_actions': [
                'How to track payments',
                'How to generate invoices',
                'System tips for Accounts'
            ]
        },
        'poc': {
            'focus_areas': ['Client Communications', 'Inquiry Management', 'Overall Coordination'],
            'welcome_message': 'Namaste! I\'m THH Pilot . I can help you with client communications, inquiry management, and overall coordination.',
            'quick_actions': [
                'How to navigate all inquiries',
                'Where to update client status',
                'System navigation for Coordinator'
            ]
        }
    }
    
    @classmethod
    def get_welcome_message(cls, role: str) -> str:
        """Get role-specific welcome message"""
        context = cls.ROLE_CONTEXT.get(role.lower(), {})
        return context.get(
            'welcome_message',
            'Hi! I\'m your AI assistant. How can I help you today?'
        )
    
    @classmethod
    def get_quick_actions(cls, role: str) -> List[str]:
        """Get role-specific quick action suggestions"""
        context = cls.ROLE_CONTEXT.get(role.lower(), {})
        return context.get('quick_actions', [])
    
    @classmethod
    def get_focus_areas(cls, role: str) -> List[str]:
        """Get role-specific focus areas"""
        context = cls.ROLE_CONTEXT.get(role.lower(), {})
        return context.get('focus_areas', [])
    
    @classmethod
    def build_context_prompt(cls, role: str, message: str) -> str:
        """
        Build context-aware prompt for AI
        
        Args:
            role: User role
            message: User message
        
        Returns:
            Enhanced prompt with role context
        """
        focus_areas = cls.get_focus_areas(role)
        
        context = f"""
You are an AI assistant for Vlite Furniture ERP.
User Role: {role.upper()}
Focus Areas: {', '.join(focus_areas)}

The user asked: "{message}"

Provide a helpful, concise answer focused on the user's role and responsibilities.
If suggesting actions, make them specific to {role} tasks.
        """.strip()
        
        return context
    
    @classmethod
    def enhance_consulting_tip(cls, tip: Dict, role: str) -> str:
        """
        Enhance consulting tip with role-specific context
        
        Args:
            tip: Consulting tip dictionary
            role: User role
        
        Returns:
            Enhanced tip message
        """
        title = tip.get('title', '')
        insight = tip.get('insight', '')
        recommendation = tip.get('recommendation', '')
        priority = tip.get('priority', 'medium').upper()
        
        message = f"**[{priority}] {title}**\n\n"
        
        if insight:
            message += f"📊 **Insight:** {insight}\n\n"
        
        message += f"💡 **Recommendation:**\n{recommendation}"
        
        return message
    
    @classmethod
    def get_all_roles(cls) -> List[str]:
        """Get list of all supported roles"""
        return list(cls.ROLE_CONTEXT.keys())
    
    @classmethod
    def is_valid_role(cls, role: str) -> bool:
        """Check if role is valid"""
        return role.lower() in cls.ROLE_CONTEXT
