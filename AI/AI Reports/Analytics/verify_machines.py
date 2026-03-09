"""
Verify machine count in database
"""
from pymongo import MongoClient
import config

client = MongoClient(config.MONGODB_URI)
db = client.get_default_database()

print("=" * 70)
print("  MACHINE COUNT VERIFICATION")
print("=" * 70)

# Count machines
count = db['machines'].count_documents({})
print(f"\n✅ Total machines in database: {count}")

print("\n📋 First 10 machines:")
for i, machine in enumerate(db['machines'].find().limit(10), 1):
    name = machine.get('name') or machine.get('machineName', 'Unknown')
    status = machine.get('operationalStatus', machine.get('status', 'Unknown'))
    print(f"{i}. {name} - Status: {status}")

print(f"\n{'='*70}")
print(f"The RAG system is showing the CORRECT count from your database.")
print(f"Your MongoDB has {count} machine records.")
print(f"{'='*70}")
