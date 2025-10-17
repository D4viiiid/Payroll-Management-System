/**
 * Simple Email Test - CommonJS version
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: './config.env' });

console.log('🧪 SIMPLE EMAIL TEST\n');

async function sendTestEmail() {
  try {
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    const FRONTEND_URL = process.env.FRONTEND_URL;
    
    console.log('📋 Email Configuration:');
    console.log('  EMAIL_USER:', EMAIL_USER || '❌ NOT SET');
    console.log('  EMAIL_PASSWORD:', EMAIL_PASSWORD ? '✅ SET (length: ' + EMAIL_PASSWORD.length + ')' : '❌ NOT SET');
    console.log('  FRONTEND_URL:', FRONTEND_URL || '❌ NOT SET');
    
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.error('\n❌ Email credentials not set in config.env!');
      return;
    }
    
    console.log('\n📧 Creating Gmail transporter...');
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    
    console.log('✅ Transporter created');
    
    console.log('\n🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!');
    
    console.log('\n📨 Sending test email to:', EMAIL_USER);
    const info = await transporter.sendMail({
      from: `"Employee System Test" <${EMAIL_USER}>`,
      to: EMAIL_USER, // Send to yourself
      subject: '🧪 Test Email - Credentials System Working!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #f8b6c1, #f06a98); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; }
            .credentials { background: linear-gradient(135deg, #fff5f7, #ffe5ec); border-left: 4px solid #f06a98; border-radius: 8px; padding: 25px; margin: 20px 0; }
            .cred-row { display: flex; justify-content: space-between; padding: 10px 0; }
            .cred-label { color: #666; font-weight: 600; }
            .cred-value { background: white; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-family: monospace; }
            .success { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Email Service Test Successful!</h1>
            </div>
            <div class="content">
              <h2 style="color: #f06a98; margin-top: 0;">Test Results</h2>
              <p>If you're reading this, the email service is working correctly!</p>
              
              <div class="credentials">
                <h3 style="color: #f06a98; margin-top: 0;">📧 Sample Credentials Format</h3>
                <div class="cred-row">
                  <span class="cred-label">Employee ID:</span>
                  <span class="cred-value">EMP-5249</span>
                </div>
                <div class="cred-row">
                  <span class="cred-label">Username:</span>
                  <span class="cred-value">gabriel.rivera</span>
                </div>
                <div class="cred-row">
                  <span class="cred-label">Password:</span>
                  <span class="cred-value" style="color: #f06a98;">BY8mmFq3lXzV</span>
                </div>
              </div>
              
              <div class="success">
                <p style="margin: 0; color: #2e7d32;">
                  <strong>✅ SMTP Connection:</strong> Verified<br>
                  <strong>✅ Email Sending:</strong> Working<br>
                  <strong>✅ Template Rendering:</strong> Successful<br>
                  <strong>✅ Credentials Display:</strong> Username & Password shown correctly
                </p>
              </div>
              
              <p style="color: #999; font-size: 13px; margin-top: 30px;">
                Test Date: ${new Date().toLocaleString()}<br>
                Service: Gmail SMTP<br>
                From: ${EMAIL_USER}
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('\n🎉 EMAIL SENT SUCCESSFULLY!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    console.log('\n📬 Check your inbox:', EMAIL_USER);
    console.log('\n✅ The email service is working correctly!');
    console.log('✅ Username and password will be displayed in employee credential emails');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error code:', error.code || 'N/A');
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication Failed:');
      console.error('   1. Make sure EMAIL_USER is correct in config.env');
      console.error('   2. Make sure EMAIL_PASSWORD is a Gmail App Password (NOT regular password)');
      console.error('   3. Enable 2-Step Verification: https://myaccount.google.com/signinoptions/two-step-verification');
      console.error('   4. Generate App Password: https://myaccount.google.com/apppasswords');
      console.error('   5. Select "Mail" and generate a new password');
      console.error('   6. Copy the 16-character password (no spaces) to config.env');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection Issue:');
      console.error('   1. Check your internet connection');
      console.error('   2. Check if Gmail SMTP is accessible');
      console.error('   3. Try again in a few moments');
    } else {
      console.error('\n💡 Full error details:');
      console.error(error);
    }
  }
}

sendTestEmail();
