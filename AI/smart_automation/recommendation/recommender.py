"""
Employee Recommender Module  
Main recommendation engine combining all scoring factors
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from . import load_calculator
from . import performance_calculator
from . import specialization_matcher

class EmployeeRecommender:
    def __init__(self):
        pass
    
    def recommend_for_inquiry(self, employees, inquiry):
        """Generate employee recommendation for inquiry"""
        if not employees or not inquiry:
            return {'error': 'Missing employees or inquiry data'}
        
        # Deep copy to avoid modifying original
        import copy
        employees = copy.deepcopy(employees)
        
        # Calculate all scores
        employees = performance_calculator.enrich_employees_with_performance(employees)
        employees = load_calculator.normalize_load_scores(employees)
        employees = specialization_matcher.match_employees_to_inquiry(employees, inquiry)
        
        # Filter only available employees
        available = [e for e in employees if e.get('capacity', {}).get('availability') == 'available']
        
        if not available:
            available = employees  # Fallback
        
        # Calculate final scores
        for emp in available:
            perf = emp.get('performance_score', 0)
            load = emp.get('normalized_load_score', 0.5)
            spec = emp.get('specialization_match', 0)
            
            # Formula: (perf * 0.6) - (load * 0.3) + (spec * 0.1)
            final_score = (perf * 0.6) - (load * 0.3) + (spec * 0.1)
            emp['scores'] = {
                'final_score': round(final_score, 3),
                'performance_score': perf,
                'load_score': emp.get('load_score', 0),
                'normalized_load_score': load,
                'specialization_match': spec
            }
            
            # Generate reasoning
            emp['reasoning'] = self._generate_reasoning(emp)
        
        # Sort by final score
        available.sort(key=lambda x: x['scores']['final_score'], reverse=True)
        
        # Return top recommendation + 2 alternatives
        return {
            'recommended': available[0] if available else None,
            'alternatives': available[1:3] if len(available) > 1 else [],
            'inquiry': inquiry,
            'total_candidates_evaluated': len(employees)
        }
    
    def _generate_reasoning(self, employee):
        """Generate human-readable reasoning"""
        scores = employee.get('scores', {})
        perf = scores.get('performance_score', 0)
        load = scores.get('load_score', 0)
        spec = scores.get('specialization_match', 0)
        
        reasons = []
        
        # Performance reason
        if perf >= 0.7:
            reasons.append(f"High performance (score: {perf:.2f})")
        elif perf >= 0.5:
            reasons.append(f"Good performance (score: {perf:.2f})")
        else:
            reasons.append(f"Moderate performance (score: {perf:.2f})")
        
        # Workload reason
        total_items = employee.get('workload', {}).get('pending_tasks', 0) + \
                     employee.get('workload', {}).get('active_quotations', 0) + \
                     employee.get('workload', {}).get('open_leads', 0)
        
        if load <= 0.3:
            reasons.append(f"Very low workload ({total_items} total items)")
        elif load <= 0.5:
            reasons.append(f"Low workload ({total_items} total items)")
        else:
            reasons.append(f"Moderate workload ({total_items} total items)")
        
        # Specialization reason
        if spec == 1.0:
            reasons.append(f"Perfect match for {employee.get('specializations', [])[0] if employee.get('specializations') else 'category'}")
        elif spec > 0:
            reasons.append(f"Partial match for category")
        else:
            reasons.append("No direct category match")
        
        # Availability
        avail = employee.get('capacity', {}).get('availability', 'unknown')
        if avail == 'available':
            reasons.append("Currently available")
        else:
            reasons.append("Currently busy")
        
        return " • ".join(reasons)

def recommend_for_inquiry(employees, inquiry):
    """Helper function to recommend employee"""
    recommender = EmployeeRecommender()
    return recommender.recommend_for_inquiry(employees, inquiry)
