import tkinter as tk
from tkinter import messagebox
import json
import sys

def send(data):
    print(json.dumps(data), flush=True)

# Get command line arguments
email = sys.argv[1] if len(sys.argv) > 1 else ""
password = sys.argv[2] if len(sys.argv) > 2 else ""
employee_id = sys.argv[3] if len(sys.argv) > 3 else ""
first_name = sys.argv[4] if len(sys.argv) > 4 else ""
last_name = sys.argv[5] if len(sys.argv) > 5 else ""
position = sys.argv[6] if len(sys.argv) > 6 else ""

def on_enroll():
    uid = entry.get().strip()
    if not uid:
        messagebox.showwarning("Input", "Enter User ID")
        return
    
    # Include email and password in the enrollment data
    send({
        "event": "enroll", 
        "user_id": uid, 
        "email": email,
        "password": password,
        "employee_id": employee_id,
        "first_name": first_name,
        "last_name": last_name,
        "position": position,
        "status": "success"
    })
    
    messagebox.showinfo("Done", f"Enrolled: {uid}")

def on_close():
    send({"event": "shutdown"})
    root.destroy()

root = tk.Tk()
root.title("Enroll Fingerprint")
root.geometry("400x200")

# Display employee information if available
if first_name and last_name:
    tk.Label(root, text=f"Enrolling: {first_name} {last_name}").pack(pady=5)
if email:
    tk.Label(root, text=f"Email: {email}").pack(pady=2)

tk.Label(root, text="User ID:").pack(pady=5)
entry = tk.Entry(root)
entry.pack()
if employee_id:
    entry.insert(0, employee_id)

tk.Button(root, text="Enroll Fingerprint", command=on_enroll).pack(pady=10)
tk.Button(root, text="Close", command=on_close).pack()

send({"event": "ready"})
root.protocol("WM_DELETE_WINDOW", on_close)
root.mainloop()
