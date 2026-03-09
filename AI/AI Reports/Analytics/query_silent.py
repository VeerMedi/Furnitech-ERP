#!/usr/bin/env python3
"""
Silent CLI wrapper for RAG queries - only outputs the answer
Usage: python query_silent.py "Your question here"
"""

import sys
import os

# Suppress all print statements from imported modules
class SuppressPrints:
    def __enter__(self):
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        sys.stdout = open(os.devnull, 'w')
        sys.stderr = open(os.devnull, 'w')
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout.close()
        sys.stderr.close()
        sys.stdout = self._original_stdout
        sys.stderr = self._original_stderr

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No question provided")
        sys.exit(1)
    
    question = ' '.join(sys.argv[1:])
    
    try:
        # Import with suppressed output
        with SuppressPrints():
            from query_rag import SimpleRAG
            rag = SimpleRAG()
            result = rag.query(question)
        
        # Output ONLY the answer
        print(result['answer'])
        sys.exit(0)
    except Exception as e:
        print(f"Sorry, I couldn't process that. Error: {str(e)}")
        sys.exit(1)
