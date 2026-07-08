import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function getAllEmployees(req: AuthenticatedRequest, res: Response) {
  try {
    const employees = await prisma.employee.findMany();
    return res.json(employees);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to list employee master records: " + error.message });
  }
}

export async function createEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const emp = req.body;
    if (!emp.employee_code || !emp.name || !emp.email) {
      return res.status(400).json({ error: "Primary keys (employee_code, name, email) are mandatory." });
    }

    const emailConflict = await prisma.employee.findUnique({ where: { email: emp.email } });
    if (emailConflict) {
      return res.status(409).json({ error: `Conflict: Employee with email ${emp.email} already exists.` });
    }

    const codeConflict = await prisma.employee.findUnique({ where: { employee_code: emp.employee_code } });
    if (codeConflict) {
      return res.status(409).json({ error: `Conflict: Employee with code ${emp.employee_code} already exists.` });
    }

    // Normalize empty-string aadhar to null to avoid unique constraint collisions on blank values
    const normalizedAadhar = emp.aadhar_pan_number?.trim() || null;

    // Check aadhar_pan_number uniqueness before creating
    if (normalizedAadhar) {
      const aadharConflict = await prisma.employee.findFirst({
        where: { aadhar_pan_number: normalizedAadhar }
      });
      if (aadharConflict) {
        return res.status(409).json({
          error: `Conflict: Aadhaar/PAN number ${normalizedAadhar} is already registered under employee ${aadharConflict.employee_code} (${aadharConflict.name}).`
        });
      }
    }

    const newEmp = await prisma.employee.create({
      data: {
        employee_code: emp.employee_code,
        aadhar_pan_number: normalizedAadhar,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
        department: emp.department,
        default_travel_approver: emp.default_travel_approver || "",
        approver_designation: emp.approver_designation || "",
        cost_centre: emp.cost_centre || "",
        default_billing_currency: emp.default_billing_currency || "INR",
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
    return res.status(500).json({ error: "Failed creating employee record: " + error.message });
  }
}

export async function updateEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const emp = req.body;

    const current = await prisma.employee.findUnique({ where: { employee_code: id } });
    if (!current) {
      return res.status(404).json({ error: "Employee record not found." });
    }

    // Check email uniqueness against OTHER employees
    if (emp.email && emp.email !== current.email) {
      const emailConflict = await prisma.employee.findUnique({ where: { email: emp.email } });
      if (emailConflict) {
        return res.status(409).json({ error: `Conflict: Email ${emp.email} is registered under another operator.` });
      }
    }

    // Normalize empty-string aadhar_pan_number to null (avoids spurious unique constraint collisions)
    const normalizedAadhar = emp.aadhar_pan_number !== undefined
      ? (emp.aadhar_pan_number?.trim() || null)
      : undefined;

    // Check aadhar_pan_number uniqueness against OTHER employees
    if (normalizedAadhar && normalizedAadhar !== current.aadhar_pan_number) {
      const aadharConflict = await prisma.employee.findFirst({
        where: {
          aadhar_pan_number: normalizedAadhar,
          NOT: { employee_code: id }
        }
      });
      if (aadharConflict) {
        return res.status(409).json({
          error: `Conflict: Aadhaar/PAN number ${normalizedAadhar} is already registered under employee ${aadharConflict.employee_code} (${aadharConflict.name}).`
        });
      }
    }

    const updated = await prisma.employee.update({
      where: { employee_code: id },
      data: {
        name: emp.name !== undefined ? emp.name : undefined,
        email: emp.email !== undefined ? emp.email : undefined,
        phone: emp.phone !== undefined ? emp.phone : undefined,
        designation: emp.designation !== undefined ? emp.designation : undefined,
        department: emp.department !== undefined ? emp.department : undefined,
        default_travel_approver: emp.default_travel_approver !== undefined ? emp.default_travel_approver : undefined,
        approver_designation: emp.approver_designation !== undefined ? emp.approver_designation : undefined,
        cost_centre: emp.cost_centre !== undefined ? emp.cost_centre : undefined,
        default_billing_currency: emp.default_billing_currency !== undefined ? emp.default_billing_currency : undefined,
        aadhar_pan_number: normalizedAadhar,
        native_city: emp.native_city !== undefined ? emp.native_city : undefined,
        nearest_airport: emp.nearest_airport !== undefined ? emp.nearest_airport : undefined,
        nearest_railway_station: emp.nearest_railway_station !== undefined ? emp.nearest_railway_station : undefined,
        default_mode_of_transport: emp.default_mode_of_transport !== undefined ? emp.default_mode_of_transport : undefined,
        extra_baggage_required: emp.extra_baggage_required !== undefined ? emp.extra_baggage_required : undefined,
        photograph_url: emp.photograph_url !== undefined ? emp.photograph_url : undefined,
        supporting_documents_url: emp.supporting_documents_url !== undefined ? emp.supporting_documents_url : undefined,
        present_location_abroad: emp.present_location_abroad !== undefined ? emp.present_location_abroad : undefined,
        assigned_plant_site: emp.assigned_plant_site !== undefined ? emp.assigned_plant_site : undefined,
        nearest_airport_india: emp.nearest_airport_india !== undefined ? emp.nearest_airport_india : undefined,
        passport_number: emp.passport_number !== undefined ? emp.passport_number : undefined,
        passport_issue_date: emp.passport_issue_date !== undefined ? emp.passport_issue_date : undefined,
        passport_expiry: emp.passport_expiry !== undefined ? emp.passport_expiry : undefined,
        passport_front_page_url: emp.passport_front_page_url !== undefined ? emp.passport_front_page_url : undefined,
        passport_back_page_url: emp.passport_back_page_url !== undefined ? emp.passport_back_page_url : undefined,
        offer_letter_url: emp.offer_letter_url !== undefined ? emp.offer_letter_url : undefined,
        polio_vaccine_status: emp.polio_vaccine_status !== undefined ? emp.polio_vaccine_status : undefined,
        polio_certificate_expiry: emp.polio_certificate_expiry !== undefined ? emp.polio_certificate_expiry : undefined,
        yfv_status: emp.yfv_status !== undefined ? emp.yfv_status : undefined,
        yfv_certificate_expiry: emp.yfv_certificate_expiry !== undefined ? emp.yfv_certificate_expiry : undefined,
        visa_number: emp.visa_number !== undefined ? emp.visa_number : undefined,
        visa_expiry_date: emp.visa_expiry_date !== undefined ? emp.visa_expiry_date : undefined,
        visa_country: emp.visa_country !== undefined ? emp.visa_country : undefined,
        train_preferred_class: emp.train_preferred_class !== undefined ? emp.train_preferred_class : undefined,
        train_berth_preference: emp.train_berth_preference !== undefined ? emp.train_berth_preference : undefined,
        train_meal_preference: emp.train_meal_preference !== undefined ? emp.train_meal_preference : undefined,
        train_preferred_number: emp.train_preferred_number !== undefined ? emp.train_preferred_number : undefined,
        passport_history: emp.passport_history !== undefined ? (JSON.parse(JSON.stringify(emp.passport_history)) as any) : undefined
      }
    });

    return res.json({ success: true, employee: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed updating employee particulars: " + error.message });
  }
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.employee.delete({ where: { employee_code: id } });
    return res.json({ success: true, message: `Successfully deleted employee record for ${id}` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed deleting employee record: " + error.message });
  }
}
