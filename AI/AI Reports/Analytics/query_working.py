"""
Simple working RAG - Minimal version
"""

from pymongo import MongoClient
from openai import OpenAI
import config

class WorkingRAG:
    def __init__(self):
        """Initialize"""
        self.client = MongoClient(config.MONGODB_URI, serverSelectionTimeoutMS=10000)
        self.db = self.client.get_default_database()
        self.llm_client = OpenAI(
            base_url=config.OPENROUTER_BASE_URL,
            api_key=config.OPENROUTER_API_KEY,
        )
    
    def query(self, question):
        """Query with simple logic"""
        # Always query these main collections
        collections = ['customers', 'orders', 'products', 'quotations', 'machines', 'transports', 'vendors']
        
        all_data = []
        
        for coll_name in collections:
            try:
                coll = self.db[coll_name]
                docs = list(coll.find({}).limit(10))
                
                for doc in docs:
                    # Simple text extraction
                    text = f"{coll_name}: "
                    if 'name' in doc:
                        text += f"Name={doc['name']} "
                    if 'status' in doc:
                        text += f"Status={doc['status']} "
                    if 'totalOrders' in doc:
                        text += f"Orders={doc['totalOrders']} "
                    
                    all_data.append(text)
            except:
                continue
        
        if not all_data:
            return {
                'question': question,
                'answer': "No data found in database.",
                'sources_count': 0
            }
        
        # Create context
        context = '\n'.join(all_data[:50])  # Limit to 50 items
        
        # Query LLM
        prompt = f"""Data: {context}\n\nQuestion: {question}\n\nProvide a brief answer:"""
        
        try:
            response = self.llm_client.chat.completions.create(
                model=config.OPENROUTER_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant. Answer briefly."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
            )
            
            answer = response.choices[0].message.content
            
            return {
                'question': question,
                'answer': answer,
                'sources_count': len(collections)
            }
        except Exception as e:
            return {
                'question': question,
                'answer': f"Error: {str(e)}",
                'sources_count': 0
            }

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("No question provided")
        sys.exit(1)
    
    question = ' '.join(sys.argv[1:])
    rag = WorkingRAG()
    result = rag.query(question)
    print(result['answer'])
