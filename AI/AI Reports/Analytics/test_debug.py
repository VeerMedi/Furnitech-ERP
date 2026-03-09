#!/usr/bin/env python3
"""
Debug version to see what's happening
"""

import sys
from query_rag import SimpleRAG

if __name__ == "__main__":
    question = "How many customers do we have?"
    
    print(f"Question: {question}")
    print(f"Question lower: {question.lower()}")
    print(f"'customer' in question: {'customer' in question.lower()}")
    
    rag = SimpleRAG()
    result = rag.query(question)
    
    print(f"\nSources count: {result['sources_count']}")
    print(f"Answer: {result['answer']}")
