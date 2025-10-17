/**
 * 🧪 EMAIL SERVICE TEST
 * Tests the email sending functionality with real credentials
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config({ path: './config.env' });

console.log('🧪 EMAIL SERVICE TEST\n');
console.log('=' .repeat(80));

async function testEmailService() {
  try {
    console.log('\n📋 Step 1: Check Email Configuration');
    console.log('-'.repeat(80));
    
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
    const FRONTEND_URL = process.env.FRONTEND_URL;
    
    console.log('✅ EMAIL_USER:', EMAIL_USER ? EMAIL_USER : '❌ NOT SET');
    console.log('✅ EMAIL_PASSWORD:', EMAIL_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
    console.log('✅ FRONTEND_URL:', FRONTEND_URL ? FRONTEND_URL : '❌ NOT SET');
    
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      console.log('\n❌ ERROR: Email credentials not configured!');
      console.log('Please set EMAIL_USER and EMAIL_PASSWORD in config.env');
      return;
    }
    
    console.log('\n📋 Step 2: Create Email Transporter');
    console.log('-'.repeat(80));
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      },
      debug: true, // Enable debug output
      logger: true  // Log information
    });
    
    console.log('✅ Transporter created');
    console.log('   Host: smtp.gmail.com');
    console.log('   Port: 587');
    console.log('   Secure: false (using TLS)');
    console.log('   Auth User:', EMAIL_USER);
    
    console.log('\n📋 Step 3: Verify SMTP Connection');
    console.log('-'.repeat(80));
    
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    console.log('   Gmail SMTP server is reachable');
    console.log('   Credentials are valid');
    
    console.log('\n📋 Step 4: Send Test Email');
    console.log('-'.repeat(80));
    
    const testEmail = EMAIL_USER; // Send to yourself for testing
    
    const mailOptions = {
      from: `"Rae Disenyo Garden & Landscaping - HR" <${EMAIL_USER}>`,
      to: testEmail,
      subject: '🧪 Test Email - Employee Credentials System',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header with gradient -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(135deg, #f8b6c1 0%, #f06a98 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                  🧪 Email Service Test
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #f06a98; margin: 0 0 20px 0;">Test Successful! ✅</h2>
              
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
                This is a test email to verify that the email service is working correctly.
              </p>
              
              <!-- Sample Credentials Box -->
              <div style="background: linear-gradient(135deg, #fff5f7 0%, #ffe5ec 100%); border-left: 4px solid #f06a98; border-radius: 8px; padding: 25px; margin: 20px 0;">
                <h3 style="color: #f06a98; margin: 0 0 15px 0;">📧 Sample Employee Credentials</h3>
                
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong>Employee ID:</strong>
                    </td>
                    <td style="text-align: right; padding: 8px 0;">
                      <span style="background: #ffffff; padding: 6px 12px; border-radius: 4px; font-family: monospace;">
                        EMP-TEST-001
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong>Username:</strong>
                    </td>
                    <td style="text-align: right; padding: 8px 0;">
                      <span style="background: #ffffff; padding: 6px 12px; border-radius: 4px; font-family: monospace;">
                        test.user
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <strong>Password:</strong>
                    </td>
                    <td style="text-align: right; padding: 8px 0;">
                      <span style="background: #ffffff; padding: 6px 12px; border-radius: 4px; font-family: monospace; color: #f06a98; font-weight: bold;">
                        TestPass123
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Important Notes -->
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #2e7d32;">
                  ✅ <strong>Email Service Status:</strong> Working correctly<br>
                  ✅ <strong>SMTP Connection:</strong> Verified<br>
                  ✅ <strong>Template Rendering:</strong> Successful<br>
                  ✅ <strong>Credentials Display:</strong> Username and Password shown correctly
                </p>
              </div>
              
              <p style="color: #999999; font-size: 13px; margin: 20px 0 0 0;">
                Test Date: ${new Date().toLocaleString()}<br>
                Email Service: Gmail SMTP (smtp.gmail.com:587)
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Rae Disenyo Garden & Landscaping<br>
                Automated Email System Test
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };
    
    console.log('Sending test email to:', testEmail);
    console.log('Subject:', mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    console.log('\n📋 Step 5: Test Employee Credentials Email');
    console.log('-'.repeat(80));
    
    const credentialsMailOptions = {
      from: `"Rae Disenyo Garden & Landscaping - HR" <${EMAIL_USER}>`,
      to: testEmail,
      subject: 'Welcome! Your Employee Account Credentials - EMP-TEST-002',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Employee Credentials</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 0;">
              <div style="background: linear-gradient(135deg, #f8b6c1 0%, #f06a98 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                  Welcome to Rae Disenyo Garden & Landscaping!
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>Gabriel Ludwig Rivera</strong>,
              </p>
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Welcome to our team! Your employee account has been created. Below are your login credentials:
              </p>
              
              <!-- Credentials -->
              <div style="background: linear-gradient(135deg, #fff5f7 0%, #ffe5ec 100%); border-left: 4px solid #f06a98; border-radius: 8px; padding: 25px;">
                <h2 style="color: #f06a98; margin: 0 0 20px 0; font-size: 20px;">
                  🔐 Your Login Credentials
                </h2>
                
                <table role="presentation" style="width: 100%;">
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-weight: 600;">Employee ID:</span>
                    </td>
                    <td style="text-align: right; padding: 10px 0;">
                      <span style="background: #ffffff; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 16px;">
                        EMP-5249
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-weight: 600;">Username:</span>
                    </td>
                    <td style="text-align: right; padding: 10px 0;">
                      <span style="background: #ffffff; padding: 8px 16px; border-radius: 4px; font-weight: 700; font-size: 16px;">
                        EMP-5249
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-weight: 600;">Password:</span>
                    </td>
                    <td style="text-align: right; padding: 10px 0;">
                      <span style="background: #ffffff; padding: 8px 16px; border-radius: 4px; color: #f06a98; font-weight: 700; font-size: 16px; font-family: 'Courier New', monospace;">
                        BY8mmFq3lXzV
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fff9e6; border-left: 4px solid #ffa500; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #ff8c00; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important Security Notice</h3>
                <ul style="margin: 0; padding-left: 20px; color: #666666;">
                  <li>Please change your password after first login</li>
                  <li>Never share your credentials with anyone</li>
                  <li>Keep your password secure and confidential</li>
                </ul>
              </div>
              
              <!-- Login Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                   style="background: linear-gradient(135deg, #f06a98 0%, #d85380 100%); 
                          color: #ffffff; 
                          text-decoration: none; 
                          padding: 15px 40px; 
                          border-radius: 25px; 
                          font-weight: 600; 
                          font-size: 16px;
                          display: inline-block;
                          box-shadow: 0 4px 6px rgba(240,106,152,0.3);">
                  Login to Your Account
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Rae Disenyo Garden & Landscaping<br>
                HR Department | Employee Portal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `
    };
    
    console.log('Sending employee credentials email to:', testEmail);
    
    const credentialsInfo = await transporter.sendMail(credentialsMailOptions);
    
    console.log('✅ Employee credentials email sent successfully!');
    console.log('   Message ID:', credentialsInfo.messageId);
    console.log('   Response:', credentialsInfo.response);
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL EMAIL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\n✅ Email service is working correctly');
    console.log('✅ Check your inbox:', testEmail);
    console.log('✅ You should receive 2 test emails:');
    console.log('   1. Email Service Test');
    console.log('   2. Employee Credentials Test');
    console.log('\n📝 Note: Check spam folder if emails not in inbox');
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ EMAIL TEST FAILED!');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication Error:');
      console.error('   - Check EMAIL_USER is correct');
      console.error('   - Check EMAIL_PASSWORD is a valid Gmail App Password');
      console.error('   - Make sure 2-Step Verification is enabled');
      console.error('   - Generate new App Password if needed');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n⚠️  Connection Error:');
      console.error('   - Check internet connection');
      console.error('   - Gmail SMTP server might be down');
      console.error('   - Check firewall settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\n⚠️  Timeout Error:');
      console.error('   - Connection timed out');
      console.error('   - Check network settings');
      console.error('   - Try again later');
    }
    
    console.error('\nFull error details:', error);
  }
}

// Run the test
testEmailService();
