"""
RAG Query API - For Backend API Calls with Organization Isolation
Accepts tenant_id as command-line argument to ensure data isolation
"""

import sys
import json
from query_rag import SimpleRAG

def main():
    if len(sys.argv) < 3:
        result = {
            'error': 'Usage: python query_rag_api.py <tenant_id> <question>',
            'success': False
        }
        print(json.dumps(result))
        sys.exit(1)
    
    tenant_id = sys.argv[1]
    question = ' '.join(sys.argv[2:])
    
    # Validate tenant_id
    if not tenant_id or tenant_id.strip() == '':
        result = {
            'error': 'Organization context required for data isolation',
            'success': False
        }
        print(json.dumps(result))
        sys.exit(1)
    
    try:
        # Redirect stdout to stderr temporarily to prevent debug logs from contaminating JSON output
        old_stdout = sys.stdout
        sys.stdout = sys.stderr
        
        # Initialize RAG with tenant context (debug output goes to stderr now)
        rag = SimpleRAG(tenant_id=tenant_id)
        
        # Restore stdout
        sys.stdout = old_stdout
        
        # Query (this also has debug output, redirect again)
        sys.stdout = sys.stderr
        result = rag.query(question)
        sys.stdout = old_stdout
        
        # Return JSON output for API consumption
        output = {
            'success': True,
            'question': result['question'],
            'answer': result['answer'],
            'sources_count': result['sources_count'],
            'tenant_id': tenant_id
        }
        print(json.dumps(output))
        
    except Exception as e:
        result = {
            'error': str(e),
            'success': False
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
