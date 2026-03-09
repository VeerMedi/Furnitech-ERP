"""
AI Insights Generator
Generates natural language insights from buying patterns, CLV, and preferences
Currently uses deterministic logic, ready for LLM integration later
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from . import buying_pattern_analyzer, clv_calculator, preference_extractor
from services.database_adapter import get_adapter

def generate_category_insights(patterns):
    """Generate insights about category popularity"""
    insights = []
    categories = patterns.get('category_popularity', [])
    
    if len(categories) >= 2:
        top_cat = categories[0]
        second_cat = categories[1]
        insights.append(
            f"{top_cat['category']} is the most popular category with {top_cat['count']} orders, "
            f"followed by {second_cat['category']} with {second_cat['count']} orders."
        )
    
    return insights

def generate_repeat_purchase_insights(patterns):
    """Generate insights about repeat purchase behavior"""
    insights = []
    repeat_rate = patterns.get('repeat_customer_rate', 0)
    freq_data = patterns.get('purchase_frequency', {})
    
    if repeat_rate > 0:
        insights.append(
            f"{int(repeat_rate * 100)}% of customers make repeat purchases, "
            f"indicating strong customer loyalty."
        )
    
    # Insights based on engagement status
    distribution = freq_data.get('distribution', {})
    active_buyers = distribution.get('Active Buyers', 0)
    at_risk = distribution.get('At Risk', 0)
    dormant = distribution.get('Dormant', 0)
    one_time = distribution.get('One-Time Buyers', 0)
    
    if active_buyers > 0:
        insights.append(
            f"{active_buyers} customers are actively engaged (purchased within last 90 days). "
            f"Focus on retention strategies for these valuable customers."
        )
    
    if at_risk > 0:
        insights.append(
            f"⚠️ {at_risk} customers are at risk of churning (last purchase 90-180 days ago). "
            f"Consider re-engagement campaigns."
        )
    
    if dormant > 0:
        insights.append(
            f"💤 {dormant} customers are dormant (last purchase 180+ days ago). "
            f"Win-back campaigns could reactivate these customers."
        )
    
    # Purchase cycle insights
    avg_cycle = freq_data.get('avg_purchase_cycle_days', 0)
    if avg_cycle > 0:
        insights.append(
            f"📅 Repeat customers typically buy every {avg_cycle} days. "
            f"Use this timing for targeted marketing campaigns."
        )
    
    return insights

def generate_preference_insights(preferences):
    """Generate insights about customer preferences"""
    insights = []
    
    # Material insights
    materials = preferences.get('material_preferences', [])
    if len(materials) >= 2:
        top_mat = materials[0]
        insights.append(
            f"{top_mat['material']} is the most preferred material, "
            f"used in {top_mat['count']} orders."
        )
    
    # Custom options insights
    options = preferences.get('custom_options', [])
    if len(options) >= 3:
        top_options = [opt['option'] for opt in options[:3]]
        insights.append(
            f"Most requested customizations: {', '.join(top_options)}."
        )
    
    return insights

def generate_regional_insights(preferences):
    """Generate insights about regional preferences"""
    insights = []
    regional = preferences.get('regional_preferences', {})
    
    if regional:
        # Find region with most distinct preference
        region_insights = []
        for region, data in regional.items():
            top_cat = data['top_category']
            region_insights.append(f"{region} prefers {top_cat}")
        
        if region_insights:
            insights.append(f"Regional preferences: {'; '.join(region_insights[:3])}.")
    
    return insights

def generate_clv_insights(clv_data):
    """Generate insights from CLV analysis"""
    insights = []
    
    if len(clv_data) >= 3:
        top_customer = clv_data[0]
        avg_clv = sum(c['clv'] for c in clv_data[:10]) / 10
        
        insights.append(
            f"Top customer {top_customer['name']} has a lifetime value of ₹{top_customer['clv']:,.0f}, "
            f"with {top_customer['order_count']} orders."
        )
        
        insights.append(
            f"Average customer lifetime value is ₹{avg_clv:,.0f} based on purchase patterns."
        )
    
    # Analyze high-value segments
    high_value = [c for c in clv_data if c['clv'] > 50000]
    if len(high_value) >= 5:
        insights.append(
            f"{len(high_value)} customers have CLV above ₹50,000, "
            f"forming your premium customer segment."
        )
    
    return insights

def generate_seasonal_insights(patterns):
    """Generate insights about seasonal trends"""
    insights = []
    seasonal = patterns.get('seasonal_demand', {})
    
    if seasonal:
        max_quarter = max(seasonal.items(), key=lambda x: sum(x[1].values()))
        quarter_name, categories = max_quarter
        total_orders = sum(categories.values())
        
        insights.append(
            f"{quarter_name} shows highest demand with {total_orders} orders across categories."
        )
    
    return insights

def generate_all_insights():
    """Generate comprehensive AI insights"""
    # Get all analytics data
    patterns = buying_pattern_analyzer.get_buying_patterns_overview()
    clv_data = clv_calculator.calculate_clv()
    preferences = preference_extractor.get_all_preferences()
    
    all_insights = []
    
    # Category insights
    all_insights.extend(generate_category_insights(patterns))
    
    # Repeat purchase insights
    all_insights.extend(generate_repeat_purchase_insights(patterns))
    
    # Preference insights
    all_insights.extend(generate_preference_insights(preferences))
    
    # Regional insights
    all_insights.extend(generate_regional_insights(preferences))
    
    # CLV insights
    all_insights.extend(generate_clv_insights(clv_data))
    
    # Seasonal insights
    all_insights.extend(generate_seasonal_insights(patterns))
    
    return {
        'insights': all_insights,
        'generated_at': '2024-12-16',
        'total_insights': len(all_insights)
    }

if __name__ == '__main__':
    # Test the generator
    result = generate_all_insights()
    print(f"Generated {result['total_insights']} insights:\n")
    for i, insight in enumerate(result['insights'], 1):
        print(f"{i}. {insight}")
