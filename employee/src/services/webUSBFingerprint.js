// WebUSB Fingerprint Service for ZKTeco Live20R/SLK20R
// This allows direct browser-to-USB communication (no backend needed!)

class WebUSBFingerprintService {
  constructor() {
    this.device = null;
    this.interfaceNumber = 0;
    this.endpointIn = null;
    this.endpointOut = null;
  }

  /**
   * Check if WebUSB is supported
   */
  isSupported() {
    if (!navigator.usb) {
      console.error('❌ WebUSB not supported in this browser');
      console.log('💡 Use Chrome, Edge, or Opera browser');
      return false;
    }
    return true;
  }

  /**
   * Request permission and connect to ZKTeco device
   */
  async connect() {
    if (!this.isSupported()) {
      throw new Error('WebUSB not supported. Please use Chrome, Edge, or Opera browser.');
    }

    try {
      // Request device (shows browser prompt for user to select USB device)
      const filters = [
        // ZKTeco vendor IDs (common values)
        { vendorId: 0x1B55 }, // ZKTeco vendor ID
        { vendorId: 0x2FFF }, // Alternative ZKTeco vendor ID
      ];

      console.log('📱 Requesting USB device access...');
      this.device = await navigator.usb.requestDevice({ filters });

      console.log('✅ Device selected:', this.device.productName);

      // Open device
      await this.device.open();
      console.log('✅ Device opened');

      // Select configuration
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // Claim interface
      await this.device.claimInterface(this.interfaceNumber);
      console.log('✅ Interface claimed');

      // Find endpoints
      const interfaceObj = this.device.configuration.interfaces[this.interfaceNumber];
      const alternate = interfaceObj.alternates[0];

      this.endpointOut = alternate.endpoints.find(e => e.direction === 'out');
      this.endpointIn = alternate.endpoints.find(e => e.direction === 'in');

      console.log('✅ ZKTeco device connected successfully!');
      return true;

    } catch (error) {
      console.error('❌ Failed to connect to fingerprint device:', error);
      throw error;
    }
  }

  /**
   * Disconnect from device
   */
  async disconnect() {
    if (this.device) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        await this.device.close();
        this.device = null;
        console.log('✅ Device disconnected');
      } catch (error) {
        console.error('❌ Error disconnecting:', error);
      }
    }
  }

  /**
   * Send command to device
   */
  async sendCommand(command) {
    if (!this.device || !this.endpointOut) {
      throw new Error('Device not connected');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(command);

    await this.device.transferOut(this.endpointOut.endpointNumber, data);
  }

  /**
   * Receive data from device
   */
  async receiveData(length = 64) {
    if (!this.device || !this.endpointIn) {
      throw new Error('Device not connected');
    }

    const result = await this.device.transferIn(this.endpointIn.endpointNumber, length);
    
    if (result.status === 'ok') {
      const decoder = new TextDecoder();
      return decoder.decode(result.data);
    }

    throw new Error('Failed to receive data from device');
  }

  /**
   * Capture fingerprint (simplified - you'll need ZKTeco protocol)
   */
  async captureFingerprint() {
    try {
      console.log('👆 Place finger on scanner...');
      
      // Send capture command (this is a placeholder - you need actual ZKTeco protocol)
      await this.sendCommand('CAPTURE_FINGERPRINT');
      
      // Wait for response
      const response = await this.receiveData();
      
      console.log('✅ Fingerprint captured:', response);
      return response;

    } catch (error) {
      console.error('❌ Fingerprint capture failed:', error);
      throw error;
    }
  }

  /**
   * Enroll fingerprint (capture 3 times and create template)
   */
  async enrollFingerprint(employeeId) {
    const templates = [];

    for (let i = 1; i <= 3; i++) {
      console.log(`📸 Capture ${i}/3 - Place finger on scanner...`);
      
      const template = await this.captureFingerprint();
      templates.push(template);
      
      console.log(`✅ Capture ${i}/3 completed`);
      
      if (i < 3) {
        console.log('🔄 Please remove finger and place again...');
        await this.sleep(2000);
      }
    }

    // Merge templates (you need to implement ZKTeco's merge algorithm)
    const mergedTemplate = this.mergeTemplates(templates);
    
    console.log('✅ Fingerprint enrollment completed for employee:', employeeId);
    return mergedTemplate;
  }

  /**
   * Verify fingerprint against stored template
   */
  async verifyFingerprint(storedTemplate) {
    try {
      console.log('👆 Place finger on scanner for verification...');
      
      const capturedTemplate = await this.captureFingerprint();
      
      // Compare templates (you need to implement matching algorithm)
      const isMatch = this.compareTemplates(capturedTemplate, storedTemplate);
      
      if (isMatch) {
        console.log('✅ Fingerprint verified successfully!');
        return true;
      } else {
        console.log('❌ Fingerprint does not match');
        return false;
      }

    } catch (error) {
      console.error('❌ Fingerprint verification failed:', error);
      throw error;
    }
  }

  /**
   * Helper: Merge fingerprint templates
   * NOTE: This is a placeholder - you need ZKTeco's actual algorithm
   */
  mergeTemplates(templates) {
    // For ZKTeco devices, you need their SDK or protocol documentation
    // This is just a placeholder
    return templates.join('|');
  }

  /**
   * Helper: Compare fingerprint templates
   * NOTE: This is a placeholder - you need ZKTeco's actual algorithm
   */
  compareTemplates(template1, template2) {
    // For ZKTeco devices, you need their SDK or matching algorithm
    // This is just a placeholder
    return template1 === template2;
  }

  /**
   * Helper: Sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new WebUSBFingerprintService();
