/**
 * 📄 Payslip Generator Service
 * Generates professional PDF payslips with company branding
 * Uses PDFKit for PDF generation
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import moment from 'moment-timezone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TIMEZONE = 'Asia/Manila';

// Company Information
const COMPANY_INFO = {
  name: 'Rae Disenyo Garden & Landscaping',
  address: 'Business Address Here',
  city: 'City, Philippines',
  phone: '+63 XXX XXX XXXX',
  email: 'contact@raedisenyo.com'
};

/**
 * Generate a professional payslip PDF
 * @param {Object} payroll - Enhanced payroll record with all details
 * @param {Object} employee - Employee record
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePayslipPDF = async (payroll, employee) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });
      
      // Collect PDF data in chunks
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
      
      // Document styling
      const colors = {
        primary: '#2C3E50',
        secondary: '#34495E',
        accent: '#3498DB',
        success: '#27AE60',
        text: '#2C3E50',
        lightGray: '#ECF0F1',
        darkGray: '#95A5A6'
      };
      
      // Header with company logo placeholder
      doc.fontSize(24)
         .fillColor(colors.primary)
         .text(COMPANY_INFO.name, 50, 50, { align: 'center' });
      
      doc.fontSize(10)
         .fillColor(colors.darkGray)
         .text(COMPANY_INFO.address, { align: 'center' })
         .text(`${COMPANY_INFO.city} | ${COMPANY_INFO.phone}`, { align: 'center' })
         .text(COMPANY_INFO.email, { align: 'center' });
      
      // Horizontal line
      doc.moveTo(50, 130)
         .lineTo(545, 130)
         .strokeColor(colors.accent)
         .lineWidth(2)
         .stroke();
      
      // Payslip Title
      doc.fontSize(18)
         .fillColor(colors.primary)
         .text('PAYSLIP', 50, 150, { align: 'center' });
      
      // Pay Period
      const startDate = moment(payroll.payPeriod.startDate).tz(TIMEZONE).format('MMMM DD, YYYY');
      const endDate = moment(payroll.payPeriod.endDate).tz(TIMEZONE).format('MMMM DD, YYYY');
      
      doc.fontSize(12)
         .fillColor(colors.text)
         .text(`Pay Period: ${startDate} - ${endDate}`, 50, 180, { align: 'center' });
      
      // Employee Information Box
      const employeeBoxY = 220;
      doc.rect(50, employeeBoxY, 245, 100)
         .fillAndStroke(colors.lightGray, colors.darkGray);
      
      doc.fontSize(11)
         .fillColor(colors.primary)
         .text('EMPLOYEE INFORMATION', 60, employeeBoxY + 10);
      
      doc.fontSize(10)
         .fillColor(colors.text)
         .text(`Name: ${employee.firstName} ${employee.lastName}`, 60, employeeBoxY + 30)
         .text(`Employee ID: ${employee.employeeId}`, 60, employeeBoxY + 50)
         .text(`Position: ${employee.position || 'N/A'}`, 60, employeeBoxY + 70);
      
      // Payment Information Box
      doc.rect(300, employeeBoxY, 245, 100)
         .fillAndStroke(colors.lightGray, colors.darkGray);
      
      doc.fontSize(11)
         .fillColor(colors.primary)
         .text('PAYMENT INFORMATION', 310, employeeBoxY + 10);
      
      doc.fontSize(10)
         .fillColor(colors.text)
         .text(`Status: ${payroll.status}`, 310, employeeBoxY + 30)
         .text(`Generated: ${moment(payroll.createdAt).tz(TIMEZONE).format('MMM DD, YYYY')}`, 310, employeeBoxY + 50)
         .text(`Payslip ID: ${payroll._id.toString().slice(-8)}`, 310, employeeBoxY + 70);
      
      // Attendance Summary
      const attendanceY = 340;
      doc.fontSize(12)
         .fillColor(colors.primary)
         .text('ATTENDANCE SUMMARY', 50, attendanceY);
      
      // Attendance table
      const attendanceTableY = attendanceY + 25;
      drawTable(doc, attendanceTableY, [
        ['Work Days', payroll.workDays.toString()],
        ['Half Days', payroll.halfDays.toString()],
        ['Total Hours Worked', `${payroll.totalHoursWorked.toFixed(2)} hrs`],
        ['Overtime Hours', `${payroll.overtimeHours.toFixed(2)} hrs`]
      ], colors);
      
      // Earnings Section
      const earningsY = attendanceTableY + 120;
      doc.fontSize(12)
         .fillColor(colors.success)
         .text('EARNINGS', 50, earningsY);
      
      const earningsTableY = earningsY + 25;
      drawTable(doc, earningsTableY, [
        ['Basic Salary', formatCurrency(payroll.basicSalary)],
        ['Overtime Pay', formatCurrency(payroll.overtimePay)],
        ['Gross Salary', formatCurrency(payroll.grossSalary), true]
      ], colors, true);
      
      // Deductions Section
      const deductionsY = earningsTableY + 100;
      doc.fontSize(12)
         .fillColor('#E74C3C')
         .text('DEDUCTIONS', 50, deductionsY);
      
      const deductionsTableY = deductionsY + 25;
      const deductionRows = [];
      
      // Mandatory deductions
      if (payroll.mandatoryDeductions && payroll.mandatoryDeductions.length > 0) {
        payroll.mandatoryDeductions.forEach(ded => {
          const dedName = ded.deduction?.name || ded.name || 'Unknown Deduction';
          deductionRows.push([dedName, formatCurrency(ded.amount)]);
        });
      }
      
      // Cash advance
      if (payroll.cashAdvanceDeduction > 0) {
        deductionRows.push(['Cash Advance', formatCurrency(payroll.cashAdvanceDeduction)]);
      }
      
      // Other deductions
      if (payroll.otherDeductions > 0) {
        deductionRows.push(['Other Deductions', formatCurrency(payroll.otherDeductions)]);
      }
      
      // Total deductions
      deductionRows.push(['Total Deductions', formatCurrency(payroll.totalDeductions), true]);
      
      drawTable(doc, deductionsTableY, deductionRows, colors, false);
      
      // Net Salary (Highlighted)
      const netSalaryY = deductionsTableY + (deductionRows.length * 25) + 40;
      
      doc.rect(50, netSalaryY, 495, 50)
         .fillAndStroke(colors.success, colors.success);
      
      doc.fontSize(14)
         .fillColor('white')
         .text('NET SALARY', 60, netSalaryY + 10)
         .fontSize(20)
         .text(formatCurrency(payroll.netSalary), 60, netSalaryY + 25, { align: 'right', width: 475 });
      
      // Year-to-Date
      if (payroll.yearToDate) {
        doc.fontSize(9)
           .fillColor(colors.darkGray)
           .text(`Year-to-Date Total: ${formatCurrency(payroll.yearToDate)}`, 50, netSalaryY + 60);
      }
      
      // Footer
      const footerY = 750;
      doc.moveTo(50, footerY)
         .lineTo(545, footerY)
         .strokeColor(colors.darkGray)
         .lineWidth(1)
         .stroke();
      
      doc.fontSize(8)
         .fillColor(colors.darkGray)
         .text('This is a computer-generated payslip and does not require a signature.', 50, footerY + 10, { align: 'center' })
         .text(`Generated on ${moment().tz(TIMEZONE).format('MMMM DD, YYYY HH:mm:ss')}`, { align: 'center' })
         .text('For questions or concerns, please contact HR Department', { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Draw a table in the PDF
 */
function drawTable(doc, startY, rows, colors, isEarnings = false) {
  const leftX = 50;
  const rightX = 545;
  const columnWidth = (rightX - leftX) / 2;
  
  rows.forEach((row, index) => {
    const y = startY + (index * 25);
    const isTotal = row[2] === true;
    
    // Background for total rows
    if (isTotal) {
      doc.rect(leftX, y - 2, rightX - leftX, 25)
         .fillAndStroke(colors.lightGray, colors.darkGray);
    }
    
    // Left column (label)
    doc.fontSize(10)
       .fillColor(isTotal ? colors.primary : colors.text)
       .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
       .text(row[0], leftX + 10, y + 5);
    
    // Right column (amount)
    doc.fontSize(10)
       .fillColor(isTotal ? colors.primary : colors.text)
       .font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
       .text(row[1], leftX + columnWidth + 10, y + 5, { width: columnWidth - 20, align: 'right' });
    
    // Line separator (except for last row)
    if (!isTotal && index < rows.length - 1) {
      doc.moveTo(leftX, y + 23)
         .lineTo(rightX, y + 23)
         .strokeColor(colors.lightGray)
         .lineWidth(0.5)
         .stroke();
    }
  });
}

/**
 * Format currency (Philippine Peso)
 */
function formatCurrency(amount) {
  return `₱${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Generate and save payslip to file
 * @param {Object} payroll - Payroll record
 * @param {Object} employee - Employee record
 * @param {String} outputPath - Optional output path
 * @returns {Promise<String>} - Path to saved PDF
 */
export const savePayslipToFile = async (payroll, employee, outputPath = null) => {
  try {
    // Generate PDF buffer
    const pdfBuffer = await generatePayslipPDF(payroll, employee);
    
    // Determine output path
    const filename = `Payslip_${employee.employeeId}_${moment(payroll.payPeriod.endDate).format('YYYY-MM-DD')}.pdf`;
    const filepath = outputPath || path.join(__dirname, '..', 'temp', filename);
    
    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write to file
    fs.writeFileSync(filepath, pdfBuffer);
    
    console.log(`✅ Payslip saved to: ${filepath}`);
    return filepath;
    
  } catch (error) {
    console.error('❌ Error saving payslip:', error);
    throw error;
  }
};

/**
 * Generate payslip for download (returns buffer)
 * @param {Object} payroll - Payroll record
 * @param {Object} employee - Employee record
 * @returns {Promise<Object>} - { buffer, filename }
 */
export const generatePayslipForDownload = async (payroll, employee) => {
  try {
    const pdfBuffer = await generatePayslipPDF(payroll, employee);
    const filename = `Payslip_${employee.employeeId}_${moment(payroll.payPeriod.endDate).format('YYYY-MM-DD')}.pdf`;
    
    return {
      buffer: pdfBuffer,
      filename
    };
    
  } catch (error) {
    console.error('❌ Error generating payslip for download:', error);
    throw error;
  }
};

export default {
  generatePayslipPDF,
  savePayslipToFile,
  generatePayslipForDownload
};
