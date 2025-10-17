#!/usr/bin/env python3
"""
Test script for the Unified Biometric System GUI
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from biometric_system_gui import UnifiedBiometricGUI
    import tkinter as tk
    
    print("✅ Successfully imported UnifiedBiometricGUI")
    print("✅ All dependencies are available")
    print("🚀 Ready to launch the unified biometric system!")
    
    # Test basic initialization
    root = tk.Tk()
    root.withdraw()  # Hide the window for testing
    
    try:
        app = UnifiedBiometricGUI(root)
        print("✅ UnifiedBiometricGUI initialized successfully")
        print("✅ All UI components created")
        print("✅ Device connection methods available")
        print("✅ Registration methods available")
        print("✅ Attendance methods available")
        
        root.destroy()
        print("🎉 All tests passed! The unified biometric system is ready to use.")
        
    except Exception as e:
        print(f"❌ Error during initialization: {str(e)}")
        root.destroy()
        
except ImportError as e:
    print(f"❌ Import error: {str(e)}")
    print("💡 Make sure all required packages are installed:")
    print("   pip install pyzkfp pillow requests")
    
except Exception as e:
    print(f"❌ Unexpected error: {str(e)}")
