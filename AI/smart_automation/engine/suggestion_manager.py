"""
Suggestion Manager Module
Manages automation suggestions lifecycle (create, store, confirm, dismiss)
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
from pathlib import Path

class SuggestionManager:
    """Manages automation suggestions"""
    
    def __init__(self, use_mock=True):
        self.use_mock = use_mock
        self.suggestions_file = Path(__file__).parent.parent / 'mock_data' / 'suggestions.json'
        self.suggestions = self._load_suggestions()
    
    def _load_suggestions(self) -> Dict[str, Dict]:
        """Load suggestions from storage"""
        if self.use_mock and self.suggestions_file.exists():
            try:
                with open(self.suggestions_file, 'r') as f:
                    data = json.load(f)
                    return {s['id']: s for s in data.get('suggestions', [])}
            except Exception:
                return {}
        return {}
    
    def _save_suggestions(self):
        """Save suggestions to storage"""
        if self.use_mock:
            self.suggestions_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.suggestions_file, 'w') as f:
                json.dump(
                    {'suggestions': list(self.suggestions.values())},
                    f,
                    indent=2
                )
    
    def create_suggestion(self, suggestion: Dict) -> Dict:
        """
        Create and store a new suggestion
        
        Args:
            suggestion: Suggestion dictionary from AI generator
        
        Returns:
            Created suggestion with ID
        """
        suggestion_id = suggestion.get('id')
        if not suggestion_id:
            suggestion_id = f"SUG-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            suggestion['id'] = suggestion_id
        
        suggestion['status'] = 'pending'
        suggestion['created_at'] = suggestion.get('created_at', datetime.now().isoformat())
        
        self.suggestions[suggestion_id] = suggestion
        self._save_suggestions()
        
        return suggestion
    
    def get_suggestion(self, suggestion_id: str) -> Optional[Dict]:
        """Get a specific suggestion by ID"""
        return self.suggestions.get(suggestion_id)
    
    def get_pending_suggestions(self, role: str = None) -> List[Dict]:
        """Get all pending suggestions, optionally filtered by role"""
        suggestions = [
            s for s in self.suggestions.values()
            if s.get('status') == 'pending'
        ]
        
        if role:
            suggestions = [s for s in suggestions if s.get('role') == role]
        
        # Sort by priority and created_at
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        suggestions.sort(
            key=lambda s: (
                priority_order.get(s.get('priority', 'medium'), 1),
                s.get('created_at', '')
            ),
            reverse=False
        )
        
        return suggestions
    
    def confirm_suggestion(self, suggestion_id: str) -> bool:
        """Mark suggestion as confirmed (will be executed)"""
        suggestion = self.get_suggestion(suggestion_id)
        if not suggestion:
            return False
        
        suggestion['status'] = 'confirmed'
        suggestion['confirmed_at'] = datetime.now().isoformat()
        
        self._save_suggestions()
        return True
    
    def dismiss_suggestion(self, suggestion_id: str) -> bool:
        """Mark suggestion as dismissed (rejected by user)"""
        suggestion = self.get_suggestion(suggestion_id)
        if not suggestion:
            return False
        
        suggestion['status'] = 'dismissed'
        suggestion['dismissed_at'] = datetime.now().isoformat()
        
        self._save_suggestions()
        return True
    
    def get_suggestion_stats(self, role: str = None) -> Dict:
        """Get suggestion statistics"""
        suggestions = self.suggestions.values()
        if role:
            suggestions = [s for s in suggestions if s.get('role') == role]
        
        suggestions = list(suggestions)
        
        return {
            'total': len(suggestions),
            'pending': len([s for s in suggestions if s.get('status') == 'pending']),
            'confirmed': len([s for s in suggestions if s.get('status') == 'confirmed']),
            'dismissed': len([s for s in suggestions if s.get('status') == 'dismissed']),
            'by_priority': {
                'high': len([s for s in suggestions if s.get('priority') == 'high']),
                'medium': len([s for s in suggestions if s.get('priority') == 'medium']),
                'low': len([s for s in suggestions if s.get('priority') == 'low'])
            }
        }

# Global instance
_suggestion_manager = None

def get_suggestion_manager(use_mock=True) -> SuggestionManager:
    """Get global suggestion manager instance"""
    global _suggestion_manager
    if _suggestion_manager is None:
        _suggestion_manager = SuggestionManager(use_mock=use_mock)
    return _suggestion_manager
