"""
Debug script to check MongoDB connection and data
"""
from pymongo import MongoClient
import config

print("=" * 70)
print("  RAG DEBUG - MongoDB Data Check")
print("=" * 70)

# Connect to MongoDB
client = MongoClient(config.MONGODB_URI, serverSelectionTimeoutMS=10000)
db = client.get_default_database()

print(f"\n✅ Connected to database: {db.name}")
print(f"📋 TENANT_ID filter: '{config.TENANT_ID}'")

# Check each collection
print("\n📊 Collection Status:")
print("-" * 70)

for collection_name in config.DATA_MODELS:
    try:
        collection = db[collection_name]
        
        # Count without filter
        total_count = collection.count_documents({})
        
        # Count with filter
        if config.TENANT_ID and config.TENANT_ID.strip():
            filtered_count = collection.count_documents({'tenantId': config.TENANT_ID})
        else:
            filtered_count = total_count
        
        print(f"{collection_name:20} | Total: {total_count:3} | Filtered: {filtered_count:3}")
        
        # Show a sample document if exists
        if total_count > 0:
            sample = collection.find_one()
            if sample:
                print(f"                     Sample fields: {list(sample.keys())[:10]}")
    
    except Exception as e:
        print(f"{collection_name:20} | ERROR: {str(e)}")

print("\n" + "=" * 70)
print("  Summary")
print("=" * 70)
print(f"TENANT_ID setting: {config.TENANT_ID if config.TENANT_ID else '(empty - queries ALL data)'}")
print(f"MAX_DOCUMENTS_PER_COLLECTION: {config.MAX_DOCUMENTS_PER_COLLECTION}")
print("\nIf filtered count is 0 but total is > 0, check your TENANT_ID setting!")
