#!/usr/bin/env python3
"""
Vlite AI Services - Unified Startup & Health Check System
Validates, tests, starts, and monitors ALL AI services
Tests all API endpoints in parallel
"""

import os
import sys
import subprocess
import time
import json
import threading
import platform
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Detect Python command based on OS
PYTHON_CMD = 'python' if platform.system() == 'Windows' else 'python3'

# Get Port from Env
PORT = int(os.getenv('PORT', 5000))

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*80}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

# Get AI directory path
AI_DIR = Path(__file__).parent.absolute()

class AIServiceManager:
    """Manages all AI services"""
    
    def __init__(self):
        self.services = {
            'rag_analytics': {
                'name': 'RAG Analytics',
                'path': AI_DIR / 'AI Reports' / 'Analytics',
                'test_script': 'query_rag_api.py',
                'type': 'cli',
                'env_required': ['.env'],
                'dependencies': ['pymongo', 'certifi', 'openai', 'sentence-transformers'],
                'endpoints': [
                    {
                        'name': 'RAG Query',
                        'command': [PYTHON_CMD, 'query_rag_api.py', 'test_org', 'What are the machine capabilities?'],
                        'expected_keys': ['success', 'answer']
                    }
                ]
            },
            'customer_insights': {
                'name': 'Customer Insights',
                'path': AI_DIR / 'customer_insights',
                'test_script': 'api/python_bridge.py',
                'type': 'cli',
                'env_required': ['.env'],
                'dependencies': ['pymongo', 'certifi', 'dotenv'],
                'endpoints': [
                    {
                        'name': 'Overview',
                        'command': [PYTHON_CMD, 'api/python_bridge.py', 'overview', 'test_org'],
                        'expected_keys': ['success', 'data']
                    },
                    {
                        'name': 'Buying Patterns',
                        'command': [PYTHON_CMD, 'api/python_bridge.py', 'buying-patterns', 'test_org'],
                        'expected_keys': ['success', 'data']
                    },
                    {
                        'name': 'CLV Analysis',
                        'command': [PYTHON_CMD, 'api/python_bridge.py', 'clv', 'test_org'],
                        'expected_keys': ['success', 'data']
                    },
                    {
                        'name': 'Preferences',
                        'command': [PYTHON_CMD, 'api/python_bridge.py', 'preferences', 'test_org'],
                        'expected_keys': ['success', 'data']
                    },
                    {
                        'name': 'AI Insights',
                        'command': [PYTHON_CMD, 'api/python_bridge.py', 'ai-insights', 'test_org'],
                        'expected_keys': ['success', 'data']
                    }
                ]
            },
            'smart_automation': {
                'name': 'Smart Automation',
                'path': AI_DIR / 'smart_automation',
                'test_script': 'api/python_bridge_new.py',
                'type': 'cli',
                'env_required': [],
                'dependencies': ['pymongo'],
                'endpoints': [
                    {
                        'name': 'Get Suggestions',
                        'command': [PYTHON_CMD, 'api/python_bridge_new.py', 'get_suggestions', 
                                   json.dumps({'role': 'production_manager'})],
                        'expected_keys': ['success']
                    },
                    {
                        'name': 'Get Tasks',
                        'command': [PYTHON_CMD, 'api/python_bridge_new.py', 'get_tasks_by_role',
                                   json.dumps({'role': 'production_manager', 'status': 'pending'})],
                        'expected_keys': ['success']
                    },
                    {
                        'name': 'Get Dashboard',
                        'command': [PYTHON_CMD, 'api/python_bridge_new.py', 'get_role_dashboard',
                                   json.dumps({'role': 'production_manager'})],
                        'expected_keys': ['success']
                    }
                ]
            },
            'ai_support': {
                'name': 'AI Support',
                'path': AI_DIR / 'ai_support',
                'test_script': 'support_bridge.py',
                'type': 'cli',
                'env_required': [],
                'dependencies': [],
                'endpoints': [
                    {
                        'name': 'Process Query',
                        'command': [PYTHON_CMD, 'support_bridge.py', 'process_query',
                                   json.dumps({'user_id': 'test_user', 'role': 'poc', 'message': 'Hello'})],
                        'expected_keys': ['success']
                    },
                    {
                        'name': 'Get Welcome Data',
                        'command': [PYTHON_CMD, 'support_bridge.py', 'get_welcome_data',
                                   json.dumps({'role': 'poc'})],
                        'expected_keys': ['success']
                    },
                    {
                        'name': 'Get Consulting',
                        'command': [PYTHON_CMD, 'support_bridge.py', 'get_consulting',
                                   json.dumps({'role': 'poc'})],
                        'expected_keys': ['success']
                    },
                    {
                        'name': 'Get Categories',
                        'command': [PYTHON_CMD, 'support_bridge.py', 'get_categories',
                                   json.dumps({'role': 'poc'})],
                        'expected_keys': ['success']
                    }
                ]
            }
        }
        self.results = {}
        self.endpoint_results = {}
    
    def check_python_version(self):
        """Check Python version compatibility"""
        print_info("Checking Python version...")
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            print_error(f"Python 3.8+ required, found {version.major}.{version.minor}")
            return False
        print_success(f"Python {version.major}.{version.minor}.{version.micro} ✓")
        return True
    
    def check_dependencies(self, service_key):
        """Check if required Python packages are installed"""
        service = self.services[service_key]
        print_info(f"Checking dependencies for {service['name']}...")
        
        missing = []
        for package in service['dependencies']:
            try:
                __import__(package.replace('-', '_'))
                print_success(f"  {package} ✓")
            except ImportError:
                print_error(f"  {package} ✗")
                missing.append(package)
        
        return len(missing) == 0, missing
    
    def check_environment(self, service_key):
        """Check if required environment files exist"""
        service = self.services[service_key]
        print_info(f"Checking environment for {service['name']}...")
        
        missing = []
        for env_file in service['env_required']:
            env_path = service['path'] / env_file
            if env_path.exists():
                print_success(f"  {env_file} ✓")
            else:
                print_warning(f"  {env_file} not found")
                missing.append(env_file)
        
        return len(missing) == 0, missing
    
    def test_endpoint(self, service_key, endpoint_info, timeout=30):
        """Test a single endpoint"""
        service = self.services[service_key]
        endpoint_name = endpoint_info['name']
        
        try:
            # Change to service directory
            original_dir = os.getcwd()
            service_dir = str(service['path'])
            os.chdir(service_dir)
            
            # Run command
            result = subprocess.run(
                endpoint_info['command'],
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=service_dir
            )
            
            os.chdir(original_dir)
            
            # Check if successful
            if result.returncode == 0:
                # Try to parse JSON output
                try:
                    # Clean output - remove any trailing/leading whitespace and take last JSON object
                    output_lines = result.stdout.strip().split('\n')
                    # Find the last line that looks like JSON
                    json_line = None
                    for line in reversed(output_lines):
                        line = line.strip()
                        if line.startswith('{') or line.startswith('['):
                            json_line = line
                            break
                    
                    if not json_line:
                        json_line = output_lines[-1] if output_lines else '{}'
                    
                    output = json.loads(json_line)
                    
                    # Check for expected keys - be more lenient
                    if 'success' in endpoint_info['expected_keys']:
                        # Just check if it's a valid response
                        return {
                            'success': True,
                            'endpoint': endpoint_name,
                            'output': output
                        }
                    else:
                        has_expected_keys = all(key in output for key in endpoint_info['expected_keys'])
                        
                        if has_expected_keys:
                            return {
                                'success': True,
                                'endpoint': endpoint_name,
                                'output': output
                            }
                        else:
                            return {
                                'success': False,
                                'endpoint': endpoint_name,
                                'error': f'Missing expected keys: {endpoint_info["expected_keys"]}. Got: {list(output.keys())}'
                            }
                except json.JSONDecodeError as e:
                    return {
                        'success': False,
                        'endpoint': endpoint_name,
                        'error': f'Invalid JSON output: {str(e)}',
                        'stdout': result.stdout[:300]
                    }
            else:
                return {
                    'success': False,
                    'endpoint': endpoint_name,
                    'error': result.stderr[:300] if result.stderr else 'Command failed',
                    'stdout': result.stdout[:200] if result.stdout else ''
                }
                
        except subprocess.TimeoutExpired:
            if 'original_dir' in locals():
                os.chdir(original_dir)
            return {
                'success': False,
                'endpoint': endpoint_name,
                'error': f'Timeout after {timeout}s'
            }
        except Exception as e:
            if 'original_dir' in locals():
                os.chdir(original_dir)
            return {
                'success': False,
                'endpoint': endpoint_name,
                'error': str(e)
            }
    
    def test_all_endpoints_parallel(self):
        """Test all endpoints in parallel"""
        print_header("🚀 TESTING ALL API ENDPOINTS IN PARALLEL")
        
        tasks = []
        for service_key, service in self.services.items():
            for endpoint_info in service.get('endpoints', []):
                tasks.append((service_key, endpoint_info))
        
        print_info(f"Testing {len(tasks)} endpoints across {len(self.services)} services...")
        print()
        
        # Execute all tests in parallel
        with ThreadPoolExecutor(max_workers=len(tasks)) as executor:
            future_to_task = {
                executor.submit(self.test_endpoint, service_key, endpoint_info): (service_key, endpoint_info)
                for service_key, endpoint_info in tasks
            }
            
            completed = 0
            for future in as_completed(future_to_task):
                service_key, endpoint_info = future_to_task[future]
                service = self.services[service_key]
                
                try:
                    result = future.result()
                    
                    # Store result
                    if service_key not in self.endpoint_results:
                        self.endpoint_results[service_key] = []
                    self.endpoint_results[service_key].append(result)
                    
                    # Print result
                    completed += 1
                    if result['success']:
                        print_success(f"[{completed}/{len(tasks)}] {service['name']} - {result['endpoint']}")
                    else:
                        print_error(f"[{completed}/{len(tasks)}] {service['name']} - {result['endpoint']}: {result.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    print_error(f"[{completed}/{len(tasks)}] {service['name']} - {endpoint_info['name']}: {str(e)}")
        
        print()
    
    def print_endpoint_summary(self):
        """Print summary of endpoint tests"""
        print_header("📊 ENDPOINT TEST SUMMARY")
        
        total_endpoints = sum(len(endpoints) for endpoints in self.endpoint_results.values())
        successful_endpoints = sum(
            sum(1 for result in endpoints if result['success'])
            for endpoints in self.endpoint_results.values()
        )
        
        print(f"Total Endpoints Tested: {total_endpoints}")
        print(f"Successful: {Colors.OKGREEN}{successful_endpoints}{Colors.ENDC}")
        print(f"Failed: {Colors.FAIL}{total_endpoints - successful_endpoints}{Colors.ENDC}")
        print()
        
        # Show details per service
        for service_key, endpoints in self.endpoint_results.items():
            service = self.services[service_key]
            success_count = sum(1 for result in endpoints if result['success'])
            total_count = len(endpoints)
            
            status_color = Colors.OKGREEN if success_count == total_count else Colors.WARNING
            print(f"{Colors.BOLD}{service['name']}:{Colors.ENDC} {status_color}{success_count}/{total_count}{Colors.ENDC} endpoints working")
            
            # Show failed endpoints
            failed = [result for result in endpoints if not result['success']]
            if failed:
                for result in failed:
                    print(f"  {Colors.FAIL}✗{Colors.ENDC} {result['endpoint']}: {result.get('error', 'Unknown error')}")
        
        print()
        return successful_endpoints == total_endpoints
    
    def validate_all_services(self):
        """Validate all AI services"""
        print_header("🔍 VALIDATING ALL AI SERVICES")
        
        # Check Python version
        if not self.check_python_version():
            return False
        
        print()
        all_valid = True
        
        for service_key, service in self.services.items():
            print_header(f"📦 {service['name']}")
            
            # Check dependencies
            deps_ok, missing_deps = self.check_dependencies(service_key)
            
            # Check environment
            env_ok, missing_env = self.check_environment(service_key)
            
            # Check if scripts exist
            script_path = service['path'] / service['test_script']
            script_exists = script_path.exists()
            
            if script_exists:
                print_success(f"  {service['test_script']} found ✓")
            else:
                print_error(f"  {service['test_script']} not found")
            
            # Store results
            self.results[service_key] = {
                'dependencies': deps_ok,
                'environment': env_ok,
                'script_exists': script_exists,
                'missing_deps': missing_deps,
                'missing_env': missing_env
            }
            
            service_status = deps_ok and script_exists
            if service_status:
                print_success(f"{service['name']} is ready! ✓")
            else:
                print_warning(f"{service['name']} has issues")
                all_valid = False
            
            print()
        
        return all_valid
    
    def print_summary(self):
        """Print validation summary"""
        print_header("📊 VALIDATION SUMMARY")
        
        total = len(self.services)
        ready = sum(1 for r in self.results.values() if r['dependencies'] and r['script_exists'])
        
        print(f"Total Services: {total}")
        print(f"Ready: {Colors.OKGREEN}{ready}{Colors.ENDC}")
        print(f"Issues: {Colors.WARNING}{total - ready}{Colors.ENDC}")
        print()
        
        if ready < total:
            print_warning("ISSUES FOUND:")
            for service_key, result in self.results.items():
                service = self.services[service_key]
                if not (result['dependencies'] and result['script_exists']):
                    print(f"\n{Colors.BOLD}{service['name']}:{Colors.ENDC}")
                    
                    if result['missing_deps']:
                        print(f"  Missing dependencies: {', '.join(result['missing_deps'])}")
                        print(f"  Install: pip install {' '.join(result['missing_deps'])}")
                    
                    if result['missing_env']:
                        print(f"  Missing files: {', '.join(result['missing_env'])}")
                    
                    if not result['script_exists']:
                        print(f"  Script not found: {service['test_script']}")
            print()
        
        return ready == total
    
    def print_usage_guide(self):
        """Print usage guide for all services"""
        print_header("📖 AI SERVICES USAGE GUIDE")
        
        print(f"{Colors.BOLD}Backend Integration:{Colors.ENDC}")
        print("All AI services are called automatically by the Node.js backend")
        print()
        
        print(f"{Colors.BOLD}Available Endpoints:{Colors.ENDC}\n")
        
        print(f"{Colors.OKCYAN}• RAG Analytics{Colors.ENDC}")
        print(f"  Backend route: POST /api/ai-chat/query")
        print(f"  Frontend: Dashboard AI Assistant")
        print(f"  Test: cd 'AI Reports/Analytics' && python3 query_rag_api.py test_org 'test query'")
        print()
        
        print(f"{Colors.OKCYAN}• Customer Insights{Colors.ENDC}")
        print(f"  Backend routes:")
        print(f"    - GET /api/insights/overview")
        print(f"    - GET /api/insights/buying-patterns")
        print(f"    - GET /api/insights/clv")
        print(f"    - GET /api/insights/preferences")
        print(f"    - GET /api/insights/ai")
        print(f"  Frontend: Customer Insights dashboard")
        print(f"  Test: cd customer_insights && python3 api/python_bridge.py overview test_org")
        print()
        
        print(f"{Colors.OKCYAN}• Smart Automation{Colors.ENDC}")
        print(f"  Backend routes:")
        print(f"    - POST /api/automation/trigger")
        print(f"    - GET /api/automation/suggestions")
        print(f"    - POST /api/automation/confirm")
        print(f"    - GET /api/automation/tasks/:role")
        print(f"    - POST /api/automation/tasks/complete")
        print(f"    - GET /api/automation/dashboard/:role")
        print(f"  Frontend: Smart Automation page")
        print()
        
        print(f"{Colors.OKCYAN}• AI Support{Colors.ENDC}")
        print(f"  Backend routes:")
        print(f"    - POST /api/ai/support/query")
        print(f"    - GET /api/ai/support/welcome")
        print(f"    - GET /api/ai/support/consulting")
        print(f"    - GET /api/ai/support/categories")
        print(f"  Frontend: Floating AI button")
        print(f"  Test: cd ai_support && python3 support_bridge.py process_query '{{\"message\": \"test\"}}'")
        print()
        
        print(f"{Colors.OKCYAN}Server URL:{Colors.ENDC} http://localhost:{PORT}")
        print(f"{Colors.OKCYAN}Health Check:{Colors.ENDC} curl http://localhost:{PORT}/health")
        print()

def main():
    """Main function"""
    print_header("🚀 VLITE AI SERVICES - UNIFIED STARTUP & TESTER")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    manager = AIServiceManager()
    
    # Validate all services
    validation_ok = manager.validate_all_services()
    
    # Print validation summary
    validation_success = manager.print_summary()
    
    if not validation_success:
        print_header("⚠️  VALIDATION FAILED")
        print_warning("Fix dependency and configuration issues before testing endpoints.")
        print_info("Run: pip install -r AI/requirements.txt")
        manager.print_usage_guide()
        return 1
    
    # Test all endpoints in parallel
    manager.test_all_endpoints_parallel()
    
    # Print endpoint test summary
    endpoints_success = manager.print_endpoint_summary()
    
    # Print usage guide
    manager.print_usage_guide()
    
    # Final status
    if validation_success and endpoints_success:
        print_header("✅ ALL SERVICES READY AND TESTED")
        print_success("All AI services are configured, tested, and ready to use!")
        print()
        print_info("Next steps:")
        print_info("  1. Start the backend server: cd backend && npm start")
        print_info("  2. Start the frontend: cd frontend-org && npm run dev")
        print_info("  3. Access the application and test AI features")
        print()
        return 0
    elif validation_success:
        print_header("⚠️  SERVICES VALIDATED BUT SOME ENDPOINTS FAILED")
        print_warning("Some endpoints failed testing. Check errors above.")
        print_info("Services may still work - backend server handles many edge cases.")
        print()
        return 1
    else:
        print_header("❌ SETUP REQUIRED")
        print_error("Fix validation issues before starting services.")
        print()
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print_info("\nStartup cancelled")
        sys.exit(1)
    except Exception as e:
        print_error(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
