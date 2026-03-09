import os
from typing import Dict, List, Any, Optional
from . import mock_data_loader

USE_MOCK_DATA = os.environ.get('USE_MOCK_DATA', 'true').lower() == 'true'

class DatabaseAdapter:
    def __init__(self):
        self.use_mock = USE_MOCK_DATA
        if self.use_mock:
            self.mock_loader = mock_data_loader.MockDataLoader()
    
    def get_employees(self, filters=None):
        if self.use_mock:
            employees = self.mock_loader.load_employees()
            if filters:
                if 'availability' in filters:
                    employees = [e for e in employees if e.get('capacity', {}).get('availability') == filters['availability']]
            return employees
        return []
    
    def get_inquiries(self, filters=None):
        if self.use_mock:
            inquiries = self.mock_loader.load_inquiries()
            if filters:
                if 'status' in filters:
                    inquiries = [i for i in inquiries if i.get('status') == filters['status']]
            return inquiries
        return []
    
    def get_inventory(self, filters=None):
        if self.use_mock:
            inventory = self.mock_loader.load_inventory()
            if filters:
                if 'status' in filters:
                    inventory = [i for i in inventory if i.get('status') == filters['status']]
            return inventory
        return []
    
    def get_production(self, filters=None):
        if self.use_mock:
            production = self.mock_loader.load_production()
            if filters:
                if 'status' in filters:
                    production = [p for p in production if p.get('status') == filters['status']]
            return production
        return []
    
    def get_machines(self):
        """Get all machines"""
        if self.use_mock:
            machines_data = self.mock_loader.load_machines()
            # Handle both dict and list formats
            if isinstance(machines_data, dict):
                return machines_data.get('machines', [])
            return machines_data
        else:
            return []
    
    def get_quotations(self):
        """Get all quotations"""
        if self.use_mock:
            return self.mock_loader.load_quotations()
        else:
            return []
    
    def get_production_orders(self):
        """Get all production orders"""
        if self.use_mock:
            production_data = self.mock_loader.load_production()
            # Handle both dict and list formats
            if isinstance(production_data, dict):
                return production_data.get('production_orders', [])
            return production_data
        else:
            return []
    
    def get_employee_by_id(self, employee_id: str):
        if self.use_mock:
            return self.mock_loader.get_employee_by_id(employee_id)
        return None
    
    def get_inquiry_by_id(self, inquiry_id: str):
        if self.use_mock:
            return self.mock_loader.get_inquiry_by_id(inquiry_id)
        return None
    
    def reset_mock_data(self):
        if self.use_mock:
            return self.mock_loader.reload_all()
        return False

def get_db_adapter():
    return DatabaseAdapter()

def get_adapter():
    """Alias for get_db_adapter"""
    return get_db_adapter()
