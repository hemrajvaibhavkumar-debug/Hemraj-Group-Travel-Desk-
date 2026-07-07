import { Router } from "express";
import * as JobCardController from "../controllers/jobcard.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth("VIEW_INDENTS"), JobCardController.getAllJobCards);
router.post("/", requireAuth("CREATE_INDENT"), JobCardController.createJobCard);
router.put("/:id", requireAuth("VIEW_INDENTS"), JobCardController.updateJobCard);
router.post("/:id/reschedule", requireAuth("VIEW_INDENTS"), JobCardController.rescheduleJobCard);
router.delete("/:id", requireAuth("MANAGE_SETTINGS"), JobCardController.deleteJobCard);

export default router;
