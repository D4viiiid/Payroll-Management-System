import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { attendanceApi, employeeApi, eventBus } from "../services/apiService";
import { getCurrentSalaryRate } from "../services/salaryRateService";
import { useDebounce } from "../utils/debounce";
import { logger } from "../utils/logger";
import { optimizedMemo } from "../utils/reactOptimization";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import "./Admin.responsive.css";

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
          record.status === 'Invalid' ? 'bg-red-100 text-red-800' :
          record.status === 'Overtime' ? 'bg-purple-100 text-purple-800' :
          record.status === 'Absent' ? 'bg-gray-100 text-gray-800' :
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
          record.status === 'Invalid' ? 'bg-red-100 text-red-800' :
          record.status === 'Overtime' ? 'bg-purple-100 text-purple-800' :
          record.status === 'Absent' ? 'bg-gray-100 text-gray-800' :
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
  
  // ✅ NEW: Sort and Status Filter State
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [statusFilters, setStatusFilters] = useState({
    'Present': false,
    'Half-day': false,
    'Full-day': false,
    'Absent': false,
    'Invalid': false
  });
  const location = useLocation();
  
  // ✅ FIX ISSUE #2: Toggle state for Important Notice dropdown
  const [showImportantNotice, setShowImportantNotice] = useState(false);

  // Mobile sidebar state for responsive design
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // 💰 Dynamic Salary Rate (fetched from backend)
  const [salaryRate, setSalaryRate] = useState({ 
    dailyRate: 550, 
    hourlyRate: 68.75, 
    overtimeRate: 85.94 
  });

  // Function to add test attendance button for testing real-time updates
  const handleTestAttendance = async (employeeId) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL.replace('/api', '')}/api/attendance/test-record`, {
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
      
      // ✅ CRITICAL FIX: Convert UTC to Manila timezone (UTC+8) for display
      // MongoDB stores: Oct 17 midnight Manila = Oct 16 4PM UTC (16:00:00.000Z)
      // We need to add 8 hours to UTC to get Manila time
      const recordDateObj = new Date(recordDate);
      const manilaTimeMs = recordDateObj.getTime() + (8 * 60 * 60 * 1000); // Add 8 hours in milliseconds
      const manilaDate = new Date(manilaTimeMs);
      const date = manilaDate.toISOString().split('T')[0];
      
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

      // ✅ CRITICAL FIX: Use status directly from backend calculation (based on hours worked)
      // DO NOT recalculate status based on time-out time - that was the bug!
      // Backend already calculated status based on ACTUAL HOURS WORKED
      
      let attendanceStatus = record.status || 'present'; // Use backend status directly
      let timeOutColor = ''; // For color coding
      
      // ✅ FALLBACK FIX: If record has both timeIn and timeOut but status is still 'present', 
      // this is old data that needs recalculation
      if (record.timeIn && record.timeOut && attendanceStatus === 'present') {
        // Calculate hours worked for fallback
        const timeInDate = new Date(record.timeIn);
        const timeOutDate = new Date(record.timeOut);
        const diffMs = timeOutDate - timeInDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Subtract 1 hour for lunch break if they worked through lunch time (12-1 PM)
        const lunchHourStart = 12;
        const lunchHourEnd = 13;
        const timeInHour = timeInDate.getHours();
        const timeOutHour = timeOutDate.getHours();
        
        let hoursWorked = diffHours;
        if (timeInHour < lunchHourEnd && timeOutHour >= lunchHourEnd) {
          hoursWorked -= 1; // Subtract lunch hour
        }
        
        // Determine status based on hours worked
        if (hoursWorked < 4) {
          attendanceStatus = 'invalid';
        } else if (hoursWorked < 6.5) {
          attendanceStatus = 'half-day';
        } else if (hoursWorked <= 8) {
          attendanceStatus = 'full-day'; // ✅ FIX: Use 'full-day' instead of 'present'
        } else {
          // Check if timed out after 5 PM for overtime
          if (timeOutHour >= 17) {
            attendanceStatus = 'overtime';
          } else {
            attendanceStatus = 'full-day'; // ✅ FIX: Use 'full-day' instead of 'present'
          }
        }
        
        console.log(`⚠️  Fallback calculation for ${record.employeeId}: ${hoursWorked.toFixed(2)} hours → ${attendanceStatus}`);
      }
      
      // Set color based on status (for time-out column display)
      if (record.timeIn && record.timeOut) {
        // Employee has completed the day
        if (attendanceStatus === 'invalid') {
          timeOutColor = 'red'; // Red for invalid (<4 hours)
        } else if (attendanceStatus === 'half-day') {
          timeOutColor = 'yellow'; // Yellow for half-day (4-6.5 hours)
        } else if (attendanceStatus === 'full-day') {
          timeOutColor = 'green'; // Green for full-day (6.5-8 hours)
        } else if (attendanceStatus === 'present') {
          timeOutColor = 'green'; // Green for legacy full-day records (stored as 'present')
        } else if (attendanceStatus === 'overtime') {
          timeOutColor = 'darkgreen'; // Dark green for overtime (>8 hours + past 5PM)
        }
      } else if (record.timeIn && !record.timeOut) {
        // Employee has timeIn but no timeOut = Currently Present (working)
        attendanceStatus = 'present';
        timeOutColor = '';
      }
      
      // Capitalize first letter for display consistency
      const capitalizeStatus = (status) => {
        if (!status) return 'Present';
        if (status === 'half-day') return 'Half-day';
        if (status === 'full-day') return 'Full-day'; // ✅ FIX: Add full-day status
        if (status === 'invalid') return 'Invalid';
        if (status === 'overtime') return 'Overtime';
        if (status === 'present') return 'Present';
        if (status === 'absent') return 'Absent';
        return status.charAt(0).toUpperCase() + status.slice(1);
      };
      
      attendanceStatus = capitalizeStatus(attendanceStatus);

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
        weekStart: getWeekStartDate(date),
        // ✅ CRITICAL FIX: Keep raw date values for filtering
        rawTimeIn: record.timeIn,  // Keep original date for filtering
        rawTimeOut: record.timeOut, // Keep original date for filtering
        rawDate: record.date        // Keep original date for filtering
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
      // ✅ CRITICAL FIX: Use rawDate field (midnight Manila) for accurate filtering
      // The Python script stores date as midnight Manila time in UTC (e.g., Oct 17 00:00 Manila = Oct 16 16:00 UTC)
      // So we need to convert UTC back to Manila timezone by adding 8 hours
      
      // Get today's date in Manila timezone (UTC+8)
      const now = new Date();
      const manilaNow = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // Add 8 hours
      const todayStr = manilaNow.toISOString().split('T')[0]; // YYYY-MM-DD in Manila timezone
      
      logger.log(`🔍 Filtering for today (Manila timezone): ${todayStr}`);
      
      filtered = filtered.filter(record => {
        // Use rawDate field (midnight Manila stored in UTC)
        const dateField = record.rawDate;
        if (!dateField) {
          logger.warn(`⚠️ No date found for record ${record.id}`);
          return false;
        }
        
        // Convert to Date object
        const dateObj = new Date(dateField);
        
        // Validate date
        if (isNaN(dateObj.getTime())) {
          logger.warn(`⚠️ Invalid date detected for record ${record.id}:`, dateField);
          return false;
        }
        
        // Convert UTC date to Manila timezone by adding 8 hours
        const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
        const recordDateStr = manilaDate.toISOString().split('T')[0];
        
        const match = recordDateStr === todayStr;
        logger.log(`   Record ${record.employeeId}: Manila date=${recordDateStr}, Today=${todayStr}, Match=${match}`);
        return match;
      });
      
      logger.log(`📊 Filtered ${filtered.length} records for today`);
    } else if (filterType === 'week' && selectedDate) {
      try {
        logger.log('🔄 Filtering by week:', selectedDate);
        
        const weekDates = getDatesFromWeekInput(selectedDate);
        logger.log('📅 Week range:', weekDates.start, 'to', weekDates.end);
        
        if (weekDates.start && weekDates.end) {
          filtered = filtered.filter(record => {
            const dateField = record.rawDate;
            if (!dateField) return false;
            
            const dateObj = new Date(dateField);
            if (isNaN(dateObj.getTime())) return false;
            
            // Convert UTC to Manila timezone by adding 8 hours
            const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
            const recordDateStr = manilaDate.toISOString().split('T')[0];
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
          const dateField = record.rawDate;
          if (!dateField) return false;
          
          const dateObj = new Date(dateField);
          if (isNaN(dateObj.getTime())) return false;
          
          // Convert UTC to Manila timezone by adding 8 hours
          const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
          const recordDateStr = manilaDate.toISOString().split('T')[0];
          return recordDateStr >= monthStart && recordDateStr <= monthEnd;
        });
      } catch (error) {
        logger.error('Error filtering by month:', error);
      }
    } else if (filterType === 'year' && selectedYear) {
      filtered = filtered.filter(record => {
        const dateField = record.rawDate;
        if (!dateField) return false;
        
        const dateObj = new Date(dateField);
        if (isNaN(dateObj.getTime())) return false;
        
        // Convert UTC to Manila timezone by adding 8 hours
        const manilaDate = new Date(dateObj.getTime() + (8 * 60 * 60 * 1000));
        return manilaDate.getFullYear().toString() === selectedYear;
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

    // ✅ NEW: Apply status filters
    const activeStatuses = Object.keys(statusFilters).filter(k => statusFilters[k]);
    if (activeStatuses.length > 0) {
      filtered = filtered.filter(record => activeStatuses.includes(record.status));
    }

    // ✅ NEW: Apply sorting
    if (sortConfig.field) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.field];
        let bVal = b[sortConfig.field];
        
        // Handle different field types
        if (sortConfig.field === 'date') {
          aVal = new Date(a.rawDate || a.date);
          bVal = new Date(b.rawDate || b.date);
        } else if (sortConfig.field === 'timeIn' || sortConfig.field === 'timeOut') {
          // Convert time strings to comparable values
          const timeToMinutes = (timeStr) => {
            if (!timeStr || timeStr === '-') return -1;
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return -1;
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const period = match[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return hours * 60 + minutes;
          };
          aVal = timeToMinutes(aVal);
          bVal = timeToMinutes(bVal);
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredData(filtered);
  }, [debouncedSearchTerm, filterType, selectedDate, selectedYear, allAttendanceData, statusFilters, sortConfig]);

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

  // ✅ NEW: Sort handler
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ✅ NEW: Status filter toggle
  const toggleStatusFilter = (status) => {
    setStatusFilters(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // ✅ NEW: Clear all status filters
  const clearStatusFilters = () => {
    setStatusFilters({
      'Present': false,
      'Half-day': false,
      'Full-day': false,
      'Absent': false,
      'Invalid': false
    });
  };

  // ✅ NEW: Apply preset filters from Dashboard navigation
  useEffect(() => {
    if (location.state?.presetFilter) {
      const { presetFilter, presetDate, presetDateType } = location.state;
      
      // Apply status filter
      if (presetFilter === 'fullDay') {
        setStatusFilters(prev => ({ ...prev, 'Full-day': true }));
      } else if (presetFilter === 'halfDay') {
        setStatusFilters(prev => ({ ...prev, 'Half-day': true }));
      } else if (presetFilter === 'today') {
        setStatusFilters(prev => ({ ...prev, 'Present': true }));
      } else if (presetFilter === 'absent') {
        setStatusFilters(prev => ({ ...prev, 'Absent': true }));
      } else if (presetFilter === 'invalid') {
        // ✅ NEW: Handle invalid filter from Dashboard
        setStatusFilters(prev => ({ ...prev, 'Invalid': true }));
      }
      
      // Apply date filter
      if (presetDate) {
        setFilterType(presetDateType || 'today');
        setSelectedDate(presetDate);
      }
      
      // Clear the state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  
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
        <div className="admin-content-area">
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

                {/* Status Filter Checkboxes */}
                <div className="d-flex gap-2 align-items-center flex-wrap" style={{ backgroundColor: '#f8f9fa', padding: '10px 15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <label className="text-sm font-medium text-gray-600 mb-0" style={{ fontWeight: '600', marginRight: '8px' }}>
                    <i className="fas fa-filter me-1"></i>Status:
                  </label>
                  {Object.keys(statusFilters).map(status => (
                    <label key={status} className="d-flex align-items-center gap-1 mb-0" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={statusFilters[status]}
                        onChange={() => toggleStatusFilter(status)}
                        className="form-check-input"
                        style={{ marginTop: '0', cursor: 'pointer' }}
                      />
                      <span className="text-sm">{status}</span>
                    </label>
                  ))}
                  {Object.values(statusFilters).some(v => v) && (
                    <button
                      onClick={clearStatusFilters}
                      className="btn btn-sm btn-link text-primary"
                      style={{ padding: '0 4px', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                      Clear All
                    </button>
                  )}
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

                {/* Status Filter Dropdown - Mobile/Tablet Only */}
                <div className="flex gap-2 items-center status-filter-dropdown">
                  <label className="text-sm font-medium text-gray-600">Status:</label>
                  <select 
                    onChange={(e) => {
                      const status = e.target.value;
                      if (status === 'all') {
                        clearStatusFilters();
                      } else if (status) {
                        // Clear all first, then set the selected one
                        const newFilters = {
                          'Present': false,
                          'Half-day': false,
                          'Full-day': false,
                          'Absent': false,
                          'Invalid': false
                        };
                        newFilters[status] = true;
                        setStatusFilters(newFilters);
                      }
                    }}
                    value={Object.keys(statusFilters).find(k => statusFilters[k]) || ''}
                    className="border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
                    style={{ color: 'black' }}
                  >
                    <option value="">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Half-day">Half-day</option>
                    <option value="Full-day">Full-day</option>
                    <option value="Absent">Absent</option>
                    <option value="Invalid">Invalid</option>
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
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('employeeId')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Employee ID
                              {sortConfig.field === 'employeeId' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'employeeId' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('name')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Employee Name
                              {sortConfig.field === 'name' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'name' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('status')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Status
                              {sortConfig.field === 'status' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'status' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('timeIn')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Time In
                              {sortConfig.field === 'timeIn' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'timeIn' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('timeOut')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Time Out
                              {sortConfig.field === 'timeOut' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'timeOut' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
                          <th 
                            className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border cursor-pointer hover:bg-gray-200 user-select-none"
                            onClick={() => handleSort('date')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            <div className="d-flex align-items-center gap-1">
                              Date
                              {sortConfig.field === 'date' && (
                                <i className={`fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'}`} style={{ fontSize: '0.75rem' }}></i>
                              )}
                              {sortConfig.field !== 'date' && (
                                <i className="fas fa-sort" style={{ fontSize: '0.75rem', opacity: 0.3 }}></i>
                              )}
                            </div>
                          </th>
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

                  {/* Important Notice Section - Collapsible */}
                  <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
                    <div 
                      className="cursor-pointer d-flex align-items-center justify-content-between"
                      onClick={() => setShowImportantNotice(!showImportantNotice)}
                    >
                      <h3 className="text-lg font-bold text-blue-800 mb-0 d-flex align-items-center gap-2">
                        <i className="fas fa-info-circle"></i>
                        Important Notice: Attendance & Payroll Rules
                      </h3>
                      <i className={`fas fa-chevron-${showImportantNotice ? 'up' : 'down'} text-blue-600`}></i>
                    </div>
                    
                    {showImportantNotice && (
                      <div className="space-y-4 mt-3">
                        {/* ✅ FIX ISSUE #2: Updated Work Hours & Lunch Break Notice */}
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

                        {/* Salary Computation */}
                        <div className="bg-white p-3 rounded-md border border-blue-200">
                          <h4 className="font-semibold text-blue-700 mb-2 d-flex align-items-center gap-1">
                            <i className="fas fa-calculator text-sm"></i>
                            Salary Computations
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                            <li><strong>Hourly Rate:</strong> Daily Rate ÷ 8 hours (₱{salaryRate.hourlyRate.toFixed(2)}/hr)</li>
                            <li><strong>Overtime Rate:</strong> Hourly Rate × 1.25 = ₱{salaryRate.overtimeRate.toFixed(2)}/hr</li>
                            <li><strong>Half-Day Pay:</strong> Variable (4 to &lt;6.5 hours worked)</li>
                            <li><strong>Full-Day Pay:</strong> Daily Rate (6.5-8 hours worked)</li>
                            <li><strong>Overtime Pay:</strong> Full Day + OT Rate × OT hours (&gt;6.5 hrs + after 5PM)</li>
                            <li><strong>Invalid Attendance:</strong> No pay (less than 4 hours worked)</li>
                          </ul>
                        </div>

                        {/* ✅ FIX ISSUE #2: Updated Half-Day Pay Clarification with Dynamic Rates */}
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300">
                          <h4 className="font-semibold text-yellow-800 mb-2 d-flex align-items-center gap-1">
                            <i className="fas fa-coins text-sm"></i>
                            💰 Half-Day Variable Pay Explained
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Half-Day status applies to 4 to &lt;6.5 hours worked, pay varies by actual hours:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 ml-2">
                            <li><strong>4 hours:</strong> Half-Day Base = ₱{(salaryRate.dailyRate / 2).toFixed(2)} (Daily ₱{salaryRate.dailyRate.toFixed(2)} ÷ 2)</li>
                            <li><strong>5 hours:</strong> Half-Day + 1hr = ₱{(salaryRate.dailyRate / 2).toFixed(2)} + ₱{salaryRate.hourlyRate.toFixed(2)} = <strong>₱{((salaryRate.dailyRate / 2) + salaryRate.hourlyRate).toFixed(2)}</strong></li>
                            <li><strong>6 hours:</strong> Half-Day + 2hrs = ₱{(salaryRate.dailyRate / 2).toFixed(2)} + ₱{(salaryRate.hourlyRate * 2).toFixed(2)} = <strong>₱{((salaryRate.dailyRate / 2) + (salaryRate.hourlyRate * 2)).toFixed(2)}</strong></li>
                            <li><strong>6.25 hours:</strong> Half-Day + 2.25hrs = ₱{(salaryRate.dailyRate / 2).toFixed(2)} + ₱{(salaryRate.hourlyRate * 2.25).toFixed(2)} = <strong>₱{((salaryRate.dailyRate / 2) + (salaryRate.hourlyRate * 2.25)).toFixed(2)}</strong></li>
                          </ul>
                          <p className="text-xs text-gray-600 italic mt-2">
                            <i className="fas fa-lightbulb text-yellow-600 mr-1"></i>
                            <strong>Note:</strong> Same "Half-Day" status, but different pay based on actual hours worked. Once ≥6.5 hrs, it becomes "Full Day" status.
                          </p>
                        </div>

                        {/* Status Meanings */}
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

                        {/* ✅ FIX ISSUE #2: Overtime Eligibility Rules */}
                        <div className="bg-purple-50 p-3 rounded-md border border-purple-300">
                          <h4 className="font-semibold text-purple-800 mb-2 d-flex align-items-center gap-1">
                            <i className="fas fa-clock text-sm"></i>
                            ⚡ Overtime Eligibility Requirements
                          </h4>
                          <p className="text-sm text-gray-700 mb-2">
                            <strong>Overtime pay (₱{salaryRate.overtimeRate.toFixed(2)}/hr) requires ALL conditions:</strong>
                          </p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 ml-2">
                            <li><strong>✅ Work &gt;8 hours total:</strong> Overtime hours = hours beyond 8 (excluding lunch)</li>
                            <li><strong>✅ Minimum 6.5 hours worked:</strong> Must work at least <span className="text-purple-600 font-bold">6hrs 30min</span> to be eligible for OT</li>
                            <li><strong>✅ Time-out after 5:00 PM:</strong> Must work past 5:00 PM for overtime eligibility</li>
                            <li><strong>✅ Manual time-out required:</strong> Must manually clock out (not auto time-out at 8 PM)</li>
                            <li><strong>❌ Auto time-out = NO OT:</strong> Employees who get auto-closed at 8:00 PM receive NO overtime pay</li>
                            <li><strong>❌ Less than 6.5 hours:</strong> Even if work past 5PM, no OT eligibility if &lt;6.5hrs total</li>
                          </ul>
                          <p className="text-xs text-gray-600 italic mt-2">
                            <i className="fas fa-info-circle text-purple-600 mr-1"></i>
                            <strong>Examples:</strong> 
                            <br/>• 8AM-5PM exactly (8 hrs) = Full Day only, no OT (didn't work past 5PM)
                            <br/>• 8AM-6PM (9 hrs) = Full Day + 1hr OT pay ✅
                            <br/>• 2PM-8PM auto time-out (6 hrs) = Half Day, NO OT (6.5hrs minimum not met + auto time-out) ❌
                            <br/>• 2PM-8PM manual time-out (6 hrs) = Half Day, NO OT (6.5hrs minimum not met) ❌
                            <br/>• 10AM-7PM (8 hrs) = Full Day + 1hr OT pay (worked past 5PM + manual time-out) ✅
                          </p>
                        </div>

                        {/* Critical Rules */}
                        <div className="bg-white p-3 rounded-md border border-red-200">
                          <h4 className="font-semibold text-red-700 mb-2 d-flex align-items-center gap-1">
                            <i className="fas fa-exclamation-triangle text-sm"></i>
                            Critical Attendance Rules
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-2">
                            <li><strong>⏰ Time-In Cutoff:</strong> ❌ Cannot time-in after <span className="text-red-600 font-bold">4:00 PM</span> (will be rejected)</li>
                            <li><strong>🕗 Auto Time-Out:</strong> All present employees automatically time-out at <span className="text-blue-600 font-bold">8:00 PM</span> (no overtime pay for auto time-out)</li>
                            <li><strong>One Time-In Per Day:</strong> Employees can only clock in once per day</li>
                            <li><strong>Duplicate Time-In:</strong> Second time-in attempt will be marked as "Invalid"</li>
                            <li><strong>Minimum Work Hours:</strong> At least 4 hours required for pay eligibility</li>
                            <li><strong>Time-Out Required:</strong> Must manually clock out before 8:00 PM to be eligible for overtime</li>
                            <li><strong>Payroll Calculation:</strong> Based on actual time-in and time-out records only</li>
                            <li><strong>Lunch Break Exclusion:</strong> 12:00-12:59 PM is automatically excluded from paid hours</li>
                          </ul>
                        </div>

                        {/* Important Notes */}
                        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-300">
                          <p className="text-xs text-gray-600 italic">
                            <i className="fas fa-lightbulb text-yellow-600 mr-1"></i>
                            <strong>Note:</strong> All time calculations are system-generated based on biometric attendance records. 
                            Manual adjustments require admin approval. Salary deductions (Cash Advance, SSS, PhilHealth, Pag-IBIG) 
                            are applied after gross salary calculation.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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
