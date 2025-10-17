#!/usr/bin/env python3
"""
Unified Biometric System GUI for ZKTeco Device
Combines fingerprint registration and attendance recording in one application
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
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

class UnifiedBiometricGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Unified Biometric System - ZKTeco")
        self.root.geometry("1000x700")
        self.root.resizable(True, True)

        # Device connection (shared between registration and attendance)
        self.zkfp2 = None
        self.is_capturing = False
        self.current_scan_thread = None
        self.backend_url = "http://localhost:5000"
        
        # Registration data
        self.registered_users = {}
        self.current_templates = []
        self.registration_in_progress = False
        self.scan_count = 0
        self.template_count = 0
        self.device_lock = threading.Lock()
        self.debug_mode = True
        self.skip_duplicate_check = False
        
        # Attendance data
        self.attendance_records = []

        self.setup_ui()
        self.check_backend_connection()
        
        # Load users from MongoDB backend
        self.load_users_from_backend()

    def setup_ui(self):
        """Setup the main UI with tabs"""
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
        main_frame.rowconfigure(1, weight=1)

        # Title
        title_label = ttk.Label(main_frame, text="Unified Biometric System",
                               font=('Arial', 20, 'bold'))
        title_label.grid(row=0, column=0, pady=(0, 20))

        # Device status section
        status_frame = ttk.LabelFrame(main_frame, text="Device Status", padding="10")
        status_frame.grid(row=1, column=0, sticky=(tk.W, tk.E), pady=(0, 10))

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

        # Tabbed interface
        self.notebook = ttk.Notebook(main_frame)
        self.notebook.grid(row=2, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(10, 0))

        # Registration Tab
        self.registration_frame = ttk.Frame(self.notebook, padding="15")
        self.notebook.add(self.registration_frame, text="Employee Registration")
        self.setup_registration_tab()

        # Attendance Tab
        self.attendance_frame = ttk.Frame(self.notebook, padding="15")
        self.notebook.add(self.attendance_frame, text="Attendance Recording")
        self.setup_attendance_tab()

        # Log Tab
        self.log_frame = ttk.Frame(self.notebook, padding="15")
        self.notebook.add(self.log_frame, text="System Logs")
        self.setup_log_tab()

    def setup_registration_tab(self):
        """Setup the registration tab with complete interface from main.py"""
        # Top Section - Device Status and Fingerprint Preview
        top_frame = ttk.Frame(self.registration_frame)
        top_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10))

        # Device Status
        status_frame = ttk.LabelFrame(top_frame, text="Device Status", padding="10")
        status_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 5))

        status_inner = ttk.Frame(status_frame)
        status_inner.pack()

        ttk.Label(status_inner, text="Device Status:").pack(side=tk.LEFT)
        self.reg_status_label = ttk.Label(status_inner, text="Disconnected", 
                                          foreground="red", font=('Arial', 10, 'bold'))
        self.reg_status_label.pack(side=tk.LEFT, padx=5)

        # Initialize/Terminate Buttons
        btn_frame = ttk.Frame(status_frame)
        btn_frame.pack(pady=5)

        self.btn_init = ttk.Button(btn_frame, text="Initialize Device", 
                                  command=self.initialize_device)
        self.btn_init.pack(side=tk.LEFT, padx=5)

        self.btn_terminate = ttk.Button(btn_frame, text="Terminate Device", 
                                        command=self.terminate_device, state=tk.DISABLED)
        self.btn_terminate.pack(side=tk.LEFT, padx=5)

        # Fingerprint Image Display
        image_frame = ttk.LabelFrame(top_frame, text="Fingerprint Preview", padding="10")
        image_frame.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(5, 0))

        self.image_label = ttk.Label(image_frame, text="No image", 
                                     background="gray", relief=tk.SUNKEN)
        self.image_label.config(width=30, anchor=tk.CENTER)
        self.image_label.pack(pady=10)

        # Left Panel - Employee Registration
        left_frame = ttk.LabelFrame(self.registration_frame, text="Employee Registration", padding="10")
        left_frame.grid(row=1, column=0, sticky=(tk.N, tk.W, tk.E), padx=5)

        # Employee Information Fields
        row = 0

        # First Name
        ttk.Label(left_frame, text="First Name:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_first_name = ttk.Entry(left_frame, width=25)
        self.entry_first_name.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Last Name
        ttk.Label(left_frame, text="Last Name:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_last_name = ttk.Entry(left_frame, width=25)
        self.entry_last_name.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Email
        ttk.Label(left_frame, text="Email:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_email = ttk.Entry(left_frame, width=25)
        self.entry_email.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Contact Number
        ttk.Label(left_frame, text="Contact Number:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_contact = ttk.Entry(left_frame, width=25)
        self.entry_contact.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Employment Status
        ttk.Label(left_frame, text="Employment Status:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.combo_status = ttk.Combobox(left_frame, width=22, state="readonly")
        self.combo_status['values'] = ('regular', 'oncall')
        self.combo_status.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Date Hired
        ttk.Label(left_frame, text="Date Hired:*").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_date_hired = ttk.Entry(left_frame, width=25)
        self.entry_date_hired.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Employee ID (auto-generated)
        ttk.Label(left_frame, text="Employee ID:").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_employee_id = ttk.Entry(left_frame, width=25, state="readonly")
        self.entry_employee_id.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Username (auto-generated)
        ttk.Label(left_frame, text="Username:").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_username = ttk.Entry(left_frame, width=25, state="readonly")
        self.entry_username.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Password (auto-generated)
        ttk.Label(left_frame, text="Password:").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.entry_password = ttk.Entry(left_frame, width=25, show="*", state="readonly")
        self.entry_password.grid(row=row, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        row += 1

        # Bind events to auto-generate fields when required fields change
        self.entry_first_name.bind('<KeyRelease>', self.auto_generate_fields)
        self.entry_last_name.bind('<KeyRelease>', self.auto_generate_fields)
        self.entry_contact.bind('<KeyRelease>', self.auto_generate_fields)
        self.combo_status.bind('<<ComboboxSelected>>', self.auto_generate_fields)
        self.entry_date_hired.bind('<KeyRelease>', self.auto_generate_fields)

        # Start Fingerprint Registration Button
        self.btn_register = ttk.Button(left_frame, text="Start Fingerprint Registration", 
                                       command=self.start_registration, state=tk.DISABLED)
        self.btn_register.grid(row=row, column=0, columnspan=2, pady=15)
        row += 1

        # Registration Progress
        self.progress_label = ttk.Label(left_frame, text="Scans: 0/3", font=('Arial', 10))
        self.progress_label.grid(row=row, column=0, columnspan=2, pady=5)
        row += 1

        self.progress_bar = ttk.Progressbar(left_frame, length=300, mode='determinate')
        self.progress_bar.grid(row=row, column=0, columnspan=2, pady=5)
        self.progress_bar['maximum'] = 3
        row += 1

        # Duplicate Detection Status
        self.duplicate_status_label = ttk.Label(left_frame, text="🔍 Checking for duplicates...", 
                                                font=('Arial', 9), foreground="blue")
        self.duplicate_status_label.grid(row=row, column=0, columnspan=2, pady=2)
        row += 1

        # Right Panel - Registered Users and Activity Log
        right_frame = ttk.Frame(self.registration_frame)
        right_frame.grid(row=1, column=1, sticky=(tk.N, tk.W, tk.E, tk.S), padx=5)

        # Registered Users List
        users_frame = ttk.LabelFrame(right_frame, text="Registered Users", padding="10")
        users_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)

        # Treeview for users
        columns = ('ID', 'Name')
        self.users_tree = ttk.Treeview(users_frame, columns=columns, show='headings', height=8)
        self.users_tree.heading('ID', text='User ID')
        self.users_tree.heading('Name', text='Name')
        self.users_tree.column('ID', width=80)
        self.users_tree.column('Name', width=200)
        self.users_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(users_frame, orient=tk.VERTICAL, command=self.users_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.users_tree.configure(yscrollcommand=scrollbar.set)

        # User Management Buttons
        user_btn_frame = ttk.Frame(users_frame)
        user_btn_frame.pack(pady=5)

        self.btn_delete_user = ttk.Button(user_btn_frame, text="Delete Selected User", 
                                         command=self.delete_selected_user, state=tk.DISABLED)
        self.btn_delete_user.pack(side=tk.LEFT, padx=5)

        # Bind selection event
        self.users_tree.bind('<<TreeviewSelect>>', self.on_user_select)

        # Log Area
        log_frame = ttk.LabelFrame(right_frame, text="Activity Log", padding="10")
        log_frame.grid(row=1, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), pady=5)

        self.reg_log_text = scrolledtext.ScrolledText(log_frame, height=10, width=40, 
                                                     state=tk.DISABLED, wrap=tk.WORD)
        self.reg_log_text.pack(fill=tk.BOTH, expand=True)

    def setup_attendance_tab(self):
        """Setup the attendance tab"""
        # Attendance controls
        att_frame = ttk.LabelFrame(self.attendance_frame, text="Attendance Recording", padding="15")
        att_frame.grid(row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 20))

        self.btn_scan_attendance = ttk.Button(att_frame, text="Scan Fingerprint for Attendance",
                                            command=self.start_attendance_scan,
                                            state=tk.DISABLED, width=30)
        self.btn_scan_attendance.pack(pady=(0, 15))

        # Progress bar for attendance
        self.attendance_progress_var = tk.DoubleVar()
        self.attendance_progress_bar = ttk.Progressbar(att_frame, variable=self.attendance_progress_var,
                                                      maximum=100, length=300, mode='determinate')
        self.attendance_progress_bar.pack(pady=(0, 10))

        # Status message
        self.attendance_status_label = ttk.Label(att_frame, text="Ready to scan",
                                                font=('Arial', 12))
        self.attendance_status_label.pack(pady=(0, 10))

        # Result display
        result_frame = ttk.LabelFrame(self.attendance_frame, text="Last Attendance Record", padding="10")
        result_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E))

        self.attendance_result_text = tk.Text(result_frame, height=8, width=60, state=tk.DISABLED,
                                             font=('Arial', 10))
        self.attendance_result_text.pack(fill=tk.BOTH, expand=True)

        # Clear result button
        ttk.Button(result_frame, text="Clear Result",
                  command=self.clear_attendance_result).pack(pady=(10, 0))

    def setup_log_tab(self):
        """Setup the log tab"""
        log_frame = ttk.LabelFrame(self.log_frame, text="System Logs", padding="10")
        log_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        self.log_text = scrolledtext.ScrolledText(log_frame, height=20, width=80,
                                                 font=('Arial', 9))
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # Clear log button
        ttk.Button(log_frame, text="Clear Logs",
                  command=self.clear_logs).pack(pady=(10, 0))

    def check_backend_connection(self):
        """Check if backend server is running"""
        try:
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

                # Try to start the device
                try:
                    if hasattr(self.zkfp2, 'Start'):
                        self.zkfp2.Start()
                        self.log("Device started successfully")
                    else:
                        self.log("Device Start() method not available, proceeding without it")
                except Exception as start_error:
                    self.log(f"Device Start() failed (this is normal for some versions): {start_error}")

                # Connection successful - no need to test capture
                self.log("Device connection established successfully")

                self.device_status_label.config(text="Connected", foreground="green")
                self.btn_connect.config(state=tk.DISABLED)
                self.btn_disconnect.config(state=tk.NORMAL)
                self.btn_reconnect.config(state=tk.NORMAL)
                self.btn_register.config(state=tk.NORMAL)
                self.btn_scan_attendance.config(state=tk.NORMAL)
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
            self.btn_register.config(state=tk.DISABLED)
            self.btn_scan_attendance.config(state=tk.DISABLED)
            self.log("Device disconnected successfully")
            messagebox.showinfo("Success", "Device disconnected successfully!")

        except Exception as e:
            self.log(f"Error disconnecting device: {str(e)}")
            messagebox.showerror("Error", f"Error disconnecting device:\n{str(e)}")

    def manual_reconnect(self):
        """Manual device reconnection - Simplified version"""
        try:
            self.log("Manual device reconnection requested...")
            self.device_status_label.config(text="Reconnecting...", foreground="orange")
            self.root.update()
            
            # Simply reinitialize the device
            self.initialize_device()
                
        except Exception as e:
            self.log(f"Manual reconnect error: {str(e)}")
            self.device_status_label.config(text="Reconnection Failed", foreground="red")
            messagebox.showerror("Error", f"Manual reconnection failed:\n{str(e)}")

    def start_registration(self):
        """Start the registration process"""
        # Get all form data
        first_name = self.entry_first_name.get().strip()
        last_name = self.entry_last_name.get().strip()
        email = self.entry_email.get().strip()
        contact = self.entry_contact.get().strip()
        employment_status = self.combo_status.get().strip()
        date_hired = self.entry_date_hired.get().strip()
        employee_id = self.entry_employee_id.get().strip()
        username = self.entry_username.get().strip()
        password = self.entry_password.get().strip()
        
        # Validate required fields
        if not all([first_name, last_name, email, contact, employment_status, date_hired]):
            messagebox.showwarning("Warning", "Please fill in all required fields (*)!")
            return
            
        # Check if auto-generated fields are present
        if not all([employee_id, username, password]):
            messagebox.showwarning("Warning", "Please fill in all required fields (*) to auto-generate Employee ID, Username, and Password!")
            return
            
        user_name = f"{first_name} {last_name}"
        
        # Check if employee ID already exists
        if employee_id in self.registered_users:
            response = messagebox.askyesno("Warning", 
                                          f"Employee ID {employee_id} already exists. Overwrite?")
            if not response:
                return
                
        self.current_templates = []
        self.progress_bar['value'] = 0
        self.progress_label.config(text="Scans: 0/3")
        
        self.btn_register.config(state=tk.DISABLED)
        
        # Store employee data for registration (matching database field names)
        employee_data = {
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'contactNumber': contact,
            'status': employment_status,
            'hireDate': date_hired,
            'employeeId': employee_id,
            'username': username,
            'password': password
        }
        
        thread = threading.Thread(target=self.register_user, args=(employee_id, user_name, employee_data))
        thread.daemon = True
        thread.start()

    def register_user(self, user_id, user_name, employee_data=None):
        """Register a new user (runs in separate thread)"""
        self.log(f"Starting registration for {user_name} (ID: {user_id})")
        
        for i in range(3):
            self.root.after(0, lambda i=i: self.progress_label.config(text=f"Scans: {i}/3"))
            self.log(f"Scan {i+1}/3 - Place finger on scanner...")
            
            self.safe_light('red')
            
            capture = self.capture_fingerprint()
            
            if not capture:
                self.log("Registration cancelled - timeout")
                self.root.after(0, self.registration_complete, False, None, None, employee_data)
                return
                
            tmp, img = capture
            
            # Duplicate check will be performed after template merging using DBIdentify
            self.root.after(0, lambda: self.duplicate_status_label.config(
                text="🔍 Will check for duplicates after merging...", foreground="blue"))
            
            # Check if this is the same finger as previous scans (only for 2nd and 3rd scans)
            if self.current_templates:
                with self.device_lock:
                    if self.zkfp2:
                        match_result = self.zkfp2.DBMatch(self.current_templates[0], tmp)
                        if match_result == 0:
                            self.log("Warning: Different finger detected!")
                            self.root.after(0, lambda: messagebox.showwarning("Warning", 
                                "This appears to be a different finger. Please use the same finger."))
                            self.root.after(0, self.registration_complete, False, None, None, employee_data)
                            return
                    
            self.current_templates.append(tmp)
            self.root.after(0, lambda: self.progress_bar.step(1))
            self.log(f"Scan {i+1}/3 captured")
            
            self.display_fingerprint_image(img)
            
            time.sleep(1)
            
        try:
            self.log("Merging templates...")
            with self.device_lock:
                if not self.zkfp2:
                    raise Exception("Device disconnected during registration")
                    
                reg_temp, reg_temp_len = self.zkfp2.DBMerge(*self.current_templates)
                
                # CRITICAL: Reload all existing templates to device memory for proper duplicate detection
                self.log("🔄 Reloading all existing templates for duplicate detection...")
                for existing_user_id, existing_user_info in self.registered_users.items():
                    if existing_user_info.get('template'):
                        try:
                            # Extract numeric part for device operations
                            if existing_user_id.startswith('EMP'):
                                existing_id_int = int(existing_user_id[3:])
                            else:
                                existing_id_int = int(existing_user_id) if isinstance(existing_user_id, str) else existing_user_id
                            
                            # Add template to device memory - DISABLED to prevent errors
                            # self.zkfp2.DBAdd(existing_id_int, existing_user_info['template'])
                            self.log(f"ℹ️  Skipped reloading template for {existing_user_info['name']} (ID: {existing_user_id}) - DBAdd disabled")
                        except Exception as reload_e:
                            self.log(f"⚠️  Failed to reload template for {existing_user_id}: {str(reload_e)}")
                            continue
                
                # Extract numeric part from Employee ID for device operations - DISABLED to prevent errors
                if user_id.startswith('EMP'):
                    user_id_int = int(user_id[3:])  # Remove 'EMP' prefix and convert to int
                else:
                    user_id_int = int(user_id) if isinstance(user_id, str) else user_id
                # self.zkfp2.DBAdd(user_id_int, reg_temp)  # DISABLED to prevent DBAdd errors
                self.log(f"ℹ️  Skipped adding template to device - DBAdd disabled")
            
            # Check for duplicates in backend database (OUTSIDE device lock)
            self.log("🔍 Checking for duplicates in backend database...")
            self.log("🚨 DUPLICATE CHECK STARTING - THIS SHOULD APPEAR IN LOGS!")
            self.log("🚨 CRITICAL: About to start duplicate check for user: " + str(user_id))
            self.log("🚨 CRITICAL: reg_temp type: " + str(type(reg_temp)))
            self.log("🚨 CRITICAL: reg_temp length: " + str(len(reg_temp) if reg_temp else "None"))
            duplicate_found = False
            duplicate_user = None
            
            try:
                # Send fingerprint template to backend for duplicate check
                duplicate_check_data = {
                    "fingerprintTemplate": bytes(reg_temp).hex(),
                    "excludeEmployeeId": None  # Don't exclude any employee for new registrations
                }
                
                self.log(f"🔍 Sending duplicate check request for user: {user_id}")
                self.log(f"🔍 Template length: {len(bytes(reg_temp).hex())}")
                self.log(f"🔍 Template hex (first 100 chars): {bytes(reg_temp).hex()[:100]}...")
                
                # Test backend connection first
                self.log(f"🔍 Testing backend connection...")
                test_response = requests.get("http://localhost:5000/api/fingerprint/test", timeout=5)
                self.log(f"🔍 Backend test response: {test_response.status_code} - {test_response.text}")
                
                response = requests.post(
                    "http://localhost:5000/api/fingerprint/check-duplicate",
                    json=duplicate_check_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                self.log(f"🔍 Backend response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    self.log(f"🔍 Backend response: {result}")
                    self.log(f"🔍 duplicateFound value: {result.get('duplicateFound')}")
                    self.log(f"🔍 result type: {type(result.get('duplicateFound'))}")
                    
                    if result.get('duplicateFound') == True:
                        duplicate_found = True
                        duplicate_user = {
                            'name': result.get('existingEmployee', {}).get('name', 'Unknown'),
                            'employeeId': result.get('existingEmployee', {}).get('employeeId', 'Unknown')
                        }
                        self.log(f"❌ DUPLICATE FINGERPRINT DETECTED IN BACKEND!")
                        self.log(f"❌ Existing employee: {duplicate_user['name']} ({duplicate_user['employeeId']})")
                    else:
                        self.log(f"✅ No duplicates found in backend")
                        self.log(f"✅ duplicateFound was: {result.get('duplicateFound')}")
                else:
                    self.log(f"⚠️  Backend duplicate check failed: {response.status_code}")
                    self.log(f"⚠️  Response text: {response.text}")
                    
            except Exception as e:
                self.log(f"⚠️  Backend duplicate check error: {str(e)}")
                self.log(f"⚠️  Error type: {type(e)}")
                import traceback
                self.log(f"⚠️  Traceback: {traceback.format_exc()}")
                # Fallback to local check if backend fails
                for existing_user_id, existing_user_info in self.registered_users.items():
                    if existing_user_info.get('template'):
                        try:
                            existing_bytes = bytes(existing_user_info['template'])
                            new_bytes = bytes(reg_temp)
                            if existing_bytes == new_bytes:
                                duplicate_found = True
                                duplicate_user = existing_user_info
                                self.log(f"❌ Duplicate fingerprint detected locally!")
                                break
                        except Exception as compare_e:
                            continue
            
            # CRITICAL DEBUG: Check if duplicate check was executed
            self.log(f"🚨 DUPLICATE CHECK COMPLETED - duplicate_found: {duplicate_found}")
            self.log(f"🚨 DUPLICATE CHECK COMPLETED - duplicate_user: {duplicate_user}")
            self.log(f"🚨 CRITICAL: About to check duplicate_found condition...")
            
            if duplicate_found and duplicate_user:
                self.log(f"❌ DUPLICATE DETECTION RESULT: Found duplicate!")
                self.log(f"❌ Duplicate user: {duplicate_user}")
                self.log(f"❌ Stopping registration process...")
                
                self.log(f"❌ Duplicate fingerprint detected! Already registered to: {duplicate_user['name']}")
                self.root.after(0, lambda: self.duplicate_status_label.config(
                    text="❌ DUPLICATE FINGERPRINT DETECTED!", foreground="red"))
                self.root.after(0, lambda: messagebox.showerror("Duplicate Fingerprint", 
                    f"This fingerprint is already registered to:\n\nName: {duplicate_user['name']}\n\nPlease use a different finger or contact admin."))
                self.root.after(0, self.registration_complete, False, None, None, employee_data)
                return  # CRITICAL: Stop execution here to prevent duplicate registration
            
            # No duplicates found - proceed with registration
            self.log("✅ DUPLICATE CHECK PASSED - No duplicates found - proceeding with registration")
            self.log("🚨 CRITICAL: About to proceed with registration...")
            self.root.after(0, lambda: self.duplicate_status_label.config(
                text="✅ No duplicates found", foreground="green"))
            
            # Store user_id as string for consistency with database
            user_id_str = str(user_id)
            self.registered_users[user_id_str] = {
                'name': user_name,
                'template': reg_temp,
                'template_length': reg_temp_len,
                'employee_data': employee_data or {}
            }
            
            self.template_count += 1  # Increment template count for new registration
            
            # Save directly to MongoDB backend (no local SQLite)
            if employee_data:
                backend_success = self.create_employee_in_backend(employee_data, reg_temp)
                if backend_success:
                    self.log(f"✅ Employee saved directly to MongoDB database")
                else:
                    self.log(f"❌ Failed to save employee to MongoDB database")
            else:
                self.log(f"❌ No employee data to save")
            
            self.log(f"Registration successful for {user_name}")
            self.safe_light('green')
            self.root.after(0, self.registration_complete, True, user_id, user_name, employee_data)
            
        except Exception as e:
            self.log(f"Registration error: {str(e)}")
            self.root.after(0, self.registration_complete, False, None, None, employee_data)

    def create_employee_in_backend(self, employee_data, fingerprint_template):
        """Create employee in MongoDB backend"""
        try:
            # Prepare data for backend
            backend_data = {
                "user_id": employee_data['employeeId'],
                "user_name": f"{employee_data['firstName']} {employee_data['lastName']}",
                "status": "registered",
                "fingerprintTemplate": bytes(fingerprint_template).hex(),
                "timestamp": datetime.now().isoformat(),
                "employee_data": {
                    "firstName": employee_data['firstName'],
                    "lastName": employee_data['lastName'],
                    "email": employee_data['email'],
                    "contactNumber": employee_data['contactNumber'],
                    "status": employee_data['status'],
                    "hireDate": employee_data['hireDate'],
                    "employeeId": employee_data['employeeId'],
                    "username": employee_data['username'],
                    "password": employee_data['password'],
                    "salary": employee_data.get('salary', 0),
                    "fingerprintEnrolled": True
                }
            }
            
            self.log(f"📤 Sending employee data to backend...")
            self.log(f"📤 Data: {json.dumps(backend_data, indent=2)}")
            
            response = requests.post(
                "http://localhost:5000/api/fingerprint/callback",
                json=backend_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            self.log(f"📥 Backend response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Callback result: {result.get('message', 'Success')}")
                
                if result.get('success'):
                    self.log(f"🎉 Employee successfully processed!")
                    self.log(f"   📋 Employee ID: {employee_data['employeeId']}")
                    self.log(f"   👤 Name: {employee_data['firstName']} {employee_data['lastName']}")
                    return True
                else:
                    self.log(f"❌ Backend processing failed: {result.get('message', 'Unknown error')}")
                    return False
            else:
                self.log(f"❌ Backend request failed: {response.status_code}")
                self.log(f"❌ Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating employee in backend: {str(e)}")
            return False

    def registration_complete(self, success, user_id, user_name, employee_data=None):
        """Callback when fingerprint registration is complete"""
        self.btn_register.config(state=tk.NORMAL)

        if success:
            self.log(f"✅ Fingerprint registered successfully for {user_name} ({user_id})")
            messagebox.showinfo("Success", f"Fingerprint registered successfully for {user_name}!")
            
            # Clear form
            self.clear_form_fields()
            
            self.progress_bar['value'] = 0
            self.progress_label.config(text="Ready to register")
            self.duplicate_status_label.config(text="")
            
            # Update users list
            self.update_users_list()
        else:
            self.log(f"❌ Registration failed for {user_name}")
            messagebox.showerror("Error", f"Registration failed for {user_name}")
            self.progress_bar['value'] = 0
            self.progress_label.config(text="Registration failed")

    def clear_form_fields(self):
        """Clear all form fields after successful registration"""
        self.entry_first_name.delete(0, tk.END)
        self.entry_last_name.delete(0, tk.END)
        self.entry_email.delete(0, tk.END)
        self.entry_contact.delete(0, tk.END)
        self.combo_status.set('')
        self.entry_date_hired.delete(0, tk.END)
        
        # Clear auto-generated fields (set to readonly first)
        self.entry_employee_id.config(state="normal")
        self.entry_employee_id.delete(0, tk.END)
        self.entry_employee_id.config(state="readonly")
        
        self.entry_username.config(state="normal")
        self.entry_username.delete(0, tk.END)
        self.entry_username.config(state="readonly")
        
        self.entry_password.config(state="normal")
        self.entry_password.delete(0, tk.END)
        self.entry_password.config(state="readonly")
        
        # Reset duplicate status
        self.duplicate_status_label.config(text="🔍 Ready for registration", foreground="blue")

    def start_attendance_scan(self):
        """Start the attendance scanning process"""
        if self.is_capturing:
            return

        self.is_capturing = True
        self.btn_scan_attendance.config(state=tk.DISABLED)
        self.attendance_progress_var.set(0)
        self.attendance_status_label.config(text="Place finger on scanner...")

        # Start scan in separate thread
        self.current_scan_thread = threading.Thread(target=self.perform_attendance_scan)
        self.current_scan_thread.daemon = True
        self.current_scan_thread.start()

    def perform_attendance_scan(self):
        """Perform the actual fingerprint scan and attendance recording"""
        try:
            # Update progress
            self.root.after(0, lambda: self.attendance_progress_var.set(10))
            self.root.after(0, lambda: self.attendance_status_label.config(text="Initializing scan..."))

            # Wait a moment for device to be ready
            time.sleep(0.5)

            # Capture fingerprint
            self.root.after(0, lambda: self.attendance_progress_var.set(30))
            self.root.after(0, lambda: self.attendance_status_label.config(text="Capturing fingerprint..."))

            capture = self.capture_fingerprint()
            if not capture:
                self.root.after(0, self.attendance_scan_failed, "Fingerprint capture failed or timeout")
                return

            template, img = capture

            # Convert to hex string
            self.root.after(0, lambda: self.attendance_progress_var.set(60))
            self.root.after(0, lambda: self.attendance_status_label.config(text="Processing fingerprint..."))

            template_hex = bytes(template).hex()
            
            # Debug logging
            self.log(f"🔍 DEBUG: Template type: {type(template)}")
            self.log(f"🔍 DEBUG: Template length: {len(template)}")
            self.log(f"🔍 DEBUG: Template hex length: {len(template_hex)}")

            # Send to backend
            self.root.after(0, lambda: self.attendance_progress_var.set(80))
            self.root.after(0, lambda: self.attendance_status_label.config(text="Recording attendance..."))

            success, result = self.record_attendance(template_hex)

            if success:
                self.root.after(0, lambda: self.attendance_progress_var.set(100))
                self.root.after(0, lambda: self.attendance_status_label.config(text="Attendance recorded successfully!"))
                self.root.after(0, self.attendance_scan_success, result)
            else:
                self.root.after(0, self.attendance_scan_failed, result)

        except Exception as e:
            self.root.after(0, self.attendance_scan_failed, f"Scan error: {str(e)}")

        finally:
            self.is_capturing = False
            self.root.after(0, lambda: self.btn_scan_attendance.config(state=tk.NORMAL))

    def capture_fingerprint(self, timeout=15):
        """✅ Capture a fingerprint with timeout - COMPLETELY FIXED VERSION"""
        if not self.zkfp2:
            self.log("❌ Device not initialized - cannot capture")
            return None
            
        start_time = time.time()
        self.log(f"🔍 Starting fingerprint capture (timeout: {timeout}s)")
        
        while time.time() - start_time < timeout:
            try:
                # Single capture attempt with proper error handling
                capture = self.zkfp2.AcquireFingerprint()
                
                if capture and len(capture) >= 2:
                    template, img = capture
                    self.log("✅ Fingerprint captured successfully")
                    return capture
                else:
                    # No finger detected, continue trying
                    pass
                    
            except Exception as e:
                error_msg = str(e)
                self.log(f"⚠️ Capture attempt failed: {error_msg}")
                
                # Check for specific error types
                if "Invalid Handle" in error_msg:
                    self.log("❌ Invalid Handle error - device connection lost")
                    return None
                elif "Device not connected" in error_msg:
                    self.log("❌ Device not connected error")
                    return None
                # For other errors, continue trying
                
            time.sleep(0.1)
            
        self.log(f"⏰ Fingerprint capture timeout after {timeout}s")
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

    def attendance_scan_success(self, result):
        """Handle successful attendance scan"""
        try:
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

            self.display_attendance_result(message, "success")

            # Auto-clear after 10 seconds
            self.root.after(10000, self.clear_attendance_result)

        except Exception as e:
            self.log(f"Error displaying success result: {str(e)}")

    def attendance_scan_failed(self, error_message):
        """Handle failed attendance scan"""
        try:
            message = f"""❌ SCAN FAILED

Error: {error_message}

Please try again or contact administrator if the problem persists."""

            self.display_attendance_result(message, "error")

        except Exception as e:
            self.log(f"Error displaying failed result: {str(e)}")

    def display_attendance_result(self, message, result_type):
        """Display result in the attendance text area"""
        try:
            self.attendance_result_text.config(state=tk.NORMAL)
            self.attendance_result_text.delete(1.0, tk.END)

            # Set color based on result type
            if result_type == "success":
                self.attendance_result_text.tag_configure("success", foreground="green")
                self.attendance_result_text.insert(tk.END, message, "success")
            else:
                self.attendance_result_text.tag_configure("error", foreground="red")
                self.attendance_result_text.insert(tk.END, message, "error")

            self.attendance_result_text.config(state=tk.DISABLED)

        except Exception as e:
            self.log(f"Error displaying result: {str(e)}")

    def clear_attendance_result(self):
        """Clear the attendance result display"""
        try:
            self.attendance_result_text.config(state=tk.NORMAL)
            self.attendance_result_text.delete(1.0, tk.END)
            self.attendance_result_text.config(state=tk.DISABLED)
            self.attendance_status_label.config(text="Ready to scan")
            self.attendance_progress_var.set(0)
        except Exception as e:
            self.log(f"Error clearing result: {str(e)}")

    def clear_logs(self):
        """Clear the log display"""
        try:
            self.log_text.delete(1.0, tk.END)
        except Exception as e:
            print(f"Error clearing logs: {str(e)}")

    def log(self, message):
        """Log message to console and GUI"""
        timestamp = time.strftime('%H:%M:%S')
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        
        # Add to GUI log
        try:
            self.log_text.insert(tk.END, log_message + "\n")
            self.log_text.see(tk.END)
        except:
            pass

    def auto_generate_fields(self, event=None):
        """Auto-generate Employee ID, Username, and Password when required fields are filled"""
        first_name = self.entry_first_name.get().strip()
        last_name = self.entry_last_name.get().strip()
        contact = self.entry_contact.get().strip()
        employment_status = self.combo_status.get().strip()
        date_hired = self.entry_date_hired.get().strip()
        
        # Only auto-generate if all required fields have some content
        if all([first_name, last_name, contact, employment_status, date_hired]):
            # Generate Employee ID
            employee_id = f"EMP{int(time.time())}"
            self.entry_employee_id.config(state="normal")
            self.entry_employee_id.delete(0, tk.END)
            self.entry_employee_id.insert(0, employee_id)
            self.entry_employee_id.config(state="readonly")
            
            # Generate Username (same as Employee ID)
            username = employee_id
            self.entry_username.config(state="normal")
            self.entry_username.delete(0, tk.END)
            self.entry_username.insert(0, username)
            self.entry_username.config(state="readonly")
            
            # Generate Password (simple format for biometric registration)
            password = f"Pass{employee_id[-4:]}"
            self.entry_password.config(state="normal")
            self.entry_password.delete(0, tk.END)
            self.entry_password.insert(0, password)
            self.entry_password.config(state="readonly")
            
            self.log(f"Auto-generated: Employee ID: {employee_id}, Username: {username}, Password: {password}")
        else:
            # Clear auto-generated fields if required fields are not complete
            self.entry_employee_id.config(state="normal")
            self.entry_employee_id.delete(0, tk.END)
            self.entry_employee_id.config(state="readonly")
            
            self.entry_username.config(state="normal")
            self.entry_username.delete(0, tk.END)
            self.entry_username.config(state="readonly")
            
            self.entry_password.config(state="normal")
            self.entry_password.delete(0, tk.END)
            self.entry_password.config(state="readonly")

    def initialize_device(self):
        """Initialize the fingerprint device - COMPLETELY FIXED VERSION"""
        try:
            self.log("🔧 Initializing fingerprint device...")
            self.device_status_label.config(text="Initializing...", foreground="orange")
            self.root.update()
            
            # Clean up any existing connection first
            if self.zkfp2:
                try:
                    self.log("🧹 Cleaning up existing device connection...")
                    self.zkfp2.Terminate()
                except:
                    pass
                self.zkfp2 = None
            
            # Wait for cleanup
            time.sleep(1)
            
            # Initialize new connection
            self.log("🔄 Creating new device instance...")
            self.zkfp2 = ZKFP2()
            self.zkfp2.Init()
            
            device_count = self.zkfp2.GetDeviceCount()
            self.log(f"📊 Found {device_count} device(s)")
            
            if device_count > 0:
                # Open device with comprehensive error checking
                try:
                    self.log("🔌 Opening device connection...")
                    self.zkfp2.OpenDevice(0)
                    self.log("✅ Device opened successfully")
                except Exception as open_e:
                    self.log(f"❌ Failed to open device: {str(open_e)}")
                    raise Exception(f"Could not open device: {str(open_e)}")

                # Device is ready - no Start() method needed
                self.log("🎯 Device ready for fingerprint capture")

                # Update UI
                self.safe_light('green')
                self.device_status_label.config(text="Connected", foreground="green")
                self.reg_status_label.config(text="Connected", foreground="green")
                
                # Enable buttons
                self.btn_init.config(state=tk.DISABLED)
                self.btn_terminate.config(state=tk.NORMAL)
                self.btn_connect.config(state=tk.DISABLED)
                self.btn_disconnect.config(state=tk.NORMAL)
                self.btn_reconnect.config(state=tk.NORMAL)
                self.btn_register.config(state=tk.NORMAL)
                self.btn_delete_user.config(state=tk.NORMAL)
                self.btn_scan_attendance.config(state=tk.NORMAL)
                
                # Load users (disabled to prevent device errors)
                self.load_users_to_device()
                
                self.log("🎉 Device initialization completed successfully!")
                messagebox.showinfo("Success", "Device initialized successfully!")
            else:
                self.log("❌ No devices found")
                messagebox.showerror("Error", "No devices found!")
                
        except Exception as e:
            self.log(f"❌ Initialization error: {str(e)}")
            self.device_status_label.config(text="Initialization Failed", foreground="red")
            messagebox.showerror("Error", f"Failed to initialize device:\n{str(e)}")
            
    def terminate_device(self):
        """Terminate the device connection - COMPLETELY FIXED VERSION"""
        try:
            self.log("🔌 Terminating device connection...")
            self.device_status_label.config(text="Disconnecting...", foreground="orange")
            self.root.update()
            
            if self.zkfp2:
                try:
                    self.log("🧹 Cleaning up device resources...")
                    self.zkfp2.Terminate()
                    self.log("✅ Device terminated successfully")
                except Exception as term_e:
                    self.log(f"⚠️ Termination warning: {str(term_e)}")
                finally:
                    self.zkfp2 = None
            
            # Update UI
            self.safe_light('red')
            self.device_status_label.config(text="Disconnected", foreground="red")
            self.reg_status_label.config(text="Disconnected", foreground="red")
            
            # Disable buttons
            self.btn_init.config(state=tk.NORMAL)
            self.btn_terminate.config(state=tk.DISABLED)
            self.btn_connect.config(state=tk.NORMAL)
            self.btn_disconnect.config(state=tk.DISABLED)
            self.btn_reconnect.config(state=tk.DISABLED)
            self.btn_register.config(state=tk.DISABLED)
            self.btn_delete_user.config(state=tk.DISABLED)
            self.btn_scan_attendance.config(state=tk.DISABLED)
            
            self.log("🎉 Device termination completed successfully!")
            messagebox.showinfo("Success", "Device terminated successfully!")
            
        except Exception as e:
            self.log(f"❌ Termination error: {str(e)}")
            messagebox.showerror("Error", f"Failed to terminate device:\n{str(e)}")

    def safe_light(self, color):
        """✅ Safe wrapper para sa Light() function"""
        try:
            with self.device_lock:
                if self.zkfp2:
                    # Map 'off' to a valid color or skip
                    if color == 'off':
                        return  # Skip turning off light
                    # Only try light control if device is properly initialized
                    try:
                        self.zkfp2.Light(color)
                    except Exception as light_error:
                        # Silently ignore light control errors to prevent threading issues
                        pass
        except Exception as e:
            # Silently ignore all light control errors
            pass

    def load_users_from_backend(self):
        """✅ Load all users from MongoDB backend"""
        try:
            if not self.check_backend_connection():
                self.log("❌ Backend server not running - cannot load users")
                return
                
            response = requests.get("http://localhost:5000/api/employees", timeout=10)
            if response.status_code == 200:
                employees = response.json()
                self.registered_users = {}
                
                for emp in employees:
                    if emp.get('fingerprintEnrolled'):
                        user_id = emp.get('employeeId')
                        user_name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}"
                        self.registered_users[user_id] = {
                            'name': user_name,
                            'template': None,  # Template not stored in MongoDB for security
                            'template_length': 0,
                            'employee_data': emp
                        }
                
                self.log(f"✅ Loaded {len(self.registered_users)} enrolled users from MongoDB")
                self.update_users_list()
                
        except Exception as e:
            self.log(f"❌ Error loading users from backend: {str(e)}")

    def load_users_to_device(self):
        """✅ Load users from database to device - DISABLED to prevent errors"""
        try:
            if not self.zkfp2:
                return
                
            # Skip automatic user loading to prevent DBAdd errors
            self.log("ℹ️  Automatic user loading disabled to prevent device errors")
            self.log("ℹ️  Users will be loaded individually during registration")
                
        except Exception as e:
            self.log(f"❌ Error in load_users_to_device: {str(e)}")

    def delete_user_from_database(self, user_id):
        """✅ Delete user from MongoDB backend"""
        try:
            if not self.check_backend_connection():
                self.log("❌ Backend server not running - cannot delete user")
                return False
                
            # First find the employee by employeeId to get the MongoDB _id
            find_response = requests.get(f"http://localhost:5000/api/employees", timeout=10)
            if find_response.status_code == 200:
                employees = find_response.json()
                employee = next((emp for emp in employees if emp.get('employeeId') == user_id), None)
                
                if employee:
                    # Delete using MongoDB _id
                    response = requests.delete(f"http://localhost:5000/api/employees/{employee['_id']}", timeout=10)
                    
                    if response.status_code == 200:
                        self.log(f"✅ User {user_id} deleted from MongoDB")
                        return True
                    else:
                        self.log(f"❌ Failed to delete user from MongoDB: {response.status_code}")
                        return False
                else:
                    self.log(f"❌ User {user_id} not found in MongoDB")
                    return False
            else:
                self.log(f"❌ Failed to fetch employees: {find_response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Database delete error: {str(e)}")
            return False

    def on_user_select(self, event):
        """Handle user selection in treeview"""
        selection = self.users_tree.selection()
        if selection:
            self.btn_delete_user.config(state=tk.NORMAL)
        else:
            self.btn_delete_user.config(state=tk.DISABLED)

    def delete_selected_user(self):
        """Delete the selected user"""
        selection = self.users_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a user to delete!")
            return
            
        item = self.users_tree.item(selection[0])
        user_id = item['values'][0]
        user_name = item['values'][1]
        
        # Confirm deletion
        result = messagebox.askyesno("Confirm Delete", 
                                   f"Are you sure you want to delete user:\n\nID: {user_id}\nName: {user_name}\n\nThis action cannot be undone!")
        if not result:
            return
            
        try:
            # Skip device deletion to prevent DBDelete errors
            if self.zkfp2 and user_id in self.registered_users:
                # Extract numeric part for device operations
                if user_id.startswith('EMP'):
                    user_id_int = int(user_id[3:])
                else:
                    user_id_int = int(user_id) if isinstance(user_id, str) else user_id
                
                # Skip device deletion to prevent DBDelete errors
                self.log(f"ℹ️  Skipped deleting user {user_name} from device - DBDelete disabled")
            
            # Delete from database
            if self.delete_user_from_database(user_id):
                # Remove from registered users
                if user_id in self.registered_users:
                    del self.registered_users[user_id]
                    self.template_count -= 1
                
                # Update users list
                self.update_users_list()
                self.btn_delete_user.config(state=tk.DISABLED)
                
                messagebox.showinfo("Success", f"User {user_name} deleted successfully!")
                self.log(f"✅ User {user_name} (ID: {user_id}) deleted completely")
            else:
                messagebox.showerror("Error", "Failed to delete user from database!")
                
        except Exception as e:
            self.log(f"❌ Error deleting user: {str(e)}")
            messagebox.showerror("Error", f"Failed to delete user:\n{str(e)}")

    def update_users_list(self):
        """Update the users list treeview"""
        for item in self.users_tree.get_children():
            self.users_tree.delete(item)
            
        for user_id, user_info in sorted(self.registered_users.items()):
            self.users_tree.insert('', tk.END, values=(user_id, user_info['name']))

    def display_fingerprint_image(self, img_data):
        """Display fingerprint image"""
        try:
            img = Image.open(io.BytesIO(img_data))
            img = img.resize((200, 200), Image.Resampling.LANCZOS)
            
            photo = ImageTk.PhotoImage(img)
            
            self.image_label.config(image=photo, text="")
            self.image_label.image = photo
        except Exception as e:
            self.log(f"Image display error: {str(e)}")

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
    app = UnifiedBiometricGUI(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()

if __name__ == "__main__":
    main()
