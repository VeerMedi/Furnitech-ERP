"""
RAG Configuration - MongoDB Direct Approach
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI')
TENANT_ID = os.getenv('TENANT_ID', '')  # Leave empty to query all data

# OpenRouter Configuration
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
# Using GPT-4o - Superior reasoning and context understanding
OPENROUTER_MODEL = os.getenv('OPENROUTER_MODEL', 'openai/gpt-4o')
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

# Query Configuration - PRODUCTION OPTIMIZED
MAX_DOCUMENTS_PER_COLLECTION = int(os.getenv('MAX_DOCUMENTS_PER_COLLECTION', 1000))  # Increased to fetch all materials for accurate counting
TEMPERATURE = float(os.getenv('TEMPERATURE', 0.7))  # Balanced for natural, accurate responses
MAX_TOKENS = int(os.getenv('MAX_TOKENS', 2000))  # Sufficient for detailed, complete answers

# Data Models to Query - ALL 32 Collections organized by functional area
DATA_MODELS = [
    # Core Business (7)
    'customers', 'orders', 'quotations', 'products', 'inquiries', 'leads', 'meetinglogs',
    
    # Operations (5)
    'machines', 'transports', 'vendors', 'staffs', 'dispatches',
    
    # Inventory Management (5)
    'inventoryitems', 'inventorystocks', 'inventorytransactions', 'rawmaterials', 'inventorysuggestions',
    
    # Purchasing (3)
    'purchaseindents', 'purchaseorders', 'grns',
    
    # Production (3)
    'productionorders', 'workflowsteps', 'drawings',
    
    # Financial (2)
    'ledgers', 'advancepayments',
    
    # System/Admin (7)
    'users', 'roles', 'organizations', 'features', 'superadmins', 'chathistories', 'tasks'
]

# Collection Priority (EXPANDED for full DB access)
HIGH_PRIORITY_COLLECTIONS = [
    'customers', 'orders', 'quotations', 'products', 'inventoryitems', 
    'machines', 'inquiries', 'productionorders', 'transports', 'staffs', 'vendors', 'advancepayments', 'users', 'meetinglogs'
]

MEDIUM_PRIORITY_COLLECTIONS = [
    'leads', 'dispatches', 'purchaseorders', 'rawmaterials', 'inventorystocks',
    'purchaseindents', 'grns', 'workflowsteps', 'ledgers', 'chathistories', 'inventorysuggestions'
]

# Low priority collections queried only when specifically requested
LOW_PRIORITY_COLLECTIONS = [
    'roles', 'organizations', 'features', 'superadmins', 'tasks'
]

# PRODUCTION MODE - Intelligent Business Assistant
SYSTEM_PROMPT = """You are an intelligent business assistant for Vlite Furniture ERP system.

🎯 CORE PRINCIPLES:

1. **ACCURACY FIRST**: Use ONLY the data provided. If information is missing, say so clearly.

2. **CLARITY & STRUCTURE**: 
   - Use clear formatting with emojis for visual clarity
   - Break down complex answers into sections
   - Use bullet points for lists
   - Highlight key numbers in **bold**

3. **SMART RESPONSES**:
   - For counts: Give the number with context ("📦 **504 raw materials** in inventory")
   - For lists: Show top 5-10 items with relevant details
   - For analysis: Provide insights, trends, and actionable information
   - For comparisons: Use clear metrics and percentages

4. **LANGUAGE MATCHING**:
   - Match user's language (English/Hindi/Hinglish)
   - Keep professional tone but friendly
   - No unnecessary greetings or filler

5. **HELPFUL EMOJIS**:
   📦 Materials/Inventory | 👥 Customers/Staff | 📝 Orders/Documents | 💰 Quotations/Finance
   ⚙️ Machines/Production | 🚚 Transport/Delivery | ⚠️ Alerts/Issues | ✅ Active/Complete

6. **CONTEXT AWARENESS**:
   - Collection headers show counts: === RAWMATERIALS (504 records) ===
   - Use these counts for accurate totals
   - Notice data patterns and provide insights

7. **COMPLETENESS**: Give thorough answers with all relevant details from the data.

**Remember**: You're helping run a business. Be precise, professional, and practical.
"""

# Query Template - Intelligent Response Generation
QUERY_TEMPLATE = """You are analyzing business data from Vlite Furniture ERP system.

📊 AVAILABLE DATA:
{context}

❓ USER QUESTION: {question}

📋 RESPONSE INSTRUCTIONS:

1. **Analyze the question type**:
   - Count/Total query → Give exact numbers from collection headers
   - List query → Show relevant items with details
   - Status query → Provide current state and breakdown
   - Analysis query → Give insights, trends, comparisons
   - General chat → Respond naturally, offer to help with business data

2. **Language matching**:
   - Detect user's language (English/Hindi/Hinglish)
   - Respond in the SAME language and style
   - Keep tone professional yet conversational

3. **Use the data intelligently**:
   - Collection headers show accurate counts: === COLLECTION (X records) ===
   - Breakdowns show distribution by category/status/type
   - Individual records show specific details
   - Notice patterns and provide insights

4. **Format your response**:
   - Start with direct answer to the question
   - Add relevant details or breakdown
   - Use emojis for clarity (📦👥📝💰⚙️🚚)
   - Use **bold** for important numbers
   - Use bullet points for lists

5. **Be complete but concise**:
   - Answer fully but avoid unnecessary details
   - Provide context where helpful
   - If data is missing, state it clearly

Now analyze the data and provide a helpful, accurate response."""
