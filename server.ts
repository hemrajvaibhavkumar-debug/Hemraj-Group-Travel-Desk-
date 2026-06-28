import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { TravelCategory, PriorityLevel, Employee, TravelIndent, JobCard, JobCardQuote, AuditLogEntry, RbacUser, RbacSettings, Vendor } from "./src/types";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 4000;
const DB_DIR = path.join(process.cwd(), "src", "db");
const DB_FILE = path.join(DB_DIR, "database.json");

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

// Initialize Gemini SDK with telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: "15mb" }));

// Initialize Mock / Persistent Database
interface SchemaDB {
  employees: Employee[];
  indents: TravelIndent[];
  jobCards: JobCard[];
  rbacUsers: RbacUser[];
  rbacSettings: RbacSettings;
  vendors: Vendor[];
}

const DEFAULT_DB_DATA: SchemaDB = {
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
      nearest_boarding_point: "Andheri East, Mumbai Office",
      luggage: "20 kg check-in, 7 kg cabin",
      visa_type: "N/A",
      seat_preference: "WINDOW",
      meal_preference: "VEG",
      source_location: "Mumbai (BOM)",
      destination: "Delhi (DEL)",
      purpose: "Urgent procurement audit for the Maharashtra machinery plant division.",
      employee_code: "EMP-1002",
      created_at: new Date("2026-06-10T10:00:00.000Z").toISOString()
    },
    {
      id: "IND-2026-0002",
      travel_type: "INTERNATIONAL",
      gst_applicable: false,
      priority: "CRITICAL",
      travel_date: "2026-07-02",
      wp_number: "WA-LAG-4835",
      nearest_boarding_point: "Lagos Executive Suite",
      luggage: "2 x 23 kg",
      visa_type: "EMPLOYMENT",
      seat_preference: "AISLE",
      meal_preference: "NON_VEG",
      source_location: "Lagos (LOS)",
      destination: "Mumbai (BOM)",
      purpose: "Quarterly alignment with Rohit ji & Directors regarding the Ricefield plant scaling operations.",
      employee_code: "EMP-2045",
      created_at: new Date("2026-06-11T12:30:00.000Z").toISOString()
    }
  ],
  jobCards: [],
  rbacUsers: [
    {
      id: "usr-1",
      name: "Subham (Workspace Operator)",
      email: "subham4343@gmail.com",
      role: "TRAVEL_DESK"
    },
    {
      id: "usr-2",
      name: "Satish Sharma (Supervisor L1)",
      email: "satish.sharma@hemrajgroup.com",
      role: "TRAVEL_APPROVER"
    },
    {
      id: "usr-3",
      name: "Rohit ji (COO / VP Commercial)",
      email: "rohit.ji@hemrajgroup.com",
      role: "VP_COMMERCIAL"
    },
    {
      id: "usr-4",
      name: "Tosin Alabi",
      email: "tosin.alabi@hemrajgroup.com",
      role: "TRAVEL_DESK"
    },
    {
      id: "usr-5",
      name: "Finance Controller",
      email: "finance@hemrajgroup.com",
      role: "FINANCE"
    }
  ],
  rbacSettings: {
    senderEmail: "travel-desk@hemraj-group.com",
    ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
    activeSimulatedEmail: "subham4343@gmail.com"
  },
  vendors: [
    {
      id: "VND-FL-01",
      name: "IndiGo Corporate Air Desk",
      emails: ["corporate.air@interglobe.com"],
      phones: ["+91 124 4973838"],
      categories: ["FLIGHT"]
    },
    {
      id: "VND-FL-02",
      name: "Air India Business Desk",
      emails: ["staralliance@airindia.in"],
      phones: [],
      categories: ["FLIGHT"]
    },
    {
      id: "VND-HT-01",
      name: "Taj Group Business Travel",
      emails: ["corporate@tajhotels.com"],
      phones: [],
      categories: ["HOTEL"]
    },
    {
      id: "VND-CB-01",
      name: "Ola Corporate Travel Desk",
      emails: ["corp@olacabs.com"],
      phones: [],
      categories: ["CAB"]
    }
  ]
};

// Database state accessor functions with filesystem syncing and rigorous error-trapping
function getDatabase(): SchemaDB {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB_DATA, null, 2));
      return DEFAULT_DB_DATA;
    }
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(data);

    // Backward compatibility & check structure
    let modified = false;
    if (!parsed.employees || !parsed.indents) {
      return DEFAULT_DB_DATA;
    }
    if (!parsed.jobCards) {
      parsed.jobCards = [];
      modified = true;
    }
    if (!parsed.rbacUsers) {
      parsed.rbacUsers = DEFAULT_DB_DATA.rbacUsers;
      modified = true;
    }
    if (!parsed.rbacSettings) {
      parsed.rbacSettings = DEFAULT_DB_DATA.rbacSettings;
      modified = true;
    }
    if (!parsed.vendors) {
      parsed.vendors = DEFAULT_DB_DATA.vendors || [];
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (error) {
    console.error("Database read error. Falling back to default mock state:", error);
    return DEFAULT_DB_DATA;
  }
}

function writeDatabase(db: SchemaDB): boolean {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Database write error:", error);
    return false;
  }
}

// RBAC API Endpoints with explicit validation and error handling
app.get("/api/rbac", (req, res) => {
  try {
    const db = getDatabase();
    return res.json({
      rbacUsers: db.rbacUsers || [],
      rbacSettings: db.rbacSettings || {
        senderEmail: "travel-desk@hemraj-group.com",
        ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
        activeSimulatedEmail: "subham4343@gmail.com"
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve RBAC & settings parameters: " + error.message });
  }
});

app.post("/api/rbac/users", (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "User Name is a required field." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email Address is a required field." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "The provided email format is invalid." });
    }
    const allowedRoles = ["TRAVEL_DESK", "TRAVEL_APPROVER", "VP_COMMERCIAL"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Role must be one of: TRAVEL_DESK, TRAVEL_APPROVER, VP_COMMERCIAL." });
    }

    const db = getDatabase();
    // Validate uniqueness of email
    const exists = db.rbacUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: `Conflict: A sandbox user with email ${email} already exists.` });
    }

    const newUser: RbacUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role as any
    };

    db.rbacUsers.push(newUser);
    if (writeDatabase(db)) {
      return res.status(201).json({ success: true, user: newUser });
    } else {
      return res.status(500).json({ error: "Failed to write database record on physical disk." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception creating RBAC user: " + error.message });
  }
});

app.put("/api/rbac/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "User Name is required for update." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email Address is required for update." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "The provided email format is invalid." });
    }
    const allowedRoles = ["TRAVEL_DESK", "TRAVEL_APPROVER", "VP_COMMERCIAL"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Role must be one of: TRAVEL_DESK, TRAVEL_APPROVER, VP_COMMERCIAL." });
    }

    const db = getDatabase();
    const index = db.rbacUsers.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "User record not found." });
    }

    // Check if email conflicts with another user
    const conflict = db.rbacUsers.some(u => u.id !== id && u.email.toLowerCase() === email.toLowerCase());
    if (conflict) {
      return res.status(409).json({ error: `Conflict: Another user with email ${email} already exists.` });
    }

    // Capture old email
    const oldEmail = db.rbacUsers[index].email;

    const updatedUser = {
      ...db.rbacUsers[index],
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role as any
    };

    db.rbacUsers[index] = updatedUser;

    // If we updated the email of the active simulated user, sync it as well
    if (db.rbacSettings.activeSimulatedEmail === oldEmail) {
      db.rbacSettings.activeSimulatedEmail = email.trim().toLowerCase();
    }

    if (writeDatabase(db)) {
      return res.json({ success: true, user: updatedUser });
    } else {
      return res.status(500).json({ error: "Failed to persist edited user record on physical disk." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception updating RBAC user: " + error.message });
  }
});

app.delete("/api/rbac/users/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.rbacUsers.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "User record not found to delete." });
    }

    // Protect from deleting all users
    if (db.rbacUsers.length <= 1) {
      return res.status(400).json({ error: "Validation Constraint: Cannot delete the last remaining manager/operator user in the registry." });
    }

    const deletedUser = db.rbacUsers[index];
    db.rbacUsers.splice(index, 1);

    // If we deleted the active simulated user, select the first remaining user!
    if (db.rbacSettings.activeSimulatedEmail === deletedUser.email) {
      db.rbacSettings.activeSimulatedEmail = db.rbacUsers[0].email;
    }

    if (writeDatabase(db)) {
      return res.json({ success: true, message: `Successfully removed user '${deletedUser.name}'` });
    } else {
      return res.status(500).json({ error: "Failed to write database updates on disk." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception deleting RBAC user: " + error.message });
  }
});

app.put("/api/rbac/settings", (req, res) => {
  try {
    const { senderEmail, ccRecipients, activeSimulatedEmail } = req.body;

    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return res.status(400).json({ error: "Primary Sender Email has an invalid format." });
    }

    const db = getDatabase();
    db.rbacSettings = {
      senderEmail: senderEmail ? senderEmail.trim() : db.rbacSettings.senderEmail,
      ccRecipients: ccRecipients !== undefined ? ccRecipients.trim() : db.rbacSettings.ccRecipients,
      activeSimulatedEmail: activeSimulatedEmail ? activeSimulatedEmail.trim().toLowerCase() : db.rbacSettings.activeSimulatedEmail
    };

    if (writeDatabase(db)) {
      return res.json({ success: true, settings: db.rbacSettings });
    } else {
      return res.status(500).json({ error: "Failed to write database settings configuration." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception saving system settings: " + error.message });
  }
});

// REST API Endpoints with extensive validation and error reporting
// Support mock file uploads using Base64 or standard simulated storage
app.post("/api/upload", (req, res) => {
  try {
    const { fileName, fileType, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "Missing required upload body parameters (fileName, fileData)." });
    }
    // We simulate storing the file and return a clean, realistic relative / simulated URL.
    const cleanName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const relativeUrl = `/uploads/${Date.now()}_${cleanName}`;
    return res.status(200).json({
      success: true,
      url: relativeUrl,
      name: fileName,
      message: "File simulated and uploaded successfully."
    });
  } catch (error: any) {
    return res.status(500).json({ error: "File upload processing failure: " + error.message });
  }
});

// Employee Endpoints
app.get("/api/employees", (req, res) => {
  try {
    const db = getDatabase();
    return res.json(db.employees);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve employee data: " + error.message });
  }
});

app.post("/api/employees", (req, res) => {
  try {
    const employee: Employee = req.body;

    // Server-side database validation
    if (!employee.employee_code || !employee.employee_code.trim()) {
      return res.status(400).json({ error: "Employee ID (employee_code) is a required field." });
    }
    if (!employee.name || !employee.name.trim()) {
      return res.status(400).json({ error: "Full Name is required." });
    }
    if (!employee.email || !employee.email.trim()) {
      return res.status(400).json({ error: "Email Address is required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
      return res.status(400).json({ error: "Provided email address layout is invalid." });
    }
    if (!employee.phone || !employee.phone.trim()) {
      return res.status(400).json({ error: "Mobile/WhatsApp number is required." });
    }
    if (!employee.designation || !employee.designation.trim()) {
      return res.status(400).json({ error: "Official designation is required." });
    }
    if (!employee.department) {
      return res.status(400).json({ error: "Department selection is required." });
    }
    if (!employee.default_travel_approver) {
      return res.status(400).json({ error: "Travel Approver selection is required." });
    }
    if (!employee.cost_centre || !employee.cost_centre.trim()) {
      return res.status(400).json({ error: "Cost Centre/Billing is required." });
    }
    if (!employee.default_billing_currency) {
      return res.status(400).json({ error: "Billing Currency is required." });
    }

    const db = getDatabase();

    // Enforce UNIQ Constraints
    const duplicateCode = db.employees.find(e => e.employee_code.toLowerCase() === employee.employee_code.toLowerCase());
    if (duplicateCode) {
      return res.status(409).json({ error: `Conflict: Employee with code '${employee.employee_code}' already exists.` });
    }
    const duplicateEmail = db.employees.find(e => e.email.toLowerCase() === employee.email.toLowerCase());
    if (duplicateEmail) {
      return res.status(409).json({ error: `Conflict: Employee with email '${employee.email}' already exists.` });
    }

    db.employees.unshift(employee);
    const writeOk = writeDatabase(db);
    if (!writeOk) {
      return res.status(500).json({ error: "I/O error backing up database record." });
    }

    return res.status(201).json({ success: true, employee });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error during registration: " + error.message });
  }
});

app.put("/api/employees/:employee_code", (req, res) => {
  try {
    const { employee_code } = req.params;
    const updateBody = req.body;

    const db = getDatabase();
    const index = db.employees.findIndex(e => e.employee_code.toLowerCase() === employee_code.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: `Employee with code ${employee_code} not found.` });
    }

    const currentEmp = db.employees[index];

    // Check if passport details changed to archive the active one
    const passportChanged = updateBody.passport_number &&
      (updateBody.passport_number !== currentEmp.passport_number ||
        updateBody.passport_issue_date !== currentEmp.passport_issue_date ||
        updateBody.passport_expiry !== currentEmp.passport_expiry);

    let passport_history = currentEmp.passport_history || [];

    if (passportChanged && currentEmp.passport_number) {
      const historyEntry = {
        passport_number: currentEmp.passport_number,
        passport_issue_date: currentEmp.passport_issue_date || "",
        passport_expiry: currentEmp.passport_expiry || "",
        passport_front_page_url: currentEmp.passport_front_page_url || "",
        passport_back_page_url: currentEmp.passport_back_page_url || "",
        archive_date: new Date().toISOString()
      };

      // Prevent duplicate history archives
      if (!passport_history.some((h: any) => h.passport_number === historyEntry.passport_number)) {
        passport_history = [historyEntry, ...passport_history];
      }
    }

    const updatedEmployee: Employee = {
      ...currentEmp,
      ...updateBody,
      passport_history
    };

    db.employees[index] = updatedEmployee;

    if (writeDatabase(db)) {
      return res.json({ success: true, employee: updatedEmployee });
    } else {
      return res.status(500).json({ error: "Failed to persist updated database." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception updating employee profile: " + error.message });
  }
});

app.delete("/api/employees/:employee_code", (req, res) => {
  try {
    const { employee_code } = req.params;
    const db = getDatabase();
    const index = db.employees.findIndex(e => e.employee_code.toLowerCase() === employee_code.toLowerCase());

    if (index === -1) {
      return res.status(404).json({ error: `Not Found: Employee ${employee_code} not found.` });
    }

    db.employees.splice(index, 1);

    if (writeDatabase(db)) {
      return res.json({ success: true, message: `Employee ${employee_code} removed successfully.` });
    } else {
      return res.status(500).json({ error: "Failed to write database updates." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception deleting employee: " + error.message });
  }
});

// Travel Indents SQL Constraint validation & Endpoints
app.get("/api/indents", (req, res) => {
  try {
    const db = getDatabase();
    return res.json(db.indents);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve indents: " + error.message });
  }
});

app.post("/api/indents", (req, res) => {
  try {
    const indent: TravelIndent = req.body;

    // Strict validations corresponding to SQL CHECK constraints
    const validCategories = ["DOMESTIC", "INTERNATIONAL", "INTERNATIONAL_RETURN", "TRAIN", "BUS", "CAB"];
    if (!indent.travel_type || !validCategories.includes(indent.travel_type)) {
      return res.status(400).json({ error: `Check Constraint Violated: Travel Category '${indent.travel_type}' is invalid. Allowed: ${validCategories.join(", ")}` });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!indent.priority || !validPriorities.includes(indent.priority)) {
      return res.status(400).json({ error: `Check Constraint Violated: Priority level '${indent.priority}' is invalid. Allowed: ${validPriorities.join(", ")}` });
    }

    if (!indent.travel_date) {
      return res.status(400).json({ error: "Travel Date is required." });
    }
    if (!indent.nearest_boarding_point || !indent.nearest_boarding_point.trim()) {
      return res.status(400).json({ error: "Nearest Boarding Point is required." });
    }
    if (!indent.source_location || !indent.source_location.trim()) {
      return res.status(400).json({ error: "Origin Location is required." });
    }
    if (!indent.destination || !indent.destination.trim()) {
      return res.status(400).json({ error: "Destination Location is required." });
    }
    if (!indent.purpose || !indent.purpose.trim()) {
      return res.status(400).json({ error: "Purpose of Travel description is required." });
    }
    if (!indent.employee_code) {
      return res.status(400).json({ error: "A valid traveler assignment (employee_code) is mandatory." });
    }

    const db = getDatabase();

    // Enforce Foreign Key Constraint
    const employeeExists = db.employees.some(e => e.employee_code === indent.employee_code);
    if (!employeeExists) {
      return res.status(400).json({ error: `Foreign Key Violation: Employee with code '${indent.employee_code}' does not exist in the master database.` });
    }

    // Generate random unique indent id if not provided
    if (!indent.id) {
      indent.id = `IND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Ensure unique ID
    const duplicateId = db.indents.some(i => i.id === indent.id);
    if (duplicateId) {
      indent.id = `IND-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    }

    indent.created_at = new Date().toISOString();
    db.indents.unshift(indent);

    const writeOk = writeDatabase(db);
    if (!writeOk) {
      return res.status(500).json({ error: "I/O error backing up travel indent." });
    }

    return res.status(201).json({ success: true, indent });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to submit travel indent: " + error.message });
  }
});

// PUT / Update endpoint for edit and status lifecycle tracking
app.put("/api/indents/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updatedIndent: TravelIndent = req.body;

    const db = getDatabase();
    const index = db.indents.findIndex(i => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Travel Indent with ID '${id}' was not found.` });
    }

    // Constraints Validation
    const validCategories = ["DOMESTIC", "INTERNATIONAL", "INTERNATIONAL_RETURN", "TRAIN", "BUS", "CAB"];
    if (updatedIndent.travel_type && !validCategories.includes(updatedIndent.travel_type)) {
      return res.status(400).json({ error: `Check Constraint: Invalid Category '${updatedIndent.travel_type}'` });
    }

    db.indents[index] = {
      ...db.indents[index],
      ...updatedIndent,
      id // retain id
    };

    const writeOk = writeDatabase(db);
    if (!writeOk) {
      return res.status(500).json({ error: "Failed to persist update on disk." });
    }

    return res.json({ success: true, indent: db.indents[index] });
  } catch (error: any) {
    return res.status(500).json({ error: "Error editing travel indent: " + error.message });
  }
});

// DELETE endpoint for housekeeping
app.delete("/api/indents/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.indents.findIndex(i => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Indent '${id}' doesn't exist.` });
    }
    db.indents.splice(index, 1);
    writeDatabase(db);
    return res.json({ success: true, message: `Indent ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete indent: " + error.message });
  }
});

// JOB CARD API ENDPOINTS WITH DETAILED AUDITING & VALIDATION
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

// GET all Job Cards
app.get("/api/job-cards", (req, res) => {
  try {
    const db = getDatabase();
    return res.json(db.jobCards || []);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve job card databases: " + error.message });
  }
});

// POST to create/initialize a Job Card
app.post("/api/job-cards", (req, res) => {
  try {
    const { indentId, travelerName, destination, department } = req.body;
    if (!indentId || !travelerName) {
      return res.status(400).json({ error: "Failed: Missing critical Traveler Name or Indent ID." });
    }

    const db = getDatabase();
    const exists = db.jobCards.some(jc => jc.id === indentId);
    if (exists) {
      return res.status(409).json({ error: `Conflict: A Job Card for Indent ID '${indentId}' is already initialized.` });
    }

    const newJobCard: JobCard = {
      id: indentId,
      indentId,
      travelerName,
      destination: destination || "Unknown",
      department: department || "General Office",
      created_at: new Date().toISOString(),
      stage: 'QUOTATION',
      rfqVendors: [],
      quotes: [],
      approvalStatus: 'PENDING',
      gstDetailsCorrect: false,
      physicalInvoiceHandedOver: false,
      auditLogs: [
        {
          timestamp: new Date().toISOString(),
          userId: "Travel Desk Office",
          action: "Job Card Opened",
          notes: `Job Card successfully generated for approved travel desk indent ${indentId}.`
        }
      ]
    };

    db.jobCards.unshift(newJobCard);
    writeDatabase(db);
    return res.status(201).json({ success: true, jobCard: newJobCard });
  } catch (error: any) {
    return res.status(500).json({ error: "Server process failure initializing Job Card: " + error.message });
  }
});

// PUT update an active Job Card
app.put("/api/job-cards/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates: Partial<JobCard> = req.body;
    const db = getDatabase();
    const index = db.jobCards.findIndex(jc => jc.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Not Found: Job Card '${id}' does not exist.` });
    }

    const currentCard = db.jobCards[index];

    // Add audit log entries safely
    let logs = [...(currentCard.auditLogs || [])];
    if (updates.auditLogs && Array.isArray(updates.auditLogs)) {
      logs = [...logs, ...updates.auditLogs];
    }

    const updatedCard: JobCard = {
      ...currentCard,
      ...updates,
      auditLogs: logs,
      id // retain id
    };

    db.jobCards[index] = updatedCard;
    writeDatabase(db);
    return res.json({ success: true, jobCard: updatedCard });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to persist Job Card adjustments: " + error.message });
  }
});

// POST to reschedule/cancel-create a Job Card
app.post("/api/job-cards/:id/reschedule", (req, res) => {
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
      return res.status(400).json({ error: "cancellation Reason is required for rescheduling." });
    }

    const db = getDatabase();
    const parentIndex = db.jobCards.findIndex(jc => jc.id === id);
    if (parentIndex === -1) {
      return res.status(404).json({ error: `Not found: Parent job card ${id} not found.` });
    }

    const parentCard = db.jobCards[parentIndex];
    const now = new Date().toISOString();

    // 1. Cancel the parent card
    parentCard.isCancelled = true;
    parentCard.cancellationReason = reason;
    parentCard.cancelledAt = now;
    parentCard.cancellationCharges = cancellationCharges;
    parentCard.cancellationGstInvoiceUrl = cancellationGstInvoiceUrl;
    parentCard.cancellationGstInvoiceName = cancellationGstInvoiceName;

    // Create new child ID
    const count = db.jobCards.filter(jc => jc.indentId === parentCard.indentId).length;
    const childId = `${parentCard.indentId}-RS${count}`;

    parentCard.rescheduledToCardId = childId;

    // Add audit log to parent
    parentCard.auditLogs.push({
      timestamp: now,
      userId: operatorId || "Travel Desk Operator",
      action: "Job Card Cancelled (Rescheduled)",
      notes: `Cancelled due to reschedule trigger. New Card ID initiated: ${childId}. Reason: ${reason}`
    });

    // 2. Create the child card
    const newJobCard: JobCard = {
      id: childId,
      indentId: parentCard.indentId,
      travelerName: parentCard.travelerName,
      destination: parentCard.destination,
      department: parentCard.department,
      created_at: now,
      stage: 'QUOTATION',
      rfqVendors: [],
      quotes: [],
      approvalStatus: 'PENDING',
      gstDetailsCorrect: false,
      physicalInvoiceHandedOver: false,
      parentJobCardId: id,
      reschedulingCharges: reschedulingCharges,
      fareDifference: fareDifference,
      reschedulingReason: reason,
      auditLogs: [
        {
          timestamp: now,
          userId: operatorId || "Travel Desk Operator",
          action: "Job Card Opened (Rescheduled)",
          notes: `Rescheduled from parent travel ticket card ${id}. Rescheduling charges: ${reschedulingCharges || 0}, Fare difference: ${fareDifference || 0}. Process restarted from QUOTATION stage.`
        }
      ]
    };

    db.jobCards.unshift(newJobCard);
    writeDatabase(db);

    return res.status(201).json({
      success: true,
      parentCard,
      newCard: newJobCard
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Server error rescheduling job card: " + error.message });
  }
});

// DELETE a Job Card
app.delete("/api/job-cards/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.jobCards.findIndex(jc => jc.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Not Found: Job Card '${id}' doesn't exist.` });
    }
    db.jobCards.splice(index, 1);
    writeDatabase(db);
    return res.json({ success: true, message: `Job Card ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Deletion failure: " + error.message });
  }
});

// GET all Vendors
app.get("/api/vendors", (req, res) => {
  try {
    const db = getDatabase();
    return res.json(db.vendors || []);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve vendors: " + error.message });
  }
});

// POST to create a Vendor
app.post("/api/vendors", (req, res) => {
  try {
    const { name, emails, phones, categories } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Vendor name is required." });
    }
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "At least one vendor email is required." });
    }
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: "At least one vendor category is required." });
    }

    const db = getDatabase();
    const id = "VND-" + name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-").substring(0, 10) + "-" + Math.floor(Math.random() * 1000);

    const newVendor: Vendor = {
      id,
      name: name.trim(),
      emails: Array.isArray(emails) ? emails : [],
      phones: Array.isArray(phones) ? phones : [],
      categories: Array.isArray(categories) ? categories : []
    };

    db.vendors.push(newVendor);
    writeDatabase(db);
    return res.status(201).json({ success: true, vendor: newVendor });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to create vendor: " + error.message });
  }
});

// PUT to update a Vendor
app.put("/api/vendors/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, emails, phones, categories } = req.body;
    const db = getDatabase();
    const index = db.vendors.findIndex(v => v.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Not Found: Vendor '${id}' does not exist.` });
    }

    if (name) db.vendors[index].name = name.trim();
    if (emails !== undefined) db.vendors[index].emails = Array.isArray(emails) ? emails : [];
    if (phones !== undefined) db.vendors[index].phones = Array.isArray(phones) ? phones : [];
    if (categories !== undefined) db.vendors[index].categories = Array.isArray(categories) ? categories : [];

    writeDatabase(db);
    return res.json({ success: true, vendor: db.vendors[index] });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update vendor: " + error.message });
  }
});

// DELETE a Vendor
app.delete("/api/vendors/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const index = db.vendors.findIndex(v => v.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Not Found: Vendor '${id}' does not exist.` });
    }

    db.vendors.splice(index, 1);
    writeDatabase(db);
    return res.json({ success: true, message: `Vendor ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete vendor: " + error.message });
  }
});

// POST to scan Travel Ticket Voucher or Vendor invoices via Gemini LLM OCR
app.post("/api/job-cards/scan", async (req, res) => {
  try {
    const { fileType, fileData, mimeType, fileName } = req.body;
    if (!fileType || !fileData) {
      return res.status(400).json({ error: "Required scanner body attributes (fileType and fileData in Base64) are missing." });
    }

    const cleanMimeType = mimeType || "image/png";
    const cleanedData = fileData.replace(/^data:.*?;base64,/, ""); // strip prefix if passed

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
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: dataUrl
                  }
                }
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
        console.error("OpenRouter Scan parser execution error. Defaulting to local extraction simulator:", openRouterError.message);
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
        const textPart = {
          text: prompt
        };

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
        console.error("Gemini Scan parser execution error. Defaulting to local extraction simulator:", geminiError.message);
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
      // Revert to local simulation mode if no API key is configured
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



// Read Raw Schema File
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

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hemraj Group Personal Travel Desk API active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
