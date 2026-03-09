"""
Task Notifications Module
Handles notifications for task assignments and updates
"""

from typing import Dict, List, Optional
from datetime import datetime
import json
from pathlib import Path

class Notification:
    """Represents a notification"""
    
    def __init__(self, notification_id: str, role: str, title: str, 
                 message: str, task_id: str = None, priority: str = 'medium'):
        self.id = notification_id
        self.role = role
        self.title = title
        self.message = message
        self.task_id = task_id
        self.priority = priority  # low, medium, high
        self.read = False
        self.created_at = datetime.now().isoformat()
    
    def to_dict(self) -> Dict:
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'role': self.role,
            'title': self.title,
            'message': self.message,
            'task_id': self.task_id,
            'priority': self.priority,
            'read': self.read,
            'created_at': self.created_at
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'Notification':
        """Create notification from dictionary"""
        notif = Notification(
            notification_id=data['id'],
            role=data['role'],
            title=data['title'],
            message=data['message'],
            task_id=data.get('task_id'),
            priority=data.get('priority', 'medium')
        )
        notif.read = data.get('read', False)
        notif.created_at = data.get('created_at', notif.created_at)
        return notif

class TaskNotificationService:
    """Manages task notifications"""
    
    def __init__(self, use_mock=True):
        self.use_mock = use_mock
        self.notifications_file = Path(__file__).parent.parent / 'mock_data' / 'notifications.json'
        self.notifications = self._load_notifications()
    
    def _load_notifications(self) -> Dict[str, Notification]:
        """Load notifications from storage"""
        if self.use_mock and self.notifications_file.exists():
            try:
                with open(self.notifications_file, 'r') as f:
                    data = json.load(f)
                    return {
                        notif_id: Notification.from_dict(notif_data)
                        for notif_id, notif_data in data.items()
                    }
            except Exception:
                return {}
        return {}
    
    def _save_notifications(self):
        """Save notifications to storage"""
        if self.use_mock:
            self.notifications_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.notifications_file, 'w') as f:
                json.dump(
                    {notif_id: notif.to_dict() for notif_id, notif in self.notifications.items()},
                    f,
                    indent=2
                )
    
    def notify_role(self, role: str, title: str, message: str, 
                   task_id: str = None, priority: str = 'medium') -> Notification:
        """
        Send notification to a role
        
        Args:
            role: Target role
            title: Notification title
            message: Notification message
            task_id: Optional related task ID
            priority: Notification priority (low, medium, high)
        
        Returns:
            Created Notification object
        """
        notif_id = f"NOTIF-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(self.notifications)}"
        
        notification = Notification(
            notification_id=notif_id,
            role=role,
            title=title,
            message=message,
            task_id=task_id,
            priority=priority
        )
        
        self.notifications[notif_id] = notification
        self._save_notifications()
        
        return notification
    
    def notify_task_created(self, role: str, task) -> Notification:
        """Send notification when a task is created"""
        return self.notify_role(
            role=role,
            title=f"New Task: {task.title}",
            message=f"A new task has been assigned to {role}: {task.description}",
            task_id=task.id,
            priority='medium'
        )
    
    def notify_task_completed(self, role: str, task) -> Notification:
        """Send notification when a task is completed"""
        return self.notify_role(
            role=role,
            title=f"Task Completed: {task.title}",
            message=f"Task {task.id} has been marked as completed.",
            task_id=task.id,
            priority='low'
        )
    
    def notify_suggestion_available(self, role: str, suggestion: Dict) -> Notification:
        """Send notification when a new suggestion is available"""
        return self.notify_role(
            role=role,
            title="New Automation Suggestion",
            message=suggestion['message'],
            priority=suggestion.get('priority', 'medium')
        )
    
    def get_notifications_for_role(self, role: str, unread_only: bool = False) -> List[Notification]:
        """Get all notifications for a role"""
        notifs = [
            notif for notif in self.notifications.values()
            if notif.role == role
        ]
        
        if unread_only:
            notifs = [n for n in notifs if not n.read]
        
        return sorted(notifs, key=lambda n: n.created_at, reverse=True)
    
    def mark_as_read(self, notification_id: str) -> bool:
        """Mark a notification as read"""
        notif = self.notifications.get(notification_id)
        if not notif:
            return False
        
        notif.read = True
        self._save_notifications()
        return True
    
    def mark_all_as_read(self, role: str) -> int:
        """Mark all notifications for a role as read"""
        count = 0
        for notif in self.notifications.values():
            if notif.role == role and not notif.read:
                notif.read = True
                count += 1
        
        if count > 0:
            self._save_notifications()
        
        return count
    
    def get_unread_count(self, role: str) -> int:
        """Get count of unread notifications for a role"""
        return len([
            n for n in self.notifications.values()
            if n.role == role and not n.read
        ])

# Global instance
_notification_service = None

def get_notification_service(use_mock=True) -> TaskNotificationService:
    """Get global notification service instance"""
    global _notification_service
    if _notification_service is None:
        _notification_service = TaskNotificationService(use_mock=use_mock)
    return _notification_service

def notify_role(role: str, title: str, message: str, task_id: str = None, priority: str = 'medium'):
    """Convenience function to send notification"""
    return get_notification_service().notify_role(role, title, message, task_id, priority)
