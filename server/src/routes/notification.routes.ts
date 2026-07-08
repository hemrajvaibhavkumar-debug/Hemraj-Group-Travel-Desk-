import { Router } from "express";
import * as NotificationController from "../controllers/notification.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth(), NotificationController.getNotifications);
router.put("/:id/read", requireAuth(), NotificationController.markAsRead);
router.post("/clear-all", requireAuth(), NotificationController.clearAllNotifications);

export default router;
