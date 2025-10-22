import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
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
  return <RouterProvider router={router} />;
}

export default App;