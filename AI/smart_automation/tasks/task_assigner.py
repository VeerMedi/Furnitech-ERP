"""
Task Assigner Module
Manages task creation, assignment, and tracking for automation system
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import os
from pathlib import Path

class Task:
    """Represents an automation task"""
    
    def __init__(self, task_id: str, title: str, description: str, 
                 role: str, linked_entity: str, entity_type: str,
                 action_type: str, metadata: Dict = None):
        self.id = task_id
        self.title = title
        self.description = description
        self.role = role
        self.linked_entity = linked_entity
        self.entity_type = entity_type
        self.action_type = action_type
        self.metadata = metadata or {}
        self.status = 'pending'
        self.assigned_to = None  # Can be specific user later
        self.created_at = datetime.now().isoformat()
        self.completed_at = None
        self.completion_notes = None
    
    def to_dict(self) -> Dict:
        """Convert task to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'role': self.role,
            'assigned_to': self.assigned_to,
            'linked_entity': self.linked_entity,
            'entity_type': self.entity_type,
            'action_type': self.action_type,
            'metadata': self.metadata,
            'status': self.status,
            'created_at': self.created_at,
            'completed_at': self.completed_at,
            'completion_notes': self.completion_notes
        }
    
    @staticmethod
    def from_dict(data: Dict) -> 'Task':
        """Create task from dictionary"""
        task = Task(
            task_id=data['id'],
            title=data['title'],
            description=data['description'],
            role=data['role'],
            linked_entity=data['linked_entity'],
            entity_type=data['entity_type'],
            action_type=data['action_type'],
            metadata=data.get('metadata', {})
        )
        task.assigned_to = data.get('assigned_to')
        task.status = data.get('status', 'pending')
        task.created_at = data.get('created_at', task.created_at)
        task.completed_at = data.get('completed_at')
        task.completion_notes = data.get('completion_notes')
        return task

class TaskAssigner:
    """Manages task assignment and tracking"""
    
    def __init__(self, use_mock=True):
        self.use_mock = use_mock
        self.tasks_file = Path(__file__).parent.parent / 'mock_data' / 'tasks.json'
        self.tasks = self._load_tasks()
    
    def _load_tasks(self) -> Dict[str, Task]:
        """Load tasks from storage"""
        if self.use_mock and self.tasks_file.exists():
            try:
                with open(self.tasks_file, 'r') as f:
                    data = json.load(f)
                    return {
                        task_id: Task.from_dict(task_data)
                        for task_id, task_data in data.items()
                    }
            except Exception:
                return {}
        return {}
    
    def _save_tasks(self):
        """Save tasks to storage"""
        if self.use_mock:
            self.tasks_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.tasks_file, 'w') as f:
                json.dump(
                    {task_id: task.to_dict() for task_id, task in self.tasks.items()},
                    f,
                    indent=2
                )
    
    def create_task(self, title: str, description: str, role: str,
                   linked_entity: str, entity_type: str, action_type: str,
                   metadata: Dict = None, assigned_to: str = None) -> Task:
        """
        Create a new task
        
        Args:
            title: Task title
            description: Task description
            role: Role responsible for this task
            linked_entity: ID of linked entity (quotation, order, etc.)
            entity_type: Type of entity
            action_type: Action to be performed
            metadata: Additional task metadata
            assigned_to: Optional specific user assignment
        
        Returns:
            Created Task object
        """
        task_id = f"TASK-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(self.tasks)}"
        
        task = Task(
            task_id=task_id,
            title=title,
            description=description,
            role=role,
            linked_entity=linked_entity,
            entity_type=entity_type,
            action_type=action_type,
            metadata=metadata
        )
        
        if assigned_to:
            task.assigned_to = assigned_to
        
        self.tasks[task_id] = task
        self._save_tasks()
        
        return task
    
    def get_tasks_by_role(self, role: str, status: str = None) -> List[Task]:
        """Get all tasks for a specific role"""
        tasks = [
            task for task in self.tasks.values()
            if task.role == role
        ]
        
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """Get a specific task by ID"""
        return self.tasks.get(task_id)
    
    def complete_task(self, task_id: str, completion_notes: str = None) -> bool:
        """Mark a task as completed"""
        task = self.get_task(task_id)
        if not task:
            return False
        
        task.status = 'completed'
        task.completed_at = datetime.now().isoformat()
        task.completion_notes = completion_notes
        
        self._save_tasks()
        return True
    
    def get_pending_tasks(self, role: str = None) -> List[Task]:
        """Get all pending tasks, optionally filtered by role"""
        tasks = [t for t in self.tasks.values() if t.status == 'pending']
        
        if role:
            tasks = [t for t in tasks if t.role == role]
        
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)
    
    def get_task_stats(self, role: str = None) -> Dict:
        """Get task statistics"""
        tasks = self.tasks.values()
        if role:
            tasks = [t for t in tasks if t.role == role]
        
        tasks = list(tasks)
        
        return {
            'total': len(tasks),
            'pending': len([t for t in tasks if t.status == 'pending']),
            'completed': len([t for t in tasks if t.status == 'completed']),
            'by_role': self._count_by_role(tasks)
        }
    
    def _count_by_role(self, tasks: List[Task]) -> Dict[str, int]:
        """Count tasks by role"""
        counts = {}
        for task in tasks:
            counts[task.role] = counts.get(task.role, 0) + 1
        return counts

# Global instance
_task_assigner = None

def get_task_assigner(use_mock=True) -> TaskAssigner:
    """Get global task assigner instance"""
    global _task_assigner
    if _task_assigner is None:
        _task_assigner = TaskAssigner(use_mock=use_mock)
    return _task_assigner
