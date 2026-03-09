"""
Customer Lifetime Value (CLV) Calculator
Formula: CLV = average_order_value × purchase_frequency × retention_probability
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from services.database_adapter import get_adapter
from datetime import datetime
from collections import defaultdict

def get_sample_clv_data():
    """Return sample CLV data for visualization when database is empty"""
    import random
    regions = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune']
    names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Vikram Singh', 
             'Anita Desai', 'Rohit Mehta', 'Kavita Joshi', 'Suresh Gupta', 'Meera Nair',
             'Arjun Verma', 'Pooja Iyer', 'Karan Malhotra', 'Divya Kapoor', 'Nikhil Shah']
    
    sample_data = []
    for i, name in enumerate(names):
        base_clv = 150000 - (i * 8000)
        sample_data.append({
            'customer_id': f'sample_{i}',
            'name': name,
            'email': f"{name.lower().replace(' ', '.')}@example.com",
            'region': random.choice(regions),
            'total_spent': int(base_clv * 0.6),
            'order_count': 5 + (15 - i),
            'avg_order_value': round(base_clv * 0.6 / (5 + (15 - i)), 2),
            'purchase_frequency': round(0.5 + (i * 0.05), 3),
            'retention_probability': round(0.85 - (i * 0.02), 2),
            'clv': round(base_clv, 2)
        })
    return sample_data

def calculate_clv():
    """
    Calculate CLV for all customers and return sorted list
    Returns top 20 customers by CLV
    """
    db = get_adapter()
    customers = db.get_customers()
    orders = db.get_orders()
    
    # If no customers or orders, return sample data
    if not customers or not orders:
        print("⚠️ No customers/orders found, returning sample CLV data")
        return get_sample_clv_data()
    
    # Group orders by customer
    customer_orders = defaultdict(list)
    for order in orders:
        customer_orders[order['customer_id']].append(order)
    
    clv_results = []
    
    for customer in customers:
        customer_id = customer['customer_id']
        customer_order_list = customer_orders.get(customer_id, [])
        
        if not customer_order_list:
            continue
        
        # Calculate metrics
        total_spent = sum(order['amount'] for order in customer_order_list)
        order_count = len(customer_order_list)
        avg_order_value = total_spent / order_count if order_count > 0 else 0
        
        # Purchase frequency (orders per month)
        if order_count > 1:
            dates = sorted([datetime.fromisoformat(order['date']) for order in customer_order_list])
            months_active = max(((dates[-1] - dates[0]).days / 30), 1)
            purchase_frequency = order_count / months_active
        else:
            purchase_frequency = 0.5  # Default for single purchase
        
        # Retention probability (simplified)
        # If customer made repeat purchases, higher retention
        retention_probability = min(0.9, 0.3 + (order_count * 0.15))
        
        # Calculate CLV
        clv = avg_order_value * purchase_frequency * retention_probability * 12  # Annual projection
        
        clv_results.append({
            'customer_id': customer_id,
            'name': customer['name'],
            'email': customer['email'],
            'region': customer['region'],
            'total_spent': total_spent,
            'order_count': order_count,
            'avg_order_value': round(avg_order_value, 2),
            'purchase_frequency': round(purchase_frequency, 3),
            'retention_probability': round(retention_probability, 2),
            'clv': round(clv, 2)
        })
    
    # Sort by CLV descending
    clv_results.sort(key=lambda x: x['clv'], reverse=True)
    
    return clv_results[:20]  # Top 20

def get_average_clv():
    """Get average CLV across all customers"""
    clv_results = calculate_clv()
    if not clv_results:
        return 0
    return sum(c['clv'] for c in clv_results) / len(clv_results)

if __name__ == '__main__':
    # Test the calculator
    results = calculate_clv()
    print(f"Top 10 Customers by CLV:")
    for i, customer in enumerate(results[:10], 1):
        print(f"{i}. {customer['name']} - CLV: ₹{customer['clv']:,.2f}")
