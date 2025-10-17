import { Router } from "express";
import { enrollFingerPrint, verifyFingerPrint } from "../controllers/app.ctrl.js";
const router = Router();

router.post("/enrollFinger", enrollFingerPrint);
router.post("/verifyFinger", verifyFingerPrint);

export default router;
