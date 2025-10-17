//#region [Modules]
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

// import rateLimit from 'express-rate-limit';
import deductionRouter from "./routes/deduction.route.js";
import payrollRouter from "./routes/payroll.route.js";
import employeeRouter from "./routes/employee.route.js";
import { errorHandler } from "./middleware/errorHandler.js";
import connectDB from "./utils/database.conn.js";
import appRoutes from "./routes/app.route.js";
import fingerprintRoutes from "./routes/fingerprint.routes.js";

//#endregion

//load environment
dotenv.config();

//#region [Global constant]
const app = express();
const PORT = process.env.PORT || 5000;
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
//#endregion

//#region [Global middlewares]
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true 
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(helmet());
//#endregion

//mongo connection
connectDB();

//#region [Root Route - Add this FIRST]
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Server is running successfully!",
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/api/employees",
      "/api/deductions", 
      "/api/payrolls",
      "/api/app",
      "/api/fingerprint",
      "/test",
      "/api/test"
    ]
  });
});
//#endregion

//#region [Routes]
app.use("/api/employees", employeeRouter);
app.use("/api/deductions", deductionRouter);
app.use("/api/payrolls", payrollRouter);
app.use("/api/app", appRoutes);
app.use("/api/fingerprint", fingerprintRoutes);

//#endregion

// Test ALL routes
app.get("/test", (req, res) => res.send("Test route working!"));
app.get("/api/test", (req, res) => res.send("API Test route working!"));

//#region [404 Handler - Add this BEFORE errorHandler]
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    requestedUrl: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "GET /",
      "GET /test", 
      "GET /api/test",
      "GET /api/fingerprint/test",
      "POST /api/fingerprint/enroll/:id",
      "POST /api/fingerprint/callback"
    ]
  });
});
//#endregion

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`CORS Origin: ${CORS_ORIGIN}`);
  console.log(`🌐 Try these URLs to test:`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://localhost:${PORT}/test`);
  console.log(`   http://localhost:${PORT}/api/fingerprint/test`);
});