import { Router } from "express";
import authRouter from "./auth.routes";
import employeeRouter from "./employee.routes";
import indentRouter from "./indent.routes";
import jobCardRouter from "./jobcard.routes";
import integrationRouter from "./integration.routes";
import scanRouter from "./scan.routes";
import vendorRouter from "./vendor.routes";
import publicRequestRouter from "./public-request.routes";
import notificationRouter from "./notification.routes";
import { rateLimit } from "express-rate-limit";

// Rate limiters
const publicRequestsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: "Too many public travel desk requests from this IP. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many scan jobs generated. Please wait before submitting more files." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiRouter = Router();

// Mount sub-routers
apiRouter.use(authRouter); // handles /api/auth/*, /api/rbac/*
apiRouter.use("/employees", employeeRouter); // handles /api/employees/*
apiRouter.use("/indents", indentRouter); // handles /api/indents/*
apiRouter.use("/job-cards", jobCardRouter); // handles /api/job-cards/*
apiRouter.use("/job-cards", scanLimiter, scanRouter); // handles /api/job-cards/scan/*
apiRouter.use("/vendors", vendorRouter); // handles /api/vendors/*
apiRouter.use("/public-requests", publicRequestsLimiter, publicRequestRouter); // handles /api/public-requests/*
apiRouter.use("/notifications", notificationRouter); // handles /api/notifications/*
apiRouter.use(integrationRouter); // handles /api/upload, /api/flights/*, /api/forex/rates, /api/schema, /api/health, /api/workorder/send

export default apiRouter;
