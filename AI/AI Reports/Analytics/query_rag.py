"""
Simple RAG Query - Direct MongoDB Approach
No embeddings, no vector store - just MongoDB queries + LLM
"""

from pymongo import MongoClient
from openai import OpenAI
import config
import re

class SimpleRAG:
    def __init__(self, tenant_id=None):
        """Initialize with MongoDB and OpenRouter
        
        Args:
            tenant_id (str, optional): Organization/tenant ID for data isolation.
                                      If provided, all queries will be filtered by this organization.
        """
        print("🚀 Initializing Simple RAG System...")
        
        # Store tenant context
        self.tenant_id = tenant_id or config.TENANT_ID
        if self.tenant_id:
            print(f"🔒 Organization context: {self.tenant_id}")
        
        # Connect to MongoDB with SSL certificate fix
        import certifi
        self.client = MongoClient(
            config.MONGODB_URI,
            serverSelectionTimeoutMS=10000,
            tlsCAFile=certifi.where()  # Fix SSL certificate verification
        )
        self.db = self.client.get_default_database()
        print(f"✅ Connected to MongoDB: {self.db.name}")
        
        # Initialize OpenRouter with required headers
        self.llm_client = OpenAI(
            base_url=config.OPENROUTER_BASE_URL,
            api_key=config.OPENROUTER_API_KEY,
            default_headers={
                "HTTP-Referer": "https://vlite.ai",
                "X-Title": "Vlite Furniture ERP",
            }
        )
        print(f"✅ Using model: {config.OPENROUTER_MODEL}")
        print("✅ System ready!\n")
    
    def format_document(self, doc, model_type):
        """Format document dynamically - includes ALL fields, adapts to future schema changes"""
        # Skip MongoDB internal fields
        skip_fields = {'_id', 'tenantId', '__v', 'createdAt', 'updatedAt'}
        
        # Build document text from all fields dynamically
        fields = []
        for key, value in doc.items():
            if key in skip_fields:
                continue
                
            # Convert value to string, handling various types
            if value is None or value == '':
                continue
            elif isinstance(value, list):
                # For lists, show count or first few items
                if value:
                    if len(value) <= 3:
                        fields.append(f"{key}={value}")
                    else:
                        fields.append(f"{key}=[{len(value)} items]")
            elif isinstance(value, dict):
                # For dicts, show a summary
                if value:
                   fields.append(f"{key}={{...}}")
            elif isinstance(value, bool):
                fields.append(f"{key}={value}")
            elif isinstance(value, (int, float)):
                fields.append(f"{key}={value}")
            else:
                # String or other types
                val_str = str(value).strip()
                if val_str and val_str.lower() not in ['n/a', 'unknown', 'null']:
                    # Limit long strings
                    if len(val_str) > 100:
                        val_str = val_str[:100] + '...'
                    fields.append(f"{key}={val_str}")
        
        # Create formatted output
        if fields:
            return ' | '.join(fields)
        else:
            return f"{model_type} record"
    
    def fetch_relevant_data(self, question):
        """Fetch data from MongoDB based on question keywords - AUTO-DISCOVERS collections"""
        # Detect if this is a COUNT query for accurate entity counting
        is_count_query = any(phrase in question.lower() for phrase in [
            'how many', 'count', 'number of', 'total', 'kitne', 'kitna'  # Hinglish support
        ])
        context_parts = []
        
        # Determine which collections to query based on keywords
        question_lower = question.lower()
        
        collections_to_query = []
        
        # Comprehensive keyword detection for all 28 collections
        keyword_map = {
            # Core Business
            'customers': ['customer', 'client', 'buyer', 'account', 'company'],
            'orders': ['order', 'purchase', 'sale', 'deliver', 'sold', 'revenue', 'sales', 'business', 'income'],
            'quotations': ['quote', 'quotation', 'estimate', 'proposal', 'pending'],
            'products': ['product', 'item', 'furniture', 'selling', 'stock', 'catalog', 'top', 'sku'],
            'inquiries': ['inquiry', 'enquiry', 'lead', 'prospect', 'question', 'request'],
            'leads': ['lead', 'prospect', 'potential customer', 'new inquiry'],
            'meetinglogs': ['meeting', 'client meeting', 'discussion', 'meeting notes', 'follow up', 'meeting log'],
            
            # Operations
            'machines': ['machine', 'equipment', 'factory', 'manufacturing', 'plant', 'maintenance'],
            'transports': ['transport', 'delivery', 'deliveries', 'delivered', 'vehicle', 'shipping', 'dispatch', 'truck', 'driver'],
            'vendors': ['vendor', 'supplier', 'provider', 'partner'],
            'staffs': ['staff', 'employee', 'worker', 'team', 'personnel', 'hr', 'human resource'],
            'dispatches': ['dispatch', 'shipment', 'shipped', 'outbound'],
            
            # Inventory Management
            'inventoryitems': ['inventory', 'warehouse', 'stock level', 'store', 'quantity'],
            'inventorystocks': ['stock', 'stock level', 'inventory quantity', 'available stock'],
            'inventorytransactions': ['inventory transaction', 'stock movement', 'stock transfer', 'stock update'],
            'rawmaterials': ['raw material', 'material', 'wood', 'metal', 'component', 'plywood', 'laminate', 'panel', 'processed panel', 'locker'],
            'inventorysuggestions': ['inventory suggestion', 'stock suggestion', 'reorder suggestion', 'low stock alert', 'stock alert'],
            
            # Purchasing
            'purchaseindents': ['purchase indent', 'indent', 'purchase request', 'requisition'],
            'purchaseorders': ['purchase order', 'po', 'purchase', 'procurement', 'buying'],
            'grns': ['grn', 'goods receipt', 'receipt note', 'received goods', 'receiving'],
            
            # Production
            'productionorders': ['production order', 'production', 'manufacturing order', 'work order', 'job card'],
            'workflowsteps': ['workflow', 'workflow step', 'process step', 'production step', 'stage'],
            'drawings': ['drawing', 'design', 'blueprint', 'cad', 'technical drawing'],
            
            # Financial
            'ledgers': ['ledger', 'accounting', 'financial', 'account balance', 'transaction', 'money', 'payment'],
            'advancepayments': ['advance payment', 'advance', 'prepayment', 'upfront payment'],
            
            # System/Admin
            'users': ['user', 'login', 'access', 'account user'],
            'roles': ['role', 'permission', 'access level', 'user role'],
            'organizations': ['organization', 'org', 'tenant', 'company setup'],
            'features': ['feature', 'feature flag', 'capability', 'module'],
            'superadmins': ['superadmin', 'super admin', 'admin', 'administrator'],
            'chathistories': ['chat', 'conversation', 'ai assistant', 'support chat', 'message history', 'chat history'],
            'tasks': ['task', 'to do', 'assignment', 'workflow task', 'action item', 'todo']
        }
        
        # Check for keyword matches
        keyword_detected_collections = []  # Track which were explicitly requested
        for collection, keywords in keyword_map.items():
            if any(word in question_lower for word in keywords):
                collections_to_query.append(collection)
                keyword_detected_collections.append(collection)  # Mark as explicitly requested
       
        
        # BROADER SEARCH STRATEGY:
        # 1. If asking for "status", "overview", "summary", or specific counts -> Add all High Priority collections
        # 2. If no specific collection found -> Query ALL High Priority collections to be safe
        # 3. Always include core collections for context
        
        broad_keywords = ['status', 'overview', 'summary', 'everything', 'business', 'dashboard', 'report', 'how many', 'count', 'total']
        
        if not collections_to_query or any(word in question_lower for word in broad_keywords):
            # Add all high priority collections if no specific match OR if it's a broad query
            for coll in config.HIGH_PRIORITY_COLLECTIONS:
                if coll not in collections_to_query:
                    collections_to_query.append(coll)
                    
        # Sort priority - BUT KEEP KEYWORD-DETECTED COLLECTIONS AT THE FRONT
        # Intelligent prioritization: Sort by priority if we have multiple collections
        if len(collections_to_query) > 1:
            # IMPORTANT: Put keyword-detected collections FIRST
            priority_order = []
            
            # 1. Add keyword-detected collections first (these are what user asked for!)
            for coll in keyword_detected_collections:
                if coll not in priority_order:
                    priority_order.append(coll)
            
            # 2. Then add other high-priority collections
            for coll in config.HIGH_PRIORITY_COLLECTIONS:
                if coll in collections_to_query and coll not in priority_order:
                    priority_order.append(coll)
            
            # 3. Then medium-priority
            for coll in config.MEDIUM_PRIORITY_COLLECTIONS:
                if coll in collections_to_query and coll not in priority_order:
                    priority_order.append(coll)
            
            # 4. Add any remaining
            for coll in collections_to_query:
                if coll not in priority_order:
                    priority_order.append(coll)
            
            collections_to_query = priority_order
        
        # Remove duplicates while preserving order
        collections_to_query = list(dict.fromkeys(collections_to_query))
        
        # SMART EXCLUSION: Prevent entity confusion by excluding semantically unrelated collections
        # When asking about raw materials, don't include products (they're different entities)
        # ONLY apply if the primary collection was explicitly keyword-detected
        exclusion_rules = {
            'rawmaterials': ['products'],  # If querying raw materials, exclude finished products
            'products': ['rawmaterials'],  # If querying products, exclude raw materials
        }
        
        # Apply exclusion rules ONLY for keyword-detected collections
        for target_collection in keyword_detected_collections:
            if target_collection in exclusion_rules:
                excludes = exclusion_rules[target_collection]
                for exclude in excludes:
                    if exclude in collections_to_query:
                        collections_to_query.remove(exclude)
                        print(f"DEBUG: Excluding '{exclude}' collection to prevent confusion with '{target_collection}'")
        
        # If no specific collection detected, intelligently select from database
        if not collections_to_query:
            # Prefer high-priority collections for general queries
            collections_to_query = config.HIGH_PRIORITY_COLLECTIONS[:5]
        
        # IMPORTANT: Limit total collections to prevent overwhelming the LLM (max 10 collections)
        # Keyword-matched collections are now first, so they won't get cut off
        max_collections = 10
        if len(collections_to_query) > max_collections:
            print(f"DEBUG: Have {len(collections_to_query)} collections, limiting to {max_collections}")
            print(f"DEBUG: Keyword-detected collections that will be kept: {keyword_detected_collections}")
            collections_to_query = collections_to_query[:max_collections]
        
        print(f"DEBUG: About to query collections: {collections_to_query}")
        
        # Query each collection
        for collection_name in collections_to_query:
            print(f"DEBUG: Starting to process collection: {collection_name}")
            try:
                collection = self.db[collection_name]
                
                # Query filter with collection-specific rules
                query = {}
                # Apply organization filter if organization context is set
                # Database uses 'organizationId' (ObjectId), not 'tenantId' (string)
                if self.tenant_id and self.tenant_id.strip():
                    from bson import ObjectId
                    try:
                        org_id = ObjectId(self.tenant_id)
                        # SAFE FALLBACK: Verify organization exists before querying
                        if collection.find_one({'organizationId': org_id}):
                            query['organizationId'] = org_id
                        else:
                            print(f"⚠️ WARNING: No documents found for organization {self.tenant_id} in {collection_name}")
                            query = {}  # Return empty query to avoid errors
                    except Exception as e:
                        # If not a valid ObjectId, try as string
                        if collection.find_one({'organizationId': self.tenant_id}):
                            query['organizationId'] = self.tenant_id
                        else:
                            print(f"⚠️ WARNING: Invalid organization ID {self.tenant_id} in {collection_name}: {e}")
                            query = {}  # Return empty query to avoid errors
                
                # SPECIAL FILTERING FOR INQUIRIES - Only active statuses
                if collection_name == 'inquiries':
                    # Only fetch inquiries with active statuses
                    query['status'] = {'$in': ['New', 'In Progress', 'Resolved']}
                    # Exclude History and Onboarding
                    print(f"DEBUG: Filtering inquiries to New/In Progress/Resolved only")
                
                # SPECIAL HANDLING FOR VENDORS - Ensure we fetch all
                if collection_name == 'vendors':
                    # No special filtering needed, fetch all vendors
                    print(f"DEBUG: Fetching all vendors")
                
                # ADAPTIVE FETCHING: For COUNT queries on master entity tables, fetch ALL documents
                # For other queries, use configurable limit to prevent context overflow
                master_entity_tables = ['rawmaterials', 'customers', 'vendors', 'orders', 'products', 'users', 'staffs']
                
                if is_count_query and collection_name in master_entity_tables:
                    # COUNT query on master entity = fetch ALL for accurate counting
                    fetch_limit = None  # No limit
                    print(f"DEBUG: COUNT query detected - fetching ALL {collection_name} for accurate count")
                else:
                    # Detail/context query = use configured limit
                    fetch_limit = config.MAX_DOCUMENTS_PER_COLLECTION
                
                # Fetch documents - sort by creation date (recent first)
                try:
                    if fetch_limit is None:
                        docs = list(collection.find(query).sort('createdAt', -1))
                    else:
                        docs = list(collection.find(query).sort('createdAt', -1).limit(fetch_limit))
                except:
                    # If createdAt doesn't exist, try updatedAt
                    try:
                        if fetch_limit is None:
                            docs = list(collection.find(query).sort('updatedAt', -1))
                        else:
                            docs = list(collection.find(query).sort('updatedAt', -1).limit(fetch_limit))
                    except:
                        # Just fetch without sorting
                        if fetch_limit is None:
                            docs = list(collection.find(query))
                        else:
                            docs = list(collection.find(query).limit(fetch_limit))
                
                print(f"DEBUG: {collection_name} - found {len(docs)} documents")
                
                if docs:
                    context_parts.append(f"\n=== {collection_name.upper()} ({len(docs)} records) ===")
                    
                   # For COUNT queries on master entities: ONLY send header, skip individual records
                    # This prevents LLM from trying to count distinct field values
                    if is_count_query and collection_name in master_entity_tables:
                        context_parts.append(f"[Total: {len(docs)} unique {collection_name}]")
                        # SMART BREAKDOWN: Add category/status/type breakdown for ALL collections
                        try:
                            breakdown = {}
                            breakdown_field = None
                            
                            # Determine which field to use for breakdown
                            if collection_name == 'rawmaterials':
                                breakdown_field = 'category'
                            elif collection_name == 'products':
                                breakdown_field = 'category'
                            elif collection_name == 'orders':
                                breakdown_field = 'status'
                            elif collection_name == 'quotations':
                                breakdown_field = 'status'
                            elif collection_name == 'customers':
                                breakdown_field = 'type'
                            elif collection_name == 'users':
                                breakdown_field = 'role'
                            elif collection_name == 'chathistories':
                                breakdown_field = 'role'
                            elif collection_name == 'meetinglogs':
                                breakdown_field = 'meetingType'
                            elif collection_name == 'tasks':
                                breakdown_field = 'status'
                            
                            # Create breakdown if field exists
                            if breakdown_field and docs:
                                for doc in docs:
                                    value = doc.get(breakdown_field, 'Unknown')
                                    # Handle ObjectId fields by converting to string
                                    if hasattr(value, '__str__'):
                                        value = str(value) if value else 'Unknown'
                                    breakdown[value] = breakdown.get(value, 0) + 1
                                
                                if breakdown:
                                    context_parts.append(f"\n[{breakdown_field.title()} Breakdown:")
                                    for key, count in sorted(breakdown.items(), key=lambda x: x[1], reverse=True):
                                        context_parts.append(f"  - {key}: {count}")
                                    context_parts.append("]")
                                    print(f"DEBUG: Added {breakdown_field} breakdown for {collection_name}")
                        except Exception as e:
                            print(f"DEBUG: Error creating breakdown: {e}")
                        
                        print(f"DEBUG: COUNT query - skipping records, header shows count: {len(docs)}")
                    else:
                        # Include individual records for non-COUNT or non-master queries
                        for idx, doc in enumerate(docs):
                            try:
                                text = self.format_document(doc, collection_name)
                                context_parts.append(text)
                            except Exception as format_error:
                                print(f"DEBUG: Error formatting doc {idx}: {format_error}")
                                continue
            except Exception as e:
                # Skip collections that don't exist or have errors
                print(f"DEBUG: Error with collection {collection_name}: {e}")
                continue
        
        print(f"DEBUG: Collections to query: {collections_to_query}")
        print(f"DEBUG: Context parts found: {len(context_parts)}")
        
        return '\n'.join(context_parts) if context_parts else "No relevant data found."
    
    def query(self, question):
        """Query the RAG system"""
        print(f"❓ Question: {question}\n")
        print("🔍 Fetching relevant data from MongoDB...")
        
        # Fetch data
        context = self.fetch_relevant_data(question)
        
        if "No relevant data found" in context:
            return {
                'question': question,
                'answer': "I couldn't find relevant data in the database. Please check your MongoDB connection or add some data first.",
                'sources_count': 0
            }
        
        print(f"✅ Found data from {len(context.split('===')) - 1} collections")
        print(f"🤖 Generating answer with {config.OPENROUTER_MODEL}...\n")
        
        # Format prompt
        prompt = config.QUERY_TEMPLATE.format(
            context=context,
            question=question
        )
        
        try:
            # Call LLM with improved settings
            response = self.llm_client.chat.completions.create(
                model=config.OPENROUTER_MODEL,
                messages=[
                    {"role": "system", "content": config.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=config.TEMPERATURE,
                max_tokens=config.MAX_TOKENS,
                top_p=0.9,  # Better quality responses
                frequency_penalty=0.3,  # Reduce repetition
                presence_penalty=0.2,  # Encourage diverse vocabulary
                timeout=180  # Generous timeout for complete responses
            )
            
            answer = response.choices[0].message.content
            
            # Validate response quality
            if not answer or len(answer.strip()) < 10:
                print(f"⚠️ WARNING: Insufficient response from LLM. Raw response: {response}")
                answer = "I received limited data. Could you rephrase your question or provide more context?"
            
            # Log token usage for monitoring
            if hasattr(response, 'usage'):
                print(f"📊 Token usage - Prompt: {response.usage.prompt_tokens}, Completion: {response.usage.completion_tokens}")
            
            return {
                'question': question,
                'answer': answer.strip(),
                'sources_count': len(context.split('===')) - 1,
                'model': config.OPENROUTER_MODEL
            }
        
        except Exception as e:
            print(f"❌ ERROR generating response: {str(e)}")
            import traceback
            traceback.print_exc()
            
            return {
                'question': question,
                'answer': f"I encountered an error while processing your question: {str(e)}. Please try again or contact support if this persists.",
                'sources_count': 0,
                'error': str(e)
            }

def interactive_mode():
    """Run in interactive Q&A mode"""
    print("=" * 70)
    print("  VLITE ERP - AI ANALYTICS ASSISTANT")
    print("=" * 70)
    print("\nAsk questions about your business data!")
    print("Type 'quit' to exit\n")
    
    # Initialize
    rag = SimpleRAG()
    
    # Sample questions
    print("💡 Sample questions:")
    print("   - How many customers do we have?")
    print("   - What are the top selling products?")
    print("   - Show me pending orders")
    print("   - List all active machines")
    print()
    
    while True:
        try:
            question = input("💬 You: ").strip()
            
            if not question:
                continue
            
            if question.lower() in ['quit', 'exit', 'q']:
                print("\n👋 Goodbye!\n")
                break
            
            # Query
            result = rag.query(question)
            
            # Display answer
            print(f"🤖 Answer:")
            print(result['answer'])
            print(f"\n📊 Data from {result['sources_count']} collection(s)")
            print()
        
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!\n")
            break
        except Exception as e:
            print(f"\n❌ Error: {str(e)}\n")

def single_query(question):
    """Run a single query"""
    rag = SimpleRAG()
    result = rag.query(question)
    print(f"🤖 Answer:\n{result['answer']}\n")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Single query mode
        question = ' '.join(sys.argv[1:])
        single_query(question)
    else:
        # Interactive mode
        interactive_mode()
