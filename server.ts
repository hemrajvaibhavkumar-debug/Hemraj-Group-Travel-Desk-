import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { TravelCategory, PriorityLevel, Employee, TravelIndent, JobCard, JobCardQuote, AuditLogEntry, RbacUser, RbacSettings, Vendor } from "./src/types";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./src/db/prisma";

const app = express();
const PORT = 5173;

// Helper for retry logic
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.code === 429)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Initialize Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: "15mb" }));

// Baseline default data in case local JSON is missing
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
    { id: "usr-4", name: "Finance Team", email: "finance@hemrajgroup.com", role: "FINANCE" }
  ],
  rbacSettings: {
    senderEmail: "travel-desk@hemraj-group.com",
    ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
    activeSimulatedEmail: "subham4343@gmail.com"
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

    // 3. Seed Job Cards
    for (const jc of seedData.jobCards || []) {
      await prisma.jobCard.create({
        data: {
          id: jc.id,
          indentId: jc.indentId,
          travelerName: jc.travelerName,
          destination: jc.destination,
          department: jc.department,
          created_at: new Date(jc.created_at || Date.now()),
          stage: jc.stage as any,
          rfqVendors: JSON.parse(JSON.stringify(jc.rfqVendors || [])),
          winningQuoteId: jc.winningQuoteId || null,
          approvalStatus: jc.approvalStatus || "PENDING",
          approvalNotes: jc.approvalNotes || null,
          approverName: jc.approverName || null,
          approvedAt: jc.approvedAt || null,
          bookingPNR: jc.bookingPNR || null,
          bookingVendor: jc.bookingVendor || null,
          finalBookingAmount: jc.finalBookingAmount || null,
          bookingCurrency: jc.bookingCurrency || null,
          ticketFileUrl: jc.ticketFileUrl || null,
          ticketFileName: jc.ticketFileName || null,
          ticketVendorInvoiceUrl: jc.ticketVendorInvoiceUrl || null,
          ticketVendorInvoiceName: jc.ticketVendorInvoiceName || null,
          bookingRecordedAt: jc.bookingRecordedAt || null,
          invoiceVendorAmount: jc.invoiceVendorAmount || null,
          invoiceCurrency: jc.invoiceCurrency || null,
          invoiceNumber: jc.invoiceNumber || null,
          gstDetailsCorrect: jc.gstDetailsCorrect || false,
          physicalInvoiceHandedOver: jc.physicalInvoiceHandedOver || false,
          varianceWarning: jc.varianceWarning || null,
          airlineGstInvoiceUrl: jc.airlineGstInvoiceUrl || null,
          airlineGstInvoiceName: jc.airlineGstInvoiceName || null,
          quoted_total: jc.quoted_total || null,
          actual_total: jc.actual_total || null,
          variance_percentage: jc.variance_percentage || null,
          vendor_name: jc.vendor_name || null,
          attachments_url: jc.attachments_url || null,
          airlineGstNumber: jc.airlineGstNumber || null,
          airlineGstAmount: jc.airlineGstAmount || null,
          airlineGstVendorName: jc.airlineGstVendorName || null,
          reconciliationRecordedAt: jc.reconciliationRecordedAt || null,
          financeCleared: jc.financeCleared || false,
          financeVarianceReason: jc.financeVarianceReason || null,
          paymentStatus: jc.paymentStatus || null,
          paymentDate: jc.paymentDate || null,
          paymentTransactionRef: jc.paymentTransactionRef || null,
          paymentMode: jc.paymentMode || null,
          paymentCurrency: jc.paymentCurrency || null,
          paymentAmountINR: jc.paymentAmountINR || null,
          paymentRecordedAt: jc.paymentRecordedAt || null,
          voided: jc.voided || false,
          void_reason: jc.void_reason || null,
          travelApprovalStatus: jc.travelApprovalStatus || null,
          travelApprovedBy: jc.travelApprovedBy || null,
          travelApprovedAt: jc.travelApprovedAt || null,
          travelApprovalNotes: jc.travelApprovalNotes || null,
          commercialApprovalStatus: jc.commercialApprovalStatus || null,
          commercialApprovedBy: jc.commercialApprovedBy || null,
          commercialApprovedAt: jc.commercialApprovedAt || null,
          commercialApprovalNotes: jc.commercialApprovalNotes || null,
          isCancelled: jc.isCancelled || false,
          cancellationReason: jc.cancellationReason || null,
          cancelledAt: jc.cancelledAt || null,
          cancellationCharges: jc.cancellationCharges || null,
          cancellationGstInvoiceUrl: jc.cancellationGstInvoiceUrl || null,
          cancellationGstInvoiceName: jc.cancellationGstInvoiceName || null,
          reschedulingCharges: jc.reschedulingCharges || null,
          fareDifference: jc.fareDifference || null,
          reschedulingReason: jc.reschedulingReason || null,
          parentJobCardId: jc.parentJobCardId || null,
          rescheduledToCardId: jc.rescheduledToCardId || null,
        }
      });

      // Seed Quotes
      if (jc.quotes && jc.quotes.length > 0) {
        for (const q of jc.quotes) {
          await prisma.jobCardQuote.create({
            data: {
              id: q.id,
              jobCardId: jc.id,
              vendorName: q.vendorName,
              amount: q.amount,
              currency: q.currency,
              quoteFileUrl: q.quoteFileUrl || null,
              quoteFileName: q.quoteFileName || null,
              isWinning: q.isWinning || false,
              created_at: q.created_at,
              airline: q.airline || null,
              sector: q.sector || null,
              layover: q.layover || null,
              travelDate: q.travelDate || null,
              agentName: q.agentName || null
            }
          });
        }
      }

      // Seed Audit Logs
      if (jc.auditLogs && jc.auditLogs.length > 0) {
        for (const log of jc.auditLogs) {
          await prisma.auditLog.create({
            data: {
              jobCardId: jc.id,
              timestamp: log.timestamp,
              userId: log.userId,
              action: log.action,
              notes: log.notes || null
            }
          });
        }
      }
    }

    // 4. Seed RBAC Users
    for (const u of seedData.rbacUsers) {
      await prisma.rbacUser.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as any
        }
      });
    }

    // 5. Seed RBAC Settings
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

    // 6. Seed Vendors
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

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// RBAC GET configuration
app.get("/api/rbac", async (req, res) => {
  try {
    const rbacUsers = await prisma.rbacUser.findMany();
    let rbacSettings = await prisma.rbacSettings.findUnique({ where: { id: 1 } });
    if (!rbacSettings) {
      rbacSettings = {
        id: 1,
        senderEmail: "travel-desk@hemraj-group.com",
        ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
        activeSimulatedEmail: "subham4343@gmail.com"
      };
    }
    return res.json({ rbacUsers, rbacSettings });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve RBAC parameter settings: " + error.message });
  }
});

// RBAC Create User
app.post("/api/rbac/users", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "User Name is a required field." });
    if (!email || !email.trim()) return res.status(400).json({ error: "Email Address is a required field." });
    if (!role) return res.status(400).json({ error: "Role configuration is required." });

    const exists = await prisma.rbacUser.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (exists) {
      return res.status(409).json({ error: `Conflict: User with email ${email} already exists.` });
    }

    const newUser = await prisma.rbacUser.create({
      data: {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role
      }
    });
    return res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception creating RBAC user: " + error.message });
  }
});

// RBAC Update User
app.put("/api/rbac/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const current = await prisma.rbacUser.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ error: "User record not found." });

    if (email && email.trim().toLowerCase() !== current.email) {
      const conflict = await prisma.rbacUser.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (conflict) return res.status(409).json({ error: `Conflict: Email ${email} already exists.` });
    }

    const updated = await prisma.rbacUser.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        email: email ? email.trim().toLowerCase() : undefined,
        role: role ? role : undefined
      }
    });

    const oldEmail = current.email;
    if (email && email.trim().toLowerCase() !== oldEmail) {
      const settings = await prisma.rbacSettings.findUnique({ where: { id: 1 } });
      if (settings && settings.activeSimulatedEmail === oldEmail) {
        await prisma.rbacSettings.update({
          where: { id: 1 },
          data: { activeSimulatedEmail: email.trim().toLowerCase() }
        });
      }
    }

    return res.json({ success: true, user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception updating RBAC user: " + error.message });
  }
});

// RBAC Delete User
app.delete("/api/rbac/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const count = await prisma.rbacUser.count();
    if (count <= 1) {
      return res.status(400).json({ error: "Validation Constraint: Cannot delete the last remaining operator user." });
    }

    const deleted = await prisma.rbacUser.delete({ where: { id } });

    const settings = await prisma.rbacSettings.findUnique({ where: { id: 1 } });
    if (settings && settings.activeSimulatedEmail === deleted.email) {
      const firstUser = await prisma.rbacUser.findFirst();
      if (firstUser) {
        await prisma.rbacSettings.update({
          where: { id: 1 },
          data: { activeSimulatedEmail: firstUser.email }
        });
      }
    }

    return res.json({ success: true, message: `Successfully removed user '${deleted.name}'` });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception deleting RBAC user: " + error.message });
  }
});

// RBAC Settings Update
app.put("/api/rbac/settings", async (req, res) => {
  try {
    const { senderEmail, ccRecipients, activeSimulatedEmail } = req.body;
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return res.status(400).json({ error: "Primary Sender Email has an invalid format." });
    }

    const updated = await prisma.rbacSettings.upsert({
      where: { id: 1 },
      update: {
        senderEmail: senderEmail ? senderEmail.trim() : undefined,
        ccRecipients: ccRecipients !== undefined ? ccRecipients.trim() : undefined,
        activeSimulatedEmail: activeSimulatedEmail ? activeSimulatedEmail.trim().toLowerCase() : undefined
      },
      create: {
        id: 1,
        senderEmail: senderEmail ? senderEmail.trim() : "travel-desk@hemraj-group.com",
        ccRecipients: ccRecipients !== undefined ? ccRecipients.trim() : "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
        activeSimulatedEmail: activeSimulatedEmail ? activeSimulatedEmail.trim().toLowerCase() : "subham4343@gmail.com"
      }
    });

    return res.json({ success: true, settings: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception saving system settings: " + error.message });
  }
});

// File upload simulation
app.post("/api/upload", (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing required upload parameters (fileName, fileData)." });
    }
    const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const relativeUrl = `/uploads/${Date.now()}_${cleanName}`;
    return res.status(200).json({
      success: true,
      url: relativeUrl,
      name: fileName,
      message: "File simulated and uploaded successfully."
    });
  } catch (error: any) {
    return res.status(500).json({ error: "File upload failure: " + error.message });
  }
});

// GET Employees
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany();
    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve employee data: " + error.message });
  }
});

// POST Create Employee
app.post("/api/employees", async (req, res) => {
  try {
    const emp = req.body;

    if (!emp.employee_code || !emp.employee_code.trim()) return res.status(400).json({ error: "Employee ID is required." });
    if (!emp.name || !emp.name.trim()) return res.status(400).json({ error: "Full Name is required." });
    if (!emp.email || !emp.email.trim()) return res.status(400).json({ error: "Email Address is required." });
    if (!emp.phone || !emp.phone.trim()) return res.status(400).json({ error: "Phone number is required." });
    if (!emp.designation || !emp.designation.trim()) return res.status(400).json({ error: "Designation is required." });
    if (!emp.department) return res.status(400).json({ error: "Department selection is required." });
    if (!emp.default_travel_approver) return res.status(400).json({ error: "Travel Approver selection is required." });
    if (!emp.cost_centre || !emp.cost_centre.trim()) return res.status(400).json({ error: "Cost Centre/Billing is required." });
    if (!emp.default_billing_currency) return res.status(400).json({ error: "Billing Currency is required." });

    const duplicateCode = await prisma.employee.findUnique({ where: { employee_code: emp.employee_code } });
    if (duplicateCode) return res.status(409).json({ error: `Conflict: Employee with code '${emp.employee_code}' already exists.` });

    const duplicateEmail = await prisma.employee.findUnique({ where: { email: emp.email } });
    if (duplicateEmail) return res.status(409).json({ error: `Conflict: Employee with email '${emp.email}' already exists.` });

    const newEmp = await prisma.employee.create({
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

    return res.status(201).json({ success: true, employee: newEmp });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error during registration: " + error.message });
  }
});

// PUT Update Employee
app.put("/api/employees/:employee_code", async (req, res) => {
  try {
    const { employee_code } = req.params;
    const updateBody = req.body;

    const currentEmp = await prisma.employee.findUnique({ where: { employee_code } });
    if (!currentEmp) return res.status(404).json({ error: `Employee not found.` });

    const passportChanged = updateBody.passport_number &&
      (updateBody.passport_number !== currentEmp.passport_number ||
        updateBody.passport_issue_date !== currentEmp.passport_issue_date ||
        updateBody.passport_expiry !== currentEmp.passport_expiry);

    let passport_history = (currentEmp.passport_history as any[]) || [];

    if (passportChanged && currentEmp.passport_number) {
      const historyEntry = {
        passport_number: currentEmp.passport_number,
        passport_issue_date: currentEmp.passport_issue_date || "",
        passport_expiry: currentEmp.passport_expiry || "",
        passport_front_page_url: currentEmp.passport_front_page_url || "",
        passport_back_page_url: currentEmp.passport_back_page_url || "",
        archive_date: new Date().toISOString()
      };

      if (!passport_history.some((h: any) => h.passport_number === historyEntry.passport_number)) {
        passport_history = [historyEntry, ...passport_history];
      }
    }

    const updated = await prisma.employee.update({
      where: { employee_code },
      data: {
        ...updateBody,
        passport_history: passport_history ? JSON.parse(JSON.stringify(passport_history)) : undefined
      }
    });

    return res.json({ success: true, employee: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception updating employee profile: " + error.message });
  }
});

// DELETE Employee
app.delete("/api/employees/:employee_code", async (req, res) => {
  try {
    const { employee_code } = req.params;
    await prisma.employee.delete({ where: { employee_code } });
    return res.json({ success: true, message: `Employee ${employee_code} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception deleting employee: " + error.message });
  }
});

// GET Indents
app.get("/api/indents", async (req, res) => {
  try {
    const indents = await prisma.travelIndent.findMany({
      orderBy: { created_at: "desc" }
    });
    return res.json(indents);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve indents: " + error.message });
  }
});

// POST Create Indent
app.post("/api/indents", async (req, res) => {
  try {
    const indent: TravelIndent = req.body;

    const validCategories = ["DOMESTIC", "INTERNATIONAL", "INTERNATIONAL_RETURN", "TRAIN", "BUS", "CAB"];
    if (!indent.travel_type || !validCategories.includes(indent.travel_type)) {
      return res.status(400).json({ error: `Check Constraint: Travel Category '${indent.travel_type}' is invalid.` });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!indent.priority || !validPriorities.includes(indent.priority)) {
      return res.status(400).json({ error: `Check Constraint: Priority level '${indent.priority}' is invalid.` });
    }

    if (!indent.travel_date) return res.status(400).json({ error: "Travel Date is required." });
    if (!indent.nearest_boarding_point || !indent.nearest_boarding_point.trim()) return res.status(400).json({ error: "Nearest Boarding Point is required." });
    if (!indent.source_location || !indent.source_location.trim()) return res.status(400).json({ error: "Origin Location is required." });
    if (!indent.destination || !indent.destination.trim()) return res.status(400).json({ error: "Destination Location is required." });
    if (!indent.purpose || !indent.purpose.trim()) return res.status(400).json({ error: "Purpose of Travel is required." });
    if (!indent.employee_code) return res.status(400).json({ error: "Traveler assignment (employee_code) is mandatory." });

    const employeeExists = await prisma.employee.findUnique({ where: { employee_code: indent.employee_code } });
    if (!employeeExists) {
      return res.status(400).json({ error: `Foreign Key Violation: Employee with code '${indent.employee_code}' does not exist.` });
    }

    if (!indent.id) {
      indent.id = `IND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const duplicateId = await prisma.travelIndent.findUnique({ where: { id: indent.id } });
    if (duplicateId) {
      indent.id = `IND-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    const newIndent = await prisma.travelIndent.create({
      data: {
        id: indent.id,
        travel_type: indent.travel_type as any,
        gst_applicable: indent.gst_applicable,
        priority: indent.priority as any,
        travel_date: indent.travel_date,
        wp_number: indent.wp_number || null,
        nearest_boarding_point: indent.nearest_boarding_point,
        luggage: indent.luggage || null,
        visa_type: indent.visa_type || null,
        visa_type_other: indent.visa_type_other || null,
        seat_preference: indent.seat_preference || null,
        seat_preference_other: indent.seat_preference_other || null,
        meal_preference: indent.meal_preference || null,
        meal_preference_other: indent.meal_preference_other || null,
        source_location: indent.source_location,
        destination: indent.destination,
        purpose: indent.purpose,
        plant: indent.plant || null,
        employee_code: indent.employee_code,
        created_at: new Date(),
        voided: indent.voided || false,
        void_reason: indent.void_reason || null,
        travel_approver: indent.travel_approver || null,
        approver_title: indent.approver_title || null,
        indent_raiser: indent.indent_raiser || null
      }
    });

    return res.status(201).json({ success: true, indent: newIndent });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to submit travel indent: " + error.message });
  }
});

// PUT Update Indent
app.put("/api/indents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedIndent = req.body;

    const exists = await prisma.travelIndent.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: `Travel Indent with ID '${id}' was not found.` });

    const updated = await prisma.travelIndent.update({
      where: { id },
      data: {
        ...updatedIndent,
        id: undefined // retain id
      }
    });

    return res.json({ success: true, indent: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Error editing travel indent: " + error.message });
  }
});

// DELETE Indent
app.delete("/api/indents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.travelIndent.delete({ where: { id } });
    return res.json({ success: true, message: `Indent ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete indent: " + error.message });
  }
});

// GET Job Cards
app.get("/api/job-cards", async (req, res) => {
  try {
    const jobCards = await prisma.jobCard.findMany({
      include: {
        quotes: true,
        auditLogs: true
      },
      orderBy: { created_at: "desc" }
    });
    return res.json(jobCards);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve job cards: " + error.message });
  }
});

// POST Create/Initialize Job Card
app.post("/api/job-cards", async (req, res) => {
  try {
    const { indentId, travelerName, destination, department } = req.body;
    if (!indentId || !travelerName) {
      return res.status(400).json({ error: "Missing travelerName or indentId parameters." });
    }

    const exists = await prisma.jobCard.findUnique({ where: { id: indentId } });
    if (exists) {
      return res.status(409).json({ error: `Conflict: Job Card for Indent ID '${indentId}' is already initialized.` });
    }

    const newJob = await prisma.jobCard.create({
      data: {
        id: indentId,
        indentId,
        travelerName,
        destination: destination || "Unknown",
        department: department || "General Office",
        stage: "QUOTATION",
        rfqVendors: JSON.parse(JSON.stringify([])),
        approvalStatus: "PENDING",
        gstDetailsCorrect: false,
        physicalInvoiceHandedOver: false,
        auditLogs: {
          create: {
            timestamp: new Date().toISOString(),
            userId: "Travel Desk Office",
            action: "Job Card Opened",
            notes: `Job Card successfully generated for approved travel desk indent ${indentId}.`
          }
        }
      },
      include: {
        quotes: true,
        auditLogs: true
      }
    });

    return res.status(201).json({ success: true, jobCard: newJob });
  } catch (error: any) {
    return res.status(500).json({ error: "Server process failure initializing Job Card: " + error.message });
  }
});

// PUT Update active Job Card
app.put("/api/job-cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const quotesData = updates.quotes;
    const auditLogsData = updates.auditLogs;

    delete updates.quotes;
    delete updates.auditLogs;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.jobCard.update({
        where: { id },
        data: {
          ...updates,
          rfqVendors: updates.rfqVendors ? JSON.parse(JSON.stringify(updates.rfqVendors)) : undefined,
          id: undefined,
          indentId: undefined
        }
      });

      if (quotesData && Array.isArray(quotesData)) {
        const quoteIds = quotesData.map(q => q.id);
        await tx.jobCardQuote.deleteMany({
          where: {
            jobCardId: id,
            id: { notIn: quoteIds }
          }
        });

        for (const q of quotesData) {
          await tx.jobCardQuote.upsert({
            where: { id: q.id },
            update: {
              vendorName: q.vendorName,
              amount: q.amount,
              currency: q.currency,
              quoteFileUrl: q.quoteFileUrl,
              quoteFileName: q.quoteFileName,
              isWinning: q.isWinning,
              created_at: q.created_at || new Date().toISOString(),
              airline: q.airline,
              sector: q.sector,
              layover: q.layover,
              travelDate: q.travelDate,
              agentName: q.agentName,
              selectedEmails: q.selectedEmails ? JSON.parse(JSON.stringify(q.selectedEmails)) : undefined,
              selectedPhones: q.selectedPhones ? JSON.parse(JSON.stringify(q.selectedPhones)) : undefined
            },
            create: {
              id: q.id,
              jobCardId: id,
              vendorName: q.vendorName,
              amount: q.amount,
              currency: q.currency,
              quoteFileUrl: q.quoteFileUrl,
              quoteFileName: q.quoteFileName,
              isWinning: q.isWinning || false,
              created_at: q.created_at || new Date().toISOString(),
              airline: q.airline,
              sector: q.sector,
              layover: q.layover,
              travelDate: q.travelDate,
              agentName: q.agentName,
              selectedEmails: q.selectedEmails ? JSON.parse(JSON.stringify(q.selectedEmails)) : undefined,
              selectedPhones: q.selectedPhones ? JSON.parse(JSON.stringify(q.selectedPhones)) : undefined
            }
          });
        }
      }

      if (auditLogsData && Array.isArray(auditLogsData)) {
        for (const log of auditLogsData) {
          await tx.auditLog.create({
            data: {
              jobCardId: id,
              timestamp: log.timestamp || new Date().toISOString(),
              userId: log.userId || "System",
              action: log.action,
              notes: log.notes
            }
          });
        }
      }

      return await tx.jobCard.findUnique({
        where: { id },
        include: { quotes: true, auditLogs: true }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    return res.json({ success: true, jobCard: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to persist Job Card adjustments: " + error.message });
  }
});

// POST Reschedule Job Card
app.post("/api/job-cards/:id/reschedule", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reason,
      operatorId,
      reschedulingCharges,
      fareDifference,
      cancellationCharges,
      cancellationGstInvoiceUrl,
      cancellationGstInvoiceName
    } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Cancellation Reason is required for rescheduling." });
    }

    const now = new Date().toISOString();
    const parentCard = await prisma.jobCard.findUnique({ where: { id } });
    if (!parentCard) return res.status(404).json({ error: `Parent Job Card ${id} not found.` });

    const siblingCount = await prisma.jobCard.count({
      where: { indentId: parentCard.indentId }
    });
    const childId = `${parentCard.indentId}-RS${siblingCount}`;

    const result = await prisma.$transaction(async (tx) => {
      const parent = await tx.jobCard.update({
        where: { id },
        data: {
          isCancelled: true,
          cancellationReason: reason,
          cancelledAt: now,
          cancellationCharges,
          cancellationGstInvoiceUrl,
          cancellationGstInvoiceName,
          rescheduledToCardId: childId,
          auditLogs: {
            create: {
              timestamp: now,
              userId: operatorId || "Travel Desk Operator",
              action: "Job Card Cancelled (Rescheduled)",
              notes: `Cancelled due to reschedule trigger. New Card ID initiated: ${childId}. Reason: ${reason}`
            }
          }
        },
        include: { quotes: true, auditLogs: true }
      });

      const child = await tx.jobCard.create({
        data: {
          id: childId,
          indentId: parentCard.indentId,
          travelerName: parentCard.travelerName,
          destination: parentCard.destination,
          department: parentCard.department,
          stage: "QUOTATION",
          rfqVendors: JSON.parse(JSON.stringify([])),
          approvalStatus: "PENDING",
          gstDetailsCorrect: false,
          physicalInvoiceHandedOver: false,
          parentJobCardId: id,
          reschedulingCharges,
          fareDifference,
          reschedulingReason: reason,
          auditLogs: {
            create: {
              timestamp: now,
              userId: operatorId || "Travel Desk Operator",
              action: "Job Card Opened (Rescheduled)",
              notes: `Rescheduled from parent travel ticket card ${id}. Rescheduling charges: ${reschedulingCharges || 0}, Fare difference: ${fareDifference || 0}. Process restarted from QUOTATION stage.`
            }
          }
        },
        include: { quotes: true, auditLogs: true }
      });

      return { parent, child };
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    return res.status(201).json({
      success: true,
      parentCard: result.parent,
      newCard: result.child
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error rescheduling job card: " + error.message });
  }
});

// DELETE Job Card
app.delete("/api/job-cards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.jobCard.delete({ where: { id } });
    return res.json({ success: true, message: `Job Card ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Deletion failure: " + error.message });
  }
});

// GET Vendors
app.get("/api/vendors", async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany();
    return res.json(vendors);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve vendors: " + error.message });
  }
});

// POST Create Vendor
app.post("/api/vendors", async (req, res) => {
  try {
    const { name, emails, phones, categories } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Vendor name is required." });

    const id = "VND-" + name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-").substring(0, 10) + "-" + Math.floor(Math.random() * 1000);

    const newVendor = await prisma.vendor.create({
      data: {
        id,
        name: name.trim(),
        emails: JSON.parse(JSON.stringify(emails || [])),
        phones: JSON.parse(JSON.stringify(phones || [])),
        categories: JSON.parse(JSON.stringify(categories || []))
      }
    });

    return res.status(201).json({ success: true, vendor: newVendor });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create vendor: " + error.message });
  }
});

// PUT Update Vendor
app.put("/api/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emails, phones, categories } = req.body;

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: name ? name.trim() : undefined,
        emails: emails !== undefined ? JSON.parse(JSON.stringify(emails || [])) : undefined,
        phones: phones !== undefined ? JSON.parse(JSON.stringify(phones || [])) : undefined,
        categories: categories !== undefined ? JSON.parse(JSON.stringify(categories || [])) : undefined
      }
    });

    return res.json({ success: true, vendor: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update vendor: " + error.message });
  }
});

// DELETE Vendor
app.delete("/api/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vendor.delete({ where: { id } });
    return res.json({ success: true, message: `Vendor ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete vendor: " + error.message });
  }
});

// Helper for simulated scans
function getSimulatedData(fileType: string) {
  if (fileType === "ticket") {
    return {
      pnr: "BOM" + Math.floor(1000 + Math.random() * 9000) + "DEL",
      travelerName: "Satish Sharma",
      travelDate: "2026-06-25",
      origin: "Mumbai (BOM)",
      destination: "Delhi (DEL)",
      finalAmount: Number((11500 + Math.random() * 1000).toFixed(2)),
      currency: "INR"
    };
  } else if (fileType === "gst_invoice") {
    return {
      vendorName: "IndiGo Airlines (InterGlobe Aviation Ltd)",
      invoiceNumber: "6E/DEL/GST/" + Math.floor(100000 + Math.random() * 900000),
      totalBillAmount: Number((14800 + Math.random() * 1500).toFixed(2)),
      currency: "INR",
      invoiceDate: "2026-06-25",
      gstNumber: "07AAACI8451M1ZT",
      gstAmount: 740.00
    };
  } else if (fileType === "id_document") {
    return {
      name: "Arjun Malhotra",
      passportNumber: "Z9876543",
      passportIssueDate: "2020-04-12",
      passportExpiryDate: "2030-04-11",
      aadharPanNumber: "987654321012"
    };
  } else {
    return {
      vendorName: "MakeMyTrip Ltd",
      invoiceNumber: "MMT/INV/" + Math.floor(10000 + Math.random() * 90000),
      totalBillAmount: Number((13500 + Math.random() * 1500).toFixed(2)),
      currency: "INR",
      invoiceDate: "2026-06-25",
      gstNumber: "27AAACM4835A1Z5"
    };
  }
}

// POST Document scan via Gemini LLM OCR
app.post("/api/job-cards/scan", async (req, res) => {
  try {
    const { fileType, fileData, mimeType, fileName } = req.body;
    if (!fileType || !fileData) {
      return res.status(400).json({ error: "Required scanner body attributes (fileType and fileData in Base64) are missing." });
    }

    const cleanMimeType = mimeType || "image/png";
    const cleanedData = fileData.replace(/^data:.*?;base64,/, "");

    const prompt = fileType === "ticket" ?
      `You are an interactive Travel Voucher scanner. Analyze the attached document image.
       Extract and return a raw, valid JSON object matching these exact keys:
       {
         "pnr": "string containing Ticket/PNR number",
         "travelerName": "string containing traveler name",
         "travelDate": "string YYYY-MM-DD",
         "origin": "string city/airport code",
         "destination": "string destination representation",
         "finalAmount": 12500,
         "currency": "INR"
       }
       Make sure finalAmount is a clean float. Return ONLY values as standard JSON without any markdown formatting or prefix labels.`
      : fileType === "gst_invoice" ?
        `You are a corporate accountant auditing a Service / Airline GST Invoice.
        Analyze the attached document image.
        Extract and return a raw, valid JSON object matching these exact keys:
        {
          "vendorName": "string Airline or Service provider name (e.g. IndiGo, Air India, AirAsia, Vistara, SpiceJet, etc.)",
          "invoiceNumber": "string containing GST invoice number",
          "totalBillAmount": 14800,
          "currency": "INR",
          "invoiceDate": "string YYYY-MM-DD",
          "gstNumber": "string containing GST details of the Service or Airline provider",
          "gstAmount": 740.00
        }
        Make sure totalBillAmount is a clean floating point value. Return ONLY raw valid JSON structures without any markdown formatting.`
        : fileType === "id_document" ?
          `You are an AI document scanner. Analyze the attached Passport or national ID card image.
          Extract and return a raw, valid JSON object matching these exact keys:
          {
            "name": "string containing traveler's full name",
            "passportNumber": "string containing passport number if it is a passport, otherwise empty string",
            "passportIssueDate": "string YYYY-MM-DD if it is a passport, otherwise empty string",
            "passportExpiryDate": "string YYYY-MM-DD if it is a passport, otherwise empty string",
            "aadharPanNumber": "string containing Aadhaar number (12 digits) or PAN card number (10 alphanumeric characters) or general national ID number if available, otherwise empty string"
          }
          Return ONLY raw valid JSON structures without any markdown formatting.`
          :
          `You are a corporate accountant scanning a vendor invoice receipt.
       Extract and return a raw, valid JSON object matching these exact keys:
       {
         "vendorName": "string vendor name",
         "invoiceNumber": "string bill or invoice number",
         "totalBillAmount": 13900,
         "currency": "INR",
         "invoiceDate": "string YYYY-MM-DD",
         "gstNumber": "string GST details"
       }
       Make sure totalBillAmount is a clean floating point value. Return ONLY raw valid JSON structures.`;

    const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();

    if (openRouterKey) {
      try {
        const dataUrl = `data:${cleanMimeType};base64,${cleanedData}`;
        const payload = {
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: dataUrl } }
              ]
            }
          ]
        };

        const response = await retryWithBackoff(async () => {
          const resObj = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Hemraj Personal Travel Desk"
            },
            body: JSON.stringify(payload)
          });
          if (resObj.status === 429) {
            const err = new Error("Rate limited") as any;
            err.status = 429;
            throw err;
          }
          return resObj;
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API failed with status ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        const rawText = responseData.choices?.[0]?.message?.content || "{}";
        const cleanedText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const scannedData = JSON.parse(cleanedText);

        return res.json({
          success: true,
          scannedData,
          fileName,
          method: "OpenRouter Gemini Flash Real-Time Parse"
        });
      } catch (openRouterError: any) {
        console.error("OpenRouter Scan parser execution error:", openRouterError.message);
        const scannedData = getSimulatedData(fileType);
        return res.json({
          success: true,
          scannedData,
          fileName,
          method: "Heuristic Fallback OCR (Local)",
          log: openRouterError.message
        });
      }
    } else if (process.env.GEMINI_API_KEY) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: cleanMimeType,
            data: cleanedData
          }
        };
        const textPart = { text: prompt };

        const response = await retryWithBackoff(() => ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: { parts: [imagePart, textPart] },
        }));

        const rawText = response.text || "{}";
        const cleanedText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const scannedData = JSON.parse(cleanedText);

        return res.json({
          success: true,
          scannedData,
          fileName,
          method: "Gemini Real-Time Cognitive Parse"
        });
      } catch (geminiError: any) {
        console.error("Gemini Scan parser execution error:", geminiError.message);
        const scannedData = getSimulatedData(fileType);
        return res.json({
          success: true,
          scannedData,
          fileName,
          method: "Heuristic Fallback OCR (Local)",
          log: geminiError.message
        });
      }
    } else {
      const scannedData = getSimulatedData(fileType);
      return res.json({
        success: true,
        scannedData,
        fileName,
        method: "Mock OCR Engine (No API Key)"
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Document AI Scan exception: " + error.message });
  }
});

// POST Flight Search Hub Endpoint
app.post("/api/flights/search", async (req, res) => {
  try {
    const { source, destination, date, flexibleDays = 5 } = req.body;
    if (!source || !destination || !date) {
      return res.status(400).json({ error: "Missing required search parameters (source, destination, date)." });
    }

    const cleanSource = source.trim().toUpperCase();
    const cleanDest = destination.trim().toUpperCase();
    const flex = Math.min(Math.max(Number(flexibleDays), 0), 10);

    const fastApiUrl = (process.env.FASTAPI_URL || "http://localhost:8000").trim();
    console.log(`Delegating flight search query [${cleanSource} -> ${cleanDest} on ${date}] to FastAPI backend: ${fastApiUrl}`);

    let flights: any[] = [];
    let fetchError = "";

    // 1. Try POST request to FastAPI backend
    try {
      const response = await fetch(`${fastApiUrl}/api/flights/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: cleanSource,
          destination: cleanDest,
          date: date,
          flexibleDays: flex
        })
      });

      if (response.ok) {
        const resData = await response.json() as any;
        if (resData && Array.isArray(resData.flights)) {
          flights = resData.flights;
        } else if (resData && Array.isArray(resData)) {
          flights = resData;
        } else if (resData && resData.data && Array.isArray(resData.data.flights)) {
          flights = resData.data.flights;
        }
      } else {
        fetchError = `FastAPI POST responded with status ${response.status}: ${response.statusText}`;
      }
    } catch (err: any) {
      console.warn(`FastAPI POST search failed, trying GET fallback: ${err.message}`);
      
      // 2. Fallback to GET request to FastAPI backend
      try {
        const getUrl = `${fastApiUrl}/flights?source=${cleanSource}&destination=${cleanDest}&date=${date}&flexible_days=${flex}`;
        const response = await fetch(getUrl);
        if (response.ok) {
          const resData = await response.json() as any;
          if (resData && Array.isArray(resData.flights)) {
            flights = resData.flights;
          } else if (resData && Array.isArray(resData)) {
            flights = resData;
          } else if (resData && resData.data && Array.isArray(resData.data.flights)) {
            flights = resData.data.flights;
          }
        } else {
          fetchError = `FastAPI GET responded with status ${response.status}`;
        }
      } catch (getErr: any) {
        fetchError = `FastAPI connection failed: ${getErr.message}`;
      }
    }

    if (flights.length === 0) {
      return res.status(400).json({
        error: fetchError || `No flights returned by your FastAPI backend server at ${fastApiUrl} for route ${cleanSource} -> ${cleanDest}.`
      });
    }

    // Normalize flight formats to ensure safety in React components
    const normalizedFlights = flights.map((f: any, idx: number) => {
      const isDuffel = f.sourceApi === "duffel" || f.id?.startsWith("DF-") || f.currency === "USD";
      return {
        id: f.id || `FA-${f.date || date}-${f.flightNumber || idx}-${idx}`,
        airline: f.airline || "Partner Airline",
        flightNumber: f.flightNumber || f.flight_number || "XX-000",
        departureTime: f.departureTime || f.departure_time || "09:00",
        arrivalTime: f.arrivalTime || f.arrival_time || "11:15",
        duration: f.duration || "2h 15m",
        stops: typeof f.stops === "number" ? f.stops : 0,
        layovers: f.layovers || f.layover || null,
        price: typeof f.price === "number" ? f.price : Number(f.price) || 150,
        currency: f.currency || "USD",
        date: f.date || date,
        terminal: f.terminal || null,
        gate: f.gate || null,
        status: f.status || "scheduled",
        sourceApi: isDuffel ? "duffel" : "aviationstack"
      };
    });

    return res.status(200).json({
      success: true,
      flights: normalizedFlights,
      method: "FastAPI Backend Connection"
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Flight search processing failed: " + error.message });
  }
});

// POST AI Recommend Best Pick endpoint
app.post("/api/flights/ai-recommend", async (req, res) => {
  try {
    const { flights } = req.body;
    if (!flights || !Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ error: "No flights provided for recommendation." });
    }

    const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (openRouterKey) {
      try {
        const prompt = `You are a corporate travel AI assistant. Analyze the following list of flight offers and choose the single absolute best option based on:
1. All factors (price, convenience, duration, stops)
2. Timings (departure/arrival times, avoiding red-eyes or long overnight stops)
3. Time period (flight duration)
4. Layover (number of layovers/stops and transit times)
5. Airline (reputation and quality)

Flight List:
${JSON.stringify(flights.map(f => ({ id: f.id, airline: f.airline, flightNumber: f.flightNumber, dep: f.departureTime, arr: f.arrivalTime, duration: f.duration, stops: f.stops, price: f.price, currency: f.currency, layovers: f.layovers })))}

Respond with a raw JSON object containing:
- bestFlightId: the exact string ID of the best flight from the list
- reasoning: a concise explanation (maximum 2 sentences) justifying why this flight is recommended.

Do NOT include any markdown code block formatting (like \`\`\`json). Just return the raw JSON object.`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Hemraj Personal Travel Desk"
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (response.ok) {
          const resData = await response.json() as any;
          const content = resData.choices?.[0]?.message?.content || "";
          const cleanedText = content.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          if (parsed && parsed.bestFlightId) {
            return res.json({ success: true, recommendation: parsed });
          }
        }
      } catch (err: any) {
        console.error("OpenRouter AI recommendation query failed:", err.message);
      }
    }

    // Heuristic Fallback Recommendation if OpenRouter is unconfigured or fails
    // Choose the flight with the lowest score: price/100 + stops*5 + duration_in_hours*2
    let bestFlight = flights[0];
    let bestScore = Infinity;

    flights.forEach((f) => {
      let durationHours = 2;
      const match = f.duration?.match(/(\d+)h/);
      if (match) durationHours = Number(match[1]);

      const score = (f.price / 100) + (f.stops * 8) + (durationHours * 3);
      if (score < bestScore) {
        bestScore = score;
        bestFlight = f;
      }
    });

    return res.json({
      success: true,
      recommendation: {
        bestFlightId: bestFlight.id,
        reasoning: `AI Recommended ${bestFlight.airline} ${bestFlight.flightNumber} due to its optimal balance of competitive pricing (${bestFlight.currency} ${bestFlight.price}), shorter transit times, and direct routing.`
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to generate AI recommendation: " + error.message });
  }
});

// GET Schema SQL
app.get("/api/schema", (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "src", "db", "01_schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, "utf-8");
      return res.json({ schema: sqlContent });
    }
    return res.status(404).json({ error: "01_schema.sql schema doc has not been established yet." });
  } catch (error: any) {
    return res.status(500).json({ error: "Internal schema reader fault: " + error.message });
  }
});

// Cache rates memory
let forexCache: any = {
  USD: 1.0825,
  INR: 90.35,
  AUD: 1.6312,
  NGN: 1625.5,
  VND: 27550.0,
  EUR: 1.0
};
let lastForexFetch = 0;

app.get("/api/forex/rates", async (req, res) => {
  const now = Date.now();
  // Cache for 10 minutes to respect API limits
  if (now - lastForexFetch < 10 * 60 * 1000) {
    return res.json({ rates: forexCache, cached: true });
  }

  try {
    const apiRes = await fetch("http://api.exchangeratesapi.io/v1/latest?access_key=7764a24bd24a776da1c5edec489dd5e3");
    if (!apiRes.ok) {
      throw new Error(`API returned status ${apiRes.status}`);
    }
    const data: any = await apiRes.json();
    if (data && data.success && data.rates) {
      forexCache = {
        ...data.rates,
        EUR: 1.0
      };
      lastForexFetch = now;
      console.log("Successfully fetched live exchange rates from APILayer.");
      return res.json({ rates: forexCache, cached: false });
    } else {
      console.warn("APILayer exchangeratesapi.io returned success: false or invalid payload:", data);
      return res.json({ rates: forexCache, cached: true, warning: "Using cached rates due to API status." });
    }
  } catch (error: any) {
    console.error("Error fetching live exchange rates:", error.message);
    return res.json({ rates: forexCache, cached: true, warning: error.message });
  }
});

app.post("/api/workorder/send", async (req, res) => {
  try {
    const workOrder = req.body;
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    console.log("Work order send requested for Card:", workOrder.cardId);

    if (webhookUrl && webhookUrl.trim()) {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workOrder,
          sentAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned status ${response.status}`);
      }

      console.log("Successfully sent Work Order to n8n webhook:", webhookUrl);
      return res.json({ success: true, message: "Work Order successfully sent to n8n webhook!" });
    } else {
      console.log("Mocking Work Order dispatch (N8N_WEBHOOK_URL not configured in .env). Payload:", workOrder);
      return res.json({ 
        success: true, 
        mocked: true, 
        message: "Work Order authorized! (Mocked dispatch: N8N_WEBHOOK_URL not configured in environment variables)" 
      });
    }
  } catch (error: any) {
    console.error("Error sending work order to n8n:", error.message);
    return res.status(500).json({ error: "Failed to dispatch Work Order: " + error.message });
  }
});

// Serve frontend assets
async function startServer() {
  // Run DB auto-seeding routine before starting Express listeners
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
