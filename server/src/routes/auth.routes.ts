import { Router } from "express";
import * as AuthController from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.post("/auth/login", AuthController.login);
router.post("/auth/logout", AuthController.logout);
router.get("/auth/me", requireAuth(), AuthController.me);

router.get("/rbac/permissions", requireAuth("MANAGE_SETTINGS"), AuthController.getPermissions);
router.put("/rbac/permissions", requireAuth("MANAGE_SETTINGS"), AuthController.updatePermissions);

router.get("/rbac", requireAuth("MANAGE_SETTINGS"), AuthController.getRbacConfig);
router.post("/rbac/users", requireAuth("MANAGE_SETTINGS"), AuthController.createRbacUser);
router.put("/rbac/users/:id", requireAuth("MANAGE_SETTINGS"), AuthController.updateRbacUser);
router.delete("/rbac/users/:id", requireAuth("MANAGE_SETTINGS"), AuthController.deleteRbacUser);
router.put("/rbac/settings", requireAuth("MANAGE_SETTINGS"), AuthController.updateRbacSettings);

export default router;
