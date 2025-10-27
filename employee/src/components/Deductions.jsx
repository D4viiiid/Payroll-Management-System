import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllDeductions, getArchivedDeductions, createDeduction, deleteDeduction, updateDeduction } from "../services/deductionService";
import { getAllEmployees } from "../services/employeeService";
import { getCurrentSalaryRate } from "../services/salaryRateService"; // ✅ FIX ISSUE #2: Import salary rate service
import { logger } from '../utils/logger';
import { showSuccess, showError, showConfirm } from "../utils/toast"; // ✅ BUG #25 FIX
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import './Admin.responsive.css';

// Status Badge Component
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
      default:
        return {
          text: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
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

const Deduction = () => {
  const [deductions, setDeductions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedDeductions, setArchivedDeductions] = useState([]);
  const [currentSalaryRate, setCurrentSalaryRate] = useState(null); // ✅ FIX ISSUE #2: Store current rate with maxCashAdvance
  const [showImportantNotice, setShowImportantNotice] = useState(false); // ✅ FIX ISSUE #2: Toggle for Important Notice
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // New filter states
  const [filterType, setFilterType] = useState(''); // 'week', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filteredArchivedData, setFilteredArchivedData] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    employee: "",
    employeeIdInput: "",
    type: "Cash Advance",
    amount: "",
    date: new Date().toISOString().split('T')[0]
  });

  const [currentEmployeeStatus, setCurrentEmployeeStatus] = useState('');

  useEffect(() => {
    fetchDeductions();
    fetchEmployees();
    fetchSalaryRate(); // ✅ FIX ISSUE #2: Fetch current salary rate
  }, []);

  // ✅ FIX ISSUE #2: Fetch current salary rate
  const fetchSalaryRate = async () => {
    try {
      const rate = await getCurrentSalaryRate();
      logger.info('✅ Current salary rate fetched:', rate);
      setCurrentSalaryRate(rate);
    } catch (error) {
      logger.error('❌ Error fetching salary rate:', error);
      // Set default if fetch fails
      setCurrentSalaryRate({
        dailyRate: 550,
        maxCashAdvance: 1100
      });
    }
  };

  const fetchDeductions = async (bypassCache = false) => {
    try {
      setLoading(true);
      
      // ✅ FIX ISSUE #1 & #4: Fetch active and archived records separately
      // bypassCache forces fresh data fetch (no browser/axios caching)
      const [activeData, archivedData] = await Promise.all([
        getAllDeductions(bypassCache), // Gets only active records (archived != true)
        getArchivedDeductions(bypassCache) // Gets only archived records (archived == true)
      ]);
      
      // ✅ FIX: Validate that data is an array
      if (!Array.isArray(activeData)) {
        logger.error('❌ getAllDeductions did not return an array:', activeData);
        throw new Error('Invalid active data format received from server');
      }
      
      if (!Array.isArray(archivedData)) {
        logger.error('❌ getArchivedDeductions did not return an array:', archivedData);
        throw new Error('Invalid archived data format received from server');
      }
      
      setDeductions(activeData);
      setArchivedDeductions(archivedData);
      setError(null);
      
      logger.info(`✅ Fetched ${activeData.length} active and ${archivedData.length} archived cash advances${bypassCache ? ' (cache bypassed)' : ''}`);
      
      // Extract available years from deduction data
      extractAvailableYears(activeData);
    } catch (err) {
      logger.error('❌ Error fetching deductions:', err);
      setError(err.message || 'Failed to fetch deductions. Please make sure MongoDB is running.');
      setDeductions([]); // Set empty arrays on error
      setArchivedDeductions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const emps = await getAllEmployees();
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(emps) ? emps : (emps.data || emps.employees || []);
      setEmployees(employeeList);
    } catch (error) {
      logger.error('Failed to fetch employees:', error);
      setEmployees([]); // Set empty array on error
    }
  };

  // Extract available years from deduction data
  const extractAvailableYears = (deductionData) => {
    const years = [...new Set(deductionData.map(deduction => {
      const date = new Date(deduction.date || deduction.createdAt);
      return date.getFullYear();
    }))].sort((a, b) => b - a); // Sort descending
    
    setAvailableYears(years);
  };

  // Get week start date (Monday) with error handling
  const getWeekStartDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // For week input (YYYY-Www), get the Monday of that week
      const year = date.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (date.getDay() + 6) % 7; // Adjust so Monday is 0
      const monday = new Date(date);
      monday.setDate(date.getDate() - daysOffset);
      
      return monday.toISOString().split('T')[0];
    } catch (error) {
      logger.error('Error getting week start date:', error);
      return '';
    }
  };

  // Get week end date (Sunday) with error handling
  const getWeekEndDate = (weekStart) => {
    try {
      if (!weekStart) return '';
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 6);
      return endDate.toISOString().split('T')[0];
    } catch (error) {
      logger.error('Error getting week end date:', error);
      return '';
    }
  };

  // Get dates from week input (YYYY-Www)
  const getDatesFromWeekInput = (weekInput) => {
    if (!weekInput) return { start: '', end: '' };
    
    try {
      const [year, week] = weekInput.split('-W');
      if (!year || !week) return { start: '', end: '' };
      
      const simple = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      const dayOfWeek = simple.getDay();
      const weekStart = new Date(simple);
      weekStart.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Adjust to Monday
      
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

  // Get month start date with error handling
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

  // Get month end date with error handling
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

  // Reset date inputs when filter type changes
  useEffect(() => {
    setSelectedDate('');
    setSelectedYear('');
  }, [filterType]);

  // Filter data based on selected criteria
  useEffect(() => {
    let filtered = deductions.filter(deduction => !deduction.archived);

    // Apply filters based on filter type
    if (filterType === 'week' && selectedDate) {
      try {
        logger.log('🔄 Filtering by week:', selectedDate);
        
        const weekDates = getDatesFromWeekInput(selectedDate);
        logger.log('📅 Week range:', weekDates.start, 'to', weekDates.end);
        
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(deduction => {
            const deductionDate = new Date(deduction.date || deduction.createdAt);
            const deductionDateStr = deductionDate.toISOString().split('T')[0];
            const isInRange = deductionDateStr >= weekDates.start && deductionDateStr <= weekDates.end;
            
            return isInRange;
          });
        }
      } catch (error) {
        logger.error('❌ Error filtering by week:', error);
      }
    } else if (filterType === 'month' && selectedDate) {
      try {
        const monthStart = getMonthStartDate(selectedDate);
        const monthEnd = getMonthEndDate(selectedDate);
        
        logger.log('🔄 Filtering by month:', monthStart, 'to', monthEnd);
        
        filtered = filtered.filter(deduction => {
          const deductionDate = new Date(deduction.date || deduction.createdAt);
          const deductionDateStr = deductionDate.toISOString().split('T')[0];
          return deductionDateStr >= monthStart && deductionDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(deduction => {
        const deductionDate = new Date(deduction.date || deduction.createdAt);
        return deductionDate.getFullYear().toString() === selectedYear;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(deduction => {
        const employeeName = deduction.name?.toLowerCase() || '';
        const employeeId = deduction.employee?.employeeId?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeId.includes(searchLower);
      });
    }

    setFilteredData(filtered);
  }, [searchTerm, filterType, selectedDate, selectedYear, deductions]);

  // Filter archived data
  useEffect(() => {
    let filtered = archivedDeductions;

    // Apply filters based on filter type for archived data
    if (filterType === 'week' && selectedDate) {
      try {
        const weekDates = getDatesFromWeekInput(selectedDate);
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(deduction => {
            const deductionDate = new Date(deduction.date || deduction.createdAt);
            const deductionDateStr = deductionDate.toISOString().split('T')[0];
            return deductionDateStr >= weekDates.start && deductionDateStr <= weekDates.end;
          });
        }
      } catch (error) {
        logger.error('Error filtering archived by week:', error);
      }
    } else if (filterType === 'month' && selectedDate) {
      try {
        const monthStart = getMonthStartDate(selectedDate);
        const monthEnd = getMonthEndDate(selectedDate);
        
        filtered = filtered.filter(deduction => {
          const deductionDate = new Date(deduction.date || deduction.createdAt);
          const deductionDateStr = deductionDate.toISOString().split('T')[0];
          return deductionDateStr >= monthStart && deductionDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering archived by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(deduction => {
        const deductionDate = new Date(deduction.date || deduction.createdAt);
        return deductionDate.getFullYear().toString() === selectedYear;
      });
    }

    // Apply search filter for archived data
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(deduction => {
        const employeeName = deduction.name?.toLowerCase() || '';
        const employeeId = deduction.employee?.employeeId?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeId.includes(searchLower);
      });
    }

    setFilteredArchivedData(filtered);
  }, [searchTerm, filterType, selectedDate, selectedYear, archivedDeductions]);

  // Format date for display with error handling - NEW IMPROVED VERSION
  const formatDisplayDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${month} ${day}, ${year}`;
    } catch (error) {
      logger.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Format date for table display (shorter version)
  const formatTableDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      logger.error('Error formatting table date:', error);
      return 'N/A';
    }
  };

  // Get current filter display text - UPDATED WITH NEW DATE FORMAT
  const getFilterDisplayText = () => {
    if (!filterType && !searchTerm) {
      return 'All Cash Advance Records';
    }
    
    if (filterType === 'week' && selectedDate) {
      try {
        const weekDates = getDatesFromWeekInput(selectedDate);
        if (weekDates.start && weekDates.end) {
          const startFormatted = formatDisplayDate(weekDates.start);
          const endFormatted = formatDisplayDate(weekDates.end);
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
    
    return 'Filtered Cash Advance Records';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      if (name === 'employeeIdInput') {
        const normalizedId = String(value || '').trim();
        let match = employees.find(emp => String(emp.employeeId ?? '').trim() === normalizedId);
        
        if (!match && normalizedId.length > 0) {
          const candidates = employees.filter(emp => String(emp.employeeId ?? '').startsWith(normalizedId));
          if (candidates.length === 1) {
            match = candidates[0];
          }
        }
        
        if (match) {
          next.employee = match._id;
          next.name = `${match.firstName} ${match.lastName}`.trim();
          // Set the current employee status for display
          setCurrentEmployeeStatus(match.status || 'Unknown');
        } else {
          next.employee = "";
          next.name = "";
          setCurrentEmployeeStatus('');
        }
      }
      
      if (name === 'type') {
        next.type = 'Advance';
      }
      return next;
    });
  };

  const handleAddDeductionClick = () => {
    setFormData({
      name: "",
      employee: "",
      employeeIdInput: "",
      type: "Advance",
      amount: "",
      date: new Date().toISOString().split('T')[0]
    });
    setCurrentEmployeeStatus('');
    setShowAddForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (!formData.name) {
        setError('Please enter a valid Employee ID from Employee Management.');
        setLoading(false);
        return;
      }
      
      const amtVal = parseFloat(formData.amount);
      if (isNaN(amtVal) || amtVal < 0) {
        setError('Amount must be a valid non-negative number.');
        setLoading(false);
        return;
      }
      
      // ✅ FIX ISSUE #2: Validate against current maxCashAdvance (2x daily rate)
      const maxAllowed = currentSalaryRate?.maxCashAdvance || 1100; // Fallback to 1100
      if (amtVal > maxAllowed) {
        setError(`Cash advance amount cannot exceed ₱${maxAllowed.toLocaleString()} (2 days × ₱${currentSalaryRate?.dailyRate || 550} daily rate).`);
        setLoading(false);
        return;
      }
      
      // ✅ NEW FIX: Check if employee has worked at least 2 full days this week
      if (formData.employee) {
        try {
          // Get current week range (Monday - Saturday)
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          
          // Calculate Monday of current week
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const monday = new Date(today);
          monday.setDate(today.getDate() - daysFromMonday);
          monday.setHours(0, 0, 0, 0);
          
          // Calculate Saturday of current week
          const saturday = new Date(monday);
          saturday.setDate(monday.getDate() + 5);
          saturday.setHours(23, 59, 59, 999);
          
          // Fetch attendance records for current week
          const attendanceResponse = await fetch(
            `/api/attendance?employeeId=${formData.employee}&startDate=${monday.toISOString()}&endDate=${saturday.toISOString()}`
          );
          
          if (attendanceResponse.ok) {
            const attendanceData = await attendanceResponse.json();
            const attendanceRecords = Array.isArray(attendanceData) ? attendanceData : (attendanceData.data || attendanceData.attendance || []);
            
            // Count Full Day records (dayType === 'Full Day')
            const fullDayCount = attendanceRecords.filter(record => 
              record.dayType === 'Full Day' && new Date(record.date).getDay() !== 0 // Exclude Sunday
            ).length;
            
            if (fullDayCount < 2) {
              setError(`Cash advance requires at least 2 full-days of work this week. Employee has only ${fullDayCount} full-day(s) so far.`);
              setLoading(false);
              return;
            }
          }
          
          // ✅ NEW FIX: Check if employee already received cash advance this week (once per week limit)
          const existingAdvancesResponse = await fetch(
            `/api/deductions?employeeId=${formData.employee}&startDate=${monday.toISOString()}&endDate=${saturday.toISOString()}`
          );
          
          if (existingAdvancesResponse.ok) {
            const existingAdvancesData = await existingAdvancesResponse.json();
            const existingAdvances = Array.isArray(existingAdvancesData) ? existingAdvancesData : (existingAdvancesData.data || []);
            
            // Check if any Advance type exists this week
            const hasAdvanceThisWeek = existingAdvances.some(record => 
              record.type === 'Advance' && record.employee === formData.employee
            );
            
            if (hasAdvanceThisWeek) {
              setError('Employee already received a cash advance this week. Only one cash advance allowed per week.');
              setLoading(false);
              return;
            }
          }
        } catch (checkError) {
          logger.error('Error checking cash advance eligibility:', checkError);
          // Continue with submission if check fails (graceful degradation)
        }
      }
      
      const submissionData = {
        name: formData.name,
        employee: formData.employee || undefined,
        type: 'Advance',
        amount: parseFloat(formData.amount),
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString()
      };
      
      await createDeduction(submissionData);
      setShowAddForm(false);
      
      setFormData({
        name: "",
        employee: "",
        employeeIdInput: "",
        type: "Cash Advance",
        amount: "",
        date: new Date().toISOString().split('T')[0]
      });
      setCurrentEmployeeStatus('');
      await fetchDeductions();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle date input change
  const handleDateChange = (e) => {
    const value = e.target.value;
    logger.log('📅 Date input changed:', value);
    setSelectedDate(value);
  };

  // Handle year change
  const handleYearChange = (e) => {
    setSelectedYear(e.target.value);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterType('');
    setSelectedDate('');
    setSelectedYear('');
    setSearchTerm('');
  };

  // Check if any filter is active
  const isFilterActive = () => {
    return filterType !== '' || searchTerm !== '';
  };

  // ✅ BUG #25 FIX: ARCHIVE FUNCTION with React Hot Toast
  const handleArchive = async (id) => {
    if (!id) {
      showError('Cannot archive - No ID provided');
      return;
    }
    
    const confirmed = await showConfirm('Are you sure you want to archive this cash advance record?', {
      confirmText: 'Archive',
      confirmColor: '#8b5cf6', // Purple color
    });
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Call PATCH /api/cash-advance/:id/archive endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-advance/${id}/archive`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Archive failed');
        }

        // ✅ FIX ISSUE #4: Bypass cache to force fresh data fetch
        await fetchDeductions(true); // true = bypass cache
        setError(null);
        showSuccess('Cash advance record archived successfully!');
        
      } catch (err) {
        logger.error('Archive error:', err);
        const errorMessage = err.message || 'Archive failed';
        setError(errorMessage);
        showError(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // ✅ BUG #25 FIX: RESTORE FROM ARCHIVE FUNCTION with React Hot Toast
  const handleRestore = async (id) => {
    if (!id) {
      showError('Cannot restore - No ID provided');
      return;
    }
    
    const confirmed = await showConfirm('Are you sure you want to restore this cash advance record?', {
      confirmText: 'Restore',
      confirmColor: '#10b981', // Green color
    });
    
    if (confirmed) {
      try {
        setLoading(true);
        
        // Call PATCH /api/cash-advance/:id/restore endpoint
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/cash-advance/${id}/restore`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || 'Restore failed');
        }

        // ✅ FIX ISSUE #4: Bypass cache to force fresh data fetch
        await fetchDeductions(true); // true = bypass cache
        setError(null);
        showSuccess('Cash advance record restored successfully!');
        
      } catch (err) {
        logger.error('Restore error:', err);
        const errorMessage = err.message || 'Restore failed';
        setError(errorMessage);
        showError(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setFormData({
      name: "",
      employee: "",
      employeeIdInput: "",
      type: "Advance",
      amount: "",
      date: new Date().toISOString().split('T')[0]
    });
    setCurrentEmployeeStatus('');
  };

  // Get employee status for display
  const getEmployeeStatus = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee?.status || 'Unknown';
  };

  if (error) return (
    <div className="container mt-4">
      <div className="alert alert-danger">
        <h4 className="alert-heading">Error!</h4>
        <p>{error}</p>
        <hr />
        <p className="mb-0">
          <button className="btn btn-outline-danger" onClick={fetchDeductions}>
            Try Again
          </button>
        </p>
      </div>
    </div>
  );

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
                    <i className="fas fa-minus-circle me-2"></i>
                    Cash Advance Management
                  </h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Track and manage employee cash advances efficiently
                  </p>
                </div>
                <button
                  onClick={handleAddDeductionClick}
                  className="btn"
                  style={{ 
                    backgroundColor: '#f06a98', 
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
                  <i className="fas fa-plus me-2"></i>Cash Advance
                </button>
              </div>

              {/* Search Bar and Filters */}
              <div className="mt-4 d-flex gap-3 align-items-center flex-wrap">
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
                    onClick={handleClearFilters}
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

                {/* Archive Button */}
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="btn"
                  style={{ 
                    backgroundColor: showArchived ? '#6c757d' : '#f06a98', 
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
                  {showArchived ? 'Back to Main' : 'View Archive'}
                </button>
              </div>

              {/* ✅ FIX ISSUE #2: Important Notice Section - Cash Advance Rate Information */}
              {currentSalaryRate && (
                <div className="mt-4 mb-4">
                  <div 
                    className="d-flex align-items-center justify-content-between p-3 rounded"
                    style={{
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #90caf9',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => setShowImportantNotice(!showImportantNotice)}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="fas fa-info-circle text-primary" style={{ fontSize: '1.5rem' }}></i>
                      <h3 className="mb-0 fw-bold text-primary" style={{ fontSize: '1.1rem' }}>
                        Important Notice - Cash Advance Guidelines
                      </h3>
                    </div>
                    <i className={`fas fa-chevron-${showImportantNotice ? 'up' : 'down'} text-primary`}></i>
                  </div>

                  {showImportantNotice && (
                    <div 
                      className="p-4 mt-2 rounded"
                      style={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #e0e0e0'
                      }}
                    >
                      <div className="row">
                        <div className="col-md-6">
                          <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '1rem' }}>
                            <i className="fas fa-dollar-sign text-success me-2"></i>
                            Current Cash Advance Rate
                          </h4>
                          <div className="ps-4">
                            <p className="mb-2">
                              <span className="fw-semibold">Daily Rate:</span>{' '}
                              <span className="text-primary fw-bold" style={{ fontSize: '1.1rem' }}>
                                ₱{currentSalaryRate.dailyRate?.toLocaleString() || '550'}
                              </span>
                            </p>
                            <p className="mb-2">
                              <span className="fw-semibold">Maximum Cash Advance:</span>{' '}
                              <span className="text-success fw-bold" style={{ fontSize: '1.2rem' }}>
                                ₱{currentSalaryRate.maxCashAdvance?.toLocaleString() || '1,100'}
                              </span>
                              <br />
                              <small className="text-muted">
                                (2 days × ₱{currentSalaryRate.dailyRate?.toLocaleString() || '550'})
                              </small>
                            </p>
                          </div>
                        </div>

                        <div className="col-md-6">
                          <h4 className="fw-bold text-dark mb-3" style={{ fontSize: '1rem' }}>
                            <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                            Cash Advance Rules
                          </h4>
                          <ul className="ps-4" style={{ lineHeight: '1.8' }}>
                            <li>
                              <span className="fw-semibold">Maximum Amount:</span> Cannot exceed{' '}
                              <span className="text-danger fw-bold">
                                ₱{currentSalaryRate.maxCashAdvance?.toLocaleString() || '1,100'}
                              </span>
                            </li>
                            <li>
                              <span className="fw-semibold">Frequency:</span> Only{' '}
                              <span className="text-danger fw-bold">one cash advance per week</span> per employee
                            </li>
                            <li>
                              <span className="fw-semibold">Deduction:</span> Automatically deducted from payroll
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="alert alert-info mt-3 mb-0" style={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9' }}>
                        <i className="fas fa-calculator me-2"></i>
                        <span className="fw-semibold">Net Salary Calculation:</span>{' '}
                        Gross Pay - SSS - PhilHealth - PAG-IBIG - Cash Advances = Net Salary
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Body content */}
            <div className="card-body" style={{ padding: '10px 20px' }}>
              {/* Cash Advance List Table */}
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Active Cash Advance Records */}
                  {!showArchived && (
                    <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md" style={{ marginTop: '10px' }}>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                          Active Cash Advance Records - {getFilterDisplayText()}
                        </h2>
                        <div className="text-sm text-gray-600">
                          {filteredData.length} record{filteredData.length !== 1 ? 's' : ''} found
                        </div>
                      </div>
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {filteredData.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                {searchTerm ? 'No cash advances found matching your search' : 'No cash advances found'}
                              </td>
                            </tr>
                          ) : (
                            filteredData.map((deduction, index) => (
                              <tr key={deduction._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.employee?.employeeId || '—'}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <StatusBadge status={getEmployeeStatus(deduction.employee?._id)} />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.type}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{Number(deduction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  {(() => {
                                    let dateToDisplay = null;
                                    if (deduction.date) {
                                      try { dateToDisplay = new Date(deduction.date); } catch {}
                                    } else if (deduction.createdAt) {
                                      try { dateToDisplay = new Date(deduction.createdAt); } catch {}
                                    }
                                    if (dateToDisplay && !isNaN(dateToDisplay.getTime())) {
                                      return formatTableDate(dateToDisplay);
                                    } else {
                                      return 'No date';
                                    }
                                  })()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleArchive(deduction._id)}
                                      className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 transition duration-200"
                                    >
                                      Archive
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Archived Cash Advance Records */}
                  {showArchived && (
                    <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md" style={{ marginTop: '10px' }}>
                      <h2 className="text-xl font-semibold text-gray-700 mb-3">Archived Cash Advance Records - {searchTerm ? `Search: "${searchTerm}"` : 'All Archived Records'}</h2>
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {filteredArchivedData.length === 0 ? (
                            <tr>
                              <td colSpan="8" className="text-center py-4 text-muted">
                                No archived cash advances found {searchTerm && 'matching your search'}
                              </td>
                            </tr>
                          ) : (
                            filteredArchivedData.map((deduction, index) => (
                              <tr key={deduction._id} className="hover:bg-gray-50 bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.employee?.employeeId || '—'}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <StatusBadge status={getEmployeeStatus(deduction.employee?._id)} />
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">{deduction.type}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">₱{Number(deduction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  {(() => {
                                    let dateToDisplay = null;
                                    if (deduction.date) {
                                      try { dateToDisplay = new Date(deduction.date); } catch {}
                                    } else if (deduction.createdAt) {
                                      try { dateToDisplay = new Date(deduction.createdAt); } catch {}
                                    }
                                    if (dateToDisplay && !isNaN(dateToDisplay.getTime())) {
                                      return formatTableDate(dateToDisplay);
                                    } else {
                                      return 'No date';
                                    }
                                  })()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap border">
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleRestore(deduction._id)}
                                      className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition duration-200"
                                    >
                                      Restore
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Deduction Modal */}
      {showAddForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" style={{ fontSize: '1.3rem', color: '#2c3e50' }}>
                  <i className="fas fa-minus-circle me-2"></i>
                  Cash Advance
                </h5>
                <button type="button" className="btn-close" onClick={handleCancel}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Employee ID *</label>
                      <input 
                        type="text" 
                        name="employeeIdInput" 
                        value={formData.employeeIdInput} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="Enter Employee ID" 
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Employee Name</label>
                      <input
                        type="text"
                        className="form-control"
                        readOnly
                        placeholder="Employee Name (auto-filled)"
                        value={formData.name}
                      />
                    </div>
                    {/* Status Field - IMPROVED */}
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Employee Status</label>
                      <div className="form-control" style={{ minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                        <StatusBadge status={currentEmployeeStatus} />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Type *</label>
                      <select 
                        name="type" 
                        value={formData.type} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required
                      >
                        <option value="Cash Advance">Cash Advance</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Amount *</label>
                      <input 
                        type="number" 
                        name="amount" 
                        value={formData.amount} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        placeholder="Enter amount" 
                        required 
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" style={{ fontSize: '1.1rem' }}>Date *</label>
                      <input 
                        type="date" 
                        name="date" 
                        value={formData.date} 
                        onChange={handleInputChange} 
                        className="form-control" 
                        required
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="submit" className="btn" disabled={loading} style={{
                      backgroundColor: '#f06a98',
                      borderColor: '#f06a98',
                      color: 'white',
                      boxShadow: '0 2px 4px rgba(240, 106, 152, 0.2)'
                    }}>
                      {loading ? 'Saving...' : 'Cash Advance'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deduction;
