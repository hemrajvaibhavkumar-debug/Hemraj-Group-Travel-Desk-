import { Router } from "express";
import authRouter from "./auth.routes";
import employeeRouter from "./employee.routes";
import indentRouter from "./indent.routes";
import jobCardRouter from "./jobcard.routes";
import integrationRouter from "./integration.routes";
import scanRouter from "./scan.routes";
import vendorRouter from "./vendor.routes";

const apiRouter = Router();

// Mount sub-routers
apiRouter.use(authRouter); // handles /api/auth/*, /api/rbac/*
apiRouter.use("/employees", employeeRouter); // handles /api/employees/*
apiRouter.use("/indents", indentRouter); // handles /api/indents/*
apiRouter.use("/job-cards", jobCardRouter); // handles /api/job-cards/*
apiRouter.use("/job-cards", scanRouter); // handles /api/job-cards/scan/*
apiRouter.use("/vendors", vendorRouter); // handles /api/vendors/*
apiRouter.use(integrationRouter); // handles /api/upload, /api/flights/*, /api/forex/rates, /api/schema, /api/health, /api/workorder/send

export default apiRouter;
