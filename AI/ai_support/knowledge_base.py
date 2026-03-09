"""
Knowledge Base Module
Loads and searches FAQ and consulting tips
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional

class KnowledgeBase:
    """Manages FAQ and consulting knowledge"""
    
    def __init__(self, use_mock=True):
        self.use_mock = use_mock
        self.base_dir = Path(__file__).parent
        self.mock_data_dir = self.base_dir / 'mock_data'
        self.faqs = []
        self.consulting_tips = []
        self._load_knowledge()
    
    def _load_knowledge(self):
        """Load FAQs and consulting tips"""
        if self.use_mock:
            try:
                # Load FAQs
                faq_file = self.mock_data_dir / 'faq.json'
                if faq_file.exists():
                    with open(faq_file, 'r', encoding='utf-8') as f:
                        self.faqs = json.load(f)
                
                # Load consulting tips
                tips_file = self.mock_data_dir / 'consulting_tips.json'
                if tips_file.exists():
                    with open(tips_file, 'r', encoding='utf-8') as f:
                        self.consulting_tips = json.load(f)
                
                # Load System Manual (Navigation Guide)
                manual_file = self.mock_data_dir / 'system_manual.json'
                if manual_file.exists():
                    with open(manual_file, 'r', encoding='utf-8') as f:
                        manual_data = json.load(f)
                        # Add manual entries to FAQs for unified search
                        self.faqs.extend(manual_data)
                        
            except Exception as e:
                print(f"Error loading knowledge base: {e}")
                self.faqs = []
                self.consulting_tips = []
    
    def search_faq(self, query: str, role: str = None, limit: int = 3) -> List[Dict]:
        """
        Search FAQs by keyword matching with improved relevance scoring
        
        Args:
            query: User question
            role: User role for filtering
            limit: Max results to return
        
        Returns:
            List of matching FAQs with relevance scores
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        results = []
        
        for faq in self.faqs:
            # Check if role matches (if specified)
            if role and 'roles' in faq:
                if role not in faq['roles'] and 'all' not in faq['roles']:
                    continue
            
            # Calculate relevance score
            score = 0
            
            # Check for exact phrase match (highest priority)
            question_lower = faq['question'].lower()
            if query_lower in question_lower or question_lower in query_lower:
                score += 10
            
            # Check keywords (high priority)
            keywords = faq.get('keywords', [])
            for keyword in keywords:
                keyword_lower = keyword.lower()
                # Exact keyword match
                if keyword_lower in query_lower:
                    score += 5
                # Fuzzy match - check if most words match
                keyword_words = set(keyword_lower.split())
                if len(keyword_words) > 1:
                    common_words = query_words & keyword_words
                    if len(common_words) >= len(keyword_words) * 0.7:  # 70% word overlap
                        score += 3
            
            # Check question text word overlap
            question_words = set(question_lower.split())
            common_words = query_words & question_words
            if common_words:
                # Score based on proportion of matching words
                overlap_ratio = len(common_words) / max(len(query_words), len(question_words))
                score += int(overlap_ratio * 4)
            
            # Check category match
            if 'category' in faq and faq['category'].lower() in query_lower:
                score += 2
            
            # Check answer text for additional context
            answer_lower = faq.get('answer', '').lower()
            answer_words = set(answer_lower.split())
            answer_common = query_words & answer_words
            if len(answer_common) >= 2:  # At least 2 matching words in answer
                score += 1
            
            if score > 0:
                results.append({
                    **faq,
                    'relevance_score': score
                })
        
        # Sort by relevance and return top results
        results.sort(key=lambda x: x['relevance_score'], reverse=True)
        return results[:limit]
    
    def get_consulting_tips(self, role: str = None, priority: str = None) -> List[Dict]:
        """
        Get consulting tips filtered by role and priority
        
        Args:
            role: User role
            priority: Filter by priority (high/medium/low)
        
        Returns:
            List of relevant consulting tips
        """
        tips = self.consulting_tips.copy()
        
        # Filter by role
        if role:
            tips = [
                tip for tip in tips
                if 'roles' in tip and role in tip['roles']
            ]
        
        # Filter by priority
        if priority:
            tips = [
                tip for tip in tips
                if tip.get('priority') == priority
            ]
        
        return tips
    
    def get_faq_by_id(self, faq_id: str) -> Optional[Dict]:
        """Get specific FAQ by ID"""
        for faq in self.faqs:
            if faq.get('id') == faq_id:
                return faq
        return None
    
    def get_faq_categories(self) -> List[str]:
        """Get all FAQ categories"""
        categories = set()
        for faq in self.faqs:
            if 'category' in faq:
                categories.add(faq['category'])
        return sorted(list(categories))
    
    def get_faqs_by_category(self, category: str, role: str = None) -> List[Dict]:
        """Get all FAQs in a category"""
        faqs = [
            faq for faq in self.faqs
            if faq.get('category') == category
        ]
        
        # Filter by role
        if role:
            faqs = [
                faq for faq in faqs
                if 'roles' in faq and (role in faq['roles'] or 'all' in faq['roles'])
            ]
        
        return faqs
    
    def get_categories(self, role: str = None) -> List[Dict]:
        """Get all categories with FAQ counts, optionally filtered by role"""
        category_counts = {}
        
        for faq in self.faqs:
            category = faq.get('category', 'General')
            
            # Filter by role if specified
            if role:
                if 'roles' not in faq or (role not in faq['roles'] and 'all' not in faq['roles']):
                    continue
            
            if category not in category_counts:
                category_counts[category] = 0
            category_counts[category] += 1
        
        # Convert to list of dicts with category and count
        categories = [
            {'category': cat, 'count': count}
            for cat, count in category_counts.items()
        ]
        
        # Sort by count descending
        categories.sort(key=lambda x: x['count'], reverse=True)
        
        return categories

# Global instance
_knowledge_base = None

def get_knowledge_base(use_mock=True):
    """Get global knowledge base instance"""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = KnowledgeBase(use_mock=use_mock)
    return _knowledge_base
