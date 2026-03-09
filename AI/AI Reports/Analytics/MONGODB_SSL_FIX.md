# MongoDB SSL Certificate Fix - SOLVED ✅

## Problem
MongoDB queries in Python were timing out with this error:
```
[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed: unable to get local issuer certificate
```

## Root Cause
Python on macOS doesn't have access to the system's SSL certificates by default for MongoDB connections.

## Solution
Added SSL certificate path using the `certifi` package:

```python
import certifi
from pymongo import MongoClient

client = MongoClient(
    uri,
    serverSelectionTimeoutMS=10000,
    tlsCAFile=certifi.where()  # ← This fixes it!
)
```

## What Fixed It
1. **Added certifi package** to requirements.txt
2. **Updated MongoDB connection** in query_rag.py with `tlsCAFile=certifi.where()`
3. **Verified** connection works with test query

## Test Results
```
✅ Connected to MongoDB: vlite_erp_multitenant
✅ Collections: ['staffs', 'orders', 'machines', 'customers']
✅ Customer count: 10
✅ Full RAG query successful!
```

## Why It Works
- `certifi.where()` returns the path to Mozilla's CA bundle
- MongoDB uses this to verify SSL certificates
- Same certificates browsers use, so they're always up to date

## Files Changed
1. `query_rag.py` - Added SSL cert parameter
2. `requirements.txt` - Added certifi package

## Verification
Run this to test:
```bash
cd "AI Reports/Analytics"
python3 query_rag.py "How many customers?"
```

Should see:
- ✅ Connects to MongoDB
- ✅ Fetches data
- ✅ Returns answer

---
**MongoDB timeout issue is SOLVED!** 🎉
