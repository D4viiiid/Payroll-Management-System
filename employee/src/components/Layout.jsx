import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const isActive = (path) => location.pathname.startsWith(path);

  const handleLogoutConfirm = () => {
    try { localStorage.removeItem("token"); } catch (_) {}
    setShowLogout(false);
    navigate("/");
  };
  const handleLogoutCancel = () => setShowLogout(false);

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fb' }}>
      {/* Sidebar */}
      <div className="shadow-sm p-4" style={{ width: 280, backgroundColor: '#f06a98', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100 }}>
        <h4 className="fw-bold mb-4" style={{ color: 'white', fontSize: '1.6rem' }}>Admin Panel</h4>
        <ul className="nav flex-column">
          <li className="nav-item mb-3">
            <Link className={`nav-link sidebar-link ${isActive('/dashboard') ? 'active fw-bold' : ''}`} to="/dashboard" style={{ color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-tachometer-alt me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Dashboard
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link className={`nav-link sidebar-link ${isActive('/attendance') ? 'active fw-bold' : ''}`} to="/attendance" style={{ color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-clock me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Attendance
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link className={`nav-link sidebar-link ${isActive('/employee') ? 'active fw-bold' : ''}`} to="/employee" style={{ color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-users me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Employee
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link className={`nav-link sidebar-link ${isActive('/deductions') ? 'active fw-bold' : ''}`} to="/deductions" style={{ color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-minus-circle me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Cash Advance
            </Link>
          </li>
          <li className="nav-item mb-3">
            <Link className={`nav-link sidebar-link ${isActive('/payroll') ? 'active fw-bold' : ''}`} to="/payroll" style={{ color: 'white', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              <i className="fas fa-money-bill-wave me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Payroll
            </Link>
          </li>
          <li className="nav-item mt-4">
            <button 
              className="nav-link no-hover" 
              onClick={() => setShowLogout(true)} 
              style={{ 
                color: 'white', 
                fontSize: '1.1rem', 
                whiteSpace: 'nowrap', 
                background: 'transparent !important', 
                border: 'none', 
                textAlign: 'left', 
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                transition: 'none',
                backgroundColor: 'transparent',
                backgroundImage: 'none',
                boxShadow: 'none'
              }}
            >
              <i className="fas fa-sign-out-alt me-3" style={{ color: 'white', fontSize: '1.2rem' }}></i>Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto" style={{ marginLeft: 280 }}>
        <div className="p-4">
          {children}
        </div>
      </div>

      {showLogout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="fas fa-sign-out-alt" style={{ color: '#f06a98', fontSize: 20 }}></span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#2c3e50' }}>Sign out?</h2>
            </div>
            <p style={{ margin: 0, color: '#5f6b7a' }}>
              You’re about to end your session. You can sign back in anytime to access your dashboard.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button onClick={handleLogoutCancel} className="btn btn-secondary" style={{ padding: '10px 16px' }}>Stay signed in</button>
              <button onClick={handleLogoutConfirm} className="btn" style={{ padding: '10px 16px', backgroundColor: '#f06a98', color: '#fff', border: 'none', borderRadius: 6 }}>Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
