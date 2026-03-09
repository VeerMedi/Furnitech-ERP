"""
Event Bus Module
Event detection and routing system
"""

from datetime import datetime
from typing import Callable, Dict, List
from . import automation_config

class EventBus:
    def __init__(self):
        """Initialize event bus"""
        self.listeners = {}
    
    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe to an event type"""
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(handler)
    
    def publish(self, event_type: str, event_data: Dict):
        """Publish an event"""
        if event_type not in self.listeners:
            return []
        
        results = []
        for handler in self.listeners[event_type]:
            try:
                result = handler(event_type, event_data)
                results.append(result)
            except Exception as e:
                results.append({'error': str(e)})
        
        return results
    
    def get_event_id(self):
        """Generate unique event ID"""
        return f"EVT_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"

# Global event bus instance
_event_bus = EventBus()

def get_event_bus():
    """Get global event bus instance"""
    return _event_bus

def subscribe(event_type: str, handler: Callable):
    """Subscribe to an event"""
    _event_bus.subscribe(event_type, handler)

def publish(event_type: str, event_data: Dict):
    """Publish an event"""
    return _event_bus.publish(event_type, event_data)
