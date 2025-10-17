#!/usr/bin/env python
"""
Direct test of attendance recording to see exactly what's happening
"""
import sys
import subprocess
import json

print("=" * 60)
print("TESTING ATTENDANCE RECORDING DIRECTLY")
print("=" * 60)

# Run the integrated_capture.py script with --direct mode
result = subprocess.run(
    [sys.executable, "integrated_capture.py", "--direct"],
    capture_output=True,
    text=True,
    timeout=60
)

print(f"\n📊 Exit Code: {result.returncode}")
print(f"\n📤 STDOUT ({len(result.stdout)} chars):")
print("-" * 60)
print(result.stdout)
print("-" * 60)

print(f"\n📤 STDERR ({len(result.stderr)} chars):")
print("-" * 60)
print(result.stderr)
print("-" * 60)

# Try to find JSON in stdout
if result.stdout:
    lines = result.stdout.strip().split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith('{'):
            try:
                data = json.loads(line)
                print(f"\n✅ Found valid JSON at line {i}:")
                print(json.dumps(data, indent=2))
            except:
                print(f"\n⚠️ Line {i} looks like JSON but failed to parse: {line[:100]}")
