#!/usr/bin/env python3
"""
Enhanced Biometric Time Clock GUI for ZKTeco Device - Phase 2
With real-time attendance validation and status warnings
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

class EnhancedAttendanceGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Enhanced Biometric Time Clock - ZKTeco (Phase 2)")
        self.root.geometry("900x700")
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
        title_label = ttk.Label(main_frame, text="Enhanced Biometric Time Clock - Phase 2",
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

        # Phase 2 indicator
        ttk.Label(status_frame, text="Validation:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.validation_label = ttk.Label(status_frame, text="Phase 2 Enhanced (8:00-9:30 Cutoff)",
                                         foreground="blue", font=('Arial', 9, 'bold'))
        self.validation_label.grid(row=2, column=1, sticky=tk.W, pady=2, padx=(10, 0))

        # Control buttons
        button_frame = ttk.Frame(status_frame)
        button_frame.grid(row=3, column=0, columnspan=2, pady=(10, 0))

        self.btn_connect = ttk.Button(button_frame, text="Connect Device",
                                     command=self.connect_device)
        self.btn_connect.pack(side=tk.LEFT, padx=(0, 10))

        self.btn_disconnect = ttk.Button(button_frame, text="Disconnect Device",
                                        command=self.disconnect_device, state=tk.DISABLED)
        self.btn_disconnect.pack(side=tk.LEFT, padx=(0, 10))

        # Scan section
        scan_frame = ttk.LabelFrame(main_frame, text="Fingerprint Scan", padding="15")
        scan_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 20))

        # Scan button
        self.btn_scan = ttk.Button(scan_frame, text="Scan Fingerprint for Attendance",
                                  command=self.start_attendance_scan,
                                  state=tk.DISABLED, width=35)
        self.btn_scan.pack(pady=(0, 15))

        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(scan_frame, variable=self.progress_var,
                                           maximum=100, length=350, mode='determinate')
        self.progress_bar.pack(pady=(0, 10))

        # Status message
        self.scan_status_label = ttk.Label(scan_frame, text="Ready to scan",
                                          font=('Arial', 12))
        self.scan_status_label.pack(pady=(0, 10))

        # Result section with larger display area
        result_frame = ttk.LabelFrame(main_frame, text="Attendance Information", padding="15")
        result_frame.grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Result text area
        self.result_text = tk.Text(result_frame, height=15, width=70, wrap=tk.WORD,
                                  font=('Courier', 10))
        self.result_text.pack(pady=(0, 10))
        self.result_text.insert('1.0', 'Waiting for fingerprint scan...\n\n' +
                               '⏰ Time-In Rules:\n' +
                               '  • 8:00 AM - 9:30 AM  → Full Day (₱550)\n' +
                               '  • 9:31 AM onwards    → Half Day (₱275)\n' +
                               '  • Must work 4+ hours for half day\n' +
                               '  • Lunch: 12:00-1:00 PM (excluded)\n')
        self.result_text.config(state=tk.DISABLED)

    def log(self, message):
        """Log message to result text area"""
        self.result_text.config(state=tk.NORMAL)
        timestamp = datetime.now().strftime('%H:%M:%S')
        self.result_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.result_text.see(tk.END)
        self.result_text.config(state=tk.DISABLED)
        print(f"[{timestamp}] {message}")

    def check_backend_connection(self):
        """Check if backend is accessible"""
        try:
            response = requests.get(f"{self.backend_url}/api/employees", timeout=3)
            if response.status_code == 200:
                self.backend_status_label.config(text="Connected ✓", foreground="green")
                self.log("✅ Backend connection successful")
            else:
                self.backend_status_label.config(text="Error", foreground="red")
                self.log("⚠️ Backend returned non-200 status")
        except Exception as e:
            self.backend_status_label.config(text="Disconnected ✗", foreground="red")
            self.log(f"❌ Backend connection failed: {str(e)}")

    def connect_device(self):
        """Connect to fingerprint device"""
        try:
            self.log("Connecting to fingerprint device...")
            self.zkfp2 = ZKFP2()
            self.zkfp2.Init()

            device_count = self.zkfp2.GetDeviceCount()
            self.log(f"Found {device_count} device(s)")

            if device_count > 0:
                self.zkfp2.OpenDevice(0)
                self.log("Device opened successfully")

                self.device_status_label.config(text="Connected ✓", foreground="green")
                self.btn_connect.config(state=tk.DISABLED)
                self.btn_disconnect.config(state=tk.NORMAL)
                self.btn_scan.config(state=tk.NORMAL)
                
                messagebox.showinfo("Success", "Device connected successfully!\n\nReady to scan fingerprints.")
            else:
                raise Exception("No fingerprint devices found")

        except Exception as e:
            self.log(f"❌ Device connection failed: {str(e)}")
            self.device_status_label.config(text="Connection Failed", foreground="red")
            messagebox.showerror("Error", f"Failed to connect to device:\n{str(e)}")

    def disconnect_device(self):
        """Disconnect from fingerprint device"""
        try:
            if self.zkfp2:
                self.zkfp2.Terminate()
                self.zkfp2 = None

            self.device_status_label.config(text="Disconnected", foreground="red")
            self.btn_connect.config(state=tk.NORMAL)
            self.btn_disconnect.config(state=tk.DISABLED)
            self.btn_scan.config(state=tk.DISABLED)
            self.log("Device disconnected successfully")

        except Exception as e:
            self.log(f"Error disconnecting device: {str(e)}")

    def start_attendance_scan(self):
        """Start the attendance scanning process"""
        if self.is_capturing:
            return

        self.is_capturing = True
        self.btn_scan.config(state=tk.DISABLED)
        self.progress_var.set(0)
        self.scan_status_label.config(text="Place finger on scanner...")

        self.current_scan_thread = threading.Thread(target=self.perform_attendance_scan)
        self.current_scan_thread.daemon = True
        self.current_scan_thread.start()

    def perform_attendance_scan(self):
        """Perform the actual fingerprint scan with Phase 2 validation"""
        try:
            self.root.after(0, lambda: self.progress_var.set(10))
            self.root.after(0, lambda: self.scan_status_label.config(text="Capturing fingerprint..."))

            # Capture fingerprint
            capture = self.capture_fingerprint()
            if not capture:
                self.root.after(0, self.scan_failed, "Fingerprint capture failed or timeout")
                return

            template, img = capture
            template_hex = bytes(template).hex()

            self.root.after(0, lambda: self.progress_var.set(40))
            self.root.after(0, lambda: self.scan_status_label.config(text="Matching fingerprint..."))

            # Send to backend for matching and recording
            success, result = self.record_attendance_with_validation(template_hex)

            if success:
                self.root.after(0, lambda: self.progress_var.set(100))
                self.root.after(0, lambda: self.scan_status_label.config(text="Success!"))
                self.root.after(0, self.scan_success, result)
            else:
                self.root.after(0, self.scan_failed, result)

        except Exception as e:
            self.root.after(0, self.scan_failed, f"Scan error: {str(e)}")

        finally:
            self.is_capturing = False
            self.root.after(0, lambda: self.btn_scan.config(state=tk.NORMAL))

    def capture_fingerprint(self, timeout=20):
        """Capture fingerprint from device"""
        start_time = time.time()

        while time.time() - start_time < timeout:
            try:
                if self.zkfp2:
                    capture = self.zkfp2.AcquireFingerprint()
                    if capture:
                        return capture
            except Exception as e:
                self.log(f"Capture attempt failed: {str(e)}")

            time.sleep(0.1)

        return None

    def record_attendance_with_validation(self, fingerprint_template):
        """Send fingerprint to backend with Phase 2 validation"""
        try:
            # Step 1: Match fingerprint and record attendance
            payload = {"fingerprint_template": fingerprint_template}
            headers = {'Content-Type': 'application/json'}
            
            self.log(f"📤 Matching fingerprint...")
            response = requests.post(f"{self.backend_url}/api/attendance/record",
                                   json=payload, headers=headers, timeout=10)

            if response.status_code != 200:
                error_data = response.json() if response.headers.get('content-type') == 'application/json' else {}
                error_msg = error_data.get('error', f'HTTP {response.status_code}')
                return False, error_msg

            result = response.json()
            employee = result.get('employee', {})
            attendance = result.get('attendance', {})
            
            employee_id = employee.get('employeeId')
            
            # Step 2: Real-time validation for time-in
            if attendance and not attendance.get('timeOut'):
                # This is a time-in scan, validate it
                now = datetime.now()
                time_in = now.strftime('%H:%M:%S')
                date = now.strftime('%Y-%m-%d')
                
                self.log(f"⏰ Validating time-in at {time_in}...")
                
                validation_response = requests.post(
                    f"{self.backend_url}/api/attendance/validate-timein",
                    json={
                        'timeIn': time_in,
                        'date': date,
                        'employeeId': employee_id
                    },
                    timeout=5
                )
                
                if validation_response.status_code == 200:
                    validation_data = validation_response.json()
                    validation = validation_data.get('validation', {})
                    result['validation'] = validation  # Add validation to result
                    self.log(f"✅ Validation: {validation.get('status')}")

            return True, result

        except requests.exceptions.RequestException as e:
            return False, f"Network error: {str(e)}"
        except Exception as e:
            return False, f"Error: {str(e)}"

    def scan_success(self, result):
        """Handle successful scan with Phase 2 validation display"""
        try:
            employee = result.get('employee', {})
            attendance = result.get('attendance', {})
            validation = result.get('validation', {})

            employee_name = employee.get('name', 'Unknown')
            employee_id = employee.get('employeeId', 'N/A')
            time_recorded = attendance.get('time', 'N/A')
            is_timeout = attendance.get('timeOut') is not None

            # Format the display message
            if is_timeout:
                # TIME-OUT DISPLAY
                message = f"""
╔════════════════════════════════════════════════╗
║     ✅ TIME-OUT RECORDED SUCCESSFULLY          ║
╚════════════════════════════════════════════════╝

👤 Employee: {employee_name}
🆔 ID: {employee_id}
⏰ Time-Out: {time_recorded}

📊 Your attendance for today has been completed.
   View payroll details in the system.

═══════════════════════════════════════════════════
"""
                self.log(f"✅ TIME-OUT: {employee_name} at {time_recorded}")
                messagebox.showinfo("✅ Time-Out Recorded", 
                    f"Time-Out recorded successfully!\n\n{employee_name}\n{time_recorded}")
            
            elif validation:
                # TIME-IN DISPLAY WITH VALIDATION
                status = validation.get('status', 'Unknown')
                message_text = validation.get('message', '')
                day_type = validation.get('dayType', 'Unknown')
                employee_info = validation.get('employeeInfo', {})
                
                if status == 'On Time':
                    # GREEN - SUCCESS
                    icon = "✅"
                    color_msg = "FULL DAY CREDITED"
                    expected_pay = employee_info.get('expectedFullDayPay', 550)
                    details = f"You will receive FULL DAY salary (₱{expected_pay})"
                    
                    message = f"""
╔════════════════════════════════════════════════╗
║     {icon} TIME-IN SUCCESSFUL - ON TIME!         ║
╚════════════════════════════════════════════════╝

👤 Employee: {employee_name}
🆔 ID: {employee_id}
⏰ Time-In: {time_recorded}

📅 Status: {color_msg}
💰 Expected Pay: ₱{expected_pay} (Full Day)

{message_text}

{details}

═══════════════════════════════════════════════════
"""
                    self.log(f"✅ TIME-IN (ON TIME): {employee_name} at {time_recorded}")
                    messagebox.showinfo("✅ On Time!", 
                        f"Good morning!\n\n{employee_name}\nTime-In: {time_recorded}\n\nFull Day Credited: ₱{expected_pay}")
                
                else:  # Half Day
                    # YELLOW - WARNING
                    icon = "⚠️"
                    color_msg = "HALF DAY (WARNING)"
                    expected_pay = employee_info.get('expectedHalfDayPay', 275)
                    details = f"⚠️ You must work at least 4 hours to receive half-day pay"
                    
                    message = f"""
╔════════════════════════════════════════════════╗
║     {icon} TIME-IN RECORDED - LATE ARRIVAL      ║
╚════════════════════════════════════════════════╝

👤 Employee: {employee_name}
🆔 ID: {employee_id}
⏰ Time-In: {time_recorded}

📅 Status: {color_msg}
💰 Expected Pay: ₱{expected_pay} (Half Day)

⚠️ WARNING: {message_text}

{details}

Arrived after 9:30 AM cutoff.
Work minimum 4 hours to qualify for half-day pay.

═══════════════════════════════════════════════════
"""
                    self.log(f"⚠️ TIME-IN (HALF DAY): {employee_name} at {time_recorded}")
                    messagebox.showwarning("⚠️ Half Day Warning", 
                        f"Late Arrival!\n\n{employee_name}\nTime-In: {time_recorded}\n\n{message_text}\n\nExpected: ₱{expected_pay}")
            
            else:
                # BASIC DISPLAY (fallback if validation not available)
                message = f"""
╔════════════════════════════════════════════════╗
║     ✅ ATTENDANCE RECORDED                      ║
╚════════════════════════════════════════════════╝

👤 Employee: {employee_name}
🆔 ID: {employee_id}
⏰ Time: {time_recorded}

═══════════════════════════════════════════════════
"""
                self.log(f"✅ ATTENDANCE: {employee_name} at {time_recorded}")

            # Display in text area
            self.result_text.config(state=tk.NORMAL)
            self.result_text.delete('1.0', tk.END)
            self.result_text.insert('1.0', message)
            self.result_text.config(state=tk.DISABLED)

        except Exception as e:
            self.log(f"Error displaying result: {str(e)}")

    def scan_failed(self, error_message):
        """Handle failed scan"""
        self.progress_var.set(0)
        self.scan_status_label.config(text="Scan failed")
        
        self.result_text.config(state=tk.NORMAL)
        self.result_text.delete('1.0', tk.END)
        self.result_text.insert('1.0', f"❌ SCAN FAILED\n\n{error_message}\n\nPlease try again.")
        self.result_text.config(state=tk.DISABLED)
        
        self.log(f"❌ Scan failed: {error_message}")
        messagebox.showerror("Scan Failed", f"Attendance scan failed:\n\n{error_message}")


def main():
    root = tk.Tk()
    app = EnhancedAttendanceGUI(root)
    root.mainloop()


if __name__ == '__main__':
    main()
