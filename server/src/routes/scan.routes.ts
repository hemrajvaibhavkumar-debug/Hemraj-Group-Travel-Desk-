import { Router } from "express";
import * as ScanController from "../controllers/scan.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/scan", requireAuth("VIEW_INDENTS"), ScanController.createScanJob);
router.get("/scan/status/:id", requireAuth("VIEW_INDENTS"), ScanController.getScanJobStatus);

export default router;
