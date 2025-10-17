// routes/fingerprint.routes.js
import express from "express";
import { enrollFingerPrint, verifyFingerPrint } from "../controllers/app.ctrl.js";

const router = express.Router();

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Fingerprint API is working" });
});

// Enroll fingerprint endpoint
router.post("/enroll", enrollFingerPrint);

// Verify fingerprint endpoint
router.post("/verify", verifyFingerPrint);

// Callback endpoint for fingerprint operations
router.post("/callback", (req, res) => {
  console.log("Fingerprint callback received:", req.body);
  res.json({ message: "Callback received" });
});

export default router;