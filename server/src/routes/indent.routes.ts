import { Router } from "express";
import * as IndentController from "../controllers/indent.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth("VIEW_INDENTS"), IndentController.getAllIndents);
router.post("/", requireAuth("CREATE_INDENT"), IndentController.createIndent);
router.post("/public", IndentController.createPublicIndent);
router.put("/:id", requireAuth("CREATE_INDENT"), IndentController.updateIndent);
router.delete("/:id", requireAuth("CREATE_INDENT"), IndentController.deleteIndent);
router.post("/send-webhook", requireAuth("CREATE_INDENT"), IndentController.sendWebhook);

export default router;
