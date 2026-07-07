import { Router } from "express";
import * as PublicRequestController from "../controllers/public-request.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// Unauthenticated public form submission
router.post("/", PublicRequestController.createPublicRequest);

// Authenticated Travel Desk routes
router.get("/", requireAuth("VIEW_INDENTS"), PublicRequestController.getAllPublicRequests);
router.put("/:id", requireAuth("CREATE_INDENT"), PublicRequestController.updatePublicRequest);

export default router;
