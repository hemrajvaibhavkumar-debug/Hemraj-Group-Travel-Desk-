import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function getAllVendors(req: AuthenticatedRequest, res: Response) {
  try {
    const vendors = await prisma.vendor.findMany();
    return res.json(vendors);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve vendors: " + error.message });
  }
}

export async function createVendor(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, emails, phones, categories } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Vendor name is required." });
    }

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
}

export async function updateVendor(req: AuthenticatedRequest, res: Response) {
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
}

export async function deleteVendor(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.vendor.delete({ where: { id } });
    return res.json({ success: true, message: `Vendor ${id} removed successfully.` });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to delete vendor: " + error.message });
  }
}
