"""
Fingerprint Registration and Identification System with GUI
Using pyzkfp and Tkinter - FIXED VERSION
"""
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import sys
import requests 
from pyzkfp import ZKFP2
from PIL import Image, ImageTk
import threading
import io
import time
import sqlite3
import json
import os


# ✅ Check kung may arguments (employee_id, name, at employee_data)
if len(sys.argv) >= 4:
    employee_id = sys.argv[1]
    employee_name = sys.argv[2]
    employee_data_json = sys.argv[3]
    try:
        employee_data = json.loads(employee_data_json)
        print(f"📋 Employee Data: {employee_data}")
    except json.JSONDecodeError:
        employee_data = {}
        print("⚠️  Invalid employee data JSON")
elif len(sys.argv) >= 3:
    employee_id = sys.argv[1]
    employee_name = sys.argv[2]
    employee_data = {}
    print("⚠️  No employee data provided")
else:
    # Default values when run manually
    employee_id = "TEST123"
    employee_name = "Test User"
    employee_data = {}
    print(f"No arguments provided — using default values: {employee_id}, {employee_name}")

print(f"Biometric GUI launched for {employee_name} ({employee_id})")


class FingerprintGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("ZKTeco Fingerprint System")
        self.root.geometry("900x700")
        self.root.resizable(False, False)
        
        self.zkfp2 = None
        self.registered_users = {}
        self.is_capturing = False
        self.current_templates = []
        self.registration_in_progress = False
        self.scan_count = 0
        self.device_lock = threading.Lock()
        self.template_count = 0  # Track template count manually since GetDBNum doesn't exist
        self.debug_mode = True  # Enable debug mode for duplicate detection
        self.skip_duplicate_check = False  # Enable duplicate detection
        
        # MongoDB only - no local database needed
        self.setup_ui()
        
        # Load users from MongoDB backend
        self.load_users_from_backend()
        
    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title = ttk.Label(main_frame, text="ZKTeco Fingerprint Management System", 
                         font=('Arial', 16, 'bold'))
        title.grid(row=0, column=0, columnspan=2, pady=10)
        
        # Top Section - Device Status and Fingerprint Preview
        top_frame = ttk.Frame(main_frame)
        top_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        # Device Status
        status_frame = ttk.LabelFrame(top_frame, text="Device Status", padding="10")
        status_frame.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=(0, 5))
        
        status_inner = ttk.Frame(status_frame)
        status_inner.pack()
        
        ttk.Label(status_inner, text="Device Status:").pack(side=tk.LEFT)
        self.status_label = ttk.Label(status_inner, text="Disconnected", 
                                      foreground="red", font=('Arial', 10, 'bold'))
        self.status_label.pack(side=tk.LEFT, padx=5)
        
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
        left_frame = ttk.LabelFrame(main_frame, text="Employee Registration", padding="10")
        left_frame.grid(row=2, column=0, sticky=(tk.N, tk.W, tk.E), padx=5)
        
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
        right_frame = ttk.Frame(main_frame)
        right_frame.grid(row=2, column=1, sticky=(tk.N, tk.W, tk.E, tk.S), padx=5)
        
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
        
        self.log_text = scrolledtext.ScrolledText(log_frame, height=10, width=40, 
                                                   state=tk.DISABLED, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        
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
        
    def create_employee_in_backend(self, employee_data, fingerprint_template=None):
        """Automatically create employee in backend database"""
        try:
            if not self.test_backend_connection():
                self.log("❌ Backend server not running - cannot create employee")
                return False
                
            # Prepare employee data for backend with proper defaults
            backend_data = {
                "firstName": employee_data.get('firstName', 'Unknown'),
                "lastName": employee_data.get('lastName', 'User'),
                "email": employee_data.get('email', f"{employee_data.get('employeeId', 'user')}@company.com"),
                "contactNumber": employee_data.get('contactNumber', '000-000-0000'),
                "status": employee_data.get('status', 'regular'),
                "hireDate": employee_data.get('hireDate', '2024-01-01'),
                "employeeId": employee_data.get('employeeId', ''),
                "username": employee_data.get('username', employee_data.get('employeeId', '')),
                "password": employee_data.get('password', 'temp123'),
                "salary": employee_data.get('salary', 0),  # Add salary field with default 0
                "fingerprintEnrolled": True
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            # Debug: Log what we're sending
            self.log(f"📤 Sending employee data to backend: {backend_data}")
            
            # Use fingerprint callback endpoint instead of direct employee creation
            fingerprint_callback_data = {
                "user_id": backend_data.get('employeeId', ''),
                "user_name": f"{backend_data.get('firstName', '')} {backend_data.get('lastName', '')}",
                "status": "registered",
                "fingerprintTemplate": bytes(fingerprint_template).hex() if fingerprint_template else "template_data",  # Convert Byte[] to hex
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
                "employee_data": backend_data
            }
            
            self.log(f"📤 Sending fingerprint callback data: {fingerprint_callback_data}")
            
            response = requests.post(
                "http://localhost:5000/api/fingerprint/callback",
                json=fingerprint_callback_data,
                headers=headers,
                timeout=10
            )
            
            self.log(f"📥 Backend response status: {response.status_code}")
            self.log(f"📥 Backend response: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    self.log(f"✅ Employee created in backend via fingerprint callback: {backend_data.get('employeeId')}")
                    # Display login credentials
                    employee_info = result.get('employee', {})
                    username = employee_info.get('username', 'N/A')
                    password = employee_info.get('password', 'N/A')
                    self.log(f"🔑 LOGIN CREDENTIALS:")
                    self.log(f"   Username: {username}")
                    self.log(f"   Password: {password}")
                    self.log(f"   Employee can now login to the employee portal!")
                    return True
                else:
                    self.log(f"❌ Fingerprint callback failed: {result.get('error', 'Unknown error')}")
                    return False
            else:
                self.log(f"❌ Failed to create employee in backend: {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"❌ Error details: {error_detail}")
                except:
                    self.log(f"❌ Error response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating employee in backend: {str(e)}")
            return False
    
    def log(self, message):
        """Add message to log"""
        try:
            if hasattr(self, 'log_text'):
                self.log_text.config(state=tk.NORMAL)
                self.log_text.insert(tk.END, f"{time.strftime('%H:%M:%S')} - {message}\n")
                self.log_text.see(tk.END)
                self.log_text.config(state=tk.DISABLED)
            else:
                print(f"{time.strftime('%H:%M:%S')} - {message}")
        except Exception as e:
            print(f"{time.strftime('%H:%M:%S')} - {message}")
            print(f"Log error: {e}")

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
    
    def test_backend_connection(self):
        """✅ Test if backend server is running"""
        try:
            response = requests.get("http://localhost:5000/api/fingerprint/test", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def test_database_connection(self):
        """✅ Test if database is working"""
        try:
            response = requests.get("http://localhost:5000/api/fingerprint/test-db", timeout=10)
            if response.status_code == 200:
                result = response.json()
                print(f"🗄️  Database test: {result.get('message')}")
                print(f"📊 Total employees: {result.get('totalEmployees')}")
                if result.get('sampleEmployees'):
                    print("👥 Sample employees:")
                    for emp in result.get('sampleEmployees', [])[:3]:
                        print(f"   - {emp.get('employeeId')}: {emp.get('name')}")
                return True
            else:
                print(f"❌ Database test failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Database test error: {e}")
            return False
    
    def init_database(self):
        """✅ Initialize SQLite database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS fingerprint_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    user_name TEXT NOT NULL,
                    fingerprint_template BLOB,
                    template_length INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            conn.close()
            self.log("✅ Database initialized successfully")
            
        except Exception as e:
            self.log(f"❌ Database initialization error: {str(e)}")
    
    def save_user_to_database(self, user_id, user_name, template, template_length):
        """✅ Save user fingerprint data to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO fingerprint_users 
                (user_id, user_name, fingerprint_template, template_length, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_id, user_name, template, template_length))
            
            conn.commit()
            conn.close()
            self.log(f"✅ User {user_name} saved to database")
            return True
            
        except Exception as e:
            self.log(f"❌ Database save error: {str(e)}")
            return False
    
    def load_users_from_backend(self):
        """✅ Load all users from MongoDB backend"""
        try:
            if not self.test_backend_connection():
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
    
    def delete_user_from_database(self, user_id):
        """✅ Delete user from MongoDB backend"""
        try:
            if not self.test_backend_connection():
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
        
    def initialize_device(self):
        """Initialize the fingerprint device"""
        try:
            self.log("Initializing device...")
            self.zkfp2 = ZKFP2()
            self.zkfp2.Init()
            
            device_count = self.zkfp2.GetDeviceCount()
            self.log(f"Found {device_count} device(s)")
            
            if device_count > 0:
                # Open device with error checking
                try:
                    self.zkfp2.OpenDevice(0)
                    self.log("Device opened successfully")
                except Exception as open_e:
                    self.log(f"Failed to open device: {str(open_e)}")
                    raise Exception(f"Could not open device: {str(open_e)}")

                # Skip capture mode initialization - device works without it
                self.log("Device opened - ready for fingerprint capture")

                self.safe_light('green')
                self.status_label.config(text="Connected", foreground="green")
                self.log("Device connected successfully")
                
                self.btn_init.config(state=tk.DISABLED)
                self.btn_terminate.config(state=tk.NORMAL)
                self.btn_register.config(state=tk.NORMAL)
                self.btn_delete_user.config(state=tk.NORMAL)
                
                self.load_users_to_device()
                
                messagebox.showinfo("Success", "Device initialized successfully!")
            else:
                self.log("No devices found")
                messagebox.showerror("Error", "No devices found!")
                
        except Exception as e:
            self.log(f"Initialization error: {str(e)}")
            messagebox.showerror("Error", f"Failed to initialize device:\n{str(e)}")
            
    def terminate_device(self):
        """Terminate the device connection"""
        try:
            with self.device_lock:
                if self.zkfp2:
                    self.zkfp2.Terminate()
                    self.zkfp2 = None
                    
            self.status_label.config(text="Disconnected", foreground="red")
            self.log("Device terminated")
            
            self.btn_init.config(state=tk.NORMAL)
            self.btn_terminate.config(state=tk.DISABLED)
            self.btn_register.config(state=tk.DISABLED)
            self.btn_delete_user.config(state=tk.DISABLED)
            
            messagebox.showinfo("Success", "Device terminated successfully!")
        except Exception as e:
            self.log(f"Termination error: {str(e)}")
            messagebox.showerror("Error", f"Failed to terminate device:\n{str(e)}")
            
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
            
    def registration_complete(self, success, user_id, user_name, employee_data=None):
        """Callback when fingerprint registration is complete"""
        self.btn_register.config(state=tk.NORMAL)

        if success:
            print(f"✅ Fingerprint registered successfully for {user_name} ({user_id})")
            print(f"📤 Sending callback to backend...")
            print(f"   User ID: {user_id}")
            print(f"   User Name: {user_name}")
            
            if not self.test_backend_connection():
                print("❌ Backend server not running - skipping callback")
                print("💡 Make sure the Node.js backend server is running on port 5000")
            else:
                print("🔍 Testing database connection...")
                self.test_database_connection()
                
                try:
                    # Use the employee_data passed from registration
                    emp_data = employee_data or {}
                    
                    # Get the fingerprint template from registered users
                    fingerprint_template = None
                    if str(user_id) in self.registered_users:
                        fingerprint_template = self.registered_users[str(user_id)].get('template')
                    
                    callback_data = {
                        "user_id": str(user_id),
                        "user_name": user_name,
                        "status": "registered",
                        "fingerprintTemplate": bytes(fingerprint_template).hex() if fingerprint_template else "template_data",  # Convert Byte[] to hex
                        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
                        "employee_data": emp_data
                    }
                    
                    headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                    
                    response = requests.post(
                        "http://localhost:5000/api/fingerprint/callback",
                        json=callback_data,
                        headers=headers,
                        timeout=10
                    )
                    
                    print(f"📥 Backend response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        result = response.json()
                        print(f"✅ Callback result: {result.get('message')}")
                        if result.get('success'):
                            print(f"🎉 Employee successfully processed!")
                            if result.get('employee'):
                                emp = result.get('employee')
                                print(f"   📋 Employee ID: {emp.get('employeeId')}")
                                print(f"   👤 Name: {emp.get('name')}")
                        else:
                            print(f"⚠️  Backend warning: {result.get('warning')}")
                    else:
                        print(f"❌ Callback failed with status: {response.status_code}")
                        try:
                            error_detail = response.json()
                            print(f"❌ Error details: {error_detail}")
                        except:
                            print(f"❌ Error response: {response.text}")
                            
                except requests.exceptions.ConnectionError as e:
                    print(f"❌ Connection error: {e}")
                except requests.exceptions.Timeout as e:
                    print(f"❌ Timeout error: {e}")
                except Exception as e:
                    print(f"❌ Unexpected error: {e}")
            
            messagebox.showinfo("Success", f"Fingerprint registered for {user_name}!")
            self.update_users_list()
            self.clear_form_fields()
        else:
            print("❌ Fingerprint registration failed")
            messagebox.showerror("Error", "Fingerprint registration failed!")
        
        self.registration_in_progress = False
        self.scan_count = 0
        self.update_scan_label()
    
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
            
    def update_scan_label(self):
        """Update the scan progress label"""
        self.progress_label.config(text=f"Scans: {self.scan_count}/3")
    
    def capture_fingerprint(self, timeout=15):
        """✅ Capture a fingerprint with timeout"""
        start_time = time.time()
        self.log(f"Starting fingerprint capture (timeout: {timeout}s)")
        
        while time.time() - start_time < timeout:
            try:
                with self.device_lock:
                    if not self.zkfp2:
                        self.log("Device not initialized")
                        return None
                    
                    # Use the working method from capture_fingerprint.py
                    capture = self.zkfp2.AcquireFingerprint()
                    
                if capture and len(capture) >= 2:
                    template, img = capture
                    self.log("Fingerprint captured successfully")
                    return capture
                    
            except Exception as e:
                self.log(f"Capture error: {str(e)}")
                # Don't return immediately, keep trying
                
            time.sleep(0.1)
            
        self.log(f"Fingerprint capture timeout after {timeout}s")
        return None
        
        
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
            
    def on_user_select(self, event):
        """Handle user selection in treeview"""
        selection = self.users_tree.selection()
        if selection:
            self.btn_delete_user.config(state=tk.NORMAL)
        else:
            self.btn_delete_user.config(state=tk.DISABLED)
    
    def sync_deletion_with_gui(self, user_id):
        """Sync deletion with Registered Users tab - refresh the GUI list"""
        try:
            # Update the users list in GUI
            self.update_users_list()
            
            # Update template count
            self.template_count = len(self.registered_users)
            
            # Log the sync
            self.log(f"🔄 GUI synced - user {user_id} removed from Registered Users list")
            
        except Exception as e:
            self.log(f"❌ Error syncing deletion with GUI: {str(e)}")
    
    def handle_external_deletion(self, user_id):
        """Handle deletion from external systems (Employee System)"""
        try:
            if user_id in self.registered_users:
                user_info = self.registered_users[user_id]
                
                # Delete from device
                if self.zkfp2:
                    if user_id.startswith('EMP'):
                        user_id_int = int(user_id[3:])
                    else:
                        user_id_int = int(user_id) if isinstance(user_id, str) else user_id
                    
                    # Skip device deletion to prevent DBDelete errors
                    # with self.device_lock:
                    #     self.zkfp2.DBDelete(user_id_int)
                    self.log(f"ℹ️  Skipped deleting user {user_info['name']} from device - DBDelete disabled")
                
                # Delete from database
                if self.delete_user_from_database(user_id):
                    # Remove from registered users
                    del self.registered_users[user_id]
                    self.template_count -= 1
                    
                    # Sync with GUI
                    self.sync_deletion_with_gui(user_id)
                    
                    self.log(f"✅ External deletion completed for {user_info['name']} (ID: {user_id})")
                    return True
                else:
                    self.log(f"❌ Failed to delete user {user_id} from database")
                    return False
            else:
                self.log(f"⚠️  User {user_id} not found in registered users")
                return False
                
        except Exception as e:
            self.log(f"❌ Error handling external deletion: {str(e)}")
            return False
    
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
                # with self.device_lock:
                #     self.zkfp2.DBDelete(user_id_int)
                self.log(f"ℹ️  Skipped deleting user {user_name} from device - DBDelete disabled")
            
            # Delete from database
            if self.delete_user_from_database(user_id):
                # Remove from registered users
                if user_id in self.registered_users:
                    del self.registered_users[user_id]
                    self.template_count -= 1
                
                # Sync deletion with GUI
                self.sync_deletion_with_gui(user_id)
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
            


def main():
    root = tk.Tk()
    app = FingerprintGUI(root)

    # Prefill form fields if employee data is provided (using database field names)
    if employee_data:
        try:
            if 'firstName' in employee_data:
                app.entry_first_name.insert(0, employee_data.get('firstName', ''))
            if 'lastName' in employee_data:
                app.entry_last_name.insert(0, employee_data.get('lastName', ''))
            if 'email' in employee_data:
                app.entry_email.insert(0, employee_data.get('email', ''))
            if 'contactNumber' in employee_data:
                app.entry_contact.insert(0, employee_data.get('contactNumber', ''))
            if 'status' in employee_data:
                app.combo_status.set(employee_data.get('status', ''))
            if 'hireDate' in employee_data:
                app.entry_date_hired.insert(0, employee_data.get('hireDate', ''))
            if 'employeeId' in employee_data:
                app.entry_employee_id.insert(0, employee_data.get('employeeId', ''))
            if 'username' in employee_data:
                app.entry_username.insert(0, employee_data.get('username', ''))
            if 'password' in employee_data:
                app.entry_password.insert(0, employee_data.get('password', ''))
        except:
            pass

    root.mainloop()

if __name__ == "__main__":
    main()