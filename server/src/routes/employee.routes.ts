import { Router } from "express";
import * as EmployeeController from "../controllers/employee.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", requireAuth("VIEW_INDENTS"), EmployeeController.getAllEmployees);
router.post("/", requireAuth("MANAGE_EMPLOYEES"), EmployeeController.createEmployee);
router.put("/:id", requireAuth("MANAGE_EMPLOYEES"), EmployeeController.updateEmployee);
router.delete("/:id", requireAuth("MANAGE_EMPLOYEES"), EmployeeController.deleteEmployee);

export default router;
