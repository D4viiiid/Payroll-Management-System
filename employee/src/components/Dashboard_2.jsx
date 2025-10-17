import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { employeeApi, attendanceApi, eventBus } from "../services/apiService";
import AttendanceModal from "./AttendanceModal";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

const Dashboard_2 = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [errorEmployees, setErrorEmployees] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState({
    totalPresent: 0,
    fullDay: 0,
    halfDay: 0,
    absent: 0
  });
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [errorAttendance, setErrorAttendance] = useState(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        setErrorEmployees(null);
        const data = await employeeApi.getAll();
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
  }, []);

  // Fetch attendance stats
  const fetchAttendanceStats = async () => {
    try {
      setLoadingAttendance(true);
      setErrorAttendance(null);
      const data = await attendanceApi.getStats();
      if (!data.error) {
        setAttendanceStats(data);
      } else {
        setErrorAttendance(data.error);
      }
    } catch (err) {
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
    navigate('/attendance', { 
      state: { 
        presetFilter: filterType,
        timestamp: new Date().getTime() // Ensure fresh navigation
      }
    });
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Fixed Sidebar - Using AdminSidebar Component */}
      <AdminSidebar />

      {/* Main Content with offset for fixed sidebar */}
      <div 
        className="flex-1" 
        style={{ 
          marginLeft: 280,
          minHeight: '100vh',
          overflow: 'auto'
        }}
      >
        <div className="p-4">
          <div className="card shadow-sm mb-4" style={{ borderRadius: '15px', border: 'none' }}>
            {/* Header - Using AdminHeader Component */}
            <div style={{ borderRadius: '15px 15px 0 0', overflow: 'hidden' }}>
              <AdminHeader />
            </div>
            
            <div className="card-header" style={{
              backgroundColor: 'transparent',
              color: 'black',
              borderRadius: 0,
              padding: '20px'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-1" style={{ fontWeight: 'bold', color: 'black', display: 'flex', alignItems: 'center', gap: 8, fontSize: '2rem', fontFamily: 'sans-serif' }}>
                    <i className="fas fa-tachometer-alt me-2"></i>
                    Dashboard
                  </h2>
                  <p className="mb-0" style={{ fontSize: '1.05rem', color: 'black', fontFamily: 'Poppins, sans-serif', fontWeight: 500, letterSpacing: '0.5px' }}>
                    Overview of employee management system
                  </p>
                </div>
              </div>
            </div>

            <div className="card-body" style={{ padding: '20px' }}>
              {/* Attendance Summary Cards */}
              <div className="row mb-4">
                {/* Total Employees */}
                <div className="col-md-3 mb-3">
                  <div 
                    className="card h-100 shadow-sm border-0 clickable-card" 
                    style={{ 
                      borderRadius: '12px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onClick={() => handleCardClick('all')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body text-white text-center p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <i className="fas fa-users fa-2x"></i>
                        <i className="fas fa-external-link-alt fa-sm"></i>
                      </div>
                      <div className="d-flex justify-content-center align-items-center mb-2">
                        {loadingEmployees ? (
                          <div className="spinner-border spinner-border-sm text-white" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        ) : errorEmployees ? (
                          <span className="text-warning small">{errorEmployees}</span>
                        ) : (
                          <h3 className="fw-bold mb-0" style={{ color: 'white' }}>{employees.length}</h3>
                        )}
                      </div>
                      <p className="mb-0" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Employees</p>
                      <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>Active workforce</small>
                      <div className="mt-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        Click to view all records
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Present */}
                <div className="col-md-3 mb-3">
                  <div
                    className="card h-100 shadow-sm border-0 clickable-card"
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onClick={() => handleCardClick('today')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body text-white text-center p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <i className="fas fa-user-check fa-2x"></i>
                        <i className="fas fa-external-link-alt fa-sm"></i>
                      </div>
                      {loadingAttendance ? (
                        <div className="spinner-border spinner-border-sm text-white" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : errorAttendance ? (
                        <span className="text-warning small">Error</span>
                      ) : (
                        <h3 className="fw-bold mb-2">{attendanceStats.totalPresent}</h3>
                      )}
                      <p className="mb-0" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Total Present</p>
                      <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>Currently at work</small>
                      <div className="mt-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        Click to view today's attendance
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Day Attendance */}
                <div className="col-md-3 mb-3">
                  <div 
                    className="card h-100 shadow-sm border-0 clickable-card" 
                    style={{ 
                      borderRadius: '12px', 
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onClick={() => handleCardClick('fullDay')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body text-white text-center p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <i className="fas fa-calendar-day fa-2x"></i>
                        <i className="fas fa-external-link-alt fa-sm"></i>
                      </div>
                      {loadingAttendance ? (
                        <div className="spinner-border spinner-border-sm text-white" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : errorAttendance ? (
                        <span className="text-warning small">Error</span>
                      ) : (
                        <h3 className="fw-bold mb-2">{attendanceStats.fullDay}</h3>
                      )}
                      <p className="mb-0" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Full Day</p>
                      <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>Completed full shift</small>
                      <div className="mt-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        Click to view full day records
                      </div>
                    </div>
                  </div>
                </div>

                {/* Absent */}
                <div className="col-md-3 mb-3">
                  <div
                    className="card h-100 shadow-sm border-0 clickable-card"
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onClick={() => handleCardClick('absent')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body text-white text-center p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <i className="fas fa-user-times fa-2x"></i>
                        <i className="fas fa-external-link-alt fa-sm"></i>
                      </div>
                      {loadingAttendance ? (
                        <div className="spinner-border spinner-border-sm text-white" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : errorAttendance ? (
                        <span className="text-warning small">Error</span>
                      ) : (
                        <h3 className="fw-bold mb-2">{attendanceStats.absent}</h3>
                      )}
                      <p className="mb-0" style={{ fontSize: '0.9rem', opacity: 0.9 }}>Absent</p>
                      <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>Not present today</small>
                      <div className="mt-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                        Click to view absent records
                      </div>
                    </div>
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
              
            </div>
          </div>
        </div>
      </div>

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
