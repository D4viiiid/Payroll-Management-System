#!/usr/bin/env python3
"""
Biometric Time Clock GUI for ZKTeco Device
Dedicated attendance scanning interface with automatic Half Day detection and deductions
"""

import tkinter as tk
from tkinter import ttk, messagebox
import sys
import requests
import threading
import time
import json
import os
from pyzkfp import ZKFP2
from PIL import Image, ImageTk
import io
from datetime import datetime, timedelta

class AttendanceGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Biometric Time Clock - ZKTeco")
        self.root.geometry("800x600")
        self.root.resizable(False, False)

        self.zkfp2 = None
        self.is_capturing = False
        self.current_scan_thread = None
        self.backend_url = "http://localhost:5000"

        self.setup_ui()
        self.check_backend_connection()

    def setup_ui(self):
        """Setup the main UI components"""
        # Main container
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Title
        title_label = ttk.Label(main_frame, text="Biometric Time Clock",
                               font=('Arial', 20, 'bold'))
        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))

        # Status section
        status_frame = ttk.LabelFrame(main_frame, text="Device Status", padding="10")
        status_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 20))

        # Backend status
        ttk.Label(status_frame, text="Backend:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.backend_status_label = ttk.Label(status_frame, text="Checking...",
                                             foreground="orange")
        self.backend_status_label.grid(row=0, column=1, sticky=tk.W, pady=2, padx=(10, 0))

        # Device status
        ttk.Label(status_frame, text="Device:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.device_status_label = ttk.Label(status_frame, text="Disconnected",
                                            foreground="red")
        self.device_status_label.grid(row=1, column=1, sticky=tk.W, pady=2, padx=(10, 0))

        # Control buttons
        button_frame = ttk.Frame(status_frame)
        button_frame.grid(row=2, column=0, columnspan=2, pady=(10, 0))

        self.btn_connect = ttk.Button(button_frame, text="Connect Device",
                                     command=self.connect_device)
        self.btn_connect.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_disconnect = ttk.Button(button_frame, text="Disconnect Device",
                                        command=self.disconnect_device, state=tk.DISABLED)
        self.btn_disconnect.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_reconnect = ttk.Button(button_frame, text="Reconnect Device",
                                       command=self.manual_reconnect, state=tk.DISABLED)
        self.btn_reconnect.pack(side=tk.LEFT)

        # Scan section
        scan_frame = ttk.LabelFrame(main_frame, text="Fingerprint Scan", padding="15")
        scan_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 20))

        # Scan button
        self.btn_scan = ttk.Button(scan_frame, text="Scan Fingerprint for Attendance",
                                  command=self.start_attendance_scan,
                                  state=tk.DISABLED, width=30)
        self.btn_scan.pack(pady=(0, 15))

        # Progress bar for scan
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(scan_frame, variable=self.progress_var,
                                           maximum=100, length=300, mode='determinate')
        self.progress_bar.pack(pady=(0, 10))

        # Status message
        self.scan_status_label = ttk.Label(scan_frame, text="Ready to scan",
                                          font=('Arial', 12))
        self.scan_status_label.pack(pady=(0, 10))

        # Result section
        result_frame = ttk.LabelFrame(main_frame, text="Last Scan Result", padding="10")
        result_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E))

        # Result display
        self.result_text = tk.Text(result_frame, height=8, width=60, state=tk.DISABLED,
                                  font=('Arial', 10))
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # Clear result button
        ttk.Button(result_frame, text="Clear Result",
                  command=self.clear_result).pack(pady=(10, 0))

    def check_backend_connection(self):
        """Check if backend server is running"""
        try:
            # ✅ Fix: Use correct endpoint for testing backend connectivity
            response = requests.get(f"{self.backend_url}/api/attendance", timeout=5)
            if response.status_code == 200:
                self.backend_status_label.config(text="Connected", foreground="green")
                self.log("✅ Backend server connection verified")
                return True
            else:
                self.backend_status_label.config(text="Error", foreground="red")
                self.log(f"⚠️ Backend returned status {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.backend_status_label.config(text="Disconnected", foreground="red")
            self.log("❌ Backend server not reachable")
            return False
        except Exception as e:
            self.backend_status_label.config(text="Error", foreground="red")
            self.log(f"❌ Backend connection error: {str(e)}")
            return False

    def connect_device(self):
        """Connect to ZKTeco fingerprint device"""
        try:
            self.log("Connecting to fingerprint device...")
            self.device_status_label.config(text="Connecting...", foreground="orange")
            self.root.update()

            # Clean up any existing connection
            if self.zkfp2:
                try:
                    self.zkfp2.Terminate()
                except:
                    pass
                self.zkfp2 = None

            # Wait a moment before reconnecting
            time.sleep(0.5)

            self.zkfp2 = ZKFP2()
            self.zkfp2.Init()

            device_count = self.zkfp2.GetDeviceCount()
            if device_count > 0:
                self.log(f"Found {device_count} device(s)")
                self.zkfp2.OpenDevice(0)

                # Try to start the device - some versions need this
                try:
                    if hasattr(self.zkfp2, 'Start'):
                        self.zkfp2.Start()
                        self.log("Device started successfully")
                    else:
                        self.log("Device Start() method not available, proceeding without it")
                except Exception as start_error:
                    self.log(f"Device Start() failed (this is normal for some versions): {start_error}")

                # Test the connection with a quick capture attempt
                try:
                    # Just test if we can call AcquireFingerprint without errors
                    test_capture = self.zkfp2.AcquireFingerprint()
                    self.log("Device connection test successful")
                except Exception as test_error:
                    self.log(f"Device connection test failed: {test_error}")
                    # Continue anyway, the device might still work

                self.device_status_label.config(text="Connected", foreground="green")
                self.btn_connect.config(state=tk.DISABLED)
                self.btn_disconnect.config(state=tk.NORMAL)
                self.btn_reconnect.config(state=tk.NORMAL)
                self.btn_scan.config(state=tk.NORMAL)
                self.log("Device connected successfully")
                messagebox.showinfo("Success", "Fingerprint device connected successfully!")
            else:
                self.device_status_label.config(text="No Device Found", foreground="red")
                self.log("No fingerprint devices found")
                messagebox.showerror("Error", "No fingerprint devices found!")
                if self.zkfp2:
                    try:
                        self.zkfp2.Terminate()
                    except:
                        pass
                    self.zkfp2 = None

        except Exception as e:
            self.device_status_label.config(text="Connection Failed", foreground="red")
            self.log(f"Device connection failed: {str(e)}")
            messagebox.showerror("Error", f"Failed to connect to device:\n{str(e)}")
            if self.zkfp2:
                try:
                    self.zkfp2.Terminate()
                except:
                    pass
                self.zkfp2 = None

    def reconnect_device(self):
        """Reconnect to the fingerprint device"""
        try:
            self.log("Attempting to reconnect device...")
            
            # Disconnect first
            if self.zkfp2:
                try:
                    self.zkfp2.Terminate()
                except:
                    pass
                self.zkfp2 = None
            
            # Wait a moment
            time.sleep(1)
            
            # Reconnect
            self.zkfp2 = ZKFP2()
            self.zkfp2.Init()
            
            device_count = self.zkfp2.GetDeviceCount()
            if device_count > 0:
                self.zkfp2.OpenDevice(0)
                
                # Try to start the device
                try:
                    if hasattr(self.zkfp2, 'Start'):
                        self.zkfp2.Start()
                        self.log("Device reconnected and started successfully")
                    else:
                        self.log("Device reconnected successfully (Start method not available)")
                except Exception as start_error:
                    self.log(f"Device Start() failed during reconnect: {start_error}")
                
                self.log("✅ Device reconnected successfully")
                return True
            else:
                self.log("❌ No devices found during reconnect")
                return False
                
        except Exception as e:
            self.log(f"❌ Device reconnect failed: {str(e)}")
            return False

    def disconnect_device(self):
        """Disconnect from fingerprint device"""
        try:
            if self.zkfp2:
                self.zkfp2.Terminate()
                self.zkfp2 = None

            self.device_status_label.config(text="Disconnected", foreground="red")
            self.btn_connect.config(state=tk.NORMAL)
            self.btn_disconnect.config(state=tk.DISABLED)
            self.btn_reconnect.config(state=tk.DISABLED)
            self.btn_scan.config(state=tk.DISABLED)
            self.log("Device disconnected successfully")
            messagebox.showinfo("Success", "Device disconnected successfully!")

        except Exception as e:
            self.log(f"Error disconnecting device: {str(e)}")
            messagebox.showerror("Error", f"Error disconnecting device:\n{str(e)}")

    def manual_reconnect(self):
        """Manual device reconnection"""
        try:
            self.log("Manual device reconnection requested...")
            self.device_status_label.config(text="Reconnecting...", foreground="orange")
            self.root.update()
            
            success = self.reconnect_device()
            
            if success:
                self.device_status_label.config(text="Connected", foreground="green")
                self.btn_connect.config(state=tk.DISABLED)
                self.btn_disconnect.config(state=tk.NORMAL)
                self.btn_reconnect.config(state=tk.NORMAL)
                self.btn_scan.config(state=tk.NORMAL)
                messagebox.showinfo("Success", "Device reconnected successfully!")
            else:
                self.device_status_label.config(text="Reconnection Failed", foreground="red")
                self.btn_connect.config(state=tk.NORMAL)
                self.btn_disconnect.config(state=tk.DISABLED)
                self.btn_reconnect.config(state=tk.DISABLED)
                self.btn_scan.config(state=tk.DISABLED)
                messagebox.showerror("Error", "Device reconnection failed!")
                
        except Exception as e:
            self.log(f"Manual reconnect error: {str(e)}")
            self.device_status_label.config(text="Reconnection Failed", foreground="red")
            messagebox.showerror("Error", f"Manual reconnection failed:\n{str(e)}")

    def start_attendance_scan(self):
        """Start the attendance scanning process"""
        if self.is_capturing:
            return

        self.is_capturing = True
        self.btn_scan.config(state=tk.DISABLED)
        self.progress_var.set(0)
        self.scan_status_label.config(text="Place finger on scanner...")

        # Start scan in separate thread
        self.current_scan_thread = threading.Thread(target=self.perform_attendance_scan)
        self.current_scan_thread.daemon = True
        self.current_scan_thread.start()

    def perform_attendance_scan(self):
        """Perform the actual fingerprint scan and attendance recording"""
        try:
            # Update progress
            self.root.after(0, lambda: self.progress_var.set(10))
            self.root.after(0, lambda: self.scan_status_label.config(text="Initializing scan..."))

            # Wait a moment for device to be ready
            time.sleep(0.5)

            # Capture fingerprint
            self.root.after(0, lambda: self.progress_var.set(30))
            self.root.after(0, lambda: self.scan_status_label.config(text="Capturing fingerprint..."))

            capture = self.capture_fingerprint()
            if not capture:
                self.root.after(0, self.scan_failed, "Fingerprint capture failed or timeout")
                return

            template, img = capture

            # Convert to hex string (same format as registration)
            self.root.after(0, lambda: self.progress_var.set(60))
            self.root.after(0, lambda: self.scan_status_label.config(text="Processing fingerprint..."))

            template_hex = bytes(template).hex()
            
            # Debug logging
            self.log(f"🔍 DEBUG: Template type: {type(template)}")
            self.log(f"🔍 DEBUG: Template length: {len(template)}")
            self.log(f"🔍 DEBUG: Template hex length: {len(template_hex)}")
            self.log(f"🔍 DEBUG: Template hex first 100 chars: {template_hex[:100]}...")
            self.log(f"🔍 DEBUG: Template hex last 100 chars: ...{template_hex[-100:]}")

            # Send to backend
            self.root.after(0, lambda: self.progress_var.set(80))
            self.root.after(0, lambda: self.scan_status_label.config(text="Recording attendance..."))

            success, result = self.record_attendance(template_hex)

            if success:
                self.root.after(0, lambda: self.progress_var.set(100))
                self.root.after(0, lambda: self.scan_status_label.config(text="Attendance recorded successfully!"))
                self.root.after(0, self.scan_success, result)
            else:
                self.root.after(0, self.scan_failed, result)

        except Exception as e:
            self.root.after(0, self.scan_failed, f"Scan error: {str(e)}")

        finally:
            self.is_capturing = False
            self.root.after(0, lambda: self.btn_scan.config(state=tk.NORMAL))

    def capture_fingerprint(self, timeout=20):
        """Capture fingerprint from device with timeout"""
        start_time = time.time()
        consecutive_errors = 0
        max_consecutive_errors = 5

        while time.time() - start_time < timeout:
            try:
                if self.zkfp2:
                    capture = self.zkfp2.AcquireFingerprint()
                    if capture:
                        consecutive_errors = 0  # Reset error counter on success
                        return capture
                    else:
                        consecutive_errors += 1
                        if consecutive_errors >= max_consecutive_errors:
                            self.log(f"Too many consecutive capture failures, reconnecting device...")
                            self.reconnect_device()
                            consecutive_errors = 0
            except Exception as e:
                consecutive_errors += 1
                self.log(f"Capture attempt failed: {str(e)}")
                
                # If we get too many consecutive errors, try to reconnect
                if consecutive_errors >= max_consecutive_errors:
                    self.log(f"Too many consecutive errors, reconnecting device...")
                    self.reconnect_device()
                    consecutive_errors = 0

            time.sleep(0.1)

        return None

    def record_attendance(self, fingerprint_template):
        """Send fingerprint to backend for attendance recording"""
        try:
            payload = {
                "fingerprint_template": fingerprint_template
            }

            headers = {'Content-Type': 'application/json'}
            self.log(f"📤 Sending attendance request to {self.backend_url}/api/attendance/record")
            response = requests.post(f"{self.backend_url}/api/attendance/record",
                                   json=payload, headers=headers, timeout=10)

            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Attendance recorded successfully: {result.get('message', 'Success')}")
                return True, result
            else:
                error_data = response.json()
                error_msg = error_data.get('error', f'HTTP {response.status_code}')
                self.log(f"❌ Attendance recording failed: {error_msg}")
                return False, error_msg

        except requests.exceptions.RequestException as e:
            error_msg = f"Network error: {str(e)}"
            self.log(f"❌ {error_msg}")
            return False, error_msg
        except Exception as e:
            error_msg = f"Error recording attendance: {str(e)}"
            self.log(f"❌ {error_msg}")
            return False, error_msg

    def scan_success(self, result):
        """Handle successful scan"""
        try:
            # Note: Light control disabled to prevent threading issues
            # No device light control in success handler

            # Format result message
            employee = result.get('employee', {})
            attendance = result.get('attendance', {})

            message = f"""✅ ATTENDANCE RECORDED SUCCESSFULLY

👤 Employee: {employee.get('name', 'Unknown')}
🆔 ID: {employee.get('employeeId', 'N/A')}

⏰ Time: {attendance.get('time', 'N/A')}
📝 Status: {attendance.get('status', 'N/A')}

📊 Attendance Status: {result.get('attendance', {}).get('attendanceStatus', 'Present')}

{result.get('message', '')}"""

            self.display_result(message, "success")

            # Auto-clear after 10 seconds
            self.root.after(10000, self.clear_result)

        except Exception as e:
            self.log(f"Error displaying success result: {str(e)}")

    def scan_failed(self, error_message):
        """Handle failed scan"""
        try:
            # Note: Light control disabled to prevent threading issues
            # No device light control in failure handler

            message = f"""❌ SCAN FAILED

Error: {error_message}

Please try again or contact administrator if the problem persists."""

            self.display_result(message, "error")

        except Exception as e:
            self.log(f"Error displaying failed result: {str(e)}")

    def display_result(self, message, result_type):
        """Display result in the text area"""
        try:
            self.result_text.config(state=tk.NORMAL)
            self.result_text.delete(1.0, tk.END)

            # Set color based on result type
            if result_type == "success":
                self.result_text.tag_configure("success", foreground="green")
                self.result_text.insert(tk.END, message, "success")
            else:
                self.result_text.tag_configure("error", foreground="red")
                self.result_text.insert(tk.END, message, "error")

            self.result_text.config(state=tk.DISABLED)

        except Exception as e:
            self.log(f"Error displaying result: {str(e)}")

    def clear_result(self):
        """Clear the result display"""
        try:
            self.result_text.config(state=tk.NORMAL)
            self.result_text.delete(1.0, tk.END)
            self.result_text.config(state=tk.DISABLED)
            self.scan_status_label.config(text="Ready to scan")
            self.progress_var.set(0)
        except Exception as e:
            self.log(f"Error clearing result: {str(e)}")

    def log(self, message):
        """Log message to console (for debugging)"""
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] {message}")

    def on_closing(self):
        """Handle window closing"""
        try:
            if self.zkfp2:
                self.zkfp2.Terminate()
        except:
            pass
        self.root.destroy()

def main():
    root = tk.Tk()
    app = AttendanceGUI(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()
