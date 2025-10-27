import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from 'react-hot-toast'; // ✅ BUG #25 FIX: React Hot Toast
import EmployeeList from './components/EmployeeList';
import './style.css';

import Login from "./components/Login";
import Dashboard_2 from "./components/Dashboard_2";
import Employee from "./components/Employee";
import Attendance from "./components/Attendance";
import Deductions from "./components/Deductions";
import Payroll from "./components/PayRoll";
import Logout from "./components/Logout";
import EmployeeDashboard from "./components/EmployeeDashboard";
import Salary from "./components/Salary";
import Payslip from './components/Payslip';
import AdminSettings from './components/AdminSettings';

// Create router with future flags - Added v7_startTransition to remove warning
const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/dashboard",
    element: <Dashboard_2 />
  },
  {
    path: "/employee",
    element: <EmployeeList />
  },
  {
    path: "/attendance",
    element: <Attendance />
  },
  {
    path: "/deductions",
    element: <Deductions />
  },
  {
    path: "/payroll",
    element: <Payroll />
  },
  {
    path: "/employee-dashboard",
    element: <EmployeeDashboard />
  },
  {
    path: "/logout",
    element: <Logout />
  },
  {
    path: "/payroll/payslip/:employeeId",
    element: <Payslip />
  },
  {
    path: "/salary",
    element: <Salary />
  },
  {
    path: "/admin-settings",
    element: <AdminSettings />
  }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

function App() {
  return (
    <>
      {/* ✅ BUG #25 FIX: React Hot Toast configuration */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
          // Success toast styling
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              background: '#10b981',
            },
          },
          // Error toast styling
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              background: '#ef4444',
            },
          },
          // Loading toast styling
          loading: {
            style: {
              background: '#3b82f6',
            },
          },
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}

export default App;