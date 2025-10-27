import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import { FaTachometerAlt, FaClock, FaUsers, FaMoneyBillWave, FaMinusCircle, FaMoneyBill, FaSignOutAlt, FaFileInvoice, FaCog } from 'react-icons/fa';

const AdminSidebar = ({ isMobileOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLinkClick = () => {
    if (isMobileOpen && onClose) {
      onClose();
    }
  };

  const getLinkStyle = (path) => ({
    color: 'white',
    fontSize: '0.95rem',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    backgroundColor: isActive(path) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
    fontWeight: isActive(path) ? '600' : '500',
    transition: 'all 0.2s ease'
  });

  return (
    <div 
      className={`admin-sidebar ${isMobileOpen ? 'sidebar-open' : ''}`}
    >
      {/* Logo - Desktop Only */}
      <div className="admin-sidebar-logo text-center mb-4">
        <img 
          src={logo} 
          alt="Logo" 
          style={{ 
            width: '140px',
            margin: "auto",
            marginBottom: '10px',
            cursor: 'default',
            pointerEvents: 'none',
            userSelect: 'none'
          }} 
        />
      </div>

      <h4 className="fw-bold mb-4 text-center admin-sidebar-title" style={{ color: 'white', fontSize: '1.4rem' }}>Admin Panel</h4>
      
      <ul className="nav flex-column admin-nav-list" style={{ listStyle: 'none', padding: 0 }}>
        <li className="nav-item mb-2" style={{ marginTop: '50px' }}>
          <Link 
            to="/dashboard" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/dashboard')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/dashboard')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/dashboard')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaTachometerAlt className="me-3" style={{ fontSize: '1.1rem' }} />
            Dashboard
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/attendance" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/attendance')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/attendance')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/attendance')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaClock className="me-3" style={{ fontSize: '1.1rem' }} />
            Attendance
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/employee" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/employee')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/employee')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/employee')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaUsers className="me-3" style={{ fontSize: '1.1rem' }} />
            Employee
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/salary" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/salary')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/salary')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/salary')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaMoneyBill className="me-3" style={{ fontSize: '1.1rem' }} />
            Salary
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/deductions" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/deductions')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/deductions')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/deductions')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaMinusCircle className="me-3" style={{ fontSize: '1.1rem' }} />
            Cash Advance
          </Link>
        </li>
        <li className="nav-item mb-2">
          <Link 
            to="/payroll" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/payroll')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/payroll')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/payroll')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaMoneyBillWave className="me-3" style={{ fontSize: '1.1rem' }} />
            Payroll Records
          </Link>
        </li>
        
        {/* Divider */}
        <li style={{ 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)', 
          margin: '15px 0' 
        }} />

        <li className="nav-item mb-2">
          <Link 
            to="/admin-settings" 
            className="nav-link admin-nav-link"
            style={getLinkStyle('/admin-settings')}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              if (!isActive('/admin-settings')) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive('/admin-settings')) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <FaCog className="me-3" style={{ fontSize: '1.1rem' }} />
            Admin Settings
          </Link>
        </li>

        <li className="nav-item mt-2">
          <Link 
            to="/logout" 
            className="nav-link admin-nav-link"
            style={{
              ...getLinkStyle('/logout'),
              backgroundColor: 'transparent'
            }}
            onClick={handleLinkClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FaSignOutAlt className="me-3" style={{ fontSize: '1.1rem' }} />
            Logout
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default AdminSidebar;
