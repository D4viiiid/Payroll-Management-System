import { StrictMode } from "react"; // Nag-eenable ng extra checks para sa React development
import { createRoot } from "react-dom/client"; // Modern way ng pag-render sa React 18+
import App from "./App.jsx"; // Main component mo
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap styles
import "./index.css"; // Tailwind (and any global styles)
import "./components/ButtonFix.css"; // ✅ FIX: Prevent button stretching
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// 🚀 PERFORMANCE: Initialize performance logger (disables console.log in production)
import './utils/performanceLogger.js';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <ToastContainer position="top-right" autoClose={3000} />
  </StrictMode>
);
