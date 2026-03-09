from typing import Dict, List

def calculate_specialization_match(employee: Dict, inquiry: Dict) -> float:
    employee_specializations = employee.get('specializations', [])
    inquiry_category = inquiry.get('product_category', '')
    if inquiry_category in employee_specializations:
        return 1.0
    for specialization in employee_specializations:
        if inquiry_category.lower() in specialization.lower() or specialization.lower() in inquiry_category.lower():
            return 0.8
    return 0.0

def match_employees_to_inquiry(employees: List[Dict], inquiry: Dict) -> List[Dict]:
    for emp in employees:
        emp['specialization_match'] = calculate_specialization_match(emp, inquiry)
    return employees

def filter_by_specialization(employees: List[Dict], inquiry: Dict, require_match=False) -> List[Dict]:
    employees = match_employees_to_inquiry(employees, inquiry)
    if require_match:
        return [emp for emp in employees if emp.get('specialization_match', 0) > 0]
    return employees

def get_specialized_employees(employees: List[Dict], category: str) -> List[Dict]:
    return [emp for emp in employees if category in emp.get('specializations', [])]
