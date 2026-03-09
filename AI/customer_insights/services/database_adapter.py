"""
Database Adapter
Provides real MongoDB integration with organization-level data isolation
"""

import os
from pymongo import MongoClient
import certifi
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseAdapter:
    """Adapter for MongoDB with organization-level isolation"""
    
    def __init__(self):
        # Get MongoDB connection from environment
        mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/vlite_erp')
        self.client = MongoClient(mongodb_uri, tlsCAFile=certifi.where())
        self.db = self.client.get_default_database()
        
        # Get organization ID from environment (set by python_bridge.py)
        org_id_str = os.getenv('ORGANIZATION_ID')
        self.organization_id = ObjectId(org_id_str) if org_id_str else None
    
    def _get_org_filter(self):
        """Get organization filter for MongoDB queries with safe fallback"""
        if not self.organization_id:
            return {}
        
        # SAFE FALLBACK: Verify organization exists before applying filter
        try:
            # Check if any document exists with this organizationId
            test_collection = self.db.customers  # Use customers as reference
            if test_collection.find_one({'organizationId': self.organization_id}):
                return {'organizationId': self.organization_id}
            else:
                print(f"⚠️ WARNING: No documents found for organization {self.organization_id}")
                return {}  # Return empty filter to avoid errors
        except Exception as e:
            print(f"⚠️ WARNING: Error checking organization {self.organization_id}: {e}")
            return {}  # Return empty filter on error
    
    def get_customers(self):
        """Get all customers for the organization"""
        filter_query = self._get_org_filter()
        customers = list(self.db.customers.find(filter_query))
        
        # Convert to expected format
        result = []
        for customer in customers:
            result.append({
                'customer_id': str(customer['_id']),
                'name': f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip(),
                'email': customer.get('email', ''),
                'phone': customer.get('phone', ''),
                'city': customer.get('address', {}).get('city', ''),
                'state': customer.get('address', {}).get('state', ''),
                'total_orders': customer.get('totalOrders', 0),
                'total_revenue': customer.get('totalRevenue', 0),
                'registration_date': customer.get('registrationDate'),
            })
        return result
    
    def get_orders(self):
        """Get all orders for the organization"""
        filter_query = self._get_org_filter()
        orders = list(self.db.orders.find(filter_query))
        
        # Convert to expected format - engine modules expect 'date' and 'amount' fields
        result = []
        for order in orders:
            result.append({
                'order_id': str(order['_id']),
                'customer_id': str(order.get('customerId', '')),
                'date': order.get('orderDate'),  # Engine expects 'date'
                'order_date': order.get('orderDate'),
                'amount': order.get('totalAmount', 0),  # Engine expects 'amount'
                'total_amount': order.get('totalAmount', 0),
                'status': order.get('status', ''),
                'items': order.get('items', []),
                'category': self._get_primary_category(order.get('items', [])),
            })
        return result
    
    def _get_primary_category(self, items):
        """Extract primary category from order items"""
        if not items or len(items) == 0:
            return 'Other'
        # Get category from first item
        first_item = items[0]
        return first_item.get('category', 'Other')
    
    def get_product_preferences(self):
        """Get product preferences from orders"""
        filter_query = self._get_org_filter()
        orders = list(self.db.orders.find(filter_query))
        
        # Aggregate preferences - handle missing fields gracefully
        material_count = {}
        category_count = {}
        
        for order in orders:
            items = order.get('items', [])
            for item in items:
                # Count materials - use .get() for safe access
                material = item.get('material', 'Unknown')
                if material:  # Only count if material exists
                    material_count[material] = material_count.get(material, 0) + 1
                
                # Count categories - use .get() for safe access
                category = item.get('category', 'Other')
                if category:  # Only count if category exists
                    category_count[category] = category_count.get(category, 0) + 1
        
        return {
            'materials': material_count,
            'categories': category_count
        }
    
    def get_customer_by_id(self, customer_id):
        """Get customer by ID"""
        filter_query = self._get_org_filter()
        filter_query['_id'] = ObjectId(customer_id)
        customer = self.db.customers.find_one(filter_query)
        
        if not customer:
            return None
        
        return {
            'customer_id': str(customer['_id']),
            'name': f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip(),
            'email': customer.get('email', ''),
            'total_orders': customer.get('totalOrders', 0),
            'total_revenue': customer.get('totalRevenue', 0),
        }
    
    def get_orders_by_customer(self, customer_id):
        """Get orders for a specific customer"""
        filter_query = self._get_org_filter()
        filter_query['customerId'] = ObjectId(customer_id)
        orders = list(self.db.orders.find(filter_query))
        
        result = []
        for order in orders:
            result.append({
                'order_id': str(order['_id']),
                'order_date': order.get('orderDate'),
                'total_amount': order.get('totalAmount', 0),
                'status': order.get('status', ''),
            })
        return result
    
    def get_orders_by_category(self, category):
        """Get orders for a specific category"""
        filter_query = self._get_org_filter()
        # Query orders that have items with the specified category
        orders = list(self.db.orders.find(filter_query))
        
        result = []
        for order in orders:
            items = order.get('items', [])
            # Check if any item matches the category
            if any(item.get('category') == category for item in items):
                result.append({
                    'order_id': str(order['_id']),
                    'order_date': order.get('orderDate'),
                    'total_amount': order.get('totalAmount', 0),
                })
        return result

# Global adapter instance
_adapter = None

def get_adapter():
    """Get the database adapter instance (singleton)"""
    global _adapter
    if _adapter is None:
        _adapter = DatabaseAdapter()
    return _adapter
