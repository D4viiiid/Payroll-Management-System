import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDebounce } from "../utils/debounce";
import { logger } from "../utils/logger";
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import './Admin.responsive.css';

import { getAllPayrolls, createPayroll, updatePayroll, deletePayroll } from "../services/payrollService";
import { getCurrentSalaryRate } from "../services/salaryRateService";

const Payroll = () => {
  const navigate = useNavigate();
  const [payrolls, setPayrolls] = useState([]);
  const [archivedPayrolls, setArchivedPayrolls] = useState([]);
  const [showArchiveHistory, setShowArchiveHistory] = useState(false);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showMandatoryDeductionModal, setShowMandatoryDeductionModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [employeeSalaries, setEmployeeSalaries] = useState({}); // Store calculated salaries
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [showImportantNotice, setShowImportantNotice] = useState(false); // ✅ NEW: Toggle for Important Notice dropdown
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // FILTER STATES - KATULAD NG SA ATTENDANCE
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState(''); // 'week', 'month', 'year', or empty for all
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // ✅ FIX ISSUE #3: Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // 💰 Dynamic Salary Rate (fetched from backend)
  const [salaryRate, setSalaryRate] = useState({ 
    dailyRate: 550, 
    hourlyRate: 68.75, 
    overtimeRate: 85.94 
  });

  const [formData, setFormData] = useState({
    employeeName: "",
    salary: "",
    deductions: "",
    netSalary: 0,
  });

  const [editingId, setEditingId] = useState(null);

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Format date to "Oct 5, 2025" format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Fetch employees and deductions data
  const fetchEmployeeAndDeductionData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch employees
      try {
        const employeesResponse = await fetch('/api/employees');
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          // Handle both paginated response {data: []} and plain array []
          const employeeList = Array.isArray(employeesData) ? employeesData : (employeesData.data || employeesData.employees || []);
          setEmployees(employeeList);
          
          // Calculate salaries for all employees
          const salaries = {};
          for (const emp of employeeList) {
            salaries[emp._id] = await calculateEmployeeSalary(emp);
          }
          setEmployeeSalaries(salaries);
        } else {
          if (employees.length > 0) {
            // Use existing data
          } else {
            setEmployees([]);
          }
        }
      } catch (employeeError) {
        setEmployees(employees.length > 0 ? employees : []);
      }
      
      // Fetch CASH ADVANCES from correct endpoint
      try {
        const deductionsResponse = await fetch('/api/cash-advance');
        if (deductionsResponse.ok) {
          const deductionsData = await deductionsResponse.json();
          // API returns { success: true, data: [...] } with pagination
          // Or { success: true, advances: [...] } for older format
          const advances = deductionsData.data || deductionsData.advances || deductionsData || [];
          
          // Transform to match expected format
          const transformed = advances.map(advance => ({
            _id: advance._id,
            employee: advance.employee,
            employeeId: advance.employee?.employeeId,
            name: advance.employee ? 
              `${advance.employee.firstName} ${advance.employee.lastName}` : 
              'Unknown',
            amount: advance.amount,
            status: advance.status,
            date: advance.requestDate,
            type: 'Cash Advance'
          }));
          
          setDeductions(transformed);
        } else {
          setDeductions([]);
        }
      } catch (deductionError) {
        logger.error('Error fetching cash advances:', deductionError);
        setDeductions([]);
      }
      
      // Update totals if employee is selected
      if (selectedEmployee) {
        updateEmployeeTotals(selectedEmployee);
      }
      
    } catch (error) {
      logger.error('Critical error in fetchEmployeeAndDeductionData:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch archived payrolls
  const fetchArchivedPayrolls = async () => {
    try {
      // Try to fetch from dedicated archived endpoint first
      try {
        const response = await fetch('/api/payrolls/archived');
        if (response.ok) {
          const archivedData = await response.json();
          setArchivedPayrolls(archivedData);
          return;
        }
      } catch (apiError) {
        // Continue to fallback
      }
      
      // Fallback: Filter from all payrolls
      let allPayrolls = [];
      try {
        allPayrolls = await getAllPayrolls();
      } catch (payrollError) {
        allPayrolls = payrolls;
      }
      
      const archivedData = allPayrolls.filter(p => p.status === 'archived');
      setArchivedPayrolls(archivedData);
      
    } catch (error) {
      setArchivedPayrolls([]);
    }
  };

  // Calculate total deductions for a specific employee
  const calculateEmployeeDeductions = (employee) => {
    if (!employee || !deductions.length) {
      return 0;
    }

    const total = deductions
      .filter(deduction => {
        // Method 1: Check by employee ID
        if (employee._id && deduction.employee?._id) {
          return deduction.employee._id === employee._id;
        }
        
        // Method 2: Check by employee name (case insensitive)
        const employeeFullName = `${employee.firstName} ${employee.lastName}`.toLowerCase().trim();
        const deductionName = (deduction.name || '').toLowerCase().trim();
        const deductionEmployeeName = (deduction.employee?.name || '').toLowerCase().trim();
        
        return deductionName.includes(employeeFullName) || 
               deductionEmployeeName.includes(employeeFullName) ||
               deductionName.includes(employee.firstName.toLowerCase()) ||
               deductionName.includes(employee.lastName.toLowerCase());
      })
      .reduce((total, deduction) => {
        const amount = Number(deduction.amount) || 0;
        return total + amount;
      }, 0);
    
    return total;
  };

  // Calculate current week salary for an employee based on attendance
  const calculateEmployeeSalary = async (employee) => {
    if (!employee) return 0;

    try {
      // ✅ FIX: Fetch current salary rate from database (not employee.dailyRate which doesn't exist)
      const rateResponse = await fetch('/api/salary-rate/current');
      let currentRate = salaryRate; // Fallback to component state
      
      if (rateResponse.ok) {
        const rateData = await rateResponse.json();
        currentRate = rateData.data || rateData;
      }
      
      // Get current week range (Monday - Saturday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Calculate Monday of current week
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      monday.setHours(0, 0, 0, 0);
      
      // Calculate Saturday of current week
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5); // Monday + 5 = Saturday
      saturday.setHours(23, 59, 59, 999);

      // Fetch attendance records for the employee for current week
      const response = await fetch(`/api/attendance?employeeId=${employee._id}&startDate=${monday.toISOString()}&endDate=${saturday.toISOString()}`);
      
      if (!response.ok) {
        // If fetch fails, calculate based on daily rate and days in week
        const dailyRate = currentRate.dailyRate;
        const daysWorked = dayOfWeek === 0 ? 6 : Math.min(dayOfWeek, 6); // If Sunday, 6 days; else current day (max 6)
        return dailyRate * daysWorked;
      }

      const responseData = await response.json();
      
      // ✅ FIX: Handle paginated API response correctly
      // API returns: { success: true, data: [...], pagination: {...} }
      const attendanceRecords = Array.isArray(responseData) ? responseData : (responseData.data || responseData.attendance || []);
      
      // Validate attendanceRecords is an array
      if (!Array.isArray(attendanceRecords)) {
        logger.error('❌ Attendance records is not an array:', attendanceRecords);
        // Fallback to daily rate calculation
        const dailyRate = currentRate.dailyRate;
        const daysWorked = dayOfWeek === 0 ? 6 : Math.min(dayOfWeek, 6);
        return dailyRate * daysWorked;
      }
      
      // Calculate total salary from attendance using current database rates
      let totalSalary = 0;
      const dailyRate = currentRate.dailyRate;
      const hourlyRate = currentRate.hourlyRate;
      const overtimeRate = currentRate.overtimeRate;

      attendanceRecords.forEach(record => {
        // Skip Sunday records
        const recordDate = new Date(record.date);
        if (recordDate.getDay() === 0) return;

        if (record.hoursWorked) {
          // Calculate based on hours worked
          const regularHours = Math.min(record.hoursWorked, 8);
          const overtimeHours = Math.max(record.hoursWorked - 8, 0);
          totalSalary += (regularHours * hourlyRate) + (overtimeHours * overtimeRate);
        } else if (record.status === 'Present' || record.timeIn) {
          // If no hours but marked present, use daily rate
          totalSalary += dailyRate;
        }
      });

      return Math.round(totalSalary * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Error calculating employee salary:', error);
      // Fallback: estimate based on daily rate from component state
      const dailyRate = salaryRate.dailyRate;
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysWorked = dayOfWeek === 0 ? 6 : Math.min(dayOfWeek, 6);
      return dailyRate * daysWorked;
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    if (editingId) {
      updateEmployeeTotals(employee);
    }
  };

  // Update employee totals automatically
  const updateEmployeeTotals = (employee) => {
    const employeeDeductions = calculateEmployeeDeductions(employee);
    const netSalary = (employee.salary || 0) - employeeDeductions;
    
    setFormData({
      employeeName: employee.firstName + ' ' + employee.lastName,
      salary: employee.salary || '',
      deductions: employeeDeductions.toString(),
      netSalary: netSalary
    });
  };

  // FILTER FUNCTIONS - KATULAD NG SA ATTENDANCE
  // Get dates from week input (YYYY-Www)
  const getDatesFromWeekInput = (weekInput) => {
    if (!weekInput) return { start: '', end: '' };
    
    try {
      const [year, week] = weekInput.split('-W');
      if (!year || !week) return { start: '', end: '' };
      
      const simple = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      const dayOfWeek = simple.getDay();
      const weekStart = new Date(simple);
      weekStart.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      return {
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      };
    } catch (error) {
      logger.error('Error parsing week input:', error);
      return { start: '', end: '' };
    }
  };

  // Get month start date
  const getMonthStartDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = date.getMonth();
      return new Date(year, month, 1).toISOString().split('T')[0];
    } catch (error) {
      logger.error('Error getting month start date:', error);
      return '';
    }
  };

  // Get month end date
  const getMonthEndDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = date.getMonth();
      return new Date(year, month + 1, 0).toISOString().split('T')[0];
    } catch (error) {
      logger.error('Error getting month end date:', error);
      return '';
    }
  };

  // 💰 Fetch current salary rate on component mount
  useEffect(() => {
    getCurrentSalaryRate()
      .then(rate => {
        setSalaryRate(rate);
        logger.info('✅ Loaded current salary rate:', rate);
      })
      .catch(error => {
        logger.error('❌ Failed to load salary rate, using defaults:', error);
      });
  }, []);

  // Reset date inputs when filter type changes
  useEffect(() => {
    setSelectedDate('');
    setSelectedYear('');
  }, [filterType]);

  // Extract available years from data
  useEffect(() => {
    const years = [...new Set(payrolls.map(record => {
      const date = new Date(record.createdAt || record.updatedAt || Date.now());
      return date.getFullYear().toString();
    }))].sort().reverse();
    
    setAvailableYears(years);
  }, [payrolls]);

  // Filter data based on selected criteria - KATULAD NG SA ATTENDANCE
  useEffect(() => {
    let filtered = [...payrolls];

    // Apply filters based on filter type
    if (filterType === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.createdAt || record.updatedAt || Date.now());
        const recordDateStr = recordDate.toISOString().split('T')[0];
        return recordDateStr === todayStr;
      });
    } else if (filterType === 'week' && selectedDate) {
      try {
        const weekDates = getDatesFromWeekInput(selectedDate);
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.createdAt || record.updatedAt || Date.now());
            const recordDateStr = recordDate.toISOString().split('T')[0];
            return recordDateStr >= weekDates.start && recordDateStr <= weekDates.end;
          });
        }
      } catch (error) {
        logger.error('Error filtering by week:', error);
      }
    } else if (filterType === 'month' && selectedDate) {
      try {
        const monthStart = getMonthStartDate(selectedDate);
        const monthEnd = getMonthEndDate(selectedDate);
        
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.createdAt || record.updatedAt || Date.now());
          const recordDateStr = recordDate.toISOString().split('T')[0];
          return recordDateStr >= monthStart && recordDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.createdAt || record.updatedAt || Date.now());
        return recordDate.getFullYear().toString() === selectedYear;
      });
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const employeeName = record.employeeName?.toLowerCase() || '';
        const employeeId = record.employeeId?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeId.includes(searchLower);
      });
    }

    setFilteredData(filtered);
  }, [debouncedSearchTerm, filterType, selectedDate, selectedYear, payrolls]);

  // Get current filter display text - KATULAD NG SA ATTENDANCE
  const getFilterDisplayText = () => {
    if (!filterType && !debouncedSearchTerm) {
      return 'All Payroll Records';
    }
    
    if (filterType === 'week' && selectedDate) {
      try {
        const weekDates = getDatesFromWeekInput(selectedDate);
        if (weekDates.start && weekDates.end) {
          const startFormatted = formatDate(weekDates.start);
          const endFormatted = formatDate(weekDates.end);
          return `Week: ${startFormatted} - ${endFormatted}`;
        }
      } catch (error) {
        logger.error('Error getting week display text:', error);
      }
    } else if (filterType === 'month' && selectedDate) {
      try {
        const date = new Date(selectedDate);
        if (!isNaN(date.getTime())) {
          const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];
          return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        }
      } catch (error) {
        logger.error('Error getting month display text:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      return `Year: ${selectedYear}`;
    }
    
    // Kung may search term lang
    if (searchTerm && !filterType) {
      return `Search Results for: "${searchTerm}"`;
    }
    
    return 'Filtered Payroll Records';
  };

  // Clear all filters - KATULAD NG SA ATTENDANCE
  const clearFilters = () => {
    setFilterType('');
    setSelectedDate('');
    setSelectedYear('');
    setSearchTerm('');
  };

  // Check if any filter is active
  const isFilterActive = () => {
    return filterType !== '' || searchTerm !== '';
  };

  // Handle date input change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Handle year change
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // Get unique employees for payslip modal
  const getUniqueEmployees = () => {
    const uniqueEmployees = [];
    const seenIds = new Set();
    
    employees.forEach(employee => {
      if (!seenIds.has(employee._id)) {
        seenIds.add(employee._id);
        uniqueEmployees.push(employee);
      }
    });
    
    return uniqueEmployees;
  };

  // Add or Update Payroll
  const handleAddOrUpdate = async (e) => {
    e.preventDefault();

    if (!editingId && !selectedEmployee && !selectAll) {
      alert('Please select an employee first!');
      return;
    }

    try {
      let results = [];

      if (selectAll) {
        for (const emp of employees) {
          const employeeName = `${emp.firstName} ${emp.lastName}`.trim();
          const salary = Number(emp.salary || 0);
          const deductionsAmt = Number(calculateEmployeeDeductions(emp));
          const netSalary = salary - deductionsAmt;
          
          const payrollData = {
            employeeName,
            employeeId: emp.employeeId || '',
            salary,
            deductions: deductionsAmt,
            netSalary
          };

          const result = await createPayroll(payrollData);
          results.push(result);
        }
        alert(`Successfully created payroll for ${results.length} employees!`);
        
      } else if (selectedEmployee) {
        const employeeName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();
        const salary = Number(selectedEmployee.salary || 0);
        const deductionsAmt = Number(calculateEmployeeDeductions(selectedEmployee));
        const netSalary = salary - deductionsAmt;
        
        const payrollData = {
            employeeName,
            employeeId: selectedEmployee.employeeId || '',
            salary,
            deductions: deductionsAmt,
            netSalary
          };

        if (editingId) {
          await updatePayroll(editingId, payrollData);
          alert('Payroll updated successfully!');
        } else {
          await createPayroll(payrollData);
          alert('Payroll added successfully!');
        }
      }

      const updatedPayrolls = await getAllPayrolls();
      setPayrolls(updatedPayrolls);

      setFormData({
        employeeName: "",
        salary: "",
        deductions: "",
        netSalary: 0
      });
      setSelectedEmployee(null);
      setSelectAll(false);
      setEditingId(null);

    } catch (error) {
      logger.error('Error saving payroll:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Edit Payroll
  const handleEdit = (payroll) => {
    const employee = employees.find(emp => 
      emp.firstName + ' ' + emp.lastName === payroll.employeeName
    );
    
    if (employee) {
      setSelectedEmployee(employee);
    }
    
    setFormData({
      employeeName: payroll.employeeName,
      salary: payroll.salary.toString(),
      deductions: payroll.deductions.toString(),
      netSalary: payroll.netSalary
    });
    setEditingId(payroll._id);
    
    // Scroll to form section
    document.querySelector('.pink-section').scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Archive Payroll
  const handleArchive = async (id) => {
    if (window.confirm('Are you sure you want to archive this payroll record?\n\nArchived records will be moved to the archive section and can be restored later.')) {
      try {
        // Get the payroll to archive
        const payrollToArchive = payrolls.find(p => p._id === id);
        
        if (!payrollToArchive) {
          alert('Payroll record not found!');
          return;
        }

        // Update the payroll status to 'archived'
        const updatedPayroll = {
          ...payrollToArchive,
          status: 'archived',
          archivedAt: new Date().toISOString()
        };
        
        // Call update service to mark as archived
        await updatePayroll(id, updatedPayroll);
        
        // Refresh the payrolls list
        const updatedPayrolls = await getAllPayrolls();
        setPayrolls(updatedPayrolls);
        
        // Refresh archived payrolls
        await fetchArchivedPayrolls();
        
        alert(`Payroll record for ${payrollToArchive.employeeName} archived successfully!`);
        
      } catch (error) {
        logger.error('ERROR in archive process:', error);
        alert(`Error archiving payroll: ${error.message}`);
      }
    }
  };

  // Restore Payroll from Archive
  const handleRestore = async (id) => {
    if (window.confirm('Are you sure you want to restore this payroll record?\n\nIt will be moved back to the active payroll records.')) {
      try {
        const payrollToRestore = archivedPayrolls.find(p => p._id === id);
        if (payrollToRestore) {
          // Update the payroll status to 'active'
          const updatedPayroll = {
            ...payrollToRestore,
            status: 'active',
            archivedAt: null
          };
          
          // Call update service to mark as active
          await updatePayroll(id, updatedPayroll);
          
          // Refresh both lists
          const updatedPayrolls = await getAllPayrolls();
          setPayrolls(updatedPayrolls);
          fetchArchivedPayrolls();
          
          alert(`Payroll record for ${payrollToRestore.employeeName} restored successfully!`);
        }
        
      } catch (error) {
        logger.error('Error restoring payroll:', error);
        alert('Error restoring payroll. Please try again.');
      }
    }
  };

  // Delete Payroll
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this payroll record?\n\nThis action cannot be undone.')) {
      try {
        await deletePayroll(id);
        const updatedPayrolls = await getAllPayrolls();
        setPayrolls(updatedPayrolls);
        alert('Payroll deleted successfully!');
      } catch (error) {
        logger.error('Error deleting payroll:', error);
        alert('Error deleting payroll. Please try again.');
      }
    }
  };

  // Cancel Edit
  const handleCancel = () => {
    setFormData({
      employeeName: "",
      salary: "",
      deductions: "",
      netSalary: 0
    });
    setSelectedEmployee(null);
    setEditingId(null);
    alert('Edit cancelled.');
  };

  // Calculate Net Salary Automatically
  const calculateNetSalary = () => {
    const salary = Number(formData.salary) || 0;
    const deductions = Number(formData.deductions) || 0;
    const netSalary = salary - deductions;
    
    setFormData(prev => ({
      ...prev,
      netSalary: netSalary
    }));
  };

  // Open Payslip Page
  const handleOpenPayslip = (employee) => {
    navigate(`/payroll/payslip/${employee._id}`, { 
      state: { 
        employee,
        payrolls: payrolls.filter(p => 
          p.employeeId === employee.employeeId || 
          p.employeeName === `${employee.firstName} ${employee.lastName}`
        )
      }
    });
  };

  // Handle Mandatory Deduction
  const handleMandatoryDeduction = () => {
    setShowMandatoryDeductionModal(true);
  };

  // Refresh Data
  const handleRefresh = () => {
    fetchEmployeeAndDeductionData();
    fetchArchivedPayrolls();
    alert('Data refreshed successfully!');
  };

  // ✅ FIX ISSUE #3: Handle table column sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // ✅ FIX ISSUE #3: Get sorted data
  const getSortedData = (data) => {
    if (!sortConfig.key) return data;

    const sortedData = [...data].sort((a, b) => {
      // Find employee data for both records
      const empA = employees.find(emp => 
        emp.employeeId === a.employeeId || 
        `${emp.firstName} ${emp.lastName}` === a.employeeName
      );
      const empB = employees.find(emp => 
        emp.employeeId === b.employeeId || 
        `${emp.firstName} ${emp.lastName}` === b.employeeName
      );

      let aValue, bValue;

      switch (sortConfig.key) {
        case 'employeeId':
          aValue = a.employeeId || '';
          bValue = b.employeeId || '';
          break;
        case 'employeeName':
          aValue = a.employeeName || '';
          bValue = b.employeeName || '';
          break;
        case 'status':
          // Order: regular > oncall > unknown
          const statusOrder = { 'regular': 1, 'oncall': 2, 'on-call': 2 };
          aValue = statusOrder[empA?.status?.toLowerCase()] || 999;
          bValue = statusOrder[empB?.status?.toLowerCase()] || 999;
          break;
        case 'salary':
          aValue = parseFloat(a.salary) || 0;
          bValue = parseFloat(b.salary) || 0;
          break;
        case 'deductions':
          aValue = parseFloat(a.deductions) || 0;
          bValue = parseFloat(b.deductions) || 0;
          break;
        case 'netSalary':
          aValue = parseFloat(a.netSalary) || 0;
          bValue = parseFloat(b.netSalary) || 0;
          break;
        case 'date':
          aValue = new Date(a.date || a.createdAt);
          bValue = new Date(b.date || b.createdAt);
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

    return sortedData;
  };

  // ✅ FIX ISSUE #3: Get sort icon for column header
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <i className="fas fa-sort text-gray-400 ms-2"></i>;
    }
    return sortConfig.direction === 'asc' 
      ? <i className="fas fa-sort-up text-blue-600 ms-2"></i>
      : <i className="fas fa-sort-down text-blue-600 ms-2"></i>;
  };

  // FIXED useEffect
  useEffect(() => {
    const fetchPayrolls = async () => {
      try {
        const data = await getAllPayrolls();
        setPayrolls(data);
        
        // If no data from API, use sample data for testing
        if (!data || data.length === 0) {
          const samplePayrolls = [
            {
              _id: '1',
              employeeName: 'John Doe',
              employeeId: 'EMP-001',
              salary: 25000,
              deductions: 1500,
              netSalary: 23500,
              status: 'active',
              createdAt: new Date().toISOString()
            },
            {
              _id: '2', 
              employeeName: 'Jane Smith',
              employeeId: 'EMP-002',
              salary: 30000,
              deductions: 2000,
              netSalary: 28000,
              status: 'active',
              createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          ];
          setPayrolls(samplePayrolls);
        }
      } catch (err) {
        // Use sample data on error
        const samplePayrolls = [
          {
            _id: '1',
            employeeName: 'Sample Employee 1',
            employeeId: 'EMP-S001',
            salary: 20000,
            deductions: 1000,
            netSalary: 19000,
            status: 'active',
            createdAt: new Date().toISOString()
          }
        ];
        setPayrolls(samplePayrolls);
      }
    };
    
    const fetchAllData = async () => {
      await fetchPayrolls();
      await fetchEmployeeAndDeductionData();
      await fetchArchivedPayrolls();
    };
    
    fetchAllData();
  }, []);

  // Auto-refresh totals when deductions change
  useEffect(() => {
    if (editingId && selectedEmployee) {
      updateEmployeeTotals(selectedEmployee);
    }
  }, [deductions, selectedEmployee, editingId]);

  // Auto-calculate net salary when salary or deductions change
  useEffect(() => {
    if (editingId) {
      calculateNetSalary();
    }
  }, [formData.salary, formData.deductions]);

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
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Payroll Management
                  </h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Efficient payroll processing for your team
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="btn btn-outline-primary btn-sm"
                  style={{ borderColor: '#f06a98', color: '#f06a98' }}
                >
                  <i className="fas fa-sync-alt me-2"></i>
                  Refresh Data
                </button>
              </div>
            </div>

            {/* FORM SECTION */}
            <div className="card-body" style={{ padding: '20px' }}>
              {!showArchiveHistory ? (
                <>
                  <div className="p-6 rounded-lg shadow-md pink-section" style={{ 
                    background: 'linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)',
                    border: '2px solid #f06a98'
                  }}>
                    <h2 className="text-xl font-semibold mb-4 text-center" style={{ 
                      color: '#c2185b', 
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {editingId ? "Edit Payroll Record" : "Add New Payroll"}
                    </h2>
                    
                    {/* Employee Selection with Buttons */}
                    <div className="mb-4">
                      {/* Mandatory Deduction Button - ABOVE Employee Selection */}
                      <div className="flex justify-end mb-0">
                        <button
                          type="button"
                          onClick={handleMandatoryDeduction}
                          className="btn btn-pink px-3 py-2 rounded-lg text-sm"
                          style={{ 
                            backgroundColor: '#f06a98', 
                            color: 'white', 
                            border: 'none', 
                            whiteSpace: 'nowrap',
                            minWidth: '150px',
                            flex: '0 0 auto',
                            width: 'auto'
                          }}
                        >
                          <i className="fas fa-minus-circle me-2"></i>
                          Mandatory Deduction
                        </button>
                      </div>

                      {/* Employee Selection */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block font-medium" style={{ 
                            color: '#c2185b', 
                            fontSize: '1.1rem',
                            fontWeight: '600'
                          }}>Select Employee</label>
                        </div>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <select 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'ALL') {
                                setSelectAll(true);
                                setSelectedEmployee(null);
                                setFormData({
                                  employeeName: "",
                                  salary: "",
                                  deductions: "",
                                  netSalary: 0
                                });
                              } else {
                                setSelectAll(false);
                                const employee = employees.find(emp => emp._id === val);
                                if (employee) handleEmployeeSelect(employee);
                              }
                            }}
                            className="w-full border border-blue-300 rounded p-3 focus:ring-2 focus:ring-blue-500" 
                            style={{ 
                              color: 'black', 
                              paddingRight: selectedEmployee ? '2.5rem' : undefined,
                              fontSize: '1rem',
                              padding: '14px',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            value={selectAll ? 'ALL' : (selectedEmployee?._id || '')}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.01)';
                              e.target.style.boxShadow = '0 4px 8px rgba(240, 106, 152, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                          >
                            <option value="" disabled hidden>Choose an employee</option>
                            <option value="ALL" style={{ color: 'black' }} disabled={!!editingId}>All Employees</option>
                            {employees.map(employee => (
                              <option key={employee._id} value={employee._id} style={{ color: 'black' }}>
                                {employee.firstName} {employee.lastName} | ID: {employee.employeeId || '—'} | Contact: {employee.contactNumber || 'N/A'} | {employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'No Date'}
                              </option>
                            ))}
                          </select>
                          {(selectedEmployee || selectAll) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmployee(null);
                                setSelectAll(false);
                                setFormData({
                                  employeeName: "",
                                  salary: "",
                                  deductions: "",
                                  netSalary: 0
                                });
                              }}
                              style={{ 
                                position: 'absolute', 
                                right: '10px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                background: 'none', 
                                border: 'none', 
                                color: 'black', 
                                fontSize: '1.2rem', 
                                cursor: 'pointer', 
                                padding: 0 
                              }}
                              aria-label="Clear Selection"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Payslip Button - BELOW Employee Selection */}
                      <div className="flex justify-end mt-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPayslipModal(true)}
                          className="btn btn-pink px-3 py-2 rounded-lg text-sm"
                          style={{ 
                            backgroundColor: '#f06a98', 
                            color: 'white', 
                            border: 'none', 
                            whiteSpace: 'nowrap',
                            minWidth: '150px',
                            flex: '0 0 auto',
                            width: 'auto'
                          }}
                        >
                          <i className="fas fa-file-invoice me-2"></i>
                          Payslip
                        </button>
                      </div>
                    </div>
                    
                    {/* Automatic Total Display */}
                    {selectedEmployee && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-green-800" style={{ color: 'black' }}>Automatic Calculation Summary</h3>
                            <p className="text-sm" style={{ color: 'black' }}>
                              Employee ID: <strong>{selectedEmployee.employeeId || '—'}</strong> | 
                              Contact: <strong>{selectedEmployee.contactNumber || 'N/A'}</strong> | 
                              Status: <strong className={selectedEmployee.status === 'regular' ? 'text-green-600' : 'text-orange-600'}>
                                {selectedEmployee.status === 'regular' ? 'Regular' : 'On Call'}
                              </strong>
                            </p>
                          </div>
                          <div className="flex items-center text-sm" style={{ color: 'black' }}>
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            Live Update
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                            <div className="text-2xl font-bold text-green-600">
                              ₱{(() => {
                                // ✅ FIX ISSUE #3: Show salary from most recent payroll record for selected employee
                                // Find the most recent payroll for this employee
                                const employeePayrolls = payrolls.filter(p => 
                                  p.employeeId === selectedEmployee.employeeId || 
                                  p.employeeName === `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                ).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                                
                                const latestPayroll = employeePayrolls[0];
                                return (latestPayroll?.salary || employeeSalaries[selectedEmployee._id] || 0).toLocaleString();
                              })()}
                            </div>
                            <div className="text-sm text-green-700">Employee Salary</div>
                            <div className="text-xs text-green-500 mt-1">
                              {(() => {
                                const employeePayrolls = payrolls.filter(p => 
                                  p.employeeId === selectedEmployee.employeeId || 
                                  p.employeeName === `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                );
                                return employeePayrolls.length > 0 ? 'From Latest Payroll Record' : 'From Current Week Attendance';
                              })()}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-red-200">
                            <div className="text-2xl font-bold text-red-600">
                              ₱{(() => {
                                // ✅ FIX ISSUE #3: Show deductions from most recent payroll record
                                const employeePayrolls = payrolls.filter(p => 
                                  p.employeeId === selectedEmployee.employeeId || 
                                  p.employeeName === `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                ).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                                
                                const latestPayroll = employeePayrolls[0];
                                return (latestPayroll?.deductions || calculateEmployeeDeductions(selectedEmployee)).toLocaleString();
                              })()}
                            </div>
                            <div className="text-sm text-red-700">Cash Advances</div>
                            <div className="text-xs text-red-500 mt-1">
                              {(() => {
                                const employeePayrolls = payrolls.filter(p => 
                                  p.employeeId === selectedEmployee.employeeId || 
                                  p.employeeName === `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                );
                                return employeePayrolls.length > 0 ? 'From Latest Payroll Record' : 'From Cash Advance Page';
                              })()}
                            </div>
                          </div>
                          <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                            <div className="text-2xl font-bold text-blue-600" style={{ color: 'black' }}>
                              ₱{(() => {
                                // ✅ FIX ISSUE #3: Show net pay from most recent payroll record
                                const employeePayrolls = payrolls.filter(p => 
                                  p.employeeId === selectedEmployee.employeeId || 
                                  p.employeeName === `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                                ).sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
                                
                                const latestPayroll = employeePayrolls[0];
                                if (latestPayroll) {
                                  return latestPayroll.netSalary.toLocaleString();
                                } else {
                                  return ((employeeSalaries[selectedEmployee._id] || 0) - calculateEmployeeDeductions(selectedEmployee)).toLocaleString();
                                }
                              })()}
                            </div>
                            <div className="text-sm text-blue-700" style={{ color: 'black' }}>Net Pay</div>
                            <div className="text-xs text-blue-500 mt-1" style={{ color: 'black' }}>Auto-Calculated</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Select-All Summary */}
                    {selectAll && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                    <div>
                    <h3 className="text-lg font-semibold text-blue-800" style={{ color: 'black' }}>Batch Calculation Summary (All Employees)</h3>
                    <p className="text-sm text-blue-600">Employees selected: <strong>{employees.length}</strong></p>
                    </div>
                    <div className="flex items-center text-sm text-blue-600" style={{ color: 'black' }}>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                    Live Update
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                    ₱{employees.reduce((sum, emp) => sum + (employeeSalaries[emp._id] || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-blue-700">Total Salaries</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-600">
                    ₱{employees.reduce((sum, emp) => sum + calculateEmployeeDeductions(emp), 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-red-700">Total Cash Advances</div>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                    ₱{(employees.reduce((sum, emp) => sum + ((employeeSalaries[emp._id] || 0) - calculateEmployeeDeductions(emp)), 0)).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">Total Net Pay</div>
                    </div>
                    </div>
                    </div>
                    )}
                    
                    {/* Payroll Edit Fields - Only show when editing */}
                    {editingId && (
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-yellow-800">Edit Payroll Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4" style={{ background: '#fac1cc', padding: '16px', borderRadius: '8px' }}>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'black' }}>Employee Name</label>
                            <input
                              name="employeeName"
                              value={formData.employeeName}
                              onChange={handleInputChange}
                              placeholder="Employee Name"
                              className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500"
                              style={{ color: 'black' }}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'black' }}>Salary</label>
                            <input
                              name="salary"
                              value={formData.salary}
                              onChange={handleInputChange}
                              placeholder="Salary"
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500"
                              style={{ color: 'black' }}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'black' }}>Deductions</label>
                            <input
                              name="deductions"
                              value={formData.deductions}
                              onChange={handleInputChange}
                              placeholder="Deductions"
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full border border-gray-300 rounded p-3 focus:ring-2 focus:ring-blue-500"
                              style={{ color: 'black' }}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'black' }}>Net Salary</label>
                            <input
                              name="netSalary"
                              value={formData.netSalary}
                              readOnly
                              className="w-full border border-gray-300 rounded p-3 bg-gray-50"
                              style={{ color: 'black' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      {/* ADD PAYROLL BUTTON - HIDDEN WHEN NO EMPLOYEE SELECTED */}
                      {(selectedEmployee || selectAll || editingId) && (
                        <button
                          type="button"
                          onClick={handleAddOrUpdate}
                          className="btn btn-pink px-3 py-2.5 rounded-lg text-sm"
                          style={{ backgroundColor: '#f06a98', color: 'white', border: 'none' }}
                        >
                          {editingId ? "Update Payroll" : "Add Payroll"}
                        </button>
                      )}
                      {editingId && (
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="bg-gray-300 text-gray-700 px-3 py-2.5 rounded-lg hover:bg-gray-400 transition duration-300 text-sm"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PAYSLIP MODAL - ✅ FIXED: Reduced width to prevent stretching behind sidebar */}
                  {showPayslipModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 md:p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800">View Payslip</h3>
                            <button
                              onClick={() => setShowPayslipModal(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <i className="fas fa-times text-xl"></i>
                            </button>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-gray-600 mb-2">Select an employee to view payslip:</p>
                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                              <table className="min-w-full table-auto text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {getUniqueEmployees().map((employee) => (
                                    <tr key={employee._id} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 whitespace-nowrap border">{employee.employeeId || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap border">
                                        {employee.firstName} {employee.lastName}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap border">{employee.contactNumber || 'N/A'}</td>
                                      <td className="px-4 py-3 whitespace-nowrap border">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          employee.status === 'regular' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                        }`}>
                                          {employee.status === 'regular' ? 'Regular' : 
                                           employee.status === 'oncall' ? 'On Call' : 'Unknown'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap border">
                                        <button
                                          onClick={() => handleOpenPayslip(employee)}
                                          className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition duration-200"
                                        >
                                         View
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => setShowPayslipModal(false)}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-300 mr-2"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANDATORY DEDUCTION MODAL - ✅ FIXED: Reduced width to prevent stretching behind sidebar */}
                  {showMandatoryDeductionModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 md:p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800">Mandatory Deductions</h3>
                            <button
                              onClick={() => setShowMandatoryDeductionModal(false)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <i className="fas fa-times text-xl"></i>
                            </button>
                          </div>
                          
                          <div className="mb-4">
                            <p className="text-gray-600 mb-4">Manage mandatory deductions for employees:</p>
                            
                            {/* Mandatory Deduction Form */}
                            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                              <h4 className="text-lg font-semibold mb-3 text-gray-700">Add Mandatory Deduction</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                                  <select className="w-full border border-gray-300 rounded p-2">
                                    <option value="">Select Employee</option>
                                    {employees.map(employee => (
                                      <option key={employee._id} value={employee._id}>
                                        {employee.firstName} {employee.lastName} - {employee.employeeId}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Deduction Type</label>
                                  <select className="w-full border border-gray-300 rounded p-2">
                                    <option value="">Select Type</option>
                                    <option value="sss">SSS Contribution</option>
                                    <option value="philhealth">PhilHealth</option>
                                    <option value="pagibig">Pag-IBIG</option>
                                    <option value="tax">Withholding Tax</option>
                                    <option value="insurance">Insurance</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                  <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded p-2"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                                  <input 
                                    type="date" 
                                    className="w-full border border-gray-300 rounded p-2"
                                  />
                                </div>
                              </div>
                              <div className="mt-4">
                                <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition duration-300">
                                  <i className="fas fa-plus me-2"></i>
                                  Add Deduction
                                </button>
                              </div>
                            </div>

                            {/* Mandatory Deductions List */}
                            <div className="border rounded-lg">
                              <table className="min-w-full table-auto text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Effective Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  <tr>
                                    <td colSpan="5" className="px-4 py-4 text-center text-gray-500">
                                      No mandatory deductions added yet
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => setShowMandatoryDeductionModal(false)}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-300 mr-2"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ========================================== */}
                  {/* PAYROLL RECORDS TABLE */}
                  <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-700">
                        Payroll Records - {getFilterDisplayText()}
                      </h2>
                      <div className="text-sm text-gray-600">
                        {filteredData.length} record{filteredData.length !== 1 ? 's' : ''} found
                      </div>
                    </div>

                    {/* FILTER SECTION - NASA TAAS NA NG TABLE */}
                    <div className="mb-4 d-flex gap-3 align-items-center flex-wrap">
                      {/* Search by Name/ID */}
                      <div className="input-group" style={{ maxWidth: '400px' }}>
                        <span className="input-group-text">
                          <i className="fas fa-search"></i>
                        </span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by name or employee ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      {/* Filter Type Selection */}
                      <div className="flex gap-2 items-center">
                        <label className="text-sm font-medium text-gray-600">Filter by:</label>
                        <select 
                          value={filterType} 
                          onChange={(e) => setFilterType(e.target.value)}
                          className="border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                          style={{ color: 'black' }}
                        >
                          <option value="">Select filter...</option>
                          <option value="today">Today</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </select>
                      </div>

                      {/* Calendar Picker for Week/Month */}
                      {(filterType === 'week' || filterType === 'month') && (
                        <div className="flex gap-2 items-center">
                          <label className="text-sm font-medium text-gray-600">
                            {filterType === 'week' ? 'Select Week:' : 'Select Month:'}
                          </label>
                          <input
                            type={filterType === 'week' ? 'week' : 'month'}
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                            style={{ color: 'black' }}
                            title={filterType === 'week' ? 'Select a week' : 'Select a month'}
                          />
                        </div>
                      )}

                      {/* Year Selection */}
                      {filterType === 'year' && (
                        <div className="flex gap-2 items-center">
                          <label className="text-sm font-medium text-gray-600">Select Year:</label>
                          <select 
                            value={selectedYear} 
                            onChange={handleYearChange}
                            className="border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                            style={{ color: 'black', minWidth: '120px' }}
                          >
                            <option value="">Select year...</option>
                            {availableYears.map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Clear Filters Button */}
                      {isFilterActive() && (
                        <button
                          onClick={clearFilters}
                          className="btn btn-outline-secondary"
                          style={{ 
                            padding: '10px 20px', 
                            fontSize: '1rem',
                            borderRadius: '8px'
                          }}
                        >
                          <i className="fas fa-times me-2"></i>
                          Clear Filters
                        </button>
                      )}

                      {/* Archive History Button */}
                      <button
                        onClick={() => setShowArchiveHistory(!showArchiveHistory)}
                        className="btn"
                        style={{
                          backgroundColor: showArchiveHistory ? '#6c757d' : '#f06a98',
                          border: 'none',
                          color: '#ffffff',
                          padding: '10px 20px',
                          fontSize: '1rem',
                          borderRadius: '8px',
                          flex: '0 0 auto',
                          width: 'auto',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className="fas fa-archive me-2"></i>
                        {showArchiveHistory ? 'Back to Main' : 'View Archive'}
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem', minWidth: '1000px', width: '100%' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors" 
                              onClick={() => handleSort('employeeId')}
                            >
                              Employee ID {getSortIcon('employeeId')}
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('employeeName')}
                            >
                              Employee Name {getSortIcon('employeeName')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Contact</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('status')}
                            >
                              Status {getSortIcon('status')}
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('salary')}
                            >
                              Salary {getSortIcon('salary')}
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('deductions')}
                            >
                              Cash Advances {getSortIcon('deductions')}
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('netSalary')}
                            >
                              Net Salary {getSortIcon('netSalary')}
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => handleSort('date')}
                            >
                              Date {getSortIcon('date')}
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {getSortedData(filteredData).map((payroll, index) => {
                            const employee = employees.find(emp => 
                              emp.employeeId === payroll.employeeId || 
                              `${emp.firstName} ${emp.lastName}` === payroll.employeeName
                            );
                            
                            return (
                              <tr key={payroll._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{payroll.employeeId || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{payroll.employeeName}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{employee?.contactNumber || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    employee?.status === 'regular' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {employee?.status === 'regular' ? 'Regular' : 
                                     employee?.status === 'oncall' ? 'On Call' : 'Unknown'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.salary.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.deductions.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.netSalary.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  {(() => {
                                    // Priority: endDate > cutoffDate > createdAt
                                    const dateToShow = payroll.endDate || payroll.cutoffDate || payroll.createdAt;
                                    if (dateToShow) {
                                      try {
                                        return new Date(dateToShow).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        });
                                      } catch (e) {
                                        return new Date().toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        });
                                      }
                                    }
                                    return new Date().toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    });
                                  })()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <div className="flex space-x-1">
                                    {/* Archive Button */}
                                    <button
                                      onClick={() => handleArchive(payroll._id)}
                                      className="bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 transition duration-200"
                                      title="Archive Payroll Record"
                                    >
                                      <i className="fas fa-archive me-1"></i>
                                      Archive
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {filteredData.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          {searchTerm ? 'No payroll records found matching your search' : 'No payroll records found'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ IMPORTANT NOTICE: MOVED BELOW TABLE WITH DROPDOWN */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-md mt-6">
                    <div 
                      className="cursor-pointer flex items-start"
                      onClick={() => setShowImportantNotice(!showImportantNotice)}
                    >
                      <div className="flex-shrink-0">
                        <i className="fas fa-info-circle text-blue-500 text-3xl"></i>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold text-gray-800">
                            <i className="fas fa-exclamation-triangle text-yellow-500 mr-2"></i>
                            Important Notice: Payroll Rules & Parameters
                          </h3>
                          <i className={`fas fa-chevron-${showImportantNotice ? 'up' : 'down'} text-blue-600 text-xl`}></i>
                        </div>
                      </div>
                    </div>
                    
                    {showImportantNotice && (
                      <div className="ml-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column: Work Week & Payment Rules */}
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <i className="fas fa-calendar-week text-blue-500 mr-2"></i>
                                Work Week Schedule
                              </h4>
                              <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start">
                                  <i className="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
                                  <span><strong>Work Days:</strong> Monday to Saturday (6 days)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
                                  <span><strong>No Work:</strong> Sunday is rest day (no work scheduled)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-clock text-blue-500 mr-2 mt-1"></i>
                                  <span><strong>Work Hours:</strong> 8:00 AM - 5:00 PM (8 hours + 1 hour lunch break)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-stopwatch text-orange-500 mr-2 mt-1"></i>
                                  <span><strong>Overtime:</strong> Work beyond 8 hours or after 5:00 PM</span>
                                </li>
                              </ul>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <i className="fas fa-calendar-check text-green-500 mr-2"></i>
                                Payroll Period & Payment
                              </h4>
                              <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start">
                                  <i className="fas fa-arrow-right text-blue-500 mr-2 mt-1"></i>
                                  <span><strong>Pay Period:</strong> Monday to Saturday (weekly)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-cut text-red-500 mr-2 mt-1"></i>
                                  <span><strong>Cut-off Day:</strong> Every Sunday (payroll calculation)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-money-bill-wave text-green-500 mr-2 mt-1"></i>
                                  <span><strong>Payment Day:</strong> Following Monday (salary release)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-info-circle text-blue-500 mr-2 mt-1"></i>
                                  <span><strong>Example:</strong> Work Oct 13-18 (Mon-Sat) → Cut-off Oct 19 (Sun) → Pay Oct 20 (Mon)</span>
                                </li>
                              </ul>
                            </div>
                          </div>

                          {/* Right Column: Salary Calculation & Deductions */}
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <i className="fas fa-calculator text-purple-500 mr-2"></i>
                                Salary Calculation Rules
                              </h4>
                              <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start">
                                  <i className="fas fa-coins text-yellow-500 mr-2 mt-1"></i>
                                  <span><strong>Current Rate:</strong> ₱{salaryRate.dailyRate}/day, ₱{salaryRate.hourlyRate}/hr, ₱{salaryRate.overtimeRate}/hr OT</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-sun text-yellow-500 mr-2 mt-1"></i>
                                  <span><strong>Full Day:</strong> 6.5-8 hours worked = 100% daily rate (₱{salaryRate.dailyRate})</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-cloud-sun text-orange-500 mr-2 mt-1"></i>
                                  <span><strong>Half Day:</strong> 4-6.5 hours worked = Variable pay by actual hours</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-moon text-blue-500 mr-2 mt-1"></i>
                                  <span><strong>Overtime:</strong> Hours beyond 8 hours × ₱{salaryRate.overtimeRate}/hr</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-times text-red-500 mr-2 mt-1"></i>
                                  <span><strong>Invalid:</strong> Less than 4 hours worked = No pay (0%)</span>
                                </li>
                              </ul>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm">
                              <h4 className="font-semibold text-gray-700 mb-2 flex items-center">
                                <i className="fas fa-hand-holding-usd text-red-500 mr-2"></i>
                                Deductions & Cash Advance
                              </h4>
                              <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start">
                                  <i className="fas fa-piggy-bank text-pink-500 mr-2 mt-1"></i>
                                  <span><strong>Cash Advance:</strong> Automatically deducted from weekly payroll</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-receipt text-blue-500 mr-2 mt-1"></i>
                                  <span><strong>Mandatory Deductions:</strong> Government-required deductions (if applicable)</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-calculator text-green-500 mr-2 mt-1"></i>
                                  <span><strong>Net Salary:</strong> Gross Salary - Total Deductions</span>
                                </li>
                                <li className="flex items-start">
                                  <i className="fas fa-chart-line text-purple-500 mr-2 mt-1"></i>
                                  <span><strong>Formula:</strong> (Work Days × Daily Rate) + (OT Hours × OT Rate) - Deductions</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Notice */}
                        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-sm text-gray-700">
                            <i className="fas fa-bell text-yellow-500 mr-2"></i>
                            <strong>Note:</strong> All salary calculations are based on actual attendance records from the Attendance page. 
                            Salary rates are set in the Salary Management page and automatically applied to all payroll calculations.
                            Cash advances from the Cash Advance page are automatically deducted from weekly payroll.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* ARCHIVE HISTORY SECTION */
                <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Archived Payroll Records</h2>
                    <div className="text-sm text-gray-600">
                      {archivedPayrolls.length} archived record{archivedPayrolls.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Archived Payroll Records Table */}
                  {archivedPayrolls.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No archived payroll records yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem', minWidth: '1000px' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Salary</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Cash Advances</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Net Salary</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Archived Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {archivedPayrolls.map((payroll, index) => {
                            const employee = employees.find(emp => 
                              emp.employeeId === payroll.employeeId || 
                              `${emp.firstName} ${emp.lastName}` === payroll.employeeName
                            );
                            return (
                              <tr key={payroll._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{payroll.employeeId || 'N/A'}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{payroll.employeeName}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.salary.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.deductions.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{payroll.netSalary.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  {payroll.archivedAt ? new Date(payroll.archivedAt).toLocaleDateString() : 'Unknown'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleRestore(payroll._id)}
                                      className="bg-green-500 text-white px-3 py-2 rounded text-xs hover:bg-green-600 transition duration-200"
                                      title="Restore Payroll Record"
                                    >
                                      <i className="fas fa-undo me-1"></i>
                                      Restore
                                    </button>
                                    <button
                                      onClick={() => handleDelete(payroll._id)}
                                      className="bg-red-500 text-white px-3 py-2 rounded text-xs hover:bg-red-600 transition duration-200"
                                      title="Delete Permanently"
                                    >
                                      <i className="fas fa-trash me-1"></i>
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
  );
};

export default Payroll;
