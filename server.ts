import dotenv from "dotenv";
import path from "path";
import fs from "fs";

function loadEnv() {
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      return;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dotenv.config();
}
loadEnv();

import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import { prisma } from "./src/db/prisma";
import { env } from "./server/src/config/env";
import apiRouter from "./server/src/routes";
import { hashPassword } from "./server/src/controllers/auth.controller";
import compression from "compression";
import { rateLimit } from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);
const PORT = env.PORT;

// Enable response compression (gzip/deflate)
app.use(compression());

// Define a general API rate limiter: max 150 requests per minute
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150,
  message: { error: "Too many requests from this IP. Please try again after 1 minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "15mb" }));

// Mount all API endpoints under /api with rate limiting
app.use("/api", globalRateLimiter, apiRouter);

// Baseline default data in case Postgres database is empty
const DEFAULT_DB_DATA = {
  employees: [
    {
      employee_code: "EMP-1002",
      name: "Satish Sharma",
      email: "satish.sharma@hemrajgroup.com",
      phone: "+91 98765 43210",
      designation: "General Manager (Purchasing)",
      department: "Purchase",
      default_travel_approver: "Rohit ji (COO)",
      approver_designation: "Chief Operating Officer",
      cost_centre: "HEM-PUR-MUM",
      default_billing_currency: "INR",
      native_city: "Mumbai, Maharashtra",
      nearest_airport: "Chhatrapati Shivaji Maharaj Airport",
      nearest_railway_station: "Mumbai CST",
      default_mode_of_transport: "Flight",
      extra_baggage_required: false,
    },
    {
      employee_code: "EMP-2045",
      name: "Tosin Alabi",
      email: "tosin.alabi@hemrajgroup.com",
      phone: "+234 803 123 4567",
      designation: "Head of Operations (West Africa)",
      department: "Ops",
      default_travel_approver: "Department Head",
      approver_designation: "VP Overseas Operations",
      cost_centre: "HEM-OPS-NGA",
      default_billing_currency: "NGN",
      present_location_abroad: "Lagos, Nigeria",
      assigned_plant_site: "Ricefield",
      nearest_airport_india: "Indira Gandhi International Airport, Delhi",
      passport_number: "A08539201",
      passport_issue_date: "2024-02-15",
      passport_expiry: "2029-02-14",
      polio_vaccine_status: "Vaccinated",
      polio_certificate_expiry: "2027-02-15",
      yfv_status: "Vaccinated",
      yfv_certificate_expiry: "2028-06-12",
      visa_number: "V394850",
      visa_expiry_date: "2026-12-31",
      visa_country: "India"
    }
  ],
  indents: [
    {
      id: "IND-2026-0001",
      travel_type: "DOMESTIC",
      gst_applicable: true,
      priority: "HIGH",
      travel_date: "2026-06-25",
      wp_number: "WP-MUM-9844",
      nearest_boarding_point: "CSIA Terminal 2",
      luggage: "1 Cabin, 1 Check-in (Up to 25kg total)",
      visa_type: "N/A",
      seat_preference: "WINDOW",
      meal_preference: "VEG",
      source_location: "Mumbai (BOM)",
      destination: "Delhi (DEL)",
      purpose: "Urgent vendor negotiations for Ricefield plant site machinery procurement.",
      employee_code: "EMP-1002",
      created_at: new Date().toISOString()
    }
  ],
  jobCards: [],
  rbacUsers: [
    { id: "usr-1", name: "Corporate Admin", email: "subham4343@gmail.com", role: "TRAVEL_DESK" },
    { id: "usr-2", name: "Rohit ji (COO)", email: "rohit.coo@hemrajgroup.com", role: "TRAVEL_APPROVER" },
    { id: "usr-3", name: "VP Commercial", email: "vp.commercial@hemrajgroup.com", role: "VP_COMMERCIAL" },
    { id: "usr-4", name: "Finance Team", email: "finance@hemrajgroup.com", role: "FINANCE" },
    { id: "usr-5", name: "Super Administrator", email: "superadmin@hemrajgroup.com", role: "SUPERADMIN" }
  ],
  rbacSettings: {
    senderEmail: "travel-desk@hemraj-group.com",
    ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
    activeSimulatedEmail: "superadmin@hemrajgroup.com"
  },
  vendors: [
    { id: "VND-MMT-101", name: "MakeMyTrip Corporate", emails: ["corp@makemytrip.com"], phones: ["+91 124 462 8745"], categories: ["FLIGHT", "HOTEL", "CAB"] },
    { id: "VND-YATRA-202", name: "Yatra Business", emails: ["b2b@yatra.com"], phones: ["+91 124 339 5500"], categories: ["FLIGHT", "HOTEL", "TRAIN"] },
    { id: "VND-SOTC-303", name: "SOTC Travel Services", emails: ["sotc@sotc.in"], phones: ["+91 22 4918 6000"], categories: ["FLIGHT", "INTERNATIONAL", "HOTEL"] }
  ]
};

// Database Auto-Seeding Script
async function seedDatabaseIfEmpty() {
  try {
    const employeeCount = await prisma.employee.count();
    if (employeeCount > 0) {
      console.log(`Database already contains ${employeeCount} employees. Seeding skipped.`);
      return;
    }

    console.log("Neon Postgres database is empty. Commencing database seeding...");

    const seedData: any = DEFAULT_DB_DATA;

    // 1. Seed Employees
    for (const emp of seedData.employees) {
      await prisma.employee.create({
        data: {
          employee_code: emp.employee_code,
          aadhar_pan_number: emp.aadhar_pan_number || null,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          designation: emp.designation,
          department: emp.department,
          default_travel_approver: emp.default_travel_approver,
          approver_designation: emp.approver_designation,
          cost_centre: emp.cost_centre,
          default_billing_currency: emp.default_billing_currency,
          native_city: emp.native_city || null,
          nearest_airport: emp.nearest_airport || null,
          nearest_railway_station: emp.nearest_railway_station || null,
          default_mode_of_transport: emp.default_mode_of_transport || null,
          extra_baggage_required: emp.extra_baggage_required || false,
          photograph_url: emp.photograph_url || null,
          supporting_documents_url: emp.supporting_documents_url || null,
          present_location_abroad: emp.present_location_abroad || null,
          assigned_plant_site: emp.assigned_plant_site || null,
          nearest_airport_india: emp.nearest_airport_india || null,
          passport_number: emp.passport_number || null,
          passport_issue_date: emp.passport_issue_date || null,
          passport_expiry: emp.passport_expiry || null,
          passport_front_page_url: emp.passport_front_page_url || null,
          passport_back_page_url: emp.passport_back_page_url || null,
          offer_letter_url: emp.offer_letter_url || null,
          polio_vaccine_status: emp.polio_vaccine_status || null,
          polio_certificate_expiry: emp.polio_certificate_expiry || null,
          yfv_status: emp.yfv_status || null,
          yfv_certificate_expiry: emp.yfv_certificate_expiry || null,
          visa_number: emp.visa_number || null,
          visa_expiry_date: emp.visa_expiry_date || null,
          visa_country: emp.visa_country || null,
          train_preferred_class: emp.train_preferred_class || null,
          train_berth_preference: emp.train_berth_preference || null,
          train_meal_preference: emp.train_meal_preference || null,
          train_preferred_number: emp.train_preferred_number || null,
          passport_history: emp.passport_history ? JSON.parse(JSON.stringify(emp.passport_history)) : null
        }
      });
    }

    // 2. Seed TravelIndents
    for (const ind of seedData.indents) {
      await prisma.travelIndent.create({
        data: {
          id: ind.id,
          travel_type: ind.travel_type as any,
          gst_applicable: ind.gst_applicable,
          priority: ind.priority as any,
          travel_date: ind.travel_date,
          wp_number: ind.wp_number || null,
          nearest_boarding_point: ind.nearest_boarding_point,
          luggage: ind.luggage || null,
          visa_type: ind.visa_type || null,
          visa_type_other: ind.visa_type_other || null,
          seat_preference: ind.seat_preference || null,
          seat_preference_other: ind.seat_preference_other || null,
          meal_preference: ind.meal_preference || null,
          meal_preference_other: ind.meal_preference_other || null,
          source_location: ind.source_location,
          destination: ind.destination,
          purpose: ind.purpose,
          plant: ind.plant || null,
          employee_code: ind.employee_code,
          created_at: new Date(ind.created_at || Date.now()),
          voided: ind.voided || false,
          void_reason: ind.void_reason || null,
          travel_approver: ind.travel_approver || null,
          approver_title: ind.approver_title || null,
          indent_raiser: ind.indent_raiser || null
        }
      });
    }

    // 3. Seed RBAC Users
    for (const u of seedData.rbacUsers) {
      await prisma.rbacUser.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as any,
          passwordHash: hashPassword("Password123")
        }
      });
    }

    // Seeding default Role Permissions
    const defaultPermissionsMap = {
      TRAVEL_DESK: ["CREATE_INDENT", "VIEW_INDENTS", "MANAGE_EMPLOYEES", "MANAGE_VENDORS", "RECORD_BOOKING", "UPLOAD_DOCUMENTS"],
      TRAVEL_APPROVER: ["VIEW_INDENTS", "APPROVE_INDENT_L1", "REJECT_INDENT_L1"],
      VP_COMMERCIAL: ["VIEW_INDENTS", "SELECT_WINNING_BID", "APPROVE_COMMERCIAL_L2", "REJECT_COMMERCIAL_L2"],
      FINANCE: ["VIEW_INDENTS", "SAVE_VENDOR_INVOICE", "APPROVE_PAYMENT", "RECONCILE_GST"],
      SUPERADMIN: [
        "CREATE_INDENT", "VIEW_INDENTS", "APPROVE_INDENT_L1", "SELECT_WINNING_BID", 
        "APPROVE_COMMERCIAL_L2", "RECORD_BOOKING", "SAVE_VENDOR_INVOICE", 
        "APPROVE_PAYMENT", "RECONCILE_GST", "MANAGE_EMPLOYEES", 
        "MANAGE_VENDORS", "MANAGE_SETTINGS"
      ]
    };

    for (const [role, perms] of Object.entries(defaultPermissionsMap)) {
      await prisma.rolePermission.upsert({
        where: { role: role as any },
        update: {},
        create: {
          role: role as any,
          permissions: perms
        }
      });
    }

    // 4. Seed RBAC Settings
    if (seedData.rbacSettings) {
      await prisma.rbacSettings.create({
        data: {
          id: 1,
          senderEmail: seedData.rbacSettings.senderEmail,
          ccRecipients: seedData.rbacSettings.ccRecipients,
          activeSimulatedEmail: seedData.rbacSettings.activeSimulatedEmail
        }
      });
    }

    // 5. Seed Vendors
    for (const v of seedData.vendors) {
      await prisma.vendor.create({
        data: {
          id: v.id,
          name: v.name,
          emails: JSON.parse(JSON.stringify(v.emails || [])),
          phones: JSON.parse(JSON.stringify(v.phones || [])),
          categories: JSON.parse(JSON.stringify(v.categories || []))
        }
      });
    }

    console.log("Database seeded successfully with baseline/mock records.");
  } catch (err) {
    console.error("Critical error during database seeding:", err);
  }
}

// Serve frontend assets
async function startServer() {
  await seedDatabaseIfEmpty();

  const server = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: server
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Hemraj Group Personal Travel Desk API active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
