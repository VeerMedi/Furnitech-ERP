from typing import Dict, List

def calculate_response_speed_score(avg_response_hours: float) -> float:
    if avg_response_hours <= 2:
        return 1.0
    elif avg_response_hours >= 8:
        return 0.0
    else:
        return round(1.0 - ((avg_response_hours - 2) / 6), 3)

def calculate_performance_score(employee: Dict) -> float:
    performance = employee.get('performance', {})
    conversion_rate = performance.get('conversion_rate', 0.5)
    avg_response_hours = performance.get('avg_response_hours', 5.0)
    response_speed_score = calculate_response_speed_score(avg_response_hours)
    performance_score = (conversion_rate * 0.6) + (response_speed_score * 0.4)
    return round(performance_score, 3)

def enrich_employees_with_performance(employees: List[Dict]) -> List[Dict]:
    for emp in employees:
        emp['performance_score'] = calculate_performance_score(emp)
        avg_response_hours = emp.get('performance', {}).get('avg_response_hours', 5.0)
        emp['response_speed_score'] = calculate_response_speed_score(avg_response_hours)
    return employees

def get_top_performers(employees: List[Dict], limit=5) -> List[Dict]:
    employees = enrich_employees_with_performance(employees)
    return sorted(employees, key=lambda x: x['performance_score'], reverse=True)[:limit]
