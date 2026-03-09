"""
Mock Data Loader Service
Loads and caches JSON mock data files
"""

import json
import os
from pathlib import Path

# Cache for loaded data
_cache = {}

def get_data_path():
    """Get the path to mock_data directory"""
    current_dir = Path(__file__).parent
    return current_dir.parent / 'mock_data'

def load_json_file(filename):
    """Load a JSON file with caching"""
    if filename in _cache:
        return _cache[filename]
    
    file_path = get_data_path() / filename
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            _cache[filename] = data
            return data
    except FileNotFoundError:
        print(f"Error: File not found - {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {filename}: {e}")
        return None

def get_customers():
    """Get all customers"""
    return load_json_file('customers.json') or []

def get_orders():
    """Get all orders"""
    return load_json_file('orders.json') or []

def get_product_preferences():
    """Get product preferences summary"""
    return load_json_file('product_preferences.json') or {}

def get_customer_by_id(customer_id):
    """Get a specific customer by ID"""
    customers = get_customers()
    for customer in customers:
        if customer['customer_id'] == customer_id:
            return customer
    return None

def get_orders_by_customer(customer_id):
    """Get all orders for a specific customer"""
    orders = get_orders()
    return [order for order in orders if order['customer_id'] == customer_id]

def get_orders_by_category(category):
    """Get all orders for a specific category"""
    orders = get_orders()
    return [order for order in orders if order['category'] == category]

def clear_cache():
    """Clear the data cache (useful for testing)"""
    global _cache
    _cache = {}
