"""
Enhanced AI Support Engine with LLM Integration
Provides intelligent, context-aware responses using OpenRouter
"""

import os
from typing import Dict, List, Optional
from dotenv import load_dotenv
from knowledge_base import get_knowledge_base
from role_context_builder import RoleContextBuilder

# Load environment variables
load_dotenv()

class EnhancedSupportEngine:
    """Enhanced AI support engine with LLM fallback"""
    
    def __init__(self, use_mock=True):
        self.knowledge_base = get_knowledge_base(use_mock=use_mock)
        self.role_builder = RoleContextBuilder()
        # Enable LLM for complex queries, use FAQ for common ones
        self.use_llm = os.getenv('USE_LLM_SUPPORT', 'true').lower() == 'true'
        self.openrouter_api_key = os.getenv('OPENROUTER_API_KEY', '')
    
    def process_query(self, user_id: str, role: str, message: str) -> Dict:
        """Process user query with hybrid FAQ + LLM approach"""
        role = role.lower() if role else 'poc'
        
        # Handle casual greetings/small talk
        greeting_keywords = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 
                            'good evening', 'namaste', 'hola', 'sup', 'whats up']
        message_lower = message.lower().strip()
        # Normalize common keywords/misspellings
        message_normal = message_lower.replace('inquires', 'inquiries').replace('enquiry', 'inquiry')
        
        # Check if it's just a greeting (short message with greeting words)
        if len(message.split()) <= 3 and any(greeting in message_lower for greeting in greeting_keywords):
            return self._handle_greeting(role)
        
        # Step 1: Try FAQ matching first (fast & accurate for common queries)
        faq_results = self.knowledge_base.search_faq(message_normal, role=role, limit=3)
        
        # High confidence FAQ match - provide enhanced system guidance
        if faq_results and faq_results[0]['relevance_score'] >= 4:
            faq = faq_results[0]
            # Enhance with role-specific navigation and next steps
            enhanced_reply = self._enhance_faq_with_navigation(faq, message, role)
            return {
                'success': True,
                'reply': enhanced_reply,
                'source': 'faq_system_guided',
                'faq_id': faq['id'],
                'category': faq['category'],
                'confidence': min(faq['relevance_score'] / 5, 1.0),
                'suggestions': self._get_related_suggestions(faq, role),
                'navigation': self._extract_navigation_steps(faq['answer'])
            }
        
        # Step 2: Use LLM for better responses if enabled
        if self.use_llm and self.openrouter_api_key:
            llm_response = self._get_llm_response(message, role, faq_results)
            if llm_response:
                return llm_response
        
        # Step 3: Medium confidence FAQ match
        if faq_results and faq_results[0]['relevance_score'] >= 3:
            faq = faq_results[0]
            enhanced_answer = self._enhance_faq_answer(faq, message, role)
            return {
                'success': True,
                'reply': enhanced_answer,
                'source': 'faq_enhanced',
                'faq_id': faq['id'],
                'category': faq['category'],
                'confidence': 0.8,
                'suggestions': self._get_related_suggestions(faq, role)
            }
        
        # Step 4: Fallback to general help
        return self._handle_no_match(message, role)
    
    def _enhance_faq_with_navigation(self, faq: Dict, original_query: str, role: str) -> str:
        """Enhance FAQ answer with navigation and actionable steps"""
        answer = faq['answer']
        category = faq['category']
        
        # Role-specific greeting
        role_greetings = {
            'sales': '💼 **Sales Assistant**',
            'production': '🏭 **Production Guide**',
            'inventory': '📦 **Inventory Helper**',
            'transport': '🚚 **Transport Assistant**',
            'pm': '📊 **Project Manager Guide**',
            'design': '🎨 **Design Helper**',
            'accounts': '💰 **Accounts Guide**'
        }
        
        greeting = role_greetings.get(role, '💡 **System Guide**')
        enhanced = f"{greeting}\n\n{answer}\n\n"
        
        # Add quick navigation reminder
        enhanced += "📍 **Quick Tip**: Look for these sections in the sidebar:\n"
        enhanced += f"   ➜ {category} module\n\n"
        
        # Add role-specific pro tips based on category
        pro_tips = self._get_category_pro_tips(category, role)
        if pro_tips:
            enhanced += f"💡 **Pro Tip**: {pro_tips}\n\n"
        
        # Add relevant quick actions
        enhanced += "⚡ **What you can do next:**\n"
        related_actions = self._get_category_related_actions(category, role)
        for action in related_actions[:3]:
            enhanced += f"   • {action}\n"
        
        # Add separator note about RAG Chat
        enhanced += "\n---\n"
        enhanced += "📊 *For data queries (\"how many\", \"show me\"), use **RAG AI Chat** in AI Features menu*\n"
        
        return enhanced
    
    def _extract_navigation_steps(self, answer: str) -> List[str]:
        """Extract navigation steps from FAQ answer"""
        steps = []
        lines = answer.split('\n')
        for line in lines:
            line = line.strip()
            # Match numbered steps or bullet points
            if line and (line[0].isdigit() or line.startswith('•') or line.startswith('-')):
                # Extract step text
                step = line.lstrip('0123456789.-• ')
                if step and len(step) > 5:
                    steps.append(step)
        return steps[:5]  # Max 5 steps
    
    def _get_category_pro_tips(self, category: str, role: str) -> str:
        """Get pro tips based on category and role"""
        tips = {
            'Quotations': {
                'sales': 'Use the Quick Create button to save 50% time on quotation entry',
                'pm': 'Review pending quotations daily to improve conversion rates'
            },
            'Production': {
                'production': 'Update order status in real-time to keep customers informed',
                'pm': 'Use the production dashboard to track bottlenecks'
            },
            'Inventory': {
                'inventory': 'Enable auto-reorder notifications to prevent stockouts',
                'production': 'Check material availability before starting production'
            },
            'Orders': {
                'sales': 'Convert approved quotations to orders with one click',
                'pm': 'Use order filters to prioritize urgent deliveries'
            },
            'AI Features': {
                'all': 'AI recommendations improve with usage - the more data, the better insights'
            }
        }
        
        category_tips = tips.get(category, {})
        return category_tips.get(role, category_tips.get('all', ''))
    
    def _get_category_related_actions(self, category: str, role: str) -> List[str]:
        """Get related actions based on category"""
        actions = {
            'Quotations': [
                'View all quotations in Sales → Quotations',
                'Create new quotation with + button',
                'Use templates for faster quotation creation',
                'Check quotation approval workflow'
            ],
            'Production': [
                'Monitor WIP in Production Dashboard',
                'Assign tasks to production team',
                'Update production status',
                'Check machine availability'
            ],
            'Inventory': [
                'View stock levels in Inventory → Items',
                'Set reorder points for critical items',
                'Generate inventory reports',
                'Track material consumption'
            ],
            'Orders': [
                'View active orders in Orders module',
                'Update order status',
                'Generate order reports',
                'Track delivery timeline'
            ],
            'AI Features': [
                'Try RAG AI Chat for data insights',
                'Use Smart Task Automation',
                'Check AI recommendations',
                'Explore Voice AI Assistant'
            ]
        }
        
        return actions.get(category, [
            f'Navigate to {category} module',
            'Use search to find specific items',
            'Check dashboard for overview'
        ])
    
    def _enhance_faq_answer(self, faq: Dict, original_query: str, role: str) -> str:
        """Legacy method - redirect to new navigation-enhanced version"""
        return self._enhance_faq_with_navigation(faq, original_query, role)
    
    def _get_llm_response(self, message: str, role: str, faq_context: List[Dict]) -> Optional[Dict]:
        """Get enhanced response from LLM with comprehensive context"""
        try:
            import requests
            
            # Build comprehensive context
            focus_areas = self.role_builder.get_focus_areas(role)
            quick_actions = self.role_builder.get_quick_actions(role)
            
            context = f"""You are **THH Pilot **, the ultimate AI System Guide for Vlite Furniture ERP.
            
**PERSONALITY**:
- Name: THH Pilot 
- Role: Expert Guide, friendly, helpful, and precisely knowledgeable
- Tone: Professional yet warm, patient, and precise. Always greets with "Namaste" if starting a conversation.
- Goal: You know EVERY dashboard, EVERY module, and EVERY feature of the Vlite ERP. Your job is to make sure no user ever feels lost.

**CRITICAL**: You are NOT a data assistant. You guide users on HOW to use features and WHERE to find them.
- ✅ DO: Show EXACT navigation paths like "Go to [Module] → [Submenu]"
- ✅ DO: Explain what each dashboard or feature does
- ❌ DON'T: Try to show actual data, counts, or live query information from the database
- 📊 For data queries (e.g., "How many orders?") → Explicitly tell them to use "RAG AI Chat" from the side menu.

**Your role**: Lead {role.upper()} users through the system interface step-by-step. You cover ALL modules: Sales (Inquiries, Quotations, Orders), CRM, Production, Inventory, Transport, Drawings, Machines, Management, and all AI features.

**Key focus areas for {role.upper()}:**
{chr(10).join([f'- {area}' for area in focus_areas])}

**Response Guidelines:**

1. **Navigation First**: Always start with WHERE to go
   - Format: "Navigate to [Module] → [Submenu] → [Action]"
   - Example: "Go to Sales → Quotations → Click + New Quotation button"
   - Be specific: button names, tab locations, sidebar items

2. **Step-by-Step Instructions**: Clear, numbered steps
   - What to click/select
   - What fields to fill
   - What buttons to press
   - What to expect as result

3. **Feature Explanation**: Explain WHAT features do
   - Smart Task Automation: AI suggests tasks
   - RAG AI Chat: Query your business data
   - AI Recommendations: Get employee/inventory suggestions
   - Voice Assistant: Hands-free system control

4. **Pro Tips**: Efficiency shortcuts
   - Keyboard shortcuts
   - Bulk actions
   - Time-saving features

5. **Visual Format**:
   - ✓ Action items
   - 📍 Navigation paths  
   - 💡 Efficiency tips
   - ⚠️ Important warnings
   - 📊 "Use RAG Chat for data"

**Available Modules & Features:**
- Sales: Leads, Inquiries, Quotations, Orders
- Production: Production Orders, Machines, Workflow Steps
- Inventory: Items, Stock Levels, Reorder Management
- Transport: Dispatch Orders, Packing, Shipping
- AI Tools: Smart Tasks, RAG Chat (for data), Recommendations, Voice
- Analytics: Reports, Dashboards (for viewing data)

**REMEMBER**: 
- You guide HOW to use the system
- RAG AI Chat handles WHAT data shows
- Separate functionality vs. data queries!
"""
            
            # Add relevant FAQ context if available
            if faq_context:
                context += "\n\nRelevant knowledge base information:\n"
                for i, faq in enumerate(faq_context[:3], 1):
                    context += f"\n{i}. **{faq['question']}**\n   {faq['answer'][:200]}...\n"
            
            # Add role-specific quick actions
            if quick_actions:
                context += f"\n\nCommon tasks for {role.upper()}:\n"
                context += chr(10).join([f'- {action}' for action in quick_actions[:5]])
            
            # Call OpenRouter API with enhanced parameters
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {self.openrouter_api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://vlite-furniture-erp.com',
                    'X-Title': 'Vlite Furniture ERP AI Assistant'
                },
                json={
                    'model': 'openai/gpt-4o-mini',  # Fast and cost-effective for system guidance
                    'messages': [
                        {'role': 'system', 'content': context},
                        {'role': 'user', 'content': message}
                    ],
                    'max_tokens': 600,  # Sufficient for detailed guidance
                    'temperature': 0.6,  # Balanced for accurate, helpful responses
                    'top_p': 0.9,
                    'frequency_penalty': 0.3,
                    'presence_penalty': 0.2
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                reply = data['choices'][0]['message']['content'].strip()
                
                # Format response with visual indicators if not already formatted
                formatted_reply = self._format_llm_response(reply, role)
                
                return {
                    'success': True,
                    'reply': formatted_reply,
                    'source': 'llm_enhanced',
                    'confidence': 0.85,
                    'suggestions': self._get_smart_suggestions(message, role)
                }
            else:
                print(f"LLM API error: Status {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            print("LLM request timeout")
            return None
        except requests.exceptions.RequestException as e:
            print(f"LLM request error: {e}")
            return None
        except Exception as e:
            print(f"LLM error: {e}")
            return None
    
    def _format_llm_response(self, reply: str, role: str) -> str:
        """Format LLM response for better readability"""
        # Add role-specific emoji/icon if not present
        role_icons = {
            'sales': '💼',
            'production': '🏭',
            'inventory': '📦',
            'transport': '🚚',
            'pm': '📊',
            'design': '🎨',
            'accounts': '💰',
            'poc': '👥'
        }
        
        icon = role_icons.get(role, '💡')
        
        # Ensure response starts with helpful indicator
        if not reply.startswith(('**', '#', icon)):
            reply = f"{icon} **Here's what I found:**\n\n{reply}"
        
        return reply
    
    def _handle_greeting(self, role: str) -> Dict:
        """Handle casual greetings with a friendly welcome"""
        role_icons = {
            'sales': '💼', 'production': '🏭', 'inventory': '📦',
            'transport': '🚚', 'pm': '📊', 'design': '🎨',
            'accounts': '💰', 'poc': '👥'
        }
        
        icon = role_icons.get(role, '👋')
        
        # Get role-specific welcome (use class method)
        welcome_data = RoleContextBuilder.get_welcome_message(role)
        
        reply = f"{icon} Namaste! I'm **THH Pilot **, your Vlite System Guide.\n\n"
        reply += f"{welcome_data}\n\n"
        
        reply += "💡 **I can help you with:**\n"
        
        # Show role-specific quick actions (use class method)
        quick_actions = RoleContextBuilder.get_quick_actions(role)
        if quick_actions:
            for action in quick_actions[:5]:
                reply += f"   • {action}\n"
            reply += "\n"
        
        reply += "📚 **Popular Topics:**\n"
        reply += "   • How to create quotations\n"
        reply += "   • Managing production orders\n"
        reply += "   • Inventory management\n"
        reply += "   • Using AI features\n"
        reply += "   • Troubleshooting & support\n\n"
        
        reply += "💬 **Just ask me anything!** For example:\n"
        reply += "   • \"How do I create a quotation?\"\n"
        reply += "   • \"Where can I check order status?\"\n"
        reply += "   • \"What are AI recommendations?\"\n"
        
        return {
            'success': True,
            'reply': reply.strip(),
            'source': 'greeting',
            'confidence': 1.0,
            'suggestions': quick_actions[:4] if quick_actions else []
        }
    
    def _get_smart_suggestions(self, message: str, role: str) -> List[str]:
        """Get contextually relevant suggestions"""
        quick_actions = self.role_builder.get_quick_actions(role)
        return quick_actions[:3]
    
    def _get_related_suggestions(self, faq: Dict, role: str) -> List[str]:
        """Get related topic suggestions based on FAQ"""
        suggestions = []
        category = faq['category']
        
        # Get other FAQs in same category
        related = self.knowledge_base.get_faqs_by_category(category, role=role)
        
        for related_faq in related[:3]:
            if related_faq['id'] != faq['id']:
                suggestions.append(related_faq['question'])
        
        # Add quick actions if not enough suggestions
        if len(suggestions) < 3:
            quick_actions = self.role_builder.get_quick_actions(role)
            suggestions.extend(quick_actions[:3 - len(suggestions)])
        
        return suggestions[:3]
    
    def _handle_no_match(self, message: str, role: str) -> Dict:
        """Handle queries with no FAQ match - guide users to explore system"""
        role_icons = {
            'sales': '💼', 'production': '🏭', 'inventory': '📦',
            'transport': '🚚', 'pm': '📊', 'design': '🎨',
            'accounts': '💰', 'poc': '👥'
        }
        
        icon = role_icons.get(role, '💡')
        
        # Check if this is a data query that should go to RAG Chat
        data_keywords = ['how many', 'count', 'total', 'show me', 'list', 'what is my', 
                        'current', 'pending', 'active', 'kitne', 'kitna', 'status of']
        is_data_query = any(keyword in message.lower() for keyword in data_keywords)
        
        if is_data_query:
            reply = f"{icon} **That sounds like a data query!**\n\n"
            reply += "I'm **THH Pilot ** - I specialize in helping you NAVIGATE the system and use features.\n\n"
            reply += "📊 **For data insights, use RAG AI Chat:**\n"
            reply += "   • Located in the AI Features menu\n"
            reply += "   • Ask questions like:\n"
            reply += "     - \"How many orders do I have?\"\n"
            reply += "     - \"Show pending quotations\"\n"
            reply += "     - \"What's my inventory status?\"\n\n"
            reply += "💡 **What I CAN help with:**\n"
            reply += "   • \"How do I create a quotation?\"\n"
            reply += "   • \"Where can I check order status?\"\n"
            reply += "   • \"How to use Smart Task Automation?\"\n"
            reply += "   • \"What features are available?\"\n\n"
            
            return {
                'success': True,
                'reply': reply.strip(),
                'source': 'redirect_to_rag',
                'confidence': 0.8,
                'suggestions': [
                    'Try RAG AI Chat for data queries',
                    'Ask me how to use a feature',
                    'Learn about AI Features'
                ],
                'redirect': 'rag_chat'
            }
        
        # Regular no-match handling for feature guidance
        reply = f"{icon} I'm **THH Pilot **, your Vlite System Guide.\n\n"
        reply += f"I couldn't find a specific help guide for \"{message[:50]}...\"\n\n"
        reply += "As a System Guide, I can show you **how to use** any feature or **where to find** any module. I don't have access to your live business data (like total orders or specific counts).\n\n"
        reply += "💡 **You can ask me things like:**\n"
        reply += "   • \"How to create a new quotation?\"\n"
        reply += "   • \"Where can I find production settings?\"\n"
        reply += "   • \"How to add new machinery?\"\n"
        reply += "   • \"How to use the inventory dashboard?\"\n\n"
        
        reply += "📚 **Explore These Help Topics:**\n"
        # Show available categories with visual appeal
        categories = self.knowledge_base.get_categories(role=role)
        if categories:
            category_icons = {
                'Quotations': '💰', 'Production': '🏭', 'Inventory': '📦',
                'Orders': '📝', 'Transport': '🚚', 'AI Features': '🤖',
                'Reports': '📊', 'Settings': '⚙️'
            }
            for cat in categories[:6]:
                cat_icon = category_icons.get(cat['category'], '•')
                reply += f"   {cat_icon} **{cat['category']}** - {cat['count']} helpful guides\n"
            reply += "\n"
        
        # Show role-specific navigation paths
        quick_actions = self.role_builder.get_quick_actions(role)
        if quick_actions:
            reply += f"🎯 **Quick Start for {role.upper()}:**\n"
            for action in quick_actions[:4]:
                reply += f"   ✓ {action}\n"
            reply += "\n"
        
        # Add system exploration tips
        reply += "🗺️ **System Navigation Tips:**\n"
        reply += "   • Use the sidebar to access main modules\n"
        reply += "   • Dashboard shows your key metrics\n"
        reply += "   • Search bar (🔍) helps find anything quickly\n"
        reply += "   • AI Features are in the side menu\n\n"
        
        # Better example questions based on role
        role_examples = {
            'sales': [
                '"How do I create a quotation?"',
                '"How to convert inquiry to quotation?"',
                '"What are AI lead recommendations?"'
            ],
            'production': [
                '"How to create production order?"',
                '"How to check machine status?"',
                '"What is Smart Task Automation?"'
            ],
            'inventory': [
                '"How to add inventory items?"',
                '"How to set reorder levels?"',
                '"What are inventory AI recommendations?"'
            ]
        }
        
        examples = role_examples.get(role, [
            '"How do I create a quotation?"',
            '"What is the RAG AI Chat?"',
            '"Show me AI features"'
        ])
        
        reply += "💬 **Try asking me:**\n"
        for example in examples:
            reply += f"   • {example}\n"
        
        return {
            'success': True,
            'reply': reply.strip(),
            'source': 'system_exploration_guide',
            'confidence': 0.5,
            'suggestions': quick_actions[:4] if quick_actions else [],
            'exploration_mode': True
        }

# Global instance
_enhanced_engine = None

def get_enhanced_engine(use_mock=True):
    """Get global enhanced engine instance"""
    global _enhanced_engine
    if _enhanced_engine is None:
        _enhanced_engine = EnhancedSupportEngine(use_mock=use_mock)
    return _enhanced_engine
