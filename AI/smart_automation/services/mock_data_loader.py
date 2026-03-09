import json, os
from typing import Dict, List

class MockDataLoader:
    def __init__(self):
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.mock_data_dir = os.path.join(self.base_dir, 'mock_data')
        self.cache = {}
    
    def _load_json_file(self, filename: str) -> List[Dict]:
        filepath = os.path.join(self.mock_data_dir, filename)
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except:
            return []
    
    def load_employees(self, use_cache=True):
        if use_cache and 'employees' in self.cache:
            return self.cache['employees']
        data = self._load_json_file('employees.json')
        self.cache['employees'] = data
        return data
    
    def load_inquiries(self, use_cache=True):
        if use_cache and 'inquiries' in self.cache:
            return self.cache['inquiries']
        data = self._load_json_file('inquiries.json')
        self.cache['inquiries'] = data
        return data
    
    def load_inventory(self, use_cache=True):
        if use_cache and 'inventory' in self.cache:
            return self.cache['inventory']
        data = self._load_json_file('inventory.json')
        self.cache['inventory'] = data
        return data
    
    def load_production(self, use_cache=True):
        if use_cache and 'production' in self.cache:
            return self.cache['production']
        data = self._load_json_file('production.json')
        self.cache['production'] = data
        return data
    
    def load_machines(self, use_cache=True):
        if use_cache and 'machines' in self.cache:
            return self.cache['machines']
        data = self._load_json_file('machines.json')
        self.cache['machines'] = data
        return data
    
    def load_quotations(self, use_cache=True):
        if use_cache and 'quotations' in self.cache:
            return self.cache['quotations']
        data = self._load_json_file('quotations.json')
        self.cache['quotations'] = data
        return data
    
    def get_employee_by_id(self, employee_id: str):
        employees = self.load_employees()
        for emp in employees:
            if emp.get('id') == employee_id:
                return emp
        return None
    
    def get_inquiry_by_id(self, inquiry_id: str):
        inquiries = self.load_inquiries()
        for inq in inquiries:
            if inq.get('id') == inquiry_id:
                return inq
        return None
    
    def clear_cache(self):
        self.cache = {}
    
    def reload_all(self):
        self.clear_cache()
        self.load_employees()
        self.load_inquiries()
        self.load_inventory()
        self.load_production()
        self.load_machines()
        return True
