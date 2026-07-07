import { Router } from "express";
import * as VendorController from "../controllers/vendor.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth("VIEW_INDENTS"), VendorController.getAllVendors);
router.post("/", requireAuth("MANAGE_VENDORS"), VendorController.createVendor);
router.put("/:id", requireAuth("MANAGE_VENDORS"), VendorController.updateVendor);
router.delete("/:id", requireAuth("MANAGE_VENDORS"), VendorController.deleteVendor);

export default router;
