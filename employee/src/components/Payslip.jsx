import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import logo from '../assets/logo.png';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import './Admin.responsive.css';
import { showSuccess, showError, showConfirm, showWarning, showInfo } from '../utils/toast';

const Payslip = () => {
  const { employeeId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [employeePayrolls, setEmployeePayrolls] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get current week period (Sunday to Saturday) - FOR PRINT ONLY
  const getCurrentWeekPeriod = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
    const sundayDate = new Date(now);
    sundayDate.setDate(now.getDate() - daysToSunday);
    
    const saturdayDate = new Date(sundayDate);
    saturdayDate.setDate(sundayDate.getDate() + 6);
    
    return {
      start: sundayDate,
      end: saturdayDate
    };
  };

  // Filter payrolls for the selected employee only
  const getEmployeePayrolls = (payrolls, employee) => {
    if (!employee || !payrolls) return [];
    
    return payrolls.filter(payroll => {
      // Match by employee ID or employee name
      const matchesById = payroll.employeeId === employee.employeeId;
      const matchesByName = payroll.employeeName === `${employee.firstName} ${employee.lastName}`;
      
      return matchesById || matchesByName;
    });
  };

  // Download PDF Payslip
  const handleDownloadPdf = async (payrollId) => {
    setDownloadingPdf(payrollId);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL.replace('/api', '')}/api/enhanced-payroll/payslip/${payrollId}/download`, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const filename = `Payslip_${employee.firstName}_${employee.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
      link.setAttribute('download', filename);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showSuccess('✅ Payslip PDF downloaded successfully!');
    } catch (error) {
      logger.error('Error downloading PDF:', error);
      showError('❌ Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Mark payslip as done
  const handleMarkAsDone = async (payrollId) => {
    const confirmed = await showConfirm(
      'Mark this payslip as Done?\n\nThis will update the payment status to completed.',
      {
        confirmText: 'Mark as Done',
        cancelText: 'Cancel',
        confirmColor: '#10b981' // Green for completion
      }
    );
    
    if (!confirmed) {
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL.replace('/api', '')}/api/payrolls/${payrollId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentStatus: 'Paid' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payslip status');
      }

      // Update local state
      setEmployeePayrolls(prevPayrolls =>
        prevPayrolls.map(payroll =>
          payroll._id === payrollId
            ? { ...payroll, paymentStatus: 'Paid', status: 'Paid' }
            : payroll
        )
      );

      showSuccess('✅ Payslip marked as Done successfully!');
    } catch (error) {
      logger.error('Error marking payslip as done:', error);
      showError('❌ Failed to mark payslip as done. Please try again.');
    }
  };

  // Sort function
  const sortedPayrolls = React.useMemo(() => {
    if (!employeePayrolls.length) return [];
    
    const sortablePayrolls = [...employeePayrolls];
    return sortablePayrolls.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.createdAt || a.updatedAt || Date.now());
          bValue = new Date(b.createdAt || b.updatedAt || Date.now());
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
  }, [employeePayrolls, sortConfig]);

  // Handle sort
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Print function - USING EMPLOYEEDASHBOARD DESIGN
  const handlePrint = () => {
    const weekPeriod = getCurrentWeekPeriod();
    const printWindow = window.open('', '_blank');
    
    // Calculate totals from all employee payrolls
    const totalSalary = employeePayrolls.reduce((sum, p) => sum + p.salary, 0);
    const totalDeductions = employeePayrolls.reduce((sum, p) => sum + p.deductions, 0);
    const totalNetPay = employeePayrolls.reduce((sum, p) => sum + p.netSalary, 0);
    
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
              <div class="period-info">Pay Period: ${weekPeriod.start.toLocaleDateString()} - ${weekPeriod.end.toLocaleDateString()}</div>
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
                  <span class="detail-value">${weekPeriod.start.toLocaleDateString()} - ${weekPeriod.end.toLocaleDateString()}</span>
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
                <span class="summary-value">₱${totalSalary.toLocaleString()}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Cash Advances:</span>
                <span class="summary-value">-₱${totalDeductions.toLocaleString()}</span>
              </div>
              <div class="summary-row total-row">
                <span class="summary-label">NET SALARY:</span>
                <span class="summary-value ${totalNetPay < 0 ? 'negative' : ''}">₱${totalNetPay.toLocaleString()}</span>
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

  useEffect(() => {
    if (location.state?.employee) {
      const selectedEmployee = location.state.employee;
      setEmployee(selectedEmployee);
      
      if (location.state.payrolls) {
        // Filter payrolls to show only records for the selected employee
        const filteredPayrolls = getEmployeePayrolls(location.state.payrolls, selectedEmployee);
        setEmployeePayrolls(filteredPayrolls);
      }
    } else {
      // Fallback: redirect back to payroll if no employee data
      navigate('/payroll');
    }
  }, [location.state, navigate]);

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <div className="admin-page-wrapper">
      {/* Mobile Hamburger Menu */}
      <button
        className="hamburger-menu-button"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Toggle Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Sidebar Overlay */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Admin Sidebar */}
      <AdminSidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content */}
      <div className="admin-main-content">
        {/* ✅ FIX ISSUE 4: Use unified AdminHeader component */}
        <AdminHeader />
        
        <div className="admin-content-area">
          <div className="card shadow-sm mb-4" style={{ borderRadius: '15px', border: 'none' }}>
            
            {/* Header bar */}
            <div className="card-header" style={{
              backgroundColor: 'transparent',
              color: 'black',
              borderRadius: 0,
              padding: '20px'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1" style={{ fontWeight: 'bold', color: 'black', display: 'flex', alignItems: 'center', gap: 8, fontSize: '2rem', fontFamily: 'sans-serif' }}>
                    <i className="fas fa-file-invoice me-2"></i>
                    Payslip - {employee.firstName} {employee.lastName}
                  </h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Employee ID: {employee.employeeId} | Total Records: {employeePayrolls.length}
                  </p>
                </div>
                <div className="d-flex gap-2">
                  {/* PRINT BUTTON */}
                  <button
                    onClick={handlePrint}
                    className="btn btn-success px-3 py-2.5 rounded-lg text-sm d-flex align-items-center gap-2"
                    style={{ backgroundColor: '#28a745', color: 'white', border: 'none', flex: '0 0 auto', width: 'auto', whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-print"></i>
                    Print Payslip
                  </button>
                  <button
                    onClick={() => navigate('/payroll')}
                    className="btn btn-pink px-3 py-2.5 rounded-lg text-sm"
                    style={{ backgroundColor: '#f06a98', color: 'white', border: 'none', flex: '0 0 auto', width: 'auto', whiteSpace: 'nowrap' }}
                  >
                    Back to Payroll
                  </button>
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <div className="card-body" style={{ padding: '20px' }}>
              <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-lg font-semibold text-gray-800">{employee.firstName} {employee.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg font-semibold text-gray-800">{employee.employeeId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      employee.status === 'regular' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {employee.status === 'regular' ? 'Regular' : 'On Call'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Contact Number</label>
                    <p className="text-lg text-gray-800">{employee.contactNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Base Salary</label>
                    <p className="text-lg font-semibold text-green-600">₱{employee.salary?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Hire Date</label>
                    <p className="text-lg text-gray-800">{formatDate(employee.hireDate)}</p>
                  </div>
                </div>
              </div>

              {/* Employee Payroll Records Table */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Payroll Records for {employee.firstName} {employee.lastName}
                  </h3>
                  
                  {/* SORT DROPDOWN */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-600">Sort by:</label>
                      <select 
                        value={sortConfig.key}
                        onChange={(e) => handleSort(e.target.value)}
                        className="border border-gray-300 rounded p-2 text-sm"
                      >
                        <option value="date">Date</option>
                        <option value="salary">Salary</option>
                        <option value="deductions">Cash Advances</option>
                        <option value="netSalary">Net Salary</option>
                      </select>
                      <button
                        onClick={() => handleSort(sortConfig.key)}
                        className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm d-flex align-items-center gap-1"
                      >
                        {sortConfig.direction === 'asc' ? (
                          <>
                            <i className="fas fa-arrow-up"></i>
                            Asc
                          </>
                        ) : (
                          <>
                            <i className="fas fa-arrow-down"></i>
                            Desc
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-sm text-gray-500">
                      {employeePayrolls.length} record(s) found
                    </span>
                  </div>
                </div>
                
                {employeePayrolls.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-file-invoice text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500 text-lg">No payroll records found for {employee.firstName} {employee.lastName}</p>
                    <p className="text-gray-400">Payroll records will appear here once created for this employee.</p>
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">
                              <button 
                                onClick={() => handleSort('date')}
                                className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                              >
                                Date
                                {sortConfig.key === 'date' && (
                                  <i className={`fas ${sortConfig.direction === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">
                              <button 
                                onClick={() => handleSort('salary')}
                                className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                              >
                                Salary
                                {sortConfig.key === 'salary' && (
                                  <i className={`fas ${sortConfig.direction === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">
                              <button 
                                onClick={() => handleSort('deductions')}
                                className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                              >
                                Cash Advances
                                {sortConfig.key === 'deductions' && (
                                  <i className={`fas ${sortConfig.direction === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">
                              <button 
                                onClick={() => handleSort('netSalary')}
                                className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                              >
                                Net Salary
                                {sortConfig.key === 'netSalary' && (
                                  <i className={`fas ${sortConfig.direction === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {sortedPayrolls.map((payroll, index) => (
                            <tr key={payroll._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                              <td className="px-4 py-3 whitespace-nowrap border">
                                {new Date(payroll.createdAt || payroll.updatedAt || Date.now()).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap border text-green-600 font-semibold">
                                ₱{payroll.salary.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap border text-red-600">
                                ₱{payroll.deductions.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap border text-blue-600 font-semibold">
                                ₱{payroll.netSalary.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap border">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  (payroll.paymentStatus || payroll.status) === 'Paid' || (payroll.paymentStatus || payroll.status) === 'Done' ? 'bg-green-100 text-green-800' : 
                                  (payroll.paymentStatus || payroll.status) === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                  (payroll.paymentStatus || payroll.status) === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {(payroll.paymentStatus || payroll.status) === 'Paid' || (payroll.paymentStatus || payroll.status) === 'Done' ? 'Done' : 
                                   (payroll.paymentStatus || payroll.status) === 'Processing' ? 'Processing' :
                                   (payroll.paymentStatus || payroll.status) === 'Pending' ? 'Pending' :
                                   'Pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap border">
                                {((payroll.paymentStatus || payroll.status) !== 'Paid' && 
                                  (payroll.paymentStatus || payroll.status) !== 'Done') && (
                                  <button
                                    onClick={() => handleMarkAsDone(payroll._id)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition duration-200"
                                    title="Mark payslip as done"
                                  >
                                    <i className="fas fa-check me-1"></i>
                                    Mark as Done
                                  </button>
                                )}
                                {((payroll.paymentStatus || payroll.status) === 'Paid' || 
                                  (payroll.paymentStatus || payroll.status) === 'Done') && (
                                  <span className="text-green-600 text-sm">
                                    <i className="fas fa-check-circle me-1"></i>
                                    Completed
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="2" className="px-4 py-3 text-right font-semibold border">Total:</td>
                            <td className="px-4 py-3 whitespace-nowrap border text-green-600 font-semibold">
                              ₱{sortedPayrolls.reduce((sum, p) => sum + p.salary, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap border text-red-600 font-semibold">
                              ₱{sortedPayrolls.reduce((sum, p) => sum + p.deductions, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap border text-blue-600 font-semibold">
                              ₱{sortedPayrolls.reduce((sum, p) => sum + p.netSalary, 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap border"></td>
                            <td className="px-4 py-3 whitespace-nowrap border"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    
                    {/* PRINT BUTTON AT BOTTOM */}
                    <div className="flex justify-end mt-6">
                      <button
                        onClick={handlePrint}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg d-flex align-items-center gap-2 transition duration-300"
                        style={{ flex: '0 0 auto', width: 'auto', whiteSpace: 'nowrap' }}
                      >
                        <i className="fas fa-print"></i>
                        Print Payslip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payslip;
