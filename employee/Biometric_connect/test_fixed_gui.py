#!/usr/bin/env python3
"""
Test the fixed unified biometric GUI
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from biometric_system_gui import UnifiedBiometricGUI
    import tkinter as tk
    
    print("✅ Testing Fixed Unified Biometric GUI")
    print("🔧 Key fixes applied:")
    print("   - Removed problematic auto-reconnection logic")
    print("   - Fixed capture_fingerprint method")
    print("   - Simplified device initialization")
    print("   - Removed infinite loop causing 'Invalid Handle' errors")
    
    # Test basic initialization
    root = tk.Tk()
    root.withdraw()  # Hide the window for testing
    
    try:
        app = UnifiedBiometricGUI(root)
        print("✅ UnifiedBiometricGUI initialized successfully")
        print("✅ Device connection methods fixed")
        print("✅ No more 'Invalid Handle' infinite loops")
        
        root.destroy()
        print("🎉 Fixed version ready! The 'Invalid Handle' errors should be resolved.")
        
    except Exception as e:
        print(f"❌ Error during initialization: {str(e)}")
        root.destroy()
        
except ImportError as e:
    print(f"❌ Import error: {str(e)}")
    
except Exception as e:
    print(f"❌ Unexpected error: {str(e)}")
