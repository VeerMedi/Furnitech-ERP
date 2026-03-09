"""
Edge Case Handler Wrapper for RAG System
Adds production-ready error handling without modifying core logic
"""

import sys
import time
from query_rag import SimpleRAG

def safe_rag_query(question):
    """
    Wrapper function with comprehensive edge case handling
    """
    # Edge Case 1: Input Validation
    if not question or not question.strip():
        return {
            'question': '',
            'answer': "Please ask a question! I'm here to help with your business data. 😊",
            'sources_count': 0
        }
    
    question = question.strip()
    
    # Edge Case 2: Very long questions
    if len(question) > 500:
        question = question[:500]
        print("⚠️ Question truncated to 500 characters")
    
    # Edge Case 3: Initialize RAG with retry logic
    max_init_retries = 3
    rag = None
    
    for attempt in range(max_init_retries):
        try:
            rag = SimpleRAG()
            break
        except Exception as e:
            if attempt < max_init_retries - 1:
                print(f"⚠️ Initialization failed (attempt {attempt + 1}), retrying in 2s...")
                time.sleep(2)
            else:
                return {
                    'question': question,
                    'answer': f"❌ System initialization failed: {str(e)[:100]}. Please check your database connection.",
                    'sources_count': 0
                }
    
    # Edge Case 4: Query with retry logic
    max_query_retries = 2
    last_error = None
    
    for attempt in range(max_query_retries):
        try:
            result = rag.query(question)
            return result
            
        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            
            # Edge Case 5: Rate limit handling
            if 'rate limit' in error_str or '429' in error_str:
                if attempt < max_query_retries - 1:
                    wait_time = (attempt + 1) * 10
                    print(f"⚠️ Rate limit hit, waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
            
            # Edge Case 6: Connection errors
            elif 'connection' in error_str or 'timeout' in error_str:
                if attempt < max_query_retries - 1:
                    print(f"⚠️ Connection error, retrying...")
                    time.sleep(3)
                    continue
            
            # Other errors - don't retry
            break
    
    # Edge Case 7: All retries failed
    return {
        'question': question,
        'answer': f"Sorry, I'm having trouble right now. Please try again in a moment. Error: {str(last_error)[:100]}",
        'sources_count': 0
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 safe_query_rag.py 'your question here'")
        sys.exit(1)
    
    question = ' '.join(sys.argv[1:])
    result = safe_rag_query(question)
    
    print(f"\n🤖 Answer:\n{result['answer']}")
