import tkinter as tk
from tkinter import messagebox
import json
import sys

def send(data):
    print(json.dumps(data), flush=True)

def on_verify():
    uid = entry.get().strip()
    if not uid:
        messagebox.showwarning("Input", "Enter User ID")
        return
    # Simulate verification
    send({"event": "verify", "user_id": uid, "result": "match"})
    messagebox.showinfo("Verification", f"User {uid} verified successfully!")

def on_close():
    send({"event": "shutdown"})
    root.destroy()

root = tk.Tk()
root.title("Verify Fingerprint")
root.geometry("300x150")

tk.Label(root, text="User ID:").pack(pady=5)
entry = tk.Entry(root)
entry.pack()

tk.Button(root, text="Verify", command=on_verify).pack(pady=5)
tk.Button(root, text="Close", command=on_close).pack()

send({"event": "ready"})
root.protocol("WM_DELETE_WINDOW", on_close)
root.mainloop()
