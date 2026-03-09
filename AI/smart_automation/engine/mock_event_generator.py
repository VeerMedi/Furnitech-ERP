"""
Mock Event Generator
Generate test events for automation testing
"""

import json
from datetime import datetime
from typing import Dict, Any
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services import mock_data_loader

class MockEventGenerator:
    def __init__(self):
        """Initialize mock event generator"""
        self.loader = mock_data_loader.MockDataLoader()
    
    def generate_quotation_approved_event(self, quotation_id=None):
        """Generate quotation.approved event"""
        if not quotation_id:
            quotation_id = f"QUOT2025{datetime.now().strftime('%H%M')}"
        
        return {
            'type': 'quotation.approved',
            'data': {
                'quotation_id': quotation_id,
                'customer_name': 'Test Customer',
                'total_value': 150000,
                'approved_by': 'Manager',
                'approved_at': datetime.now().isoformat()
            }
        }
    
    def generate_low_stock_event(self):
        """Generate inventory.low_stock event"""
        inventory = self.loader.load_inventory()
        low_stock_items = [item for item in inventory if item.get('status') in ['low_stock', 'critical_low']]
        material = low_stock_items[0] if low_stock_items else inventory[0] if inventory else {}
        
        return {
            'type': 'inventory.low_stock',
            'data': {
                'material': material,
                'current_stock': material.get('current_stock', 0),
                'reorder_level': material.get('reorder_level', 0),
                'detected_at': datetime.now().isoformat()
            }
        }
    
    def generate_new_inquiry_event(self):
        """Generate inquiry.created event"""
        inquiries = self.loader.load_inquiries()
        new_inquiries = [inq for inq in inquiries if inq.get('status') == 'new']
        inquiry = new_inquiries[0] if new_inquiries else inquiries[0] if inquiries else {}
        
        return {
            'type': 'inquiry.created',
            'data': {
                'inquiry_id': inquiry.get('id'),
                'inquiry': inquiry,
                'created_at': datetime.now().isoformat()
            }
        }
    
    def generate_production_completed_event(self):
        """Generate production.completed event"""
        production = self.loader.load_production()
        completed = [prod for prod in production if prod.get('status') == 'completed']
        prod_item = completed[0] if completed else production[0] if production else {}
        
        return {
            'type': 'production.completed',
            'data': {
                'production_id': prod_item.get('id'),
                'quotation_id': prod_item.get('quotation_id'),
                'customer_name': prod_item.get('customer_name'),
                'completed_at': datetime.now().isoformat()
            }
        }
    
    def generate_machine_overuse_event(self):
        """Generate machine.usage_threshold event"""
        machines = self.loader.load_machines()
        overused = [m for m in machines if m.get('hours_used', 0) >= m.get('maintenance_threshold', 9999)]
        machine = overused[0] if overused else machines[0] if machines else {}
        
        return {
            'type': 'machine.usage_threshold',
            'data': {
                'machine': machine,
                'hours_used': machine.get('hours_used', 0),
                'threshold': machine.get('maintenance_threshold', 0),
                'detected_at': datetime.now().isoformat()
            }
        }
    
    def generate_all_test_events(self):
        """Generate all test events"""
        return {
            'quotation_approved': self.generate_quotation_approved_event(),
            'low_stock': self.generate_low_stock_event(),
            'new_inquiry': self.generate_new_inquiry_event(),
            'production_completed': self.generate_production_completed_event(),
            'machine_overuse': self.generate_machine_overuse_event()
        }
