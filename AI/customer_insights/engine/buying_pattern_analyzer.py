"""
Buying Pattern Analyzer
Analyzes customer purchase patterns, frequency, and trends
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from services.database_adapter import get_adapter
from datetime import datetime
from collections import defaultdict, Counter

def analyze_category_popularity():
    """Calculate purchase count by category"""
    db = get_adapter()
    orders = db.get_orders()
    
    category_counts = Counter(order['category'] for order in orders)
    
    return [
        {'category': category, 'count': count}
        for category, count in category_counts.most_common()
    ]

def analyze_purchase_frequency():
    """Analyze how often customers make purchases with meaningful metrics"""
    db = get_adapter()
    customers = db.get_customers()
    orders = db.get_orders()
    
    customer_orders = defaultdict(list)
    for order in orders:
        customer_orders[order['customer_id']].append(order)
    
    # Sort orders by date for each customer
    for customer_id in customer_orders:
        customer_orders[customer_id].sort(key=lambda x: 
            datetime.fromisoformat(x['date']) if isinstance(x['date'], str) else x['date']
        )
    
    now = datetime.now()
    frequency_analysis = {
        'Active Buyers': 0,          # Purchased within last 90 days
        'At Risk': 0,                # Last purchase 90-180 days ago
        'Dormant': 0,                # Last purchase 180+ days ago
        'One-Time Buyers': 0         # Only one purchase ever
    }
    
    avg_days_between = []
    
    for customer in customers:
        customer_id = customer['customer_id']
        orders_list = customer_orders.get(customer_id, [])
        
        if len(orders_list) == 0:
            continue
        elif len(orders_list) == 1:
            frequency_analysis['One-Time Buyers'] += 1
        else:
            # Calculate average days between purchases
            dates = [datetime.fromisoformat(o['date']) if isinstance(o['date'], str) else o['date'] 
                    for o in orders_list]
            days_between = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_days_between.extend(days_between)
            
            # Check last purchase date
            last_order_date = dates[-1]
            days_since_last = (now - last_order_date).days
            
            if days_since_last <= 90:
                frequency_analysis['Active Buyers'] += 1
            elif days_since_last <= 180:
                frequency_analysis['At Risk'] += 1
            else:
                frequency_analysis['Dormant'] += 1
    
    # Add average purchase cycle metric
    avg_cycle_days = sum(avg_days_between) / len(avg_days_between) if avg_days_between else 0
    
    return {
        'distribution': frequency_analysis,
        'avg_purchase_cycle_days': round(avg_cycle_days, 1),
        'total_repeat_customers': len(avg_days_between)
    }

def calculate_repeat_customer_rate():
    """Calculate percentage of customers who made repeat purchases"""
    db = get_adapter()
    customers = db.get_customers()
    orders = db.get_orders()
    
    customer_orders = defaultdict(list)
    for order in orders:
        customer_orders[order['customer_id']].append(order)
    
    total_customers = len(customers)
    repeat_customers = sum(1 for c in customers if len(customer_orders.get(c['customer_id'], [])) > 1)
    
    return round(repeat_customers / total_customers, 2) if total_customers > 0 else 0

def analyze_monthly_trends():
    """Analyze order trends by month"""
    db = get_adapter()
    orders = db.get_orders()
    
    monthly_counts = defaultdict(int)
    monthly_revenue = defaultdict(float)
    
    for order in orders:
        # Handle both datetime objects and ISO strings
        date_val = order['date']
        if isinstance(date_val, str):
            date = datetime.fromisoformat(date_val)
        else:
            date = date_val  # Already a datetime object
        month_key = date.strftime('%Y-%m')
        monthly_counts[month_key] += 1
        monthly_revenue[month_key] += order['amount']
    
    results = []
    for month in sorted(monthly_counts.keys()):
        results.append({
            'month': month,
            'orders': monthly_counts[month],
            'revenue': monthly_revenue[month]
        })
    
    return results

def analyze_seasonal_demand():
    """Detect seasonal patterns by category"""
    db = get_adapter()
    orders = db.get_orders()
    
    quarter_category = defaultdict(lambda: defaultdict(int))
    
    for order in orders:
        # Handle both datetime objects and ISO strings
        date_val = order['date']
        if isinstance(date_val, str):
            date = datetime.fromisoformat(date_val)
        else:
            date = date_val  # Already a datetime object
        quarter = f"Q{(date.month - 1) // 3 + 1}"
        quarter_category[quarter][order['category']] += 1
   
    return dict(quarter_category)

def get_sample_buying_patterns():
    """Return sample data for visualization when database is empty"""
    from datetime import datetime, timedelta
    
    # Generate last 6 months
    today = datetime.now()
    months = []
    for i in range(6, 0, -1):
        month_date = today - timedelta(days=30*i)
        months.append({
            'month': month_date.strftime('%Y-%m'),
            'orders': 12 + (i * 3),  # Increasing trend
            'revenue': (12 + (i * 3)) * 3500
        })
    
    return {
        'category_popularity': [
            {'category': 'Chairs', 'count': 45},
            {'category': 'Tables', 'count': 32},
            {'category': 'Sofas', 'count': 28},
            {'category': 'Beds', 'count': 22},
            {'category': 'Cabinets', 'count': 18},
            {'category': 'Wardrobes', 'count': 15}
        ],
        'purchase_frequency': {
            'distribution': {
                'Active Buyers': 45,
                'At Risk': 18,
                'Dormant': 12,
                'One-Time Buyers': 25
            },
            'avg_purchase_cycle_days': 45.5,
            'total_repeat_customers': 75
        },
        'repeat_customer_rate': 0.75,
        'monthly_trends': months,
        'seasonal_demand': {
            'Q1': {'Chairs': 15, 'Tables': 10, 'Sofas': 8},
            'Q2': {'Chairs': 18, 'Tables': 12, 'Sofas': 10},
            'Q3': {'Chairs': 12, 'Tables': 8, 'Sofas': 6},
            'Q4': {'Chairs': 20, 'Tables': 15, 'Sofas': 12}
        }
    }

def get_buying_patterns_overview():
    """Get comprehensive buying patterns data with fallback to sample data"""
    db = get_adapter()
    orders = db.get_orders()
    
    # If no orders exist, return sample data for visualization
    if not orders or len(orders) == 0:
        print("⚠️ No orders found, returning sample data for visualization")
        return get_sample_buying_patterns()
    
    # Return real data if available
    patterns = {
        'category_popularity': analyze_category_popularity(),
        'purchase_frequency': analyze_purchase_frequency(),
        'repeat_customer_rate': calculate_repeat_customer_rate(),
        'monthly_trends': analyze_monthly_trends(),
        'seasonal_demand': analyze_seasonal_demand()
    }
    
    # If any critical data is empty, supplement with sample data
    if not patterns['category_popularity']:
        print("⚠️ No category data, using sample categories")
        patterns['category_popularity'] = get_sample_buying_patterns()['category_popularity']
    
    if not patterns['monthly_trends']:
        print("⚠️ No monthly trends, using sample trends")
        patterns['monthly_trends'] = get_sample_buying_patterns()['monthly_trends']
    
    return patterns


if __name__ == '__main__':
    # Test the analyzer
    patterns = get_buying_patterns_overview()
    print("Category Popularity:")
    for item in patterns['category_popularity'][:5]:
        print(f"  {item['category']}: {item['count']} orders")
    
    print(f"\nRepeat Customer Rate: {patterns['repeat_customer_rate'] * 100}%")
    print(f"\nPurchase Frequency Distribution:")
    for key, value in patterns['purchase_frequency'].items():
        print(f"  {key}: {value} customers")
