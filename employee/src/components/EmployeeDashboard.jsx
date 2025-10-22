import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaUser, FaCalendarAlt, FaMoneyBillWave, FaMinusCircle, FaClock, FaSignOutAlt, FaIdCard, FaEnvelope, FaBriefcase, FaDollarSign, FaPhone, FaMapMarkerAlt, FaVenusMars, FaBirthdayCake, FaPrint, FaHistory, FaEye, FaTimes, FaLock, FaCamera } from "react-icons/fa";
import { employeeApi, attendanceApi, salaryApi, eventBus } from "../services/apiService";
import { toast } from 'react-toastify';
import { logger } from '../utils/logger';
import { compressImage, validateImageFile, formatFileSize } from '../utils/imageOptimization';
import logo from '../assets/logo.png';
import ChangePassword from './ChangePassword';
import HamburgerMenu from './HamburgerMenu';
import './EmployeeDashboard.responsive.css';

// Status Badge Component - SAME AS ADMIN
const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'regular':
        return {
          text: 'Regular',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'oncall':
      case 'on-call':
        return {
          text: 'On Call',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case 'probationary':
        return {
          text: 'Probationary',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          text: 'Regular',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {config.text}
    </span>
  );
};

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [transformedAttendance, setTransformedAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [weekFilter, setWeekFilter] = useState('');
  const [filterType, setFilterType] = useState(''); // 'week' or 'month'
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [showPayrollDetails, setShowPayrollDetails] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ NEW: Sidebar toggle state for mobile
  const fileInputRef = useRef(null);

  // Function to transform attendance data to display format
  const transformAttendanceData = (attendanceRecords) => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      return [];
    }

    // Map attendance records to the format needed for display
    return attendanceRecords.map(record => {
      // Use the date field directly
      const date = record.date || record.timeIn;
      
      // Format time in and time out
      const timeIn = record.timeIn ? new Date(record.timeIn).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : '-';
      
      const timeOut = record.timeOut ? new Date(record.timeOut).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }) : '-';

      // Determine status: use dayType if available, otherwise use status field, default to 'present' if time in exists
      let displayStatus = 'unknown';
      
      if (record.dayType) {
        // Use dayType for more accurate status
        displayStatus = record.dayType.toLowerCase().replace(' ', '-'); // 'Full Day' -> 'full-day', 'Half Day' -> 'half-day'
      } else if (record.status) {
        displayStatus = record.status.toLowerCase();
      } else if (record.timeIn && record.timeOut) {
        // If both time in and time out exist, assume present
        displayStatus = 'present';
      } else if (record.timeIn && !record.timeOut) {
        // If only time in exists, it's incomplete
        displayStatus = 'incomplete';
      } else if (!record.timeIn) {
        // If no time in, it's absent
        displayStatus = 'absent';
      }

      return {
        _id: record._id,
        date: date,
        timeIn: timeIn,
        timeOut: timeOut,
        status: displayStatus,
        actualHoursWorked: record.actualHoursWorked || 0,
        dayType: record.dayType || record.status
      };
    });
  };

  // Format date to "Month Day, Year" format
  const formatDateToMonthDayYear = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get week number from date
  const getWeekNumber = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  // Get start and end date of week from week number and year
  const getWeekDates = (weekNumber, year) => {
    const firstDayOfYear = new Date(year, 0, 1);
    const daysToAdd = (weekNumber - 1) * 7;
    const startDate = new Date(firstDayOfYear);
    startDate.setDate(firstDayOfYear.getDate() + daysToAdd - firstDayOfYear.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return { start: startDate, end: endDate };
  };

  // Filter attendance by month
  const getAttendanceByMonth = (attendance, monthFilter) => {
    if (!monthFilter) return attendance;
    
    const filterDate = new Date(monthFilter);
    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth();
    
    return attendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate.getFullYear() === filterYear && recordDate.getMonth() === filterMonth;
    });
  };

  // Filter attendance by week
  const getAttendanceByWeek = (attendance, weekFilter) => {
    if (!weekFilter) return attendance;
    
    const [year, week] = weekFilter.split('-W');
    const weekDates = getWeekDates(parseInt(week), parseInt(year));
    
    return attendance.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= weekDates.start && recordDate <= weekDates.end;
    });
  };

  // Filter payroll by month
  const getPayrollByMonth = (payrolls, monthFilter) => {
    if (!monthFilter) return payrolls;
    
    const filterDate = new Date(monthFilter);
    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth();
    
    return payrolls.filter(payroll => {
      const payrollDate = new Date(payroll.createdAt || payroll.updatedAt || Date.now());
      return payrollDate.getFullYear() === filterYear && payrollDate.getMonth() === filterMonth;
    });
  };

  // Filter payroll by week
  const getPayrollByWeek = (payrolls, weekFilter) => {
    if (!weekFilter) return payrolls;
    
    const [year, week] = weekFilter.split('-W');
    const weekDates = getWeekDates(parseInt(week), parseInt(year));
    
    return payrolls.filter(payroll => {
      const payrollDate = new Date(payroll.createdAt || payroll.updatedAt || Date.now());
      return payrollDate >= weekDates.start && payrollDate <= weekDates.end;
    });
  };

  // Filter cash advance by month
  const getCashAdvanceByMonth = (deductions, monthFilter) => {
    if (!monthFilter) return deductions;
    
    const filterDate = new Date(monthFilter);
    const filterYear = filterDate.getFullYear();
    const filterMonth = filterDate.getMonth();
    
    return deductions.filter(deduction => {
      const deductionDate = new Date(deduction.date);
      return deductionDate.getFullYear() === filterYear && deductionDate.getMonth() === filterMonth;
    });
  };

  // Filter cash advance by week
  const getCashAdvanceByWeek = (deductions, weekFilter) => {
    if (!weekFilter) return deductions;
    
    const [year, week] = weekFilter.split('-W');
    const weekDates = getWeekDates(parseInt(week), parseInt(year));
    
    return deductions.filter(deduction => {
      const deductionDate = new Date(deduction.date);
      return deductionDate >= weekDates.start && deductionDate <= weekDates.end;
    });
  };

  // Get filtered data based on filter type
  const getFilteredData = (data, dataType) => {
    if (filterType === 'month' && monthFilter) {
      if (dataType === 'attendance') return getAttendanceByMonth(data, monthFilter);
      if (dataType === 'payroll') return getPayrollByMonth(data, monthFilter);
      if (dataType === 'deductions') return getCashAdvanceByMonth(data, monthFilter);
    } else if (filterType === 'week' && weekFilter) {
      if (dataType === 'attendance') return getAttendanceByWeek(data, weekFilter);
      if (dataType === 'payroll') return getPayrollByWeek(data, weekFilter);
      if (dataType === 'deductions') return getCashAdvanceByWeek(data, weekFilter);
    }
    return data;
  };

  // Get daily payroll records for a specific period
  const getDailyPayrollRecords = (period) => {
    // This would normally come from your backend
    // For now, we'll return sample data based on the period
    const dailySalary = 550;
    
    if (period.includes('September 17') && period.includes('September 23')) {
      return [
        {
          date: '2025-09-17',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-18',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-19',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-09-20',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-21',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-22',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-23',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        }
      ];
    } else if (period.includes('September 24') && period.includes('September 30')) {
      return [
        {
          date: '2025-09-24',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-25',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-26',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-09-27',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-09-28',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-09-29',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-09-30',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        }
      ];
    } else if (period.includes('October 1') && period.includes('October 7')) {
      return [
        {
          date: '2025-10-01',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-02',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-03',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-04',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-05',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-06',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-07',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        }
      ];
    } else if (period.includes('October 8') && period.includes('October 14')) {
      return [
        {
          date: '2025-10-08',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-09',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-10',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-11',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-12',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-13',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-14',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        }
      ];
    } else if (period.includes('October 15') && period.includes('October 21')) {
      return [
        {
          date: '2025-10-15',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-16',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-17',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-18',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-19',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        },
        {
          date: '2025-10-20',
          salary: dailySalary,
          cashAdvance: 1000,
          netSalary: dailySalary - 1000
        },
        {
          date: '2025-10-21',
          salary: dailySalary,
          cashAdvance: 0,
          netSalary: dailySalary
        }
      ];
    }
    
    return [];
  };



  // Filter and sort data based on date filter and sort config
  const getFilteredAndSortedData = (data, dateKey = 'date') => {
    if (!data || !Array.isArray(data)) return [];
    
    let filteredData = [...data];
    
    // Apply sorting
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'date':
            aValue = new Date(a[dateKey] || a.createdAt);
            bValue = new Date(b[dateKey] || b.createdAt);
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'salary':
            aValue = a.salary;
            bValue = b.salary;
            break;
          case 'deductions':
            aValue = a.deductions;
            bValue = b.deductions;
            break;
          case 'netSalary':
            aValue = a.netSalary;
            bValue = b.netSalary;
            break;
          default:
            return 0;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filteredData;
  };

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Print function for payslip
  const handlePrintPayslip = (payroll = null) => {
    const printWindow = window.open('', '_blank');
    const payrollToPrint = payroll || employee.payroll[0];
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${employee.firstName} ${employee.lastName}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 0;
              padding: 20px;
              color: #000000;
              background: white;
            }
            .payslip-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #000000;
              padding: 25px;
              background: white;
            }
            .header-section {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 2px solid #000000;
              padding-bottom: 20px;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 10px;
            }
            .payslip-title {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0 5px 0;
              color: #000000;
            }
            .employee-name {
              font-size: 18px;
              font-weight: bold;
              color: #000000;
              margin-bottom: 5px;
            }
            .period-info {
              font-size: 14px;
              color: #000000;
              margin: 5px 0;
            }
            .details-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .employee-details, .payroll-details {
              padding: 15px;
              background: #f8f9fa;
              border-radius: 4px;
              border: 1px solid #dddddd;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #000000;
              border-bottom: 1px solid #000000;
              padding-bottom: 5px;
            }
            .detail-group {
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
            }
            .detail-label {
              font-weight: bold;
              color: #000000;
              font-size: 13px;
            }
            .detail-value {
              color: #000000;
              font-size: 13px;
            }
            .summary-section {
              margin-top: 25px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 4px;
              border: 1px solid #dddddd;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 5px 0;
            }
            .summary-label {
              font-weight: bold;
              color: #000000;
              font-size: 14px;
            }
            .summary-value {
              font-weight: bold;
              color: #000000;
              font-size: 14px;
            }
            .total-row {
              border-top: 2px solid #000000;
              padding-top: 10px;
              margin-top: 10px;
              font-size: 16px;
            }
            .negative {
              color: #000000;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 11px;
              color: #000000;
              border-top: 1px solid #000000;
              padding-top: 15px;
            }
            .signature-section {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .signature-line {
              border-top: 1px solid #000000;
              margin-top: 60px;
              text-align: center;
              padding-top: 10px;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .payslip-container { border: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header-section">
              <img src="${logo}" alt="Company Logo" class="logo" onerror="this.style.display='none'">
              <div class="payslip-title">EMPLOYEE PAYSLIP</div>
              <div class="employee-name">${employee.firstName} ${employee.lastName}</div>
              <div class="period-info">Pay Period: ${payrollToPrint.period}</div>
              <div class="period-info">Date Generated: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="details-section">
              <div class="employee-details">
                <div class="section-title">Employee Information</div>
                <div class="detail-group">
                  <span class="detail-label">Employee ID:</span>
                  <span class="detail-value">${employee.employeeId}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Full Name:</span>
                  <span class="detail-value">${employee.firstName} ${employee.lastName}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Position:</span>
                  <span class="detail-value">${employee.status === 'regular' ? 'Regular Employee' : 'On-Call Employee'}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Daily Rate:</span>
                  <span class="detail-value">₱550.00</span>
                </div>
              </div>
              
              <div class="payroll-details">
                <div class="section-title">Payroll Information</div>
                <div class="detail-group">
                  <span class="detail-label">Pay Period:</span>
                  <span class="detail-value">${payrollToPrint.period}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Payment Date:</span>
                  <span class="detail-value">${new Date().toLocaleDateString()}</span>
                </div>
                <div class="detail-group">
                  <span class="detail-label">Payment Method:</span>
                  <span class="detail-value">Bank Transfer</span>
                </div>
              </div>
            </div>
            
            <div class="summary-section">
              <div class="section-title">Salary Summary</div>
              <div class="summary-row">
                <span class="summary-label">Basic Salary (7 days):</span>
                <span class="summary-value">₱${payrollToPrint.salary.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Cash Advances:</span>
                <span class="summary-value">-₱${payrollToPrint.deductions.toLocaleString()}</span>
              </div>
              <div class="summary-row total-row">
                <span class="summary-label">NET SALARY:</span>
                <span class="summary-value ${payrollToPrint.netSalary < 0 ? 'negative' : ''}">₱${payrollToPrint.netSalary.toLocaleString()}</span>
              </div>
            </div>

            <div class="signature-section">
              <div>
                <div class="signature-line">
                  <div>Employee's Signature</div>
                </div>
              </div>
              <div>
                <div class="signature-line">
                  <div>Authorized Signature</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              This is a computer-generated document. No signature is required.<br>
              For inquiries, please contact HR Department.
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleViewPayrollDetails = (payroll) => {
    setSelectedPayroll(payroll);
    setShowPayrollDetails(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterType('');
    setMonthFilter('');
    setWeekFilter('');
  };

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        logger.log('📊 fetchEmployeeData called - START');
        logger.log('📊 Call stack trace:', new Error().stack);
        
        // Get employee data from localStorage (set during login)
        const storedEmployee = localStorage.getItem('currentEmployee');
        if (!storedEmployee) {
          toast.error('No employee data found. Please login again.');
          window.location.href = '/';
          return;
        }

        const employeeData = JSON.parse(storedEmployee);
        logger.log('📊 Employee data from localStorage:', { 
          id: employeeData._id, 
          hasProfilePicture: !!employeeData.profilePicture,
          profilePictureLength: employeeData.profilePicture ? employeeData.profilePicture.length : 0
        });
        
        // ✅ FIX ISSUE 2: Fetch fresh employee data from database instead of using stale localStorage
        // This ensures status, contactNumber, and other profile fields are always up-to-date
        logger.log('🔄 Fetching fresh employee data from database for ID:', employeeData._id);
        const freshEmployeeData = await employeeApi.getById(employeeData._id);
        
        if (freshEmployeeData && !freshEmployeeData.error) {
          logger.log('✅ Fresh employee data fetched:', {
            id: freshEmployeeData._id,
            hasProfilePicture: !!freshEmployeeData.profilePicture,
            profilePictureLength: freshEmployeeData.profilePicture ? freshEmployeeData.profilePicture.length : 0
          });
          
          // ✅ FIX ISSUE 5: Preserve profilePicture if fresh data doesn't include it
          // This prevents profile picture from being lost after re-fetching employee data
          const mergedData = {
            ...freshEmployeeData,
            profilePicture: freshEmployeeData.profilePicture || employeeData.profilePicture || null
          };
          
          logger.log('🔄 Merged employee data with preserved profile picture:', {
            hasProfilePicture: !!mergedData.profilePicture,
            profilePictureLength: mergedData.profilePicture ? mergedData.profilePicture.length : 0
          });
          setEmployee(mergedData);
          
          // Update localStorage with merged data (preserves profile picture)
          localStorage.setItem('currentEmployee', JSON.stringify(mergedData));
          logger.log('📊 fetchEmployeeData completed - localStorage updated');
          
          // Check if password change is required
          if (freshEmployeeData.requiresPasswordChange) {
            setShowChangePassword(true);
          }

          // Fetch attendance data
          const attendanceResult = await attendanceApi.getByEmployeeId(freshEmployeeData.employeeId);
          if (!attendanceResult.error) {
            setAttendance(attendanceResult);
            const transformed = transformAttendanceData(attendanceResult);
            setTransformedAttendance(transformed);
          }

          // Fetch payroll data (assuming there's an endpoint to get payroll by employee ID)
          // For now, we'll fetch all payroll and filter by employee ID
          const payrollResult = await salaryApi.getAll();
          if (!payrollResult.error) {
            const employeePayroll = payrollResult.filter(p => p.employeeId === freshEmployeeData.employeeId);
            setPayroll(employeePayroll);
          }
        } else {
          logger.error('❌ Failed to fetch fresh employee data, falling back to localStorage');
          setEmployee(employeeData);
          
          // Check if password change is required
          if (employeeData.requiresPasswordChange) {
            setShowChangePassword(true);
          }

          // Fetch attendance data
          const attendanceResult = await attendanceApi.getByEmployeeId(employeeData.employeeId);
          if (!attendanceResult.error) {
            setAttendance(attendanceResult);
            const transformed = transformAttendanceData(attendanceResult);
            setTransformedAttendance(transformed);
          }

          // Fetch payroll data
          const payrollResult = await salaryApi.getAll();
          if (!payrollResult.error) {
            const employeePayroll = payrollResult.filter(p => p.employeeId === employeeData.employeeId);
            setPayroll(employeePayroll);
          }
        }

      } catch (error) {
        logger.error('Error fetching employee data:', error);
        toast.error('Failed to load employee data');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, []);

  // Set up event listeners for real-time updates
  useEffect(() => {
    const unsubscribeAttendance = eventBus.on('attendance-recorded', (data) => {
      logger.log('Employee Dashboard: Attendance recorded event received');
      // Refresh attendance data if it belongs to this employee
      if (employee && data.employee && data.employee.employeeId === employee.employeeId) {
        fetchEmployeeData();
      }
    });

    return () => {
      unsubscribeAttendance();
    };
  }, [employee]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleLogout = () => {
    // Close sidebar before logout (for smooth UX)
    setSidebarOpen(false);
    // Clear any stored data and redirect to login
    localStorage.removeItem('currentEmployee');
    localStorage.removeItem('userRole');
    window.location.href = '/';
  };

  // Handle profile picture upload with compression
  const handleProfilePictureChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file, {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setUploadingPicture(true);

    try {
      logger.log(`Original image size: ${formatFileSize(file.size)}`);

      // Compress image (max 200KB)
      const compressedBase64 = await compressImage(file, {
        maxSizeMB: 0.2,          // 200KB max
        maxWidthOrHeight: 800,   // Max dimension 800px
        quality: 0.8,            // 80% quality
        fileType: 'image/jpeg'   // Convert to JPEG for best compression
      });

      logger.log(`Compressed image size: ~${formatFileSize(compressedBase64.length * 0.75)}`);
      logger.log(`📸 Sending profile picture to API for employee ${employee.employeeId}`);
      logger.log(`📸 Compressed base64 length: ${compressedBase64.length}`);
      logger.log(`📸 Compressed base64 preview: ${compressedBase64.substring(0, 50)}...`);

      // Update profile picture via API
      const result = await employeeApi.updateProfilePicture(employee.employeeId, compressedBase64);

      logger.log(`📸 API Response received:`, result);
      logger.log(`📸 Response has profilePicture:`, !!result.profilePicture);
      if (result.profilePicture) {
        logger.log(`📸 Response profilePicture length: ${result.profilePicture.length}`);
        logger.log(`📸 Response profilePicture preview: ${result.profilePicture.substring(0, 50)}...`);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        // Update local state
        const updatedEmployee = { ...employee, profilePicture: result.profilePicture };
        setEmployee(updatedEmployee);
        logger.log(`📸 Updated employee state with new profile picture`);
        
        // Update localStorage
        localStorage.setItem('currentEmployee', JSON.stringify(updatedEmployee));
        logger.log(`📸 Updated localStorage with new profile picture`);
        
        toast.success('Profile picture updated successfully!');
      }
    } catch (error) {
      logger.error('Error uploading profile picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };



  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fb' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Get filtered data for each tab
  const filteredDeductions = getFilteredData(employee?.deductions || [], 'deductions');
  const filteredAttendance = getFilteredData(attendance || [], 'attendance');
  const filteredPayroll = getFilteredData(payroll || [], 'payroll');

  return (
    <div className="employee-dashboard-container">
      {/* Hamburger Menu - Mobile/Tablet Only */}
      <HamburgerMenu 
        isOpen={sidebarOpen} 
        onClick={() => setSidebarOpen(!sidebarOpen)} 
      />

      {/* Sidebar Overlay - Mobile/Tablet Only */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Left side navigation */}
      <div className={`employee-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        {/* Logo/Header Section */}
        <h4 className="fw-bold mb-4" style={{ 
          color: 'white', 
          fontSize: '1.6rem',
          textAlign: 'center'
        }}>
          Employee Panel
        </h4>

        {/* User Profile Section with Upload */}
        <div className="text-center mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Profile Picture */}
            <div 
              style={{ 
                width: '90px', 
                height: '90px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid white',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                margin: '0 auto 15px',
                background: employee?.profilePicture ? 'transparent' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {employee?.profilePicture ? (
                <img 
                  src={employee.profilePicture} 
                  alt="Profile" 
                  loading="lazy"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
              ) : (
                <FaUser style={{ fontSize: '2.5rem', color: '#f06a98' }} />
              )}
            </div>

            {/* Camera Icon Button */}
            <button
              onClick={triggerFileInput}
              disabled={uploadingPicture}
              style={{
                position: 'absolute',
                bottom: '15px',
                right: '-5px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'white',
                border: '2px solid #f06a98',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: uploadingPicture ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s',
                opacity: uploadingPicture ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!uploadingPicture) {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  e.currentTarget.style.background = '#f8f8f8';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'white';
              }}
            >
              {uploadingPicture ? (
                <div className="spinner-border spinner-border-sm" style={{ color: '#f06a98', width: '14px', height: '14px' }} />
              ) : (
                <FaCamera style={{ fontSize: '0.8rem', color: '#f06a98' }} />
              )}
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleProfilePictureChange}
              style={{ display: 'none' }}
            />
          </div>

          <h6 className="mb-1" style={{ color: 'white', fontSize: '1rem' }}>
            {employee?.firstName} {employee?.lastName}
          </h6>
          <p className="mb-0" style={{ color: 'white', fontSize: '0.8rem', opacity: 0.8 }}>
            {employee?.employeeId}
          </p>
          <StatusBadge status={employee?.status} />
        </div>
        
        {/* Navigation Menu */}
        <ul className="nav flex-column px-3 py-2">
          <li className="nav-item mb-2">
            <button 
              className={`nav-link w-100 text-start d-flex align-items-center ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                setSidebarOpen(false);
              }}
              style={{ 
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'profile' ? '600' : '500',
                padding: '12px 16px',
                backgroundColor: activeTab === 'profile' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'profile') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'profile') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <FaUser className="me-3" style={{ fontSize: '1.1rem' }} />
              Profile
            </button>
          </li>
          
          <li className="nav-item mb-2">
            <button 
              className={`nav-link w-100 text-start d-flex align-items-center ${activeTab === 'deductions' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('deductions');
                setSidebarOpen(false);
              }}
              style={{ 
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'deductions' ? '600' : '500',
                padding: '12px 16px',
                backgroundColor: activeTab === 'deductions' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'deductions') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'deductions') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <FaMinusCircle className="me-3" style={{ fontSize: '1.1rem' }} />
              Cash Advance
            </button>
          </li>
          
          <li className="nav-item mb-2">
            <button 
              className={`nav-link w-100 text-start d-flex align-items-center ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('attendance');
                setSidebarOpen(false);
              }}
              style={{ 
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'attendance' ? '600' : '500',
                padding: '12px 16px',
                backgroundColor: activeTab === 'attendance' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'attendance') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'attendance') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <FaClock className="me-3" style={{ fontSize: '1.1rem' }} />
              Attendance
            </button>
          </li>
          
          <li className="nav-item mb-2">
            <button
              className={`nav-link w-100 text-start d-flex align-items-center ${activeTab === 'payslip' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('payslip');
                setSidebarOpen(false);
              }}
              style={{
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: activeTab === 'payslip' ? '600' : '500',
                padding: '12px 16px',
                backgroundColor: activeTab === 'payslip' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (activeTab !== 'payslip') {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== 'payslip') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <FaMoneyBillWave className="me-3" style={{ fontSize: '1.1rem' }} />
              Payslip
            </button>
          </li>

          {/* Divider */}
          <li style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
            margin: '15px 0' 
          }} />

          <li className="nav-item mb-2">
            <button
              className="nav-link w-100 text-start d-flex align-items-center"
              onClick={() => setShowChangePassword(true)}
              style={{
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <FaLock className="me-3" style={{ fontSize: '1.1rem' }} />
              Change Password
            </button>
          </li>

          {/* Logout Button */}
          <li className="nav-item mt-3">
            <button 
              className="nav-link w-100 text-start d-flex align-items-center" 
              onClick={handleLogout}
              style={{ 
                color: 'white',
                fontSize: '0.95rem',
                fontWeight: '500',
                padding: '12px 16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <FaSignOutAlt className="me-3" style={{ fontSize: '1.1rem' }} />
              Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="employee-main-content">
        <div className="employee-content-wrapper">
          {/* Header Card with Clock */}
          <div className="card shadow-lg mb-4" style={{ 
            borderRadius: '15px', 
            border: 'none',
            background: 'white',
            overflow: 'hidden'
          }}>
            {/* Real-time clock and user info bar */}
            <div style={{ 
              background: '#f06a98', 
              color: 'white', 
              padding: '15px 30px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between'
            }}>
              {/* Real-time Clock Component */}
              <ClockBar />
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'white' }}>
                  {employee?.firstName} {employee?.lastName}
                </span>
                <br />
                <span style={{ fontSize: '0.85rem', opacity: 0.9, color: 'white' }}>
                  {employee?.position || 'EMPLOYEE'}
                </span>
              </div>
            </div>
            
            {/* Header bar */}
            <div className="card-header" style={{
              backgroundColor: '#f7fafc',
              borderRadius: 0,
              padding: '25px 30px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-2" style={{
                    fontWeight: '700',
                    color: '#2d3748',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: '1.8rem',
                  }}>
                    <FaUser style={{ color: '#f06a98' }} />
                    Employee Dashboard
                  </h2>
                  <p className="mb-0" style={{
                    fontSize: '1rem',
                    color: '#718096',
                    fontWeight: '400'
                  }}>
                    Welcome to your personal workspace
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="card-body" style={{ padding: '20px' }}>
              {/* Content based on active tab */}
              <div className="row">
                <div className="col-12">
                  {activeTab === 'profile' && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <h4 className="mb-4 text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <FaUser style={{ color: '#f06a98' }} />
                        Personal Information
                      </h4>
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaIdCard style={{ color: '#f06a98' }} />
                              Employee ID
                            </label>
                            <p className="fs-5 text-gray-800">{employee?.employeeId || 'N/A'}</p>
                          </div>
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaUser style={{ color: '#f06a98' }} />
                              Full Name
                            </label>
                            <p className="fs-5 text-gray-800">{employee?.firstName} {employee?.lastName}</p>
                          </div>
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaEnvelope style={{ color: '#f06a98' }} />
                              Email
                            </label>
                            <p className="fs-6 text-gray-700">{employee?.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaUser style={{ color: '#f06a98' }} />
                              Status
                            </label>
                            <div className="mt-1">
                              <StatusBadge status={employee?.status} />
                            </div>
                          </div>
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaCalendarAlt style={{ color: '#f06a98' }} />
                              Hire Date
                            </label>
                            <p className="fs-6 text-gray-700">{formatDate(employee?.hireDate)}</p>
                          </div>
                          <div className="mb-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                            <label className="form-label fw-bold text-primary d-flex align-items-center gap-2">
                              <FaPhone style={{ color: '#f06a98' }} />
                              Contact Number
                            </label>
                            <p className="fs-6 text-gray-700">{employee?.contactNumber || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'deductions' && (
                    <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <FaMinusCircle style={{ color: '#f06a98' }} />
                          Your Cash Advance Records
                        </h4>
                      </div>

                      {/* Filter Section */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Filter Type:</label>
                          <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="">Select Filter Type</option>
                            <option value="week">Filter by Week</option>
                            <option value="month">Filter by Month</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          {filterType === 'month' && (
                            <>
                              <label className="form-label fw-bold">Filter by Month:</label>
                              <input
                                type="month"
                                className="form-control"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                              />
                            </>
                          )}
                          {filterType === 'week' && (
                            <>
                              <label className="form-label fw-bold">Filter by Week:</label>
                              <input
                                type="week"
                                className="form-control"
                                value={weekFilter}
                                onChange={(e) => setWeekFilter(e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sort and Clear Filters */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Sort by:</label>
                          <div className="d-flex gap-2">
                            <select 
                              value={sortConfig.key}
                              onChange={(e) => handleSort(e.target.value)}
                              className="form-select"
                            >
                              <option value="date">Date</option>
                              <option value="amount">Amount</option>
                            </select>
                            <button
                              onClick={() => handleSort(sortConfig.key)}
                              className="btn"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </button>
                          </div>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn"
                              style={{ backgroundColor: '#dc3545', color: 'white' }}
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredDeductions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <FaMinusCircle className="text-5xl mb-4 text-gray-300 mx-auto" />
                          <p className="text-lg">No cash advance records found</p>
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn mt-2"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="table-container" style={{ borderRadius: '8px', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
                          <table className="min-w-full table-auto text-sm">
                            <thead style={{ background: '#f06a98', color: 'white' }}>
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('date')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Date
                                    {sortConfig.key === 'date' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('amount')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Amount
                                    {sortConfig.key === 'amount' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getFilteredAndSortedData(filteredDeductions).map((deduction, index) => (
                                <tr key={deduction._id} className="hover:bg-pink-50 transition-colors duration-200">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                                    {formatDate(deduction.date)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                    -{formatCurrency(deduction.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                              <tr>
                                <td colSpan="2" className="px-6 py-4 text-right font-semibold text-gray-900">Total Cash Advance:</td>
                                <td className="px-6 py-4 whitespace-nowrap text-red-600 font-semibold">
                                  -{formatCurrency(filteredDeductions.reduce((sum, d) => sum + (d.amount || 0), 0))}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'attendance' && (
                    <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <FaClock style={{ color: '#f06a98' }} />
                          Attendance Records
                        </h4>
                      </div>

                      {/* Filter Section */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Filter Type:</label>
                          <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="">Select Filter Type</option>
                            <option value="week">Filter by Week</option>
                            <option value="month">Filter by Month</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          {filterType === 'month' && (
                            <>
                              <label className="form-label fw-bold">Filter by Month:</label>
                              <input
                                type="month"
                                className="form-control"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                              />
                            </>
                          )}
                          {filterType === 'week' && (
                            <>
                              <label className="form-label fw-bold">Filter by Week:</label>
                              <input
                                type="week"
                                className="form-control"
                                value={weekFilter}
                                onChange={(e) => setWeekFilter(e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sort and Clear Filters */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Sort by:</label>
                          <div className="d-flex gap-2">
                            <select 
                              value={sortConfig.key}
                              onChange={(e) => handleSort(e.target.value)}
                              className="form-select"
                            >
                              <option value="date">Date</option>
                            </select>
                            <button
                              onClick={() => handleSort(sortConfig.key)}
                              className="btn"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </button>
                          </div>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn"
                              style={{ backgroundColor: '#dc3545', color: 'white' }}
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredAttendance.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <FaClock className="text-5xl mb-4 text-gray-300 mx-auto" />
                          <p className="text-lg">No attendance records found</p>
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn mt-2"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="table-container" style={{ borderRadius: '8px', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
                          <table className="min-w-full table-auto text-sm">
                            <thead style={{ background: '#f06a98', color: 'white' }}>
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button
                                    onClick={() => handleSort('date')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Date
                                    {sortConfig.key === 'date' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Time In</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Time Out</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getFilteredAndSortedData(transformedAttendance).map((record, index) => (
                                <tr key={record.date} className="hover:bg-pink-50 transition-colors duration-200">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                                    {formatDate(record.date)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {record.timeIn || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                                    {record.timeOut || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      record.status === 'present' || record.status === 'full-day' ? 'bg-green-100 text-green-800' :
                                      record.status === 'half-day' || record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                      record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                      record.status === 'incomplete' ? 'bg-orange-100 text-orange-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {record.status === 'present' || record.status === 'full-day' ? 'Present' :
                                       record.status === 'half-day' || record.status === 'late' ? 'Half-day' :
                                       record.status === 'absent' ? 'Absent' :
                                       record.status === 'incomplete' ? 'Incomplete' :
                                       'Present'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'payslip' && (
                    <div className="overflow-x-auto bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <FaMoneyBillWave style={{ color: '#f06a98' }} />
                          Your Payroll Records
                        </h4>
                      </div>

                      {/* Filter Section */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Filter Type:</label>
                          <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                          >
                            <option value="">Select Filter Type</option>
                            <option value="week">Filter by Week</option>
                            <option value="month">Filter by Month</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          {filterType === 'month' && (
                            <>
                              <label className="form-label fw-bold">Filter by Month:</label>
                              <input
                                type="month"
                                className="form-control"
                                value={monthFilter}
                                onChange={(e) => setMonthFilter(e.target.value)}
                              />
                            </>
                          )}
                          {filterType === 'week' && (
                            <>
                              <label className="form-label fw-bold">Filter by Week:</label>
                              <input
                                type="week"
                                className="form-control"
                                value={weekFilter}
                                onChange={(e) => setWeekFilter(e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Sort and Clear Filters */}
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Sort by:</label>
                          <div className="d-flex gap-2">
                            <select 
                              value={sortConfig.key}
                              onChange={(e) => handleSort(e.target.value)}
                              className="form-select"
                            >
                              <option value="date">Date</option>
                              <option value="salary">Salary</option>
                              <option value="deductions">Cash Advances</option>
                              <option value="netSalary">Net Salary</option>
                            </select>
                            <button
                              onClick={() => handleSort(sortConfig.key)}
                              className="btn"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </button>
                          </div>
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn"
                              style={{ backgroundColor: '#dc3545', color: 'white' }}
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredPayroll.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <FaMoneyBillWave className="text-5xl mb-4 text-gray-300 mx-auto" />
                          <p className="text-lg">No payroll records found</p>
                          {(filterType || monthFilter || weekFilter) && (
                            <button
                              onClick={clearFilters}
                              className="btn mt-2"
                              style={{ backgroundColor: '#f06a98', color: 'white' }}
                            >
                              Clear Filter
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="table-container" style={{ borderRadius: '8px', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
                          <table className="min-w-full table-auto text-sm">
                            <thead style={{ background: '#f06a98', color: 'white' }}>
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('date')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Pay Period
                                    {sortConfig.key === 'date' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('salary')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Salary
                                    {sortConfig.key === 'salary' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('deductions')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Cash Advances
                                    {sortConfig.key === 'deductions' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">
                                  <button 
                                    onClick={() => handleSort('netSalary')}
                                    className="flex items-center gap-1 text-white hover:text-blue-200 focus:outline-none"
                                  >
                                    Net Salary
                                    {sortConfig.key === 'netSalary' && (
                                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </button>
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {getFilteredAndSortedData(filteredPayroll, 'createdAt').map((payroll, index) => (
                                <tr key={payroll._id} className="hover:bg-pink-50 transition-colors duration-200">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                                    {payroll.period}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                    {formatCurrency(payroll.salary)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                                    -{formatCurrency(payroll.deductions)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                                    {formatCurrency(payroll.netSalary)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <button
                                      onClick={() => handleViewPayrollDetails(payroll)}
                                      className="btn btn-sm d-flex align-items-center gap-1"
                                      style={{ backgroundColor: '#f06a98', color: 'white', border: 'none' }}
                                    >
                                      <FaEye />
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Details Modal */}
      {showPayrollDetails && selectedPayroll && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header" style={{ backgroundColor: '#f06a98', color: 'white' }}>
                <h5 className="modal-title">Payroll Details - {selectedPayroll.period}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPayrollDetails(false)}
                  style={{ filter: 'invert(1)' }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Employee ID</label>
                      <p>{employee.employeeId}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Full Name</label>
                      <p>{employee.firstName} {employee.lastName}</p>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-bold">Pay Period</label>
                      <p>{selectedPayroll.period}</p>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-bold">Net Salary</label>
                      <p className="text-blue-600 fw-bold fs-5">{formatCurrency(selectedPayroll.netSalary)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Daily Payroll Records Table */}
                <div className="mt-4">
                  <h6 className="fw-bold mb-3">Daily Payroll Breakdown:</h6>
                  <div className="table-responsive">
                    <table className="table table-bordered table-sm">
                      <thead style={{ backgroundColor: '#f06a98', color: 'white' }}>
                        <tr>
                          <th>Date</th>
                          <th>Salary</th>
                          <th>Cash Advance</th>
                          <th>Net Salary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getDailyPayrollRecords(selectedPayroll.period).map((record, index) => (
                          <tr key={index}>
                            <td className="fw-semibold">{formatDate(record.date)}</td>
                            <td className="text-success fw-semibold">₱{record.salary.toLocaleString()}</td>
                            <td className={record.cashAdvance > 0 ? 'text-danger fw-semibold' : 'fw-semibold'}>
                              {record.cashAdvance > 0 ? `-₱${record.cashAdvance.toLocaleString()}` : '₱0'}
                            </td>
                            <td className={record.netSalary >= 0 ? 'text-primary fw-bold' : 'text-danger fw-bold'}>
                              {record.netSalary >= 0 ? '₱' : '-₱'}{Math.abs(record.netSalary).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-light">
                        <tr>
                          <td className="fw-bold text-end">Weekly Total:</td>
                          <td className="text-success fw-bold">₱{selectedPayroll.salary.toLocaleString()}</td>
                          <td className="text-danger fw-bold">-₱{selectedPayroll.deductions.toLocaleString()}</td>
                          <td className="text-primary fw-bold fs-6">₱{selectedPayroll.netSalary.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowPayrollDetails(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn d-flex align-items-center gap-2"
                  onClick={() => handlePrintPayslip(selectedPayroll)}
                  style={{ backgroundColor: '#28a745', color: 'white' }}
                >
                  <FaPrint />
                  Print Payslip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePassword
          employeeId={employee?._id}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            // Update localStorage to reflect password has been changed
            const updatedEmployee = { ...employee, requiresPasswordChange: false };
            setEmployee(updatedEmployee);
            localStorage.setItem('currentEmployee', JSON.stringify(updatedEmployee));
            toast.success('Password changed successfully!');
          }}
        />
      )}
    </div>
  );
};

// Real-time clock component - Same as Admin
function ClockBar() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <span style={{ fontSize: '1rem', fontWeight: 500, color: 'white' }}>
      {day} | {date} {time}
    </span>
  );
}

export default EmployeeDashboard;
