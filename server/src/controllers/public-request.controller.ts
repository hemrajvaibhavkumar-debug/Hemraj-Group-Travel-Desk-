import { Request, Response } from "express";
import { prisma } from "../../../src/db/prisma";

export async function createPublicRequest(req: Request, res: Response) {
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
      return res.status(400).json({ error: "Missing required fields (Travel Type, Name, Email, Source, Destination, Date)." });
    }

    // 1. Ingest/Update Employee Profile (marked profile_completed: false)
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
          default_billing_currency: "INR",
          profile_completed: false
        }
      });
    }

    // 2. Create PublicRequest Draft
    const draftId = `REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest = await prisma.publicRequest.create({
      data: {
        id: draftId,
        travel_type: type,
        traveler_name: name.trim(),
        traveler_email: email.trim().toLowerCase(),
        traveler_phone: (phone || "").trim(),
        department: department || "Purchase",
        designation: designation || "Staff Member",
        origin: from,
        destination: to,
        travel_date: date,
        is_return: !!is_return,
        domestic_connection_required: !!domestic_connection_required,
        indent_raiser: indent_raiser || name.trim(),
        travel_approver: travel_approver || "Department Head",
        approver_title: approver_title || "Manager",
        status: "PENDING"
      }
    });

    return res.status(201).json({ success: true, request: newRequest });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to log request: " + error.message });
  }
}

export async function getAllPublicRequests(req: Request, res: Response) {
  try {
    const requests = await prisma.publicRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { created_at: "desc" }
    });
    return res.json({ success: true, requests });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch requests: " + error.message });
  }
}

export async function updatePublicRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await prisma.publicRequest.update({
      where: { id },
      data: { status }
    });

    return res.json({ success: true, request });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update request: " + error.message });
  }
}
