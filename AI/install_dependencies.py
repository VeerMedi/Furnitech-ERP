#!/usr/bin/env python3
"""
One-Click AI Services Setup
Installs all required dependencies automatically
"""

import subprocess
import sys

def install_dependencies():
    """Install all required Python packages"""
    
    print("=" * 70)
    print("🚀 VLITE AI SERVICES - ONE-CLICK INSTALLER".center(70))
    print("=" * 70)
    print()
    
    dependencies = [
        'pymongo',
        'certifi',
        'openai',
        'sentence-transformers',
        'python-dotenv'
    ]
    
    print("📦 Installing dependencies...")
    print()
    
    for package in dependencies:
        print(f"Installing {package}...")
        try:
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', package
            ], stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
            print(f"✅ {package} installed")
        except subprocess.CalledProcessError:
            print(f"❌ Failed to install {package}")
            return False
    
    print()
    print("=" * 70)
    print("✅ ALL DEPENDENCIES INSTALLED SUCCESSFULLY!".center(70))
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Create .env files in:")
    print("   - AI/AI Reports/Analytics/.env")
    print("   - AI/customer_insights/.env")
    print()
    print("2. Add your MongoDB URI and API keys")
    print()
    print("3. Start the application:")
    print("   - Backend: cd backend && npm start")
    print("   - Frontend: cd frontend-org && npm run dev")
    print()
    return True

if __name__ == "__main__":
    success = install_dependencies()
    sys.exit(0 if success else 1)
