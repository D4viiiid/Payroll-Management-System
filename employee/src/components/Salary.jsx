import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { salaryApi, employeeApi } from '../services/apiService';
import { useDebounce } from '../utils/debounce';
import { logger } from '../utils/logger';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

// Status Badge Component - Updated to show dayType instead of employee status
const StatusBadge = ({ dayType }) => {
  const getStatusConfig = (dayType) => {
    switch (dayType?.toLowerCase()) {
      case 'full day':
        return {
          text: 'Full Day',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'half day':
        return {
          text: 'Half Day',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          borderColor: 'border-orange-200'
        };
      case 'absent':
        return {
          text: 'Absent',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          text: 'N/A',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(dayType);

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
      {config.text}
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/attendance`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAttendanceRecords(data);
      } else {
        logger.error('Attendance data is not an array:', data);
        setAttendanceRecords([]);
      }
    } catch (err) {
      logger.error('Error fetching attendance data:', err);
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
    
    return attendanceRecord?.dayType || 'N/A';
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
      alert('Error: Cannot archive - No ID provided');
      logger.error('Archive error: No ID provided');
      return;
    }

    if (window.confirm('Are you sure you want to archive this salary record?')) {
      try {
        setLoading(true);

        logger.log('🔄 Attempting to archive salary record with ID:', id);

        const result = await salaryApi.archive(id);
        if (result.error) {
          setError(result.error);
          alert(`Error: ${result.error}`);
        } else {
          // Refresh the list
          await fetchSalaries();
          setError(null);
          alert('Salary record archived successfully!');
        }

      } catch (err) {
        logger.error('❌ Archive error details:', err);

        const errorMessage = err.message || 'Archive failed';
        setError(errorMessage);
        alert(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // === RESTORE FROM ARCHIVE FUNCTION ===
  const handleRestore = async (id) => {
    if (!id) {
      alert('Error: Cannot restore - No ID provided');
      return;
    }

    if (window.confirm('Are you sure you want to restore this salary record?')) {
      try {
        setLoading(true);

        logger.log('🔄 Attempting to restore salary record with ID:', id);

        const result = await salaryApi.restore(id);
        if (result.error) {
          setError(result.error);
          alert(`Error: ${result.error}`);
        } else {
          // Refresh the list
          await fetchSalaries();
          setError(null);
          alert('Salary record restored successfully!');
        }

      } catch (err) {
        logger.error('❌ Restore error details:', err);

        const errorMessage = err.message || 'Restore failed';
        setError(errorMessage);
        alert(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
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
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      <AdminSidebar />
      
      {/* Main Content with Sidebar Margin */}
      <div 
        className="flex-1 overflow-auto" 
        style={{ 
          marginLeft: '280px',
          width: 'calc(100% - 280px)'
        }}
      >
        <AdminHeader />
        
        <div className="p-4">
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
                              const dayType = getDayType(salary.employeeId, salary.date); // Get dayType from attendance
                              
                              return (
                                <tr key={salary._id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {employee ? `${employee.firstName} ${employee.lastName}` : salary.employeeName || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{salary.employeeId}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    <StatusBadge dayType={dayType} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{formatPeso(salary.amount || salary.salary)}</td>
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
                              const dayType = getDayType(salary.employeeId, salary.date); // Get dayType from attendance
                              
                              return (
                                <tr key={salary._id} className="hover:bg-gray-50 bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    {employee ? `${employee.firstName} ${employee.lastName}` : salary.employeeName || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{salary.employeeId}</td>
                                  <td className="px-4 py-3 whitespace-nowrap border">
                                    <StatusBadge dayType={dayType} />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap border">{formatPeso(salary.amount || salary.salary)}</td>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;
