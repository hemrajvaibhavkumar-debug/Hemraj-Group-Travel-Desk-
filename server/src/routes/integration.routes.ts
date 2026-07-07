import { Router } from "express";
import * as IntegrationController from "../controllers/integration.controller";
import * as JobCardController from "../controllers/jobcard.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/upload", requireAuth("VIEW_INDENTS"), IntegrationController.uploadFile);
router.post("/flights/search", requireAuth("VIEW_INDENTS"), IntegrationController.searchFlights);
router.post("/flights/ai-recommend", requireAuth("VIEW_INDENTS"), IntegrationController.recommendFlights);
router.get("/forex/rates", requireAuth("VIEW_INDENTS"), IntegrationController.getForexRates);
router.get("/schema", requireAuth("VIEW_INDENTS"), IntegrationController.getDbSchema);
router.get("/health", IntegrationController.checkHealth);
router.post("/workorder/send", requireAuth("VIEW_INDENTS"), JobCardController.sendWorkOrder);

export default router;
