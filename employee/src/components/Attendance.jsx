import React, { useState, useEffect } from "react";
import { attendanceApi, employeeApi, eventBus } from "../services/apiService";
import { useDebounce } from "../utils/debounce";
import { logger } from "../utils/logger";
import { optimizedMemo } from "../utils/reactOptimization";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

// Memoized Attendance Row Component for better performance
const AttendanceRow = optimizedMemo(
  ({ record, index, onArchive, formatTableDate }) => (
    <tr key={record.id} className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.employeeId}</td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.name}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          record.status === 'Present' ? 'bg-blue-100 text-blue-800' : 
          record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800' :
          record.status === 'Full-day' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {record.status || 'Present'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.timeIn || '-'}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span style={{ 
          color: record.timeOutColor === 'yellow' ? '#d97706' : 
                 record.timeOutColor === 'green' ? '#10b981' : 
                 record.timeOutColor === 'darkgreen' ? '#047857' : 
                 'inherit',
          fontWeight: record.timeOutColor ? '600' : 'normal'
        }}>
          {record.timeOut || '-'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">{formatTableDate(record.date)}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <div className="flex space-x-1">
          <button
            onClick={() => onArchive(record.id)}
            className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600 transition duration-200"
          >
            Archive
          </button>
        </div>
      </td>
    </tr>
  ),
  (prevProps, nextProps) => {
    // Only re-render if record data changes
    return (
      prevProps.record.id === nextProps.record.id &&
      prevProps.record.status === nextProps.record.status &&
      prevProps.record.timeOut === nextProps.record.timeOut &&
      prevProps.index === nextProps.index
    );
  },
  'AttendanceRow'
);

// Memoized Archived Attendance Row Component
const ArchivedAttendanceRow = optimizedMemo(
  ({ record, index, onRestore, formatTableDate }) => (
    <tr key={record.id} className="hover:bg-gray-50 bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap border">{index + 1}</td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.employeeId}</td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.name}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          record.status === 'Present' ? 'bg-blue-100 text-blue-800' : 
          record.status === 'Half-day' ? 'bg-yellow-100 text-yellow-800' :
          record.status === 'Full-day' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {record.status || 'Present'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">{record.timeIn || '-'}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <span style={{ 
          color: record.timeOutColor === 'yellow' ? '#d97706' : 
                 record.timeOutColor === 'green' ? '#10b981' : 
                 record.timeOutColor === 'darkgreen' ? '#047857' : 
                 'inherit',
          fontWeight: record.timeOutColor ? '600' : 'normal'
        }}>
          {record.timeOut || '-'}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap border">{formatTableDate(record.date)}</td>
      <td className="px-4 py-3 whitespace-nowrap border">
        <div className="flex space-x-1">
          <button
            onClick={() => onRestore(record.id)}
            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition duration-200"
          >
            Restore
          </button>
        </div>
      </td>
    </tr>
  ),
  (prevProps, nextProps) => {
    return (
      prevProps.record.id === nextProps.record.id &&
      prevProps.index === nextProps.index
    );
  },
  'ArchivedAttendanceRow'
);

const AttendancePage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterType, setFilterType] = useState(''); // 'week', 'month', 'year', or empty for all
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [allAttendanceData, setAllAttendanceData] = useState([]); // Transformed data for display
  const [rawAttendanceData, setRawAttendanceData] = useState([]); // ✅ NEW: Store raw attendance data
  const [employees, setEmployees] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [errorAttendance, setErrorAttendance] = useState(null);
  const [errorEmployees, setErrorEmployees] = useState(null);

  // Function to add test attendance button for testing real-time updates
  const handleTestAttendance = async (employeeId) => {
    try {
      const response = await fetch('http://localhost:5000/api/attendance/test-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ employeeId })
      });

      const result = await response.json();
      if (response.ok) {
        logger.log('Test attendance recorded:', result);
        // The real-time update should happen automatically via WebSocket
      } else {
        logger.error('Test attendance failed:', result.error);
      }
    } catch (error) {
      logger.error('Error testing attendance:', error);
    }
  };

  // Function to transform API data to display format
  const transformAttendanceData = (attendanceRecords, employeeList) => {
    const employeeMap = employeeList.reduce((map, emp) => {
      map[emp.employeeId] = {
        name: `${emp.firstName} ${emp.lastName}`,
        status: emp.status
      };
      return map;
    }, {});

    // Transform attendance records to display format
    const transformed = attendanceRecords.map(record => {
      // Handle both new schema (date, timeIn, timeOut) and legacy schema (time)
      const recordDate = record.date || record.time;
      const date = new Date(recordDate).toISOString().split('T')[0];
      
      // Get employee name from populated field or fallback to employeeMap
      let employeeName = 'Unknown';
      if (record.employee && typeof record.employee === 'object') {
        employeeName = `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim();
      } else {
        employeeName = employeeMap[record.employeeId]?.name || 'Unknown';
      }

      // Format time
      const formatTime = (dateValue) => {
        if (!dateValue) return '';
        return new Date(dateValue).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      };

      // Calculate status based on timeIn and timeOut
      let attendanceStatus = 'present'; // Default
      let timeOutColor = ''; // For color coding
      
      if (record.timeIn && record.timeOut) {
        // Employee has both timeIn and timeOut
        const timeOutDate = new Date(record.timeOut);
        const timeOutHour = timeOutDate.getHours();
        const timeOutMinute = timeOutDate.getMinutes();
        const timeOutInMinutes = timeOutHour * 60 + timeOutMinute;
        const fivePM = 17 * 60; // 5:00 PM = 17:00 in minutes
        const sixPM = 18 * 60;  // 6:00 PM = 18:00 in minutes
        
        if (timeOutInMinutes < fivePM) {
          // Time out before 5:00 PM = Half Day
          attendanceStatus = 'Half-day';
          timeOutColor = 'yellow'; // Yellow for half-day
        } else if (timeOutInMinutes === fivePM) {
          // Time out exactly at 5:00 PM = Full Day
          attendanceStatus = 'Full-day';
          timeOutColor = 'green'; // Green for full-day
        } else {
          // Time out after 5:00 PM = Overtime
          attendanceStatus = 'Full-day';
          timeOutColor = 'darkgreen'; // Darker green for overtime
        }
      } else if (record.timeIn && !record.timeOut) {
        // Employee has timeIn but no timeOut = Currently Present
        attendanceStatus = 'Present';
        timeOutColor = '';
      }

      return {
        id: record._id || `${record.employeeId}-${date}`,
        employeeId: record.employeeId,
        name: employeeName,
        date: date,
        status: attendanceStatus,
        archived: record.archived || false,
        timeIn: formatTime(record.timeIn),
        timeOut: formatTime(record.timeOut),
        timeOutColor: timeOutColor, // Add color info for rendering
        weekStart: getWeekStartDate(date)
      };
    });

    return transformed;
  };

  // Fetch attendance and employees data
  const fetchData = async () => {
    try {
      setLoadingAttendance(true);
      setLoadingEmployees(true);
      setErrorAttendance(null);
      setErrorEmployees(null);
      
      // Fetch both attendance and employees in parallel
      const [attendanceResponse, employeeResponse] = await Promise.all([
        attendanceApi.getAll(),
        employeeApi.getAll()
      ]);
      
      // Handle attendance response
      if (attendanceResponse.error) {
        setErrorAttendance(attendanceResponse.error);
      }
      
      // Handle employee response
      if (employeeResponse.error) {
        setErrorEmployees(employeeResponse.error);
      } else {
        // Handle both paginated response {data: []} and plain array []
        const employeeList = Array.isArray(employeeResponse) ? employeeResponse : (employeeResponse.data || employeeResponse.employees || []);
        setEmployees(employeeList);
      }
      
      // Transform data only if both are successful
      if (!attendanceResponse.error && !employeeResponse.error) {
        const employeeList = Array.isArray(employeeResponse) ? employeeResponse : (employeeResponse.data || employeeResponse.employees || []);
        // ✅ FIX: Extract attendance array from paginated response
        const attendanceList = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || attendanceResponse.attendance || []);
        setRawAttendanceData(attendanceList); // ✅ Store raw data
        const transformedData = transformAttendanceData(attendanceList, employeeList);
        setAllAttendanceData(transformedData);
      }
      
    } catch (err) {
      setErrorAttendance('Failed to fetch attendance data');
      setErrorEmployees('Failed to fetch employee data');
    } finally {
      setLoadingAttendance(false);
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchData();

  // Set up event listeners for real-time updates
  const unsubscribeAttendance = eventBus.on('attendance-updated', (data) => {
    logger.log('Attendance updated event received:', data);
  if (employees.length > 0) {
    // ✅ FIX: Extract attendance array from paginated response
    const attendanceList = Array.isArray(data) ? data : (data.data || data.attendance || []);
    setRawAttendanceData(attendanceList); // ✅ Store raw data
    const transformedData = transformAttendanceData(attendanceList, employees);
    setAllAttendanceData(transformedData);
  }
});    const unsubscribeAttendanceRecorded = eventBus.on('attendance-recorded', (data) => {
      logger.log('Attendance recorded event received:', data);
      // Refresh data
      fetchData();
    });

    const unsubscribeEmployees = eventBus.on('employees-updated', (data) => {
      logger.log('Employees updated event received:', data);
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
      setEmployees(employeeList);
      // Re-transform attendance data with new employee info using raw data
      if (rawAttendanceData.length > 0) {
        const transformedData = transformAttendanceData(rawAttendanceData, employeeList);
        setAllAttendanceData(transformedData);
      }
    });

    // Auto-refresh every 60 seconds to catch any missed updates (reduced from 30+5 seconds)
    const refreshInterval = setInterval(() => {
      logger.log('Auto-refreshing attendance data...');
      fetchData();
    }, 60000); // 60 seconds - reduced polling frequency

    // Cleanup
    return () => {
      unsubscribeAttendance();
      unsubscribeAttendanceRecorded();
      unsubscribeEmployees();
      clearInterval(refreshInterval);
    };
  }, []);

  // Extract available years from data
  useEffect(() => {
    const years = [...new Set(allAttendanceData.map(record => 
      record.date.substring(0, 4) // YYYY format
    ))].sort().reverse();
    
    setAvailableYears(years);
  }, [allAttendanceData]);

  // Get week start date (Monday) with error handling
  const getWeekStartDate = (dateString) => {
    try {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(date);
      monday.setDate(date.getDate() + daysToMonday);
      
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
    let filtered = allAttendanceData.filter(record => !record.archived);

    // Apply filters based on filter type
    if (filterType === 'today') {
      // Get today's date in Philippines timezone (UTC+8)
      // Since backend uses Philippines timezone, we need to match that
      const today = new Date();
      // Create date string in format YYYY-MM-DD based on user's date
      // The backend stores dates in Philippines timezone, so we compare date strings
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      logger.log(`🔍 Filtering for today: ${todayStr}`);
      
      filtered = filtered.filter(record => {
        // Extract date part from record.date (which may be a full timestamp)
        const recordDate = new Date(record.date);
        const recordYear = recordDate.getFullYear();
        const recordMonth = String(recordDate.getMonth() + 1).padStart(2, '0');
        const recordDay = String(recordDate.getDate()).padStart(2, '0');
        const recordDateStr = `${recordYear}-${recordMonth}-${recordDay}`;
        
        logger.log(`   Record date: ${recordDateStr}, Match: ${recordDateStr === todayStr}`);
        return recordDateStr === todayStr;
      });
      
      logger.log(`📊 Filtered ${filtered.length} records for today`);
    } else if (filterType === 'week' && selectedDate) {
      try {
        logger.log('🔄 Filtering by week:', selectedDate);
        
        const weekDates = getDatesFromWeekInput(selectedDate);
        logger.log('📅 Week range:', weekDates.start, 'to', weekDates.end);
        
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(record => {
            const recordDate = new Date(record.date);
            const recordDateStr = recordDate.toISOString().split('T')[0];
            const isInRange = recordDateStr >= weekDates.start && recordDateStr <= weekDates.end;
            
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
        
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          const recordDateStr = recordDate.toISOString().split('T')[0];
          return recordDateStr >= monthStart && recordDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getFullYear().toString() === selectedYear;
      });
    }

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const employeeName = record.name?.toLowerCase() || '';
        const employeeId = record.employeeId?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeId.includes(searchLower);
      });
    }

    setFilteredData(filtered);
  }, [debouncedSearchTerm, filterType, selectedDate, selectedYear, allAttendanceData]);

  // Get archived data
  const archivedData = allAttendanceData.filter(record => record.archived);

  // Filter archived data based on search term
  const filteredArchivedData = archivedData.filter(record => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    const employeeName = record.name?.toLowerCase() || '';
    const employeeId = record.employeeId?.toLowerCase() || '';
    return employeeName.includes(searchLower) || employeeId.includes(searchLower);
  });

  // Calculate statistics for current filter
  const totalEmployees = filteredData.length;

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

  // Format date for table display
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
      return 'All Attendance Records';
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
    
    return 'Filtered Attendance Records';
  };

  // Archive function
  const handleArchive = async (recordId) => {
    if (window.confirm('Are you sure you want to archive this attendance record?')) {
      try {
        const response = await fetch(`/api/attendance/${recordId}/archive`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          // Update local state
          const updatedData = allAttendanceData.map(record =>
            record.id === recordId
              ? { ...record, archived: true }
              : record
          );
          setAllAttendanceData(updatedData);
          logger.log('✅ Attendance record archived successfully');
        } else {
          logger.error('❌ Failed to archive attendance record');
          alert('Failed to archive attendance record');
        }
      } catch (error) {
        logger.error('❌ Error archiving attendance:', error);
        alert('Error archiving attendance record');
      }
    }
  };

  // Restore from archive function
  const handleRestore = async (recordId) => {
    if (window.confirm('Are you sure you want to restore this attendance record?')) {
      try {
        const response = await fetch(`/api/attendance/${recordId}/restore`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          // Update local state
          const updatedData = allAttendanceData.map(record =>
            record.id === recordId
              ? { ...record, archived: false }
              : record
          );
          setAllAttendanceData(updatedData);
          logger.log('✅ Attendance record restored successfully');
        } else {
          logger.error('❌ Failed to restore attendance record');
          alert('Failed to restore attendance record');
        }
      } catch (error) {
        logger.error('❌ Error restoring attendance:', error);
        alert('Error restoring attendance record');
      }
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

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Fixed Sidebar - Using AdminSidebar Component */}
      <AdminSidebar />

      {/* Main Content with left margin for fixed sidebar */}
      <div className="flex-1 overflow-auto" style={{ marginLeft: '280px' }}>
        <div className="p-4">
          <div className="card shadow-sm mb-4" style={{ borderRadius: '15px', border: 'none' }}>
            {/* Header - Using AdminHeader Component */}
            <div style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
              <AdminHeader />
            </div>
            
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
                    <i className="fas fa-clock me-2"></i>
                    Attendance Overview
                  </h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Monitor and track employee attendance records
                  </p>
                </div>
                <div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      logger.log('Manual refresh triggered');
                      fetchData();
                    }}
                    style={{ 
                      backgroundColor: '#007bff', 
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4 mt-4" style={{ maxWidth: '300px' }}>
                <div className="bg-yellow-50 p-4 rounded-lg text-center border">
                  {loadingAttendance || loadingEmployees ? (
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : errorAttendance || errorEmployees ? (
                    <div className="text-danger small">
                      {errorAttendance || errorEmployees}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold">{totalEmployees}</div>
                  )}
                  <div className="text-gray-600 text-sm">
                    Total Employees - {getFilterDisplayText()}
                  </div>
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

            {/* Body content */}
            <div className="card-body" style={{ padding: '10px 20px' }}>

              {/* Main Attendance Table */}
              {!showArchived && (
                <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">
                      Attendance Records - {getFilterDisplayText()}
                    </h2>
                    <div className="text-sm text-gray-600">
                      {filteredData.length} record{filteredData.length !== 1 ? 's' : ''} found
                    </div>
                  </div>
                  {loadingAttendance || loadingEmployees ? (
                    <div className="text-center py-8">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading attendance data...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading attendance records...</p>
                    </div>
                  ) : errorAttendance || errorEmployees ? (
                    <div className="text-center py-8 text-danger">
                      <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                      <p>{errorAttendance || errorEmployees}</p>
                      <button onClick={fetchData} className="btn btn-primary btn-sm">
                        Retry
                      </button>
                    </div>
                  ) : (
                    <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Time In</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Time Out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 divide-y divide-gray-200">
                        {filteredData.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="text-center py-4 text-muted">
                              {searchTerm ? 'No attendance records found matching your search' : 'No attendance records found'}
                            </td>
                          </tr>
                        ) : (
                          filteredData.map((record, index) => (
                            <AttendanceRow
                              key={record.id}
                              record={record}
                              index={index}
                              onArchive={handleArchive}
                              formatTableDate={formatTableDate}
                            />
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Archived Items Section */}
              {showArchived && (
                <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">Archived Attendance Records - {searchTerm ? `Search: "${searchTerm}"` : 'All Archived Records'}</h2>
                    <div className="text-sm text-gray-600">
                      {filteredArchivedData.length} archived record{filteredArchivedData.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {filteredArchivedData.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                      <i className="fas fa-archive text-4xl mb-3 text-gray-300"></i>
                      <p>No archived attendance records found</p>
                    </div>
                  ) : (
                    <table className="min-w-full table-auto text-sm" style={{ fontSize: '0.875rem' }}>
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">#</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Employee Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Time In</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Time Out</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 divide-y divide-gray-200">
                        {filteredArchivedData.map((record, index) => (
                          <ArchivedAttendanceRow
                            key={record.id}
                            record={record}
                            index={index}
                            onRestore={handleRestore}
                            formatTableDate={formatTableDate}
                          />
                        ))}
                      </tbody>
                    </table>
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

export default AttendancePage;
