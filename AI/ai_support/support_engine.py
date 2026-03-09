"""
AI Support Engine
Main logic for handling support queries and consulting
"""

from typing import Dict, List, Optional
from knowledge_base import get_knowledge_base
from role_context_builder import RoleContextBuilder

class SupportEngine:
    """Main AI support engine"""
    
    def __init__(self, use_mock=True):
        self.knowledge_base = get_knowledge_base(use_mock=use_mock)
        self.role_builder = RoleContextBuilder()
    
    def process_query(self, user_id: str, role: str, message: str) -> Dict:
        """
        Process user query and generate response
        
        Args:
            user_id: User ID
            role: User role
            message: User message
        
        Returns:
            Response with answer and suggestions
        """
        # Normalize role
        role = role.lower() if role else 'poc'
        
        # Try FAQ search first
        faq_results = self.knowledge_base.search_faq(message, role=role, limit=1)
        
        if faq_results and faq_results[0]['relevance_score'] >= 3:
            # High confidence FAQ match
            faq = faq_results[0]
            return {
                'success': True,
                'reply': faq['answer'],
                'source': 'faq',
                'faq_id': faq['id'],
                'category': faq['category'],
                'confidence': min(faq['relevance_score'] / 5, 1.0),
                'suggestions': self._get_related_suggestions(faq, role)
            }
        
        elif faq_results:
            # Lower confidence FAQ match
            faq = faq_results[0]
            return {
                'success': True,
                'reply': f"I found something that might help:\n\n{faq['answer']}\n\nIs this what you were looking for?",
                'source': 'faq',
                'faq_id': faq['id'],
                'category': faq['category'],
                'confidence': min(faq['relevance_score'] / 5, 1.0),
                'suggestions': [
                    'Yes, that helps!',
                    'No, I need more info',
                    'Show me related topics'
                ]
            }
        
        else:
            # No FAQ match - provide general guidance
            return self._handle_no_match(message, role)
    
    def get_consulting_insights(self, role: str, priority: str = None) -> List[Dict]:
        """
        Get business consulting insights for role
        
        Args:
            role: User role
            priority: Filter by priority (high/medium/low)
        
        Returns:
            List of consulting tips
        """
        tips = self.knowledge_base.get_consulting_tips(role=role, priority=priority)
        
        # Enhance tips with role context
        enhanced_tips = []
        for tip in tips:
            enhanced_tip = {
                **tip,
                'enhanced_message': self.role_builder.enhance_consulting_tip(tip, role)
            }
            enhanced_tips.append(enhanced_tip)
        
        return enhanced_tips
    
    def get_faq_categories(self, role: str = None) -> List[Dict]:
        """
        Get FAQ categories with counts
        
        Args:
            role: Filter by role
        
        Returns:
            List of categories with FAQ counts
        """
        categories = self.knowledge_base.get_faq_categories()
        result = []
        
        for category in categories:
            faqs = self.knowledge_base.get_faqs_by_category(category, role=role)
            if faqs:
                result.append({
                    'category': category,
                    'count': len(faqs),
                    'sample_questions': [faq['question'] for faq in faqs[:3]]
                })
        
        return result
    
    def get_welcome_data(self, role: str) -> Dict:
        """
        Get welcome message and quick actions for role
        
        Args:
            role: User role
        
        Returns:
            Welcome data with message and quick actions
        """
        return {
            'welcome_message': self.role_builder.get_welcome_message(role),
            'quick_actions': self.role_builder.get_quick_actions(role),
            'focus_areas': self.role_builder.get_focus_areas(role),
            'faq_categories': self.get_faq_categories(role)
        }
    
    def _get_related_suggestions(self, faq: Dict, role: str) -> List[str]:
        """Generate related suggestions based on FAQ"""
        suggestions = []
        
        category = faq.get('category')
        
        # Add category-specific suggestions
        if category == 'Quotations':
            suggestions = [
                'Show me pending quotations',
                'How do I edit a quotation?',
                'Get quotation optimization tips'
            ]
        elif category == 'Production':
            suggestions = [
                'Check production status',
                'View WIP orders',
                'Get production tips'
            ]
        elif category == 'Inventory':
            suggestions = [
                'Show low stock items',
                'View all inventory',
                'Get inventory optimization tips'
            ]
        elif category == 'Dispatch':
            suggestions = [
                'View pending dispatches',
                'Check shipping status',
                'Get logistics tips'
            ]
        else:
            suggestions = [
                'Show more FAQs',
                'Get consulting tips',
                'Browse by category'
            ]
        
        return suggestions[:3]
    
    def _handle_no_match(self, message: str, role: str) -> Dict:
        """Handle queries with no FAQ match"""
        # Provide general guidance
        categories = self.get_faq_categories(role)
        
        reply = f"I couldn't find a specific answer to that question.\n\n"
        reply += f"**Here are some ways I can help:**\n"
        
        for cat in categories[:3]:
            reply += f"\n• **{cat['category']}**: {cat['count']} topics available"
        
        reply += f"\n\nTry asking about:\n"
        quick_actions = self.role_builder.get_quick_actions(role)
        for action in quick_actions[:3]:
            reply += f"• {action}\n"
        
        return {
            'success': True,
            'reply': reply.strip(),
            'source': 'general',
            'confidence': 0.3,
            'suggestions': quick_actions[:3]
        }

# Global instance
_support_engine = None

def get_support_engine(use_mock=True):
    """Get global support engine instance"""
    global _support_engine
    if _support_engine is None:
        _support_engine = SupportEngine(use_mock=use_mock)
    return _support_engine
