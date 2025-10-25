import os
import sys

# Set MongoDB URI
os.environ['MONGODB_URI'] = 'mongodb+srv://admin1:admin1111@cluster0.noevrrs.mongodb.net/employee_db?retryWrites=true&w=majority&appName=Cluster0'

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import the database connection function
from capture_fingerprint_ipc_complete import get_database_connection

print("Testing database connection...")
print("=" * 60)

db, client = get_database_connection()

if db is None:
    print(f"❌ Connection FAILED: {client}")
    sys.exit(1)
else:
    print("✅ Connection SUCCESSFUL!")
    print(f"✅ Database: {db.name}")
    print(f"✅ Client: {type(client).__name__}")
    
    # Test query
    try:
        employees = db.employees
        count = employees.count_documents({})
        print(f"✅ Found {count} employees in database")
    except Exception as e:
        print(f"❌ Query failed: {e}")
    
    sys.exit(0)
