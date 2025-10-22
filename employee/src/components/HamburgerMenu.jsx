import React from 'react';
import './HamburgerMenu.css';

/**
 * Hamburger Menu Component
 * ========================
 * Animated hamburger menu icon that toggles sidebar visibility on mobile devices.
 * 
 * Features:
 * - Smooth animation between hamburger and X icon
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - Mobile-first design
 * - Pink theme matching employee dashboard
 * 
 * Usage:
 * <HamburgerMenu isOpen={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)} />
 */

const HamburgerMenu = ({ isOpen, onClick }) => {
  return (
    <button
      className={`hamburger-menu ${isOpen ? 'open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      type="button"
    >
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
      <span className="hamburger-line"></span>
    </button>
  );
};

export default HamburgerMenu;
