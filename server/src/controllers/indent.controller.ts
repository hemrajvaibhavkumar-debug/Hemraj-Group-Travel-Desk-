import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import * as N8nService from "../services/n8n.service";

export async function getAllIndents(req: AuthenticatedRequest, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = parseInt(req.query.skip as string) || 0;
    const indents = await prisma.travelIndent.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
      skip: skip
    });
    return res.json(indents);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve indents: " + error.message });
  }
}

export async function createIndent(req: AuthenticatedRequest, res: Response) {
  try {
    const indent = req.body;

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
}

export async function updateIndent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const updatedIndent = req.body;

    const exists = await prisma.travelIndent.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: `Travel Indent with ID '${id}' was not found.` });

    const updated = await prisma.travelIndent.update({
      where: { id },
      data: {
        ...updatedIndent,
        id: undefined // retain original id
      }
    });

    return res.json({ success: true, indent: updated });
  } catch (error: any) {
    return res.status(500).json({ error: "Error editing travel indent: " + error.message });
  }
}

export async function deleteIndent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.travelIndent.delete({ where: { id } });
    return res.json({ success: true, message: `Indent ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete indent: " + error.message });
  }
}

export async function sendWebhook(req: AuthenticatedRequest, res: Response) {
  try {
    const { indentId, action, comment } = req.body;
    if (!indentId) {
      return res.status(400).json({ error: "Missing indentId parameter." });
    }

    const indent = await prisma.travelIndent.findUnique({
      where: { id: indentId },
      include: { employee: true }
    });

    if (!indent) {
      return res.status(404).json({ error: `Travel Indent '${indentId}' not found.` });
    }

    const webhookPayload = {
      indent: {
        id: indent.id,
        travel_type: indent.travel_type,
        gst_applicable: indent.gst_applicable,
        priority: indent.priority,
        travel_date: indent.travel_date,
        wp_number: indent.wp_number,
        source_location: indent.source_location,
        destination: indent.destination,
        purpose: indent.purpose,
        employee_code: indent.employee_code,
        employee_name: indent.employee.name,
        employee_email: indent.employee.email,
        employee_phone: indent.employee.phone,
        department: indent.employee.department,
        designation: indent.employee.designation,
        cost_centre: indent.employee.cost_centre
      },
      action: action || "SUBMIT",
      comment: comment || "",
      timestamp: new Date().toISOString()
    };

    const ok = await N8nService.sendIndentWebhook(webhookPayload);
    if (ok) {
      return res.json({ success: true, message: "Webhook successfully sent to n8n flow!" });
    } else {
      return res.status(502).json({ error: "Failed to trigger n8n flow. Endpoint was unreachable or returned failure." });
    }
  } catch (error: any) {
    return res.status(500).json({ error: "Exception raising webhook integration: " + error.message });
  }
}

export async function createPublicIndent(req: any, res: Response) {
  try {
    const {
      type,
      name,
      email,
      phone,
      department,
      designation,
      from,
      to,
      date,
      is_return,
      domestic_connection_required,
      indent_raiser,
      travel_approver,
      approver_title
    } = req.body;

    if (!type || !name || !email || !from || !to || !date) {
      return res.status(400).json({ error: "Missing required fields (Travel Type, Name, Email, Source, Destination, Travel Date)." });
    }

    // 1. Resolve or create placeholder traveler profile
    let employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          employee_code: `EMP-TEMP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: (phone || "").trim(),
          department: department || "Purchase",
          designation: designation || "Staff Member",
          default_travel_approver: travel_approver || "Department Head",
          approver_designation: approver_title || "Manager",
          cost_centre: "HEM-TEMP",
          default_billing_currency: "INR"
        }
      });
    }

    // 2. Insert simplified travel indent
    const indentId = `IND-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newIndent = await prisma.travelIndent.create({
      data: {
        id: indentId,
        travel_type: type as any,
        gst_applicable: true,
        priority: "MEDIUM",
        travel_date: date,
        wp_number: phone || null,
        nearest_boarding_point: from,
        source_location: from,
        destination: to,
        purpose: `Publicly submitted request. Route: ${from} to ${to}. Connection required: ${domestic_connection_required ? 'Yes' : 'No'}.`,
        employee_code: employee.employee_code,
        travel_approver: travel_approver || null,
        approver_title: approver_title || null,
        indent_raiser: indent_raiser || name.trim(),
        is_return: !!is_return,
        domestic_connection_required: !!domestic_connection_required
      }
    });

    return res.status(201).json({ success: true, indent: newIndent });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to submit public indent: " + error.message });
  }
}
