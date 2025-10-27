import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showSuccess, showError, showConfirm } from '../utils/toast';
import './ScheduleManagement.css';

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state for creating schedule
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    regularEmployees: [],
    onCallEmployees: []
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Fetch employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch schedules when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchScheduleForDate(selectedDate);
    }
  }, [selectedDate]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API_URL}/employees`);
      // Handle both paginated response {data: []} and plain array []
      const employeeList = Array.isArray(response.data) ? response.data : (response.data.data || response.data.employees || []);
      setEmployees(employeeList);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    }
  };

  const fetchScheduleForDate = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/schedules/date/${date}`);
      setSchedules(response.data ? [response.data] : []);
    } catch (err) {
      if (err.response?.status === 404) {
        setSchedules([]); // No schedule for this date
      } else {
        setError('Failed to load schedule');
        console.error('Error fetching schedule:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      const response = await axios.post(`${API_URL}/schedules`, formData);
      setSuccessMessage('Schedule created successfully!');
      setSchedules([response.data.schedule]);
      setShowCreateForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        regularEmployees: [],
        onCallEmployees: []
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create schedule');
      console.error('Error creating schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this schedule?', {
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: '#ef4444'
    });
    
    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.delete(`${API_URL}/schedules/${scheduleId}`);
      showSuccess('Schedule deleted successfully!');
      setSchedules([]);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete schedule');
      console.error('Error deleting schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId, type) => {
    setFormData(prev => {
      const field = type === 'regular' ? 'regularEmployees' : 'onCallEmployees';
      const currentList = prev[field];
      
      if (currentList.includes(employeeId)) {
        return {
          ...prev,
          [field]: currentList.filter(id => id !== employeeId)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentList, employeeId]
        };
      }
    });
  };

  const isEmployeeAssigned = (employeeId) => {
    return formData.regularEmployees.includes(employeeId) || 
           formData.onCallEmployees.includes(employeeId);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp._id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <h2>📅 Daily Schedule Management</h2>
        <p className="schedule-subtitle">Manage employee schedules (2 Regular + 3 On-Call per day)</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="alert alert-success">
          ✅ {successMessage}
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Date Selector */}
      <div className="schedule-controls">
        <div className="date-selector">
          <label htmlFor="date-select">Select Date:</label>
          <input
            id="date-select"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '❌ Cancel' : '➕ Create Schedule'}
        </button>
      </div>

      {/* Create Schedule Form */}
      {showCreateForm && (
        <div className="schedule-form-container">
          <form onSubmit={handleCreateSchedule} className="schedule-form">
            <h3>Create New Schedule</h3>
            
            <div className="form-group">
              <label htmlFor="schedule-date">Date:</label>
              <input
                id="schedule-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="form-input"
              />
            </div>

            <div className="employee-selection">
              <div className="employee-section">
                <h4>Regular Employees (Max 2)</h4>
                <p className="section-note">Selected: {formData.regularEmployees.length}/2</p>
                <div className="employee-list">
                  {employees.filter(emp => emp.employmentType === 'Regular').map(employee => (
                    <label key={employee._id} className="employee-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.regularEmployees.includes(employee._id)}
                        onChange={() => handleEmployeeToggle(employee._id, 'regular')}
                        disabled={
                          formData.regularEmployees.length >= 2 && 
                          !formData.regularEmployees.includes(employee._id)
                        }
                      />
                      <span className={isEmployeeAssigned(employee._id) ? 'assigned' : ''}>
                        {employee.firstName} {employee.lastName}
                        {employee.employeeId && <small> (ID: {employee.employeeId})</small>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="employee-section">
                <h4>On-Call Employees (Max 3)</h4>
                <p className="section-note">Selected: {formData.onCallEmployees.length}/3</p>
                <div className="employee-list">
                  {employees.filter(emp => emp.employmentType === 'On-Call').map(employee => (
                    <label key={employee._id} className="employee-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.onCallEmployees.includes(employee._id)}
                        onChange={() => handleEmployeeToggle(employee._id, 'onCall')}
                        disabled={
                          formData.onCallEmployees.length >= 3 && 
                          !formData.onCallEmployees.includes(employee._id)
                        }
                      />
                      <span className={isEmployeeAssigned(employee._id) ? 'assigned' : ''}>
                        {employee.firstName} {employee.lastName}
                        {employee.employeeId && <small> (ID: {employee.employeeId})</small>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-success"
                disabled={
                  loading ||
                  formData.regularEmployees.length === 0 ||
                  formData.onCallEmployees.length === 0
                }
              >
                {loading ? '⏳ Creating...' : '✅ Create Schedule'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Display Schedule */}
      <div className="schedule-display">
        <h3>Schedule for {new Date(selectedDate).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</h3>

        {loading ? (
          <div className="loading">⏳ Loading schedule...</div>
        ) : schedules.length > 0 ? (
          schedules.map(schedule => (
            <div key={schedule._id} className="schedule-card">
              <div className="schedule-card-header">
                <h4>Daily Schedule</h4>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteSchedule(schedule._id)}
                >
                  🗑️ Delete
                </button>
              </div>

              <div className="schedule-sections">
                <div className="schedule-section">
                  <h5>👷 Regular Employees ({schedule.regularEmployees.length})</h5>
                  <ul className="employee-list-display">
                    {schedule.regularEmployees.map(empId => (
                      <li key={empId}>
                        <span className="employee-badge regular">
                          {getEmployeeName(empId)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="schedule-section">
                  <h5>📞 On-Call Employees ({schedule.onCallEmployees.length})</h5>
                  <ul className="employee-list-display">
                    {schedule.onCallEmployees.map(empId => (
                      <li key={empId}>
                        <span className="employee-badge oncall">
                          {getEmployeeName(empId)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="schedule-summary">
                <p>
                  <strong>Total Scheduled:</strong> {schedule.totalEmployees} employees
                </p>
                <p>
                  <strong>Created:</strong> {new Date(schedule.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-schedule">
            <p>📭 No schedule found for this date</p>
            <p className="note">Click "Create Schedule" to add one</p>
          </div>
        )}
      </div>

      {/* Calendar View (Week) */}
      <div className="week-view">
        <h3>📆 This Week's Overview</h3>
        <div className="week-grid">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - date.getDay() + i);
            const dateStr = date.toISOString().split('T')[0];
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            
            return (
              <div
                key={dateStr}
                className={`week-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="day-name">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="day-number">{date.getDate()}</div>
                <div className="day-status">
                  {/* Could show scheduled count here */}
                  📅
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ScheduleManagement;
