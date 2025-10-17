import re

# Read the file
with open('EmployeeList.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find and replace
old_pattern = r"(// Generate employee credentials\s+console\.log\('.*?Generating employee credentials\.\.\.'\);)"

new_code = """setFingerprintStep(1); // Scanning
    alert('📱 Device ready! Please place your finger on the scanner and scan 3 times...');
    
    console.log('🖐️ Starting fingerprint capture...');
    
    // Call pre-enroll endpoint to capture fingerprint BEFORE creating employee
    const enrollResponse = await fetch('/api/biometric-integrated/pre-enroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!enrollResponse.ok) {
      const errorData = await enrollResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Fingerprint capture failed');
    }

    const enrollResult = await enrollResponse.json();
    
    if (!enrollResult.success || !enrollResult.template) {
      throw new Error(enrollResult.message || 'Failed to capture fingerprint template');
    }

    console.log('✅ Fingerprint captured! Template length:', enrollResult.templateLength);
    
    // Store the captured template in state
    setCapturedFingerprintTemplate(enrollResult.template);

    // Generate employee credentials AFTER successful fingerprint capture
    console.log('🔑 Generating employee credentials...');"""

content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Write back
with open('EmployeeList.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ File updated successfully!")
