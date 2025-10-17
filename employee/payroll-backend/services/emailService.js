/**
 * 📧 Email Notification Service
 * Handles all email notifications for the payroll system
 */

import nodemailer from 'nodemailer';
import moment from 'moment-timezone';

const TIMEZONE = 'Asia/Manila';
const COMPANY_NAME = 'Rae Disenyo Garden & Landscaping';

/**
 * Get email configuration from environment variables
 * Called at runtime to ensure env vars are loaded
 */
const getEmailConfig = () => {
  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    },
    debug: true, // Enable debug output
    logger: true  // Log information
  };
};

/**
 * Create email transporter with enhanced configuration
 * Supports Gmail and other SMTP providers
 */
const createTransporter = () => {
  // Get config at runtime to ensure env vars are loaded
  const EMAIL_CONFIG = getEmailConfig();
  
  console.log('🔍 Checking email environment variables (at runtime)...');
  console.log('   EMAIL_USER:', EMAIL_CONFIG.auth.user || 'NOT SET!!!');
  console.log('   EMAIL_PASSWORD:', EMAIL_CONFIG.auth.pass ? '***SET (' + EMAIL_CONFIG.auth.pass.length + ' chars)***' : 'NOT SET!!!');
  console.log('   EMAIL_HOST:', EMAIL_CONFIG.host);
  console.log('   EMAIL_PORT:', EMAIL_CONFIG.port);
  
  if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
    console.error('❌ Email credentials not configured. Emails will not be sent.');
    console.error('   Expected: EMAIL_USER and EMAIL_PASSWORD in config.env');
    return null;
  }
  
  console.log('📧 Creating email transporter...');
  console.log('   Host:', EMAIL_CONFIG.host);
  console.log('   Port:', EMAIL_CONFIG.port);
  console.log('   Secure:', EMAIL_CONFIG.secure);
  console.log('   User:', EMAIL_CONFIG.auth.user);
  
  const transporter = nodemailer.createTransport(EMAIL_CONFIG);
  
  // Verify transporter configuration
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter is ready to send emails');
    }
  });
  
  return transporter;
};

/**
 * Send payroll notification email
 * @param {Object} employee - Employee record
 * @param {Object} payroll - Payroll record
 * @returns {Promise<Object>}
 */
export const sendPayrollNotification = async (employee, payroll) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const startDate = moment(payroll.payPeriod.startDate).tz(TIMEZONE).format('MMMM DD, YYYY');
    const endDate = moment(payroll.payPeriod.endDate).tz(TIMEZONE).format('MMMM DD, YYYY');
    
    const mailOptions = {
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to: employee.email,
      subject: `Payroll Processed - ${endDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2C3E50; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .highlight { background: #27AE60; color: white; padding: 15px; text-align: center; font-size: 18px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${COMPANY_NAME}</h2>
              <p>Payroll Notification</p>
            </div>
            
            <div class="content">
              <p>Dear ${employee.firstName} ${employee.lastName},</p>
              <p>Your payroll for the period <strong>${startDate}</strong> to <strong>${endDate}</strong> has been processed.</p>
              
              <div class="details">
                <h3>Payroll Summary</h3>
                <div class="detail-row">
                  <span>Employee ID:</span>
                  <span>${employee.employeeId}</span>
                </div>
                <div class="detail-row">
                  <span>Work Days:</span>
                  <span>${payroll.workDays}</span>
                </div>
                <div class="detail-row">
                  <span>Half Days:</span>
                  <span>${payroll.halfDays}</span>
                </div>
                <div class="detail-row">
                  <span>Total Hours:</span>
                  <span>${payroll.totalHoursWorked.toFixed(2)} hrs</span>
                </div>
                <div class="detail-row">
                  <span>Overtime Hours:</span>
                  <span>${payroll.overtimeHours.toFixed(2)} hrs</span>
                </div>
              </div>
              
              <div class="details">
                <h3>Earnings</h3>
                <div class="detail-row">
                  <span>Basic Salary:</span>
                  <span>₱${payroll.basicSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="detail-row">
                  <span>Overtime Pay:</span>
                  <span>₱${payroll.overtimePay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="detail-row">
                  <strong>Gross Salary:</strong>
                  <strong>₱${payroll.grossSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
              
              <div class="details">
                <h3>Deductions</h3>
                ${payroll.mandatoryDeductions && payroll.mandatoryDeductions.length > 0 ? 
                  payroll.mandatoryDeductions.map(ded => `
                    <div class="detail-row">
                      <span>${ded.deduction?.name || ded.name || 'Unknown'}:</span>
                      <span>₱${ded.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                  `).join('') : 
                  '<div class="detail-row"><span>No mandatory deductions</span><span>₱0.00</span></div>'
                }
                ${payroll.cashAdvanceDeduction > 0 ? `
                  <div class="detail-row">
                    <span>Cash Advance:</span>
                    <span>₱${payroll.cashAdvanceDeduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                ` : ''}
                <div class="detail-row">
                  <strong>Total Deductions:</strong>
                  <strong>₱${payroll.totalDeductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>
              
              <div class="highlight">
                <strong>Net Salary: ₱${payroll.netSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong>
              </div>
              
              <p>Your payslip is available for download in the employee portal.</p>
              <p>If you have any questions, please contact the HR department.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from ${COMPANY_NAME}</p>
              <p>Generated on ${moment().tz(TIMEZONE).format('MMMM DD, YYYY HH:mm:ss')}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Payroll notification sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending payroll notification:', error);
    return {
      success: false,
      message: 'Failed to send payroll notification',
      error: error.message
    };
  }
};

/**
 * Send cash advance approval notification
 * @param {Object} employee - Employee record
 * @param {Object} advance - Cash advance record
 * @returns {Promise<Object>}
 */
export const sendCashAdvanceApproval = async (employee, advance) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const mailOptions = {
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to: employee.email,
      subject: `Cash Advance Approved - ${advance.advanceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #27AE60; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✅ Cash Advance Approved</h2>
            </div>
            
            <div class="content">
              <p>Dear ${employee.firstName} ${employee.lastName},</p>
              <p>Your cash advance request has been approved.</p>
              
              <div class="details">
                <h3>Advance Details</h3>
                <div class="detail-row">
                  <span>Advance ID:</span>
                  <span>${advance.advanceId}</span>
                </div>
                <div class="detail-row">
                  <span>Amount:</span>
                  <span><strong>₱${advance.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
                </div>
                <div class="detail-row">
                  <span>Request Date:</span>
                  <span>${moment(advance.requestDate).tz(TIMEZONE).format('MMMM DD, YYYY')}</span>
                </div>
                <div class="detail-row">
                  <span>Approval Date:</span>
                  <span>${moment(advance.approvalDate).tz(TIMEZONE).format('MMMM DD, YYYY')}</span>
                </div>
                ${advance.deductionSchedule ? `
                  <div class="detail-row">
                    <span>Deduction Schedule:</span>
                    <span>${moment(advance.deductionSchedule).tz(TIMEZONE).format('MMMM DD, YYYY')}</span>
                  </div>
                ` : ''}
              </div>
              
              ${advance.approvalNotes ? `
                <div class="details">
                  <h4>Notes:</h4>
                  <p>${advance.approvalNotes}</p>
                </div>
              ` : ''}
              
              <p><strong>Important:</strong> This amount will be deducted from your next payroll as scheduled.</p>
              <p>If you have any questions, please contact the HR department.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from ${COMPANY_NAME}</p>
              <p>Generated on ${moment().tz(TIMEZONE).format('MMMM DD, YYYY HH:mm:ss')}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Cash advance approval notification sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending cash advance approval:', error);
    return {
      success: false,
      message: 'Failed to send cash advance approval notification',
      error: error.message
    };
  }
};

/**
 * Send cash advance rejection notification
 * @param {Object} employee - Employee record
 * @param {Object} advance - Cash advance record
 * @returns {Promise<Object>}
 */
export const sendCashAdvanceRejection = async (employee, advance) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const mailOptions = {
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to: employee.email,
      subject: `Cash Advance Request Update - ${advance.advanceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #E74C3C; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Cash Advance Request Update</h2>
            </div>
            
            <div class="content">
              <p>Dear ${employee.firstName} ${employee.lastName},</p>
              <p>We regret to inform you that your cash advance request could not be approved at this time.</p>
              
              <div class="details">
                <p><strong>Advance ID:</strong> ${advance.advanceId}</p>
                <p><strong>Requested Amount:</strong> ₱${advance.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                ${advance.rejectionReason ? `<p><strong>Reason:</strong> ${advance.rejectionReason}</p>` : ''}
              </div>
              
              <p>If you have any questions or concerns, please contact the HR department.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from ${COMPANY_NAME}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Cash advance rejection notification sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending cash advance rejection:', error);
    return {
      success: false,
      message: 'Failed to send cash advance rejection notification',
      error: error.message
    };
  }
};

/**
 * Send cash advance reminder email
 * @param {Object} employee - Employee record
 * @param {Object} data - Reminder data with advances and totalOutstanding
 * @returns {Promise<Object>}
 */
export const sendCashAdvanceReminder = async (employee, data) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const advancesList = data.advances.map(adv => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${adv.advanceId}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">₱${adv.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">₱${adv.remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${moment(adv.requestDate).tz(TIMEZONE).format('MMM DD, YYYY')}</td>
      </tr>
    `).join('');
    
    const mailOptions = {
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to: employee.email,
      subject: `Cash Advance Payment Reminder`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F39C12; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #34495E; color: white; padding: 10px; text-align: left; }
            .total { background: #F39C12; color: white; padding: 15px; text-align: center; font-size: 18px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>💰 Cash Advance Payment Reminder</h2>
            </div>
            
            <div class="content">
              <p>Dear ${employee.firstName} ${employee.lastName},</p>
              <p>This is a friendly reminder about your outstanding cash advance balance.</p>
              
              <div class="details">
                <h3>Outstanding Advances</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Advance ID</th>
                      <th>Original Amount</th>
                      <th>Remaining Balance</th>
                      <th>Request Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${advancesList}
                  </tbody>
                </table>
              </div>
              
              <div class="total">
                <strong>Total Outstanding:</strong> ₱${data.totalOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              
              <p>Your outstanding balance will be deducted from your upcoming payroll as scheduled.</p>
              <p>If you have any questions or concerns, please contact the HR department.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated reminder from ${COMPANY_NAME}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Cash advance reminder sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending cash advance reminder:', error);
    return {
      success: false,
      message: 'Failed to send cash advance reminder',
      error: error.message
    };
  }
};

/**
 * Send system alert email (for admins)
 * @param {Object} admin - Admin employee record
 * @param {Object} alertData - Alert data with subject, message, and data
 * @returns {Promise<Object>}
 */
/**
 * Send system alert email (for admins)
 * @param {Object} admin - Admin employee record
 * @param {Object} alertData - Alert data with subject, message, and data
 * @returns {Promise<Object>}
 */
export const sendSystemAlert = async (admin, alertData) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const { subject, message, data, severity = 'info' } = alertData;
    
    const colors = {
      info: '#3498DB',
      warning: '#F39C12',
      error: '#E74C3C'
    };
    
    let dataHtml = '';
    if (data && typeof data === 'object') {
      dataHtml = '<div class="details">';
      for (const [key, value] of Object.entries(data)) {
        dataHtml += `<p><strong>${key}:</strong> ${value}</p>`;
      }
      dataHtml += '</div>';
    }
    
    const mailOptions = {
      from: `"${COMPANY_NAME} System" <${FROM_EMAIL}>`,
      to: admin.email,
      subject: `[SYSTEM ALERT] ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${colors[severity]}; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 System Alert</h2>
              <p>${subject}</p>
            </div>
            
            <div class="content">
              <p>Dear ${admin.firstName} ${admin.lastName},</p>
              <p>${message}</p>
              ${dataHtml}
              <p><strong>Severity:</strong> ${severity.toUpperCase()}</p>
              <p><strong>Timestamp:</strong> ${moment().tz(TIMEZONE).format('MMMM DD, YYYY HH:mm:ss')}</p>
            </div>
            
            <div class="footer">
              <p>This is an automated alert from ${COMPANY_NAME} Payroll System</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'System alert sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending system alert:', error);
    return {
      success: false,
      message: 'Failed to send system alert',
      error: error.message
    };
  }
};

/**
 * Send payslip email with PDF attachment
 * @param {Object} employee - Employee record
 * @param {Object} payroll - Payroll record
 * @param {Buffer} pdfBuffer - Payslip PDF buffer
 * @param {String} filename - PDF filename
 * @returns {Promise<Object>}
 */
export const sendPayslipEmail = async (employee, payroll, pdfBuffer, filename) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    const endDate = moment(payroll.payPeriod.endDate).tz(TIMEZONE).format('MMMM DD, YYYY');
    
    const mailOptions = {
      from: `"${COMPANY_NAME}" <${FROM_EMAIL}>`,
      to: employee.email,
      subject: `Payslip - ${endDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2C3E50; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${COMPANY_NAME}</h2>
              <p>📄 Your Payslip is Ready</p>
            </div>
            
            <div class="content">
              <p>Dear ${employee.firstName} ${employee.lastName},</p>
              <p>Please find attached your payslip for the period ending <strong>${endDate}</strong>.</p>
              <p><strong>Net Salary:</strong> ₱${payroll.netSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              <p>If you have any questions, please contact the HR department.</p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from ${COMPANY_NAME}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    return {
      success: true,
      message: 'Payslip email sent successfully',
      messageId: info.messageId
    };
    
  } catch (error) {
    console.error('❌ Error sending payslip email:', error);
    return {
      success: false,
      message: 'Failed to send payslip email',
      error: error.message
    };
  }
};

/**
 * Send new employee credentials email
 * @param {Object} employee - Employee record with credentials
 * @returns {Promise<Object>}
 */
export const sendEmployeeCredentialsEmail = async (employee) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return {
        success: false,
        message: 'Email service not configured'
      };
    }
    
    // Get FROM_EMAIL from config at runtime
    const EMAIL_CONFIG = getEmailConfig();
    const FROM_EMAIL = process.env.FROM_EMAIL || EMAIL_CONFIG.auth.user;
    
    const { firstName, lastName, employeeId, username, plainTextPassword, email } = employee;
    
    const mailOptions = {
      from: `"${COMPANY_NAME} - HR Department" <${FROM_EMAIL}>`,
      to: email,
      subject: `Welcome! Your Employee Account Credentials - ${employeeId}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Our Team</title>
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
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Welcome to ${COMPANY_NAME}!
                </h1>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear <strong>${firstName} ${lastName}</strong>,
              </p>
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                Welcome to our team! We're excited to have you on board. Your employee account has been successfully created, and you can now access the employee portal.
              </p>
            </td>
          </tr>
          
          <!-- Credentials Box -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background: linear-gradient(135deg, #fff5f7 0%, #ffe5ec 100%); border-left: 4px solid #f06a98; border-radius: 8px; padding: 25px; box-shadow: 0 2px 4px rgba(240,106,152,0.1);">
                <h2 style="color: #f06a98; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">
                  🔐 Your Login Credentials
                </h2>
                
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-size: 14px; font-weight: 600;">Employee ID:</span>
                    </td>
                    <td style="padding: 10px 0; text-align: right;">
                      <span style="color: #333333; font-size: 16px; font-weight: 700; background-color: #ffffff; padding: 8px 16px; border-radius: 4px; display: inline-block;">
                        ${employeeId}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-size: 14px; font-weight: 600;">Username:</span>
                    </td>
                    <td style="padding: 10px 0; text-align: right;">
                      <span style="color: #333333; font-size: 16px; font-weight: 700; background-color: #ffffff; padding: 8px 16px; border-radius: 4px; display: inline-block;">
                        ${username}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #666666; font-size: 14px; font-weight: 600;">Password:</span>
                    </td>
                    <td style="padding: 10px 0; text-align: right;">
                      <span style="color: #f06a98; font-size: 16px; font-weight: 700; background-color: #ffffff; padding: 8px 16px; border-radius: 4px; display: inline-block; font-family: 'Courier New', monospace;">
                        ${plainTextPassword}
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Important Notes -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background-color: #fff9e6; border-left: 4px solid #ffa500; border-radius: 8px; padding: 20px;">
                <h3 style="color: #ff8c00; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                  ⚠️ Important Security Notes
                </h3>
                <ul style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Please change your password after your first login</li>
                  <li style="margin-bottom: 8px;">Keep your credentials confidential</li>
                  <li style="margin-bottom: 8px;">Never share your password with anyone</li>
                  <li>Contact IT support if you experience any login issues</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Login Button -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                 style="display: inline-block; background: linear-gradient(135deg, #f8b6c1 0%, #f06a98 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 25px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 15px rgba(240,106,152,0.3);">
                Login to Your Account
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 10px 0; text-align: center;">
                If you did not expect this email or have any questions, please contact our HR department immediately.
              </p>
              <p style="color: #cccccc; font-size: 12px; margin: 0; text-align: center;">
                © ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.
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
    
    console.log('📧 Attempting to send credentials email...');
    console.log('   From:', mailOptions.from);
    console.log('   To:', email);
    console.log('   Subject:', mailOptions.subject);
    console.log('   Employee ID:', employeeId);
    console.log('   Username:', username);
    console.log('   Password:', plainTextPassword ? '✅ PROVIDED' : '❌ MISSING');
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Employee credentials email sent successfully!');
    console.log('   To:', email);
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    return {
      success: true,
      message: 'Credentials email sent successfully',
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
    
  } catch (error) {
    console.error('❌ Error sending credentials email:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Error details:', error);
    
    // Provide specific error messages
    let errorMessage = 'Failed to send credentials email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Check EMAIL_USER and EMAIL_PASSWORD in config.env';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Check internet connection and SMTP settings';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email server connection timed out. Try again later';
    } else if (error.responseCode === 550) {
      errorMessage = 'Recipient email address rejected. Check if email address is valid';
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code
    };
  }
};

export default {
  sendPayrollNotification,
  sendCashAdvanceApproval,
  sendCashAdvanceRejection,
  sendCashAdvanceReminder,
  sendSystemAlert,
  sendPayslipEmail,
  sendEmployeeCredentialsEmail // ✅ ADDED
};
