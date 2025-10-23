import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi, attendanceApi, eventBus } from "../services/apiService";
import { logger } from "../utils/logger";
import AttendanceModal from "./AttendanceModal";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import "./Admin.responsive.css";

const Dashboard_2 = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [errorEmployees, setErrorEmployees] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    totalPresent: 0,
    fullDay: 0,
    halfDay: 0,
    absent: 0,
    invalid: 0
  });
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [errorAttendance, setErrorAttendance] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchEmployees = async (bypassCache = false) => {
      try {
        setLoadingEmployees(true);
        setErrorEmployees(null);
        const data = await employeeApi.getAll({ bypassCache });
        if (!data.error) {
          // Handle both paginated response {data: []} and plain array []
          const employeeList = Array.isArray(data) ? data : (data.data || data.employees || []);
          setEmployees(employeeList);
        } else {
          setErrorEmployees(data.error);
        }
      } catch (err) {
        setErrorEmployees('Failed to fetch employees');
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
    
    // ✅ Listen to employee events for real-time updates
    const handleEmployeeUpdate = () => fetchEmployees(true); // Bypass cache on updates
    eventBus.on('employee-created', handleEmployeeUpdate);
    eventBus.on('employee-updated', handleEmployeeUpdate);
    eventBus.on('employee-deleted', handleEmployeeUpdate);
    
    return () => {
      eventBus.removeListener('employee-created', handleEmployeeUpdate);
      eventBus.removeListener('employee-updated', handleEmployeeUpdate);
      eventBus.removeListener('employee-deleted', handleEmployeeUpdate);
    };
  }, []);

  // Fetch attendance stats
  const fetchAttendanceStats = async () => {
    try {
      setLoadingAttendance(true);
      setErrorAttendance(null);
      
      console.log('📊 Dashboard: Fetching attendance stats...');
      const data = await attendanceApi.getStats();
      console.log('📊 Dashboard: Stats received:', data);
      
      if (!data.error) {
        console.log('📊 Dashboard: Setting stats state:', {
          totalPresent: data.totalPresent,
          fullDay: data.fullDay,
          halfDay: data.halfDay,
          absent: data.absent,
          invalid: data.invalid
        });
        setAttendanceStats(data);
      } else {
        console.error('❌ Dashboard: Error in stats response:', data.error);
        setErrorAttendance(data.error);
      }
    } catch (err) {
      console.error('❌ Dashboard: Failed to fetch stats:', err);
      setErrorAttendance('Failed to fetch attendance stats');
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendanceStats();

    // Set up event listeners for real-time updates
    const unsubscribeAttendanceRecorded = eventBus.on('attendance-recorded', (data) => {
      logger.log('Dashboard: Attendance recorded event received');
      // Refresh attendance stats
      fetchAttendanceStats();
    });

    // Cleanup
    return () => {
      unsubscribeAttendanceRecorded();
    };
  }, []);

  // Function to handle card clicks and navigate to attendance page
  const handleCardClick = (filterType) => {
    const today = new Date().toISOString().split('T')[0];
    navigate('/attendance', { 
      state: { 
        presetFilter: filterType,
        presetDate: filterType !== 'all' ? today : null,
        presetDateType: filterType !== 'all' ? 'today' : null,
        timestamp: new Date().getTime() // Ensure fresh navigation
      }
    });
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

      {/* Fixed Sidebar - Using AdminSidebar Component */}
      <AdminSidebar isMobileOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content */}
      <div className="admin-main-content">
        <div className="admin-content-area">
          <div className="admin-card">
            {/* Header - Using AdminHeader Component */}
            <div style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden', marginBottom: '20px' }}>
              <AdminHeader />
            </div>
            
            <div style={{
              backgroundColor: 'transparent',
              color: 'black',
              borderRadius: 0,
              padding: '20px 0',
              marginBottom: '20px'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1" style={{ fontWeight: 'bold', color: 'black', display: 'flex', alignItems: 'center', gap: 8, fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontFamily: 'sans-serif' }}>
                    <i className="fas fa-tachometer-alt me-2"></i>
                    Dashboard
                  </h2>
                  <p className="mb-0" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.05rem)', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Overview of employee management system
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: '0' }}>
              {/* Attendance Summary Cards */}
              <div className="stats-grid">
                {/* Placeholder cards - need to rebuild properly */}
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => navigate('/employee')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-users fa-2x mb-3"></i>
                    <h3 className="fw-bold">{employees.length}</h3>
                    <p className="mb-0">Total Employees</p>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => handleCardClick('today')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-user-check fa-2x mb-3"></i>
                    <h3 className="fw-bold">{attendanceStats.totalPresent}</h3>
                    <p className="mb-0">Total Present</p>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => handleCardClick('halfDay')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-clock fa-2x mb-3"></i>
                    <h3 className="fw-bold">{attendanceStats.halfDay}</h3>
                    <p className="mb-0">Half Day</p>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => handleCardClick('fullDay')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-calendar-day fa-2x mb-3"></i>
                    <h3 className="fw-bold">{attendanceStats.fullDay}</h3>
                    <p className="mb-0">Full Day</p>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => handleCardClick('absent')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-user-times fa-2x mb-3"></i>
                    <h3 className="fw-bold">{attendanceStats.absent}</h3>
                    <p className="mb-0">Absent</p>
                  </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)', color: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer' }} onClick={() => handleCardClick('invalid')}>
                  <div className="text-white text-center p-1">
                    <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                    <h3 className="fw-bold">{attendanceStats.invalid || 0}</h3>
                    <p className="mb-0">Invalid</p>
                  </div>
                </div>
              </div>

              {/* Fingerprint Attendance Button - Centered below cards */}
              <div className="row mt-4">
                <div className="col-12 d-flex justify-content-center">
                  <button
                    onClick={() => setShowAttendanceModal(true)}
                    className="btn btn-lg shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '50px',
                      padding: '15px 40px',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      border: 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <i className="fas fa-fingerprint me-2"></i>
                    Fingerprint Attendance
                  </button>
                </div>
              </div>

              {/* Additional space for future content can be added here if needed */}
              
            </div> {/* Close div style padding:0 */}
          </div> {/* Close admin-card */}
        </div> {/* Close admin-content-area */}
      </div> {/* Close admin-main-content */}

      {/* Attendance Modal */}
      <AttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onSuccess={(data) => {
          logger.log('Attendance recorded:', data);
          // Refresh attendance stats
          fetchAttendanceStats();
        }}
      />
    </div>
  );
};

export default Dashboard_2;
