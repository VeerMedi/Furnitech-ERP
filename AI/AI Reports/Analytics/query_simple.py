#!/usr/bin/env python3
"""
Simple CLI wrapper for RAG queries
Usage: python query_simple.py "Your question here"
"""

import sys
from query_rag import SimpleRAG

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No question provided")
        sys.exit(1)
    
    question = ' '.join(sys.argv[1:])
    
    try:
        rag = SimpleRAG()
        result = rag.query(question)
        
        # Output just the answer for easy parsing
        print(result['answer'])
        sys.exit(0)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
