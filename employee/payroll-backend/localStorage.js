import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMPLOYEES_FILE = path.join(__dirname, 'local-employees.json');
const ATTENDANCE_FILE = path.join(__dirname, 'local-attendance.json');

// Ensure files exist
if (!fs.existsSync(EMPLOYEES_FILE)) {
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ATTENDANCE_FILE)) {
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([], null, 2));
}

// Local storage functions
export const localEmployeeStorage = {
  // Get all employees
  getAll: () => {
    try {
      const data = fs.readFileSync(EMPLOYEES_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading local employees:', error);
      return [];
    }
  },

  // Find employee by fingerprint template
  findByFingerprint: (template) => {
    const employees = localEmployeeStorage.getAll();
    return employees.find(emp => emp.fingerprintTemplate === template);
  },

  // Find employee by employeeId
  findByEmployeeId: (employeeId) => {
    const employees = localEmployeeStorage.getAll();
    return employees.find(emp => emp.employeeId === employeeId);
  },

  // Save employee
  save: (employee) => {
    try {
      const employees = localEmployeeStorage.getAll();
      const existingIndex = employees.findIndex(emp => emp.employeeId === employee.employeeId);

      if (existingIndex >= 0) {
        employees[existingIndex] = { ...employees[existingIndex], ...employee };
      } else {
        employee._id = Date.now().toString(); // Simple ID generation
        employees.push(employee);
      }

      fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2));
      return employee;
    } catch (error) {
      console.error('Error saving employee locally:', error);
      throw error;
    }
  },

  // Count employees
  count: () => {
    return localEmployeeStorage.getAll().length;
  }
};

export const localAttendanceStorage = {
  // Get all attendance records
  getAll: () => {
    try {
      const data = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading local attendance:', error);
      return [];
    }
  },

  // Save attendance record
  save: (attendance) => {
    try {
      const records = localAttendanceStorage.getAll();
      attendance._id = Date.now().toString(); // Simple ID generation
      records.push(attendance);
      fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(records, null, 2));
      return attendance;
    } catch (error) {
      console.error('Error saving attendance locally:', error);
      throw error;
    }
  },

  // Get attendance for specific employee
  getByEmployeeId: (employeeId) => {
    const records = localAttendanceStorage.getAll();
    return records.filter(record => record.employeeId === employeeId);
  },

  // Get today's attendance
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    const records = localAttendanceStorage.getAll();
    return records.filter(record => {
      const recordDate = new Date(record.time).toISOString().split('T')[0];
      return recordDate === today;
    });
  }
};
