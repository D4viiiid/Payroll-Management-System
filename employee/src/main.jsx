import { StrictMode } from "react"; // Nag-eenable ng extra checks para sa React development
import { createRoot } from "react-dom/client"; // Modern way ng pag-render sa React 18+
import App from "./App.jsx"; // Main component mo
import "bootstrap/dist/css/bootstrap.min.css"; // Bootstrap styles
import "./index.css"; // Tailwind (and any global styles)
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <ToastContainer position="top-right" autoClose={3000} />
  </StrictMode>
);
