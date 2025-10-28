import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salaryApi, employeeApi, attendanceApi } from '../services/apiService'; // ✅ Added attendanceApi
import { useDebounce } from '../utils/debounce';
import { logger } from '../utils/logger';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import SalaryRateModal from './SalaryRateModal'; // ✅ Import the existing modal
import './Admin.responsive.css';
import { showSuccess, showError, showConfirm } from '../utils/toast';

// ✅ FIXED: Status Badge Component - Now handles both "Full Day" and "Full-day" formats
// Uses inline conditional classes instead of dynamic class strings for Tailwind compatibility
const StatusBadge = ({ dayType }) => {
  // Normalize status text for display and comparison
  // Convert to lowercase and replace spaces with hyphens for consistent matching
  const normalizedType = dayType?.toLowerCase().replace(/\s+/g, '-');
  
  // Determine display text
  let displayText = dayType || 'N/A';
  if (normalizedType === 'half-day' || normalizedType === 'halfday') displayText = 'Half Day';
  else if (normalizedType === 'full-day' || normalizedType === 'fullday') displayText = 'Full Day';
  else if (normalizedType === 'overtime' || normalizedType === 'overtime') displayText = 'Overtime';
  else if (normalizedType === 'present') displayText = 'Present';
  else if (normalizedType === 'invalid') displayText = 'Invalid';
  else if (normalizedType === 'absent') displayText = 'Absent';
  else if (normalizedType === 'incomplete') displayText = 'Incomplete';

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      normalizedType === 'present' ? 'bg-blue-100 text-blue-800' : 
      normalizedType === 'half-day' || normalizedType === 'halfday' ? 'bg-yellow-100 text-yellow-800' :
      normalizedType === 'full-day' || normalizedType === 'fullday' ? 'bg-green-100 text-green-800' :
      normalizedType === 'invalid' ? 'bg-red-100 text-red-800' :
      normalizedType === 'overtime' ? 'bg-purple-100 text-purple-800' :
      normalizedType === 'absent' ? 'bg-gray-100 text-gray-800' :
      normalizedType === 'incomplete' ? 'bg-orange-100 text-orange-800' :
      'bg-gray-100 text-gray-800'
    }`}>
      {displayText}
    </span>
  );
};

const Salary = () => {
  const formatPeso = (amount) => {
    const numericAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(numericAmount);
  };

  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]); // NEW: Store attendance data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState(''); // 'today', 'week', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedSalaries, setArchivedSalaries] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSalaryRateModal, setShowSalaryRateModal] = useState(false); // ✅ Add modal state
  const [showImportantNotice, setShowImportantNotice] = useState(false); // ✅ FIX: Add missing state for collapsible notice
  const [newSalaryData, setNewSalaryData] = useState({
    employeeId: '',
    salary: '',
    date: ''
  });

  useEffect(() => {
    fetchSalaries();
    fetchEmployees();
    fetchAttendanceData(); // NEW: Fetch attendance data
  }, []);

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const data = await salaryApi.getAll();
      if (!data.error) {
        const allSalaries = data;

        // Separate active and archived salaries
        const active = allSalaries.filter(salary => !salary.archived);
        const archived = allSalaries.filter(salary => salary.archived);

        setSalaries(active);
        setArchivedSalaries(archived);
        setError(null);

        // Extract available years from salary data
        extractAvailableYears(active);
      } else {
        setError(data.error);
      }
    } catch (err) {
      logger.error('Error fetching salaries:', err);
      setError(err.message || 'Failed to fetch salary records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeeApi.getAll();
      if (!data.error) {
        // Handle both paginated response {data: []} and plain array []
        const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
        setEmployees(employeeList);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      logger.error('Error fetching employees:', err);
      // Fallback to mock data if API fails
      const mockEmployees = [
        {
          _id: '1',
          employeeId: 'EMP-1001',
          firstName: 'Juan',
          lastName: 'Dela Cruz',
          salary: 25000,
          status: 'regular'
        },
        {
          _id: '2',
          employeeId: 'EMP-1002',
          firstName: 'Maria',
          lastName: 'Santos',
          salary: 22000,
          status: 'regular'
        },
        {
          _id: '3',
          employeeId: 'EMP-1003',
          firstName: 'Pedro',
          lastName: 'Reyes',
          salary: 18000,
          status: 'oncall'
        }
      ];
      setEmployees(mockEmployees);
    }
  };

  // NEW: Fetch attendance data to get dayType for salary records
  const fetchAttendanceData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance`);
      const data = await response.json();
      
      // ✅ FIX: Handle paginated response - extract data array from response object
      // Backend returns: { success: true, data: [...], pagination: {...} }
      // We need to extract the data array, not use the whole response object
      if (Array.isArray(data)) {
        // Direct array (old format)
        setAttendanceRecords(data);
        logger.log('✅ Attendance data loaded (array format):', data.length, 'records');
      } else if (data.data && Array.isArray(data.data)) {
        // Paginated response (new format) - THIS IS THE FIX!
        setAttendanceRecords(data.data);
        logger.log('✅ Attendance data loaded (paginated format):', data.data.length, 'records');
      } else if (data.attendance && Array.isArray(data.attendance)) {
        // Alternative field name
        setAttendanceRecords(data.attendance);
        logger.log('✅ Attendance data loaded (attendance field):', data.attendance.length, 'records');
      } else {
        logger.error('❌ Attendance data structure unexpected:', data);
        setAttendanceRecords([]);
      }
    } catch (err) {
      logger.error('❌ Error fetching attendance data:', err);
      setAttendanceRecords([]);
    }
  };

  // NEW: Get dayType from attendance record matching salary date and employeeId
  const getDayType = (employeeId, salaryDate) => {
    if (!salaryDate || !attendanceRecords.length) return 'N/A';
    
    const salaryDateStr = new Date(salaryDate).toISOString().split('T')[0];
    
    // Find attendance record for this employee on this date
    const attendanceRecord = attendanceRecords.find(record => {
      if (!record.date) return false;
      const recordDateStr = new Date(record.date).toISOString().split('T')[0];
      return record.employeeId === employeeId && recordDateStr === salaryDateStr;
    });
    
    // Return dayType (capitalized) or status (lowercase) - prefer dayType
    return attendanceRecord?.dayType || attendanceRecord?.status || 'N/A';
  };

  // NEW: Get calculated salary from attendance record
  const getCalculatedSalary = (employeeId, salaryDate) => {
    if (!salaryDate || !attendanceRecords.length) return 0;
    
    const salaryDateStr = new Date(salaryDate).toISOString().split('T')[0];
    
    // Find attendance record for this employee on this date
    const attendanceRecord = attendanceRecords.find(record => {
      if (!record.date) return false;
      const recordDateStr = new Date(record.date).toISOString().split('T')[0];
      return record.employeeId === employeeId && recordDateStr === salaryDateStr;
    });
    
    // Return totalPay from attendance (includes daySalary + overtimePay)
    return attendanceRecord?.totalPay || attendanceRecord?.daySalary || 0;
  };

  // Extract available years from salary data
  const extractAvailableYears = (salaryData) => {
    const years = [...new Set(salaryData.map(salary => {
      const date = new Date(salary.date || salary.createdAt);
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
    let filtered = salaries.filter(salary => !salary.archived);

    // Apply filters based on filter type
    if (filterType === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      filtered = filtered.filter(salary => {
        const salaryDate = new Date(salary.date || salary.createdAt);
        const salaryDateStr = salaryDate.toISOString().split('T')[0];
        return salaryDateStr === todayStr;
      });
    } else if (filterType === 'week' && selectedDate) {
      try {
        logger.log('🔄 Filtering by week:', selectedDate);
        
        const weekDates = getDatesFromWeekInput(selectedDate);
        logger.log('📅 Week range:', weekDates.start, 'to', weekDates.end);
        
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(salary => {
            const salaryDate = new Date(salary.date || salary.createdAt);
            const salaryDateStr = salaryDate.toISOString().split('T')[0];
            const isInRange = salaryDateStr >= weekDates.start && salaryDateStr <= weekDates.end;
            
            logger.log('📋 Checking salary:', {
              employeeId: salary.employeeId,
              salaryDate: salaryDateStr,
              inRange: isInRange
            });
            
            return isInRange;
          });
          
          logger.log('✅ Filtered results:', filtered.length);
        }
      } catch (error) {
        logger.error('❌ Error filtering by week:', error);
      }
    } else if (filterType === 'month' && selectedDate) {
      try {
        const monthStart = getMonthStartDate(selectedDate);
        const monthEnd = getMonthEndDate(selectedDate);
        
        logger.log('🔄 Filtering by month:', monthStart, 'to', monthEnd);
        
        filtered = filtered.filter(salary => {
          const salaryDate = new Date(salary.date || salary.createdAt);
          const salaryDateStr = salaryDate.toISOString().split('T')[0];
          return salaryDateStr >= monthStart && salaryDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(salary => {
        const salaryDate = new Date(salary.date || salary.createdAt);
        return salaryDate.getFullYear().toString() === selectedYear;
      });
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(salary => {
        const employeeName = salary.employeeName?.toLowerCase() || '';
        const employeeId = salary.employeeId?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeId.includes(searchLower);
      });
    }

    setFilteredData(filtered);
  }, [debouncedSearchTerm, filterType, selectedDate, selectedYear, salaries]);

  // Filter archived data based on search term
  const filteredArchivedSalaries = archivedSalaries.filter(salary => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    const employeeName = salary.employeeName?.toLowerCase() || '';
    const employeeId = salary.employeeId?.toLowerCase() || '';
    return employeeName.includes(searchLower) || employeeId.includes(searchLower);
  });

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
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      
      return `${month} ${day}, ${year}`;
    } catch (error) {
      logger.error('Error formatting table date:', error);
      return 'N/A';
    }
  };

  // Get current filter display text - UPDATED WITH NEW DATE FORMAT
  const getFilterDisplayText = () => {
    if (!filterType && !searchTerm) {
      return 'All Salary Records';
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
    
    return 'Filtered Salary Records';
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

  // === ARCHIVE FUNCTION ===
  const handleArchive = async (id) => {
    if (!id) {
      showError('Error: Cannot archive - No ID provided');
      logger.error('Archive error: No ID provided');
      return;
    }

    const confirmed = await showConfirm(
      'Are you sure you want to archive this salary record?',
      {
        confirmText: 'Archive',
        cancelText: 'Cancel',
        confirmColor: '#a855f7' // Purple for archive
      }
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);

      logger.log('🔄 Attempting to archive salary record with ID:', id);

      const result = await salaryApi.archive(id);
      if (result.error) {
        setError(result.error);
        showError(`Error: ${result.error}`);
      } else {
        // Refresh the list
        await fetchSalaries();
        setError(null);
        showSuccess('Salary record archived successfully!');
      }

    } catch (err) {
      logger.error('❌ Archive error details:', err);

      const errorMessage = err.message || 'Archive failed';
      setError(errorMessage);
      showError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // === RESTORE FROM ARCHIVE FUNCTION ===
  const handleRestore = async (id) => {
    if (!id) {
      showError('Error: Cannot restore - No ID provided');
      return;
    }

    const confirmed = await showConfirm(
      'Are you sure you want to restore this salary record?',
      {
        confirmText: 'Restore',
        cancelText: 'Cancel',
        confirmColor: '#10b981' // Green for restore
      }
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);

      logger.log('🔄 Attempting to restore salary record with ID:', id);

      const result = await salaryApi.restore(id);
      if (result.error) {
        setError(result.error);
        showError(`Error: ${result.error}`);
      } else {
        // Refresh the list
        await fetchSalaries();
        setError(null);
        showSuccess('Salary record restored successfully!');
      }

    } catch (err) {
      logger.error('❌ Restore error details:', err);

      const errorMessage = err.message || 'Restore failed';
      setError(errorMessage);
      showError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Handle adding manual salary record
  const handleAddSalary = async (e) => {
    e.preventDefault();
    
    if (!newSalaryData.employeeId || !newSalaryData.date) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Find employee to get name
      const employee = employees.find(emp => emp.employeeId === newSalaryData.employeeId);
      if (!employee) {
        showError('Employee not found');
        return;
      }

      // ✅ FIX: Fetch attendance record to get salary amount and status
      const attendanceResult = await attendanceApi.getAll();
      const attendanceRecords = Array.isArray(attendanceResult) ? attendanceResult : 
                               (attendanceResult.data || attendanceResult.attendance || []);
      
      // Find attendance record matching employee ID and date
      const attendanceDateOnly = getDateOnly(newSalaryData.date);
      const matchingAttendance = attendanceRecords.find(att => 
        att.employeeId === newSalaryData.employeeId && 
        getDateOnly(att.date) === attendanceDateOnly
      );

      let salaryAmount = 0;
      let status = 'N/A';
      
      if (matchingAttendance) {
        // Use attendance data for salary amount and status
        salaryAmount = matchingAttendance.totalPay || matchingAttendance.daySalary || 0;
        status = matchingAttendance.status || 'N/A';
        console.log(`📊 Found matching attendance: ${status}, Amount: ₱${salaryAmount}`);
      } else {
        console.warn(`⚠️ No attendance record found for ${newSalaryData.employeeId} on ${attendanceDateOnly}`);
      }

      // Create salary record with data from attendance
      const salaryData = {
        employeeId: newSalaryData.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        salary: salaryAmount,
        status: status,
        date: newSalaryData.date,
        archived: false
      };

      const result = await salaryApi.create(salaryData);
      
      if (!result.error) {
        showSuccess(matchingAttendance 
          ? `Salary record created successfully with ${status} status and ₱${salaryAmount.toFixed(2)}!`
          : 'Salary record created successfully (no matching attendance found)!');
        setShowAddForm(false);
        await fetchSalaries(); // Refresh list
        setNewSalaryData({ employeeId: '', salary: '', date: '' }); // Reset form
      } else {
        showError(result.error);
      }
    } catch (error) {
      logger.error('Error creating salary record:', error);
      showError('Failed to create salary record');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Sync missing salary records from attendance
  const handleSyncMissingRecords = async () => {
    const confirmed = await showConfirm(
      'This will create salary records for all attendance records with status "Half Day", "Full Day", or "Overtime" that don\'t have a matching salary record. Continue?',
      {
        confirmText: 'Sync Now',
        cancelText: 'Cancel',
        confirmColor: '#3b82f6'
      }
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      
      // Fetch all attendance records
      const attendanceResult = await attendanceApi.getAll();
      const attendanceRecords = Array.isArray(attendanceResult) ? attendanceResult : 
                               (attendanceResult.data || attendanceResult.attendance || []);
      
      // Fetch current salary records
      const salaryResult = await salaryApi.getAll();
      const currentSalaries = Array.isArray(salaryResult) ? salaryResult : 
                             (salaryResult.data || []);
      
      let createdCount = 0;
      let skippedCount = 0;
      
      // Loop through attendance records and create missing salary records
      for (const attendance of attendanceRecords) {
        // ✅ FIX: Only process completed attendance with status that has salary computation
        const validStatuses = ['Half Day', 'Full Day', 'Overtime'];
        if (!attendance.timeOut || !validStatuses.includes(attendance.status)) {
          skippedCount++;
          continue;
        }

        const attendanceDate = getDateOnly(attendance.date);
        
        // Check if salary record exists
        const existingSalary = currentSalaries.find(salary => 
          salary.employeeId === attendance.employeeId && 
          getDateOnly(salary.date) === attendanceDate
        );

        if (!existingSalary) {
          // Find employee
          const employee = employees.find(emp => emp.employeeId === attendance.employeeId);
          if (!employee) {
            console.warn(`Employee not found for attendance: ${attendance.employeeId}`);
            skippedCount++;
            continue;
          }

          // Create salary record
          const salaryData = {
            employeeId: attendance.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            salary: attendance.totalPay || attendance.daySalary || 0,
            status: employee.status || 'Regular',
            date: attendance.date,
            archived: false
          };

          const result = await salaryApi.create(salaryData);
          if (!result.error) {
            createdCount++;
          } else {
            console.error(`Failed to create salary for ${attendance.employeeId}:`, result.error);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      showSuccess(`Sync complete! Created ${createdCount} new salary records. Skipped ${skippedCount} records.`);
      await fetchSalaries(); // Refresh list
      
    } catch (error) {
      logger.error('Error syncing salary records:', error);
      showError('Failed to sync salary records');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get date only (YYYY-MM-DD)
  const getDateOnly = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    return date.toISOString().split('T')[0];
  };

  // === RENDER ===
  if (error) return (
    <div className="container mt-4">
      <div className="alert alert-danger">
        <h4 className="alert-heading">Error!</h4>
        <p>{error}</p>
        <hr />
        <button className="btn btn-danger" onClick={fetchSalaries}>Try Again</button>
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
          <div className="card shadow-sm" style={{ borderRadius: '15px', border: 'none' }}>
           
            <div className="card-header" style={{ borderRadius: '0', padding: '20px', background: 'transparent' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1" style={{ fontWeight: 'bold', color: 'black', display: 'flex', alignItems: 'center', gap: 8, fontSize: '2rem', fontFamily: 'sans-serif' }}>
                    <i className="fas fa-money-bill me-2"></i>
                    Salary Management
                  </h2>
                  <p className="mb-0" style={{ fontSize: '16px', opacity: '0.9', color: 'black' }}>
                    Automatic salary calculation based on attendance records
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* ✅ NEW: Add Salary Record button */}
                  <button 
                    className="btn" 
                    onClick={() => setShowAddForm(true)}
                    style={{ 
                      backgroundColor: '#10b981', 
                      border: 'none', 
                      color: '#ffffff', 
                      padding: '10px 20px', 
                      fontSize: '1rem',
                      borderRadius: '8px'
                    }}
                    title="Manually add salary record"
                  >
                    <i className="fas fa-plus me-2"></i>Add Salary Record
                  </button>
                  
                  {/* ✅ CORRECT: Adjust Salary Rate button opens modal */}
                  <button 
                    className="btn" 
                    onClick={() => setShowSalaryRateModal(true)}
                    style={{ 
                      backgroundColor: '#f06a98', 
                      border: 'none', 
                      color: '#ffffff', 
                      padding: '10px 20px', 
                      fontSize: '1rem',
                      borderRadius: '8px'
                    }}
                  >
                    <i className="fas fa-edit me-2"></i>Adjust Salary Rate
                  </button>
                </div>
              </div>

              {/* Search Bar and Filters */}
              <div className="mt-4 d-flex gap-3 align-items-center flex-wrap">
                {/* ✅ NEW: Sync Missing Records button */}
                <button
                  onClick={handleSyncMissingRecords}
                  className="btn"
                  style={{ 
                    backgroundColor: '#3b82f6', 
                    border: 'none', 
                    color: '#ffffff', 
                    padding: '10px 20px', 
                    fontSize: '1rem',
                    borderRadius: '8px'
                  }}
                  title="Create salary records for all attendance without salary records"
                >
                  <i className="fas fa-sync me-2"></i>
                  Sync Missing Records
                </button>
                
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
                    borderRadius: '8px'
                  }}
                >
                  <i className="fas fa-archive me-2"></i>
                  {showArchived ? 'Back to Main' : 'View Archive'}
                </button>
              </div>
            </div>
           
            {/* Salary Records Table */}
            <div className="card-body" style={{ padding: '10px 20px' }}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Active Salary Records */}
                  {!showArchived && (
                    <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md" style={{ marginTop: '10px' }}>
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                          {showArchived ? 'Archived ' : ''}Salary Records - {getFilterDisplayText()}
                        </h2>
                        <div className="text-sm text-gray-600">
                          {filteredData.length} record{filteredData.length !== 1 ? 's' : ''} found
                        </div>
                      </div>
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {filteredData.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-4 text-muted">
                                {searchTerm ? 'No salary records found matching your search' : 'No salary records found'}
                              </td>
                            </tr>
                          ) : (
                            filteredData.map((salary, index) => {
                              const employee = employees.find(emp => emp.employeeId === salary.employeeId);
                              
                              return (
                                <tr key={salary._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {employee ? `${employee.firstName} ${employee.lastName}` : salary.employeeName || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{salary.employeeId}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {/* ✅ CORRECT: Show attendance status (Half-Day/Full-Day/Overtime) */}
                                    <StatusBadge dayType={getDayType(salary.employeeId, salary.date || salary.createdAt)} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {/* ✅ CORRECT: Show calculated salary from attendance totalPay */}
                                    {formatPeso(getCalculatedSalary(salary.employeeId, salary.date || salary.createdAt) || salary.salary || salary.amount || 0)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {salary.date ? formatTableDate(salary.date) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleArchive(salary._id)}
                                        className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600 transition duration-200"
                                      >
                                        Archive
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Archived Salary Records */}
                  {showArchived && (
                    <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md" style={{ marginTop: '10px' }}>
                      <h2 className="text-xl font-semibold text-gray-700 mb-3">Archived Salary Records - {searchTerm ? `Search: "${searchTerm}"` : 'All Archived Records'}</h2>
                      <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                        <thead className="bg-gray-100 text-gray-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 divide-y divide-gray-200">
                          {filteredArchivedSalaries.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="text-center py-4 text-muted">
                                No archived salary records found {searchTerm && 'matching your search'}
                              </td>
                            </tr>
                          ) : (
                            filteredArchivedSalaries.map((salary, index) => {
                              const employee = employees.find(emp => emp.employeeId === salary.employeeId);
                              
                              return (
                                <tr key={salary._id} className="hover:bg-gray-50 bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {employee ? `${employee.firstName} ${employee.lastName}` : salary.employeeName || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{salary.employeeId}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {/* ✅ CORRECT: Show attendance status (Half-Day/Full-Day/Overtime) */}
                                    <StatusBadge dayType={getDayType(salary.employeeId, salary.date || salary.createdAt)} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {/* ✅ CORRECT: Show calculated salary from attendance totalPay */}
                                    {formatPeso(getCalculatedSalary(salary.employeeId, salary.date || salary.createdAt) || salary.salary || salary.amount || 0)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {salary.date ? formatTableDate(salary.date) : 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    <div className="flex space-x-1">
                                      <button
                                        onClick={() => handleRestore(salary._id)}
                                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition duration-200"
                                      >
                                        Restore
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ✅ CORRECT: Important Notice - Comprehensive Version (Matches Attendance.jsx Structure) */}
            <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-sm">
              <div 
                className="cursor-pointer d-flex align-items-center justify-content-between"
                onClick={() => setShowImportantNotice(!showImportantNotice)}
                style={{ cursor: 'pointer' }}
              >
                <h3 className="text-lg font-bold text-yellow-800 mb-0 d-flex align-items-center gap-2">
                  <i className="fas fa-info-circle"></i>
                  Important Notice: Salary Calculation & Status Rules
                </h3>
                <i className={`fas fa-chevron-${showImportantNotice ? 'up' : 'down'} text-yellow-600`}></i>
              </div>
              
              {showImportantNotice && (
                <div className="space-y-4 mt-3">
                  {/* Work Hours & Lunch Break */}
                  <div className="bg-orange-50 p-3 rounded-md border border-orange-300">
                    <h4 className="font-semibold text-orange-800 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-clock text-sm"></i>
                      ⏰ Standard Work Hours & Lunch Break
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                      <li><strong>Standard Shift:</strong> 8:00 AM to 5:00 PM (9 hours total)</li>
                      <li><strong>Paid Hours:</strong> Only <strong>8 hours</strong> are counted as regular work</li>
                      <li><strong>Lunch Break (12:00 NN - 12:59 PM):</strong> <span className="text-red-600 font-bold">NOT INCLUDED</span> in the 8-hour computation</li>
                      <li><strong>Formula:</strong> Total Time - Lunch Break = Paid Hours</li>
                      <li><strong>Example:</strong> 8:00 AM - 5:00 PM = 9hrs - 1hr lunch = <strong>8 hours paid</strong></li>
                    </ul>
                  </div>

                  {/* Salary Computations */}
                  <div className="bg-white p-3 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-calculator text-sm"></i>
                      💰 Salary Computations
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                      <li><strong>Hourly Rate:</strong> Daily Rate ÷ 8 hours (₱68.75/hr)</li>
                      <li><strong>Overtime Rate:</strong> Hourly Rate × 1.25 = ₱85.94/hr</li>
                      <li><strong>Half-Day Pay:</strong> Variable (4 to &lt;6.5 hours worked)</li>
                      <li><strong>Full-Day Pay:</strong> Daily Rate (6.5-8 hours worked)</li>
                      <li><strong>Overtime Pay:</strong> Full Day + OT Rate × OT hours (&gt;6.5 hrs + after 5PM)</li>
                      <li><strong>Invalid Attendance:</strong> No pay (less than 4 hours worked)</li>
                    </ul>
                  </div>

                  {/* Half-Day Variable Pay Explained */}
                  <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300">
                    <h4 className="font-semibold text-yellow-800 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-coins text-sm"></i>
                      💰 Half-Day Variable Pay Explained
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Half-Day status applies to 4 to &lt;6.5 hours worked, pay varies by actual hours:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 ml-2">
                      <li><strong>4 hours:</strong> Half-Day Base = ₱275.00 (Daily ₱550.00 ÷ 2)</li>
                      <li><strong>5 hours:</strong> Half-Day + 1hr = ₱275.00 + ₱68.75 = <strong>₱343.75</strong></li>
                      <li><strong>6 hours:</strong> Half-Day + 2hrs = ₱275.00 + ₱137.50 = <strong>₱412.50</strong></li>
                      <li><strong>6.25 hours:</strong> Half-Day + 2.25hrs = ₱275.00 + ₱154.69 = <strong>₱429.69</strong></li>
                    </ul>
                    <p className="text-xs text-gray-600 italic mt-2">
                      <i className="fas fa-lightbulb text-yellow-600 mr-1"></i>
                      <strong>Note:</strong> Same "Half-Day" status, but different pay based on actual hours worked. Once ≥6.5 hrs, it becomes "Full Day" status.
                    </p>
                  </div>

                  {/* Status Definitions */}
                  <div className="bg-white p-3 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-700 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-tags text-sm"></i>
                      📋 Status Definitions
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                      <li><strong>Present:</strong> Employee clocked in only (no clock out yet)</li>
                      <li><strong>Invalid:</strong> Worked &lt;4 hours (0% pay - No Pay)</li>
                      <li><strong>Half-Day:</strong> Worked 4 to &lt;6.5 hours (variable pay by exact hours)</li>
                      <li><strong>Full-Day:</strong> Worked 6.5-8 hours (100% daily rate)</li>
                      <li><strong>Overtime:</strong> Worked &gt;6.5 hrs + timed out after 5PM (Full pay + OT rate)</li>
                      <li><strong>Absent:</strong> No time-in record for the day (0% pay)</li>
                    </ul>
                    <p className="text-xs text-gray-600 italic mt-2">
                      <i className="fas fa-info-circle text-blue-600 mr-1"></i>
                      <strong>Note:</strong> Grace period 8:00-9:30 AM allows Full Day eligibility if ≥6.5 hours worked.
                    </p>
                  </div>

                  {/* Overtime Eligibility */}
                  <div className="bg-purple-50 p-3 rounded-md border border-purple-300">
                    <h4 className="font-semibold text-purple-800 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-clock text-sm"></i>
                      ⚡ Overtime Eligibility Requirements
                    </h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Overtime pay (₱85.94/hr) requires ALL conditions:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 ml-2">
                      <li><strong>✅ Work &gt;8 hours total:</strong> Overtime hours = hours beyond 8 (excluding lunch)</li>
                      <li><strong>✅ Minimum 6.5 hours worked:</strong> Must work at least <span className="text-purple-600 font-bold">6hrs 30min</span> to be eligible for OT</li>
                      <li><strong>✅ Time-out after 5:00 PM:</strong> Must work past 5:00 PM for overtime eligibility</li>
                      <li><strong>✅ Manual time-out required:</strong> Must manually clock out (not auto time-out at 8 PM)</li>
                    </ul>
                    <p className="text-xs text-gray-600 italic mt-2">
                      <i className="fas fa-info-circle text-purple-600 mr-1"></i>
                      <strong>Example:</strong> 8:00 AM - 7:00 PM (10 hrs total - 1 hr lunch = 9 hrs paid) → 8 hrs Full Day + 1 hr OT (if out after 5PM)
                    </p>
                  </div>

                  {/* Archive & System Notes */}
                  <div className="bg-white p-3 rounded-md border border-gray-200">
                    <h4 className="font-semibold text-gray-700 mb-2 d-flex align-items-center gap-1">
                      <i className="fas fa-cog text-sm"></i>
                      ⚙️ Archive & System Notes
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                      <li><strong>Automatic Calculation:</strong> Salaries calculated automatically when attendance records are finalized</li>
                      <li><strong>Rate Adjustments:</strong> Use "Adjust Salary Rate" button to update global daily rate</li>
                      <li><strong>Effective Dates:</strong> New rates take effect immediately through Saturday, then Monday activation for following week</li>
                      <li><strong>Archive System:</strong> Archived records preserved for historical reference but excluded from active reporting</li>
                      <li><strong>Weekly Totals:</strong> Salary amounts shown are calculated from attendance time-in/time-out records</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Add Salary Record Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-96 shadow-lg rounded-md bg-white">
            <div className="text-center">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">Add Salary Record</h3>
              <form onSubmit={handleAddSalary}>
                <div className="space-y-4">
                  {/* Employee Selection */}
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee *
                    </label>
                    <select
                      value={newSalaryData.employeeId}
                      onChange={(e) => setNewSalaryData({...newSalaryData, employeeId: e.target.value})}
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                      required
                      style={{ color: 'black' }}
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.employeeId} value={emp.employeeId}>
                          {emp.employeeId} - {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Selection */}
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={newSalaryData.date}
                      onChange={(e) => setNewSalaryData({...newSalaryData, date: e.target.value})}
                      className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                      required
                      style={{ color: 'black' }}
                    />
                  </div>

                  {/* Info Message */}
                  <div className="text-xs text-gray-500 text-left bg-blue-50 p-3 rounded">
                    <i className="fas fa-info-circle mr-1"></i>
                    The salary amount will be automatically calculated from the attendance record for this date.
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-6 space-y-2">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <i className="fas fa-save mr-2"></i>
                    Create Salary Record
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewSalaryData({ employeeId: '', salary: '', date: '' });
                    }}
                    className="w-full px-4 py-2 bg-gray-200 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CORRECT: Salary Rate Modal */}
      <SalaryRateModal 
        isOpen={showSalaryRateModal}
        onClose={() => setShowSalaryRateModal(false)}
        onSuccess={(updatedRate) => {
          // Optional: Refresh salary data after rate update
          logger.info('Salary rate updated successfully:', updatedRate);
          // Could trigger a refetch of salary data here if needed
        }}
      />
    </div>
  );
};

export default Salary;
