# Fix ZKFP2 Missing Methods

## Issue
ZKFP2 library doesn't have GetDBNum or GetDeviceInfo methods, but the code uses GetDBNum to check template count.

## Plan
- [ ] Add self.template_count = 0 to __init__ method
- [ ] Update template_count when loading users from database to device
- [ ] Increment template_count when registering new users
- [ ] Decrement template_count when deleting users
- [ ] Replace all self.zkfp2.GetDBNum() calls with self.template_count
- [ ] Remove GetDBNum test in initialize_device method

## Files to Edit
- employee/Biometric_connect/main.py
