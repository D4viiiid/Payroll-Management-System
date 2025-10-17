/**
 * Simple Email Test - Test sending to the configured email
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load environment variables
const result = dotenv.config({ path: './config.env' });

if (result.error) {
  console.error('❌ Error loading config.env:', result.error);
  process.exit(1);
}

console.log('🧪 SIMPLE EMAIL TEST\n');
console.log('✅ Config loaded from:', './config.env\n');

async function sendTestEmail() {
  try {
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    const FRONTEND_URL = process.env.FRONTEND_URL;
    
    console.log('📋 Email Configuration:');
    console.log('  EMAIL_USER:', EMAIL_USER || '❌ NOT SET');
    console.log('  EMAIL_PASSWORD:', EMAIL_PASSWORD ? '✅ SET (***' + EMAIL_PASSWORD.slice(-4) + ')' : '❌ NOT SET');
    console.log('  FRONTEND_URL:', FRONTEND_URL || '❌ NOT SET');
    
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.error('\n❌ Email credentials not set in config.env!');
      console.error('Please add EMAIL_USER and EMAIL_PASSWORD');
      return;
    }
    
    console.log('\n📧 Creating Gmail transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    
    console.log('✅ Transporter created');
    
    console.log('\n🔍 Verifying connection...');
    await transporter.verify();
    console.log('✅ Connection verified!');
    
    console.log('\n📨 Sending test email...');
    const info = await transporter.sendMail({
      from: `"Test" <${EMAIL_USER}>`,
      to: EMAIL_USER, // Send to yourself
      subject: 'Test Email - Employee System',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from the employee management system.</p>
        <p>If you received this, the email service is working correctly!</p>
        <hr>
        <p><strong>Sample Credentials:</strong></p>
        <ul>
          <li>Employee ID: EMP-TEST-001</li>
          <li>Username: testuser</li>
          <li>Password: TestPass123</li>
        </ul>
      `
    });
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('\n📬 Check your inbox:', EMAIL_USER);
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('  1. EMAIL_USER is correct');
      console.error('  2. EMAIL_PASSWORD is a Gmail App Password (not regular password)');
      console.error('  3. 2-Step Verification is enabled on your Google account');
      console.error('  4. Generate new App Password at: https://myaccount.google.com/apppasswords');
    }
  }
}

sendTestEmail();
