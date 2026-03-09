from typing import Dict, List

def calculate_load_score(employee: Dict) -> float:
    workload = employee.get('workload', {})
    pending_tasks = workload.get('pending_tasks', 0)
    active_quotations = workload.get('active_quotations', 0)
    open_leads = workload.get('open_leads', 0)
    load_score = (pending_tasks * 0.4) + (active_quotations * 0.3) + (open_leads * 0.3)
    return round(load_score, 2)

def normalize_load_scores(employees: List[Dict]) -> List[Dict]:
    if not employees:
        return employees
    for emp in employees:
        emp['load_score'] = calculate_load_score(emp)
    scores = [emp['load_score'] for emp in employees]
    min_score = min(scores) if scores else 0
    max_score = max(scores) if scores else 1
    score_range = max_score - min_score
    if score_range == 0:
        for emp in employees:
            emp['normalized_load_score'] = 0.5
    else:
        for emp in employees:
            emp['normalized_load_score'] = round((emp['load_score'] - min_score) / score_range, 3)
    return employees

def get_employees_by_load(employees: List[Dict], ascending=True) -> List[Dict]:
    employees = normalize_load_scores(employees)
    return sorted(employees, key=lambda x: x['load_score'], reverse=not ascending)
