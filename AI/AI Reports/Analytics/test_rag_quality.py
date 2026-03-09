"""
Quick Test Script for RAG Response Quality
Run this to verify improvements are working
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from query_rag import SimpleRAG
import config

def test_rag_quality():
    """Test RAG with various question types"""
    
    print("=" * 80)
    print("  RAG RESPONSE QUALITY TEST")
    print("=" * 80)
    print(f"\n🤖 Model: {config.OPENROUTER_MODEL}")
    print(f"🌡️  Temperature: {config.TEMPERATURE}")
    print(f"📊 Max Tokens: {config.MAX_TOKENS}\n")
    
    # Initialize RAG
    print("🔧 Initializing RAG system...\n")
    rag = SimpleRAG()
    
    # Test cases
    test_questions = [
        # Count queries
        ("How many raw materials do we have?", "Count Query"),
        ("Total customers in database", "Count Query"),
        
        # List queries
        ("Show me pending orders", "List Query"),
        ("List top 5 quotations", "List Query"),
        
        # Analysis queries
        ("What's the status of our inventory?", "Analysis Query"),
        ("Give me a summary of our business performance", "Analysis Query"),
        
        # Hinglish
        ("kitne orders pending hain?", "Hinglish Query"),
        ("customers ki list dikhao", "Hinglish Query"),
    ]
    
    results = []
    
    for idx, (question, qtype) in enumerate(test_questions, 1):
        print("\n" + "=" * 80)
        print(f"TEST {idx}/{len(test_questions)}: {qtype}")
        print("=" * 80)
        print(f"📝 Question: {question}\n")
        
        try:
            # Get response
            result = rag.query(question)
            
            # Display response
            print(f"💬 Answer:\n{result['answer']}\n")
            
            # Quality metrics
            answer_length = len(result['answer'])
            has_emojis = any(char in result['answer'] for char in ['📦', '👥', '📝', '💰', '⚙️', '🚚'])
            has_bold = '**' in result['answer']
            has_structure = any(char in result['answer'] for char in ['•', '-', '\n'])
            
            quality_score = sum([
                answer_length > 50,  # Not too short
                answer_length < 2000,  # Not cut off
                has_emojis,
                has_bold,
                has_structure
            ])
            
            print(f"📊 Quality Metrics:")
            print(f"   - Length: {answer_length} chars {'✅' if 50 < answer_length < 2000 else '⚠️'}")
            print(f"   - Emojis: {'✅' if has_emojis else '❌'}")
            print(f"   - Bold formatting: {'✅' if has_bold else '❌'}")
            print(f"   - Structure: {'✅' if has_structure else '❌'}")
            print(f"   - Sources: {result.get('sources_count', 0)} collections")
            print(f"   - Overall: {quality_score}/5 {'✅' if quality_score >= 4 else '⚠️'}")
            
            results.append({
                'question': question,
                'type': qtype,
                'quality_score': quality_score,
                'length': answer_length,
                'success': True
            })
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}\n")
            results.append({
                'question': question,
                'type': qtype,
                'quality_score': 0,
                'success': False,
                'error': str(e)
            })
    
    # Summary
    print("\n" + "=" * 80)
    print("  TEST SUMMARY")
    print("=" * 80)
    
    successful = sum(1 for r in results if r['success'])
    total_quality = sum(r.get('quality_score', 0) for r in results if r['success'])
    avg_quality = total_quality / successful if successful > 0 else 0
    avg_length = sum(r.get('length', 0) for r in results if r['success']) / successful if successful > 0 else 0
    
    print(f"\n✅ Successful: {successful}/{len(test_questions)}")
    print(f"📊 Average Quality: {avg_quality:.1f}/5.0")
    print(f"📏 Average Length: {avg_length:.0f} chars")
    
    if successful == len(test_questions) and avg_quality >= 4.0:
        print("\n🎉 ALL TESTS PASSED! Response quality is EXCELLENT!")
        return True
    elif successful == len(test_questions) and avg_quality >= 3.0:
        print("\n✅ Tests passed. Response quality is GOOD but could be improved.")
        return True
    else:
        print("\n⚠️ Some issues detected. Check individual test results above.")
        return False

if __name__ == "__main__":
    success = test_rag_quality()
    sys.exit(0 if success else 1)
