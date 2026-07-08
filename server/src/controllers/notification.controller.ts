import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function createNotificationInternal(
  userRole: string,
  title: string,
  message: string,
  link?: string,
  userId?: string
) {
  try {
    await prisma.notification.create({
      data: {
        id: `NOT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        userRole,
        userId: userId || null,
        title,
        message,
        link: link || null,
        read: false
      }
    });
  } catch (err: any) {
    console.error("Failed to create internal notification:", err.message);
  }
}

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized session role check." });
    }

    // Build OR conditions dynamically — avoid empty `{}` which matches ALL records
    const orConditions: any[] = [
      { userRole },
      { userRole: "ALL" }
    ];
    if (userEmail) {
      orConditions.push({ userId: userEmail });
    }
    // SUPERADMIN sees everything
    if (userRole === "SUPERADMIN") {
      orConditions.push({});  // match all
    }

    const notifications = await prisma.notification.findMany({
      where: {
        read: false,
        OR: orConditions
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, notifications });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to fetch notifications: " + error.message });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return res.json({ success: true, notification });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to mark notification read: " + error.message });
  }
}

export async function clearAllNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userEmail = req.user?.email;

    if (!userRole) {
      return res.status(401).json({ error: "Unauthorized session role check." });
    }

    // Build OR conditions dynamically — mirror getNotifications logic
    const orConditions: any[] = [
      { userRole },
      { userRole: "ALL" }
    ];
    if (userEmail) {
      orConditions.push({ userId: userEmail });
    }
    if (userRole === "SUPERADMIN") {
      orConditions.push({});
    }

    await prisma.notification.updateMany({
      where: {
        read: false,
        OR: orConditions
      },
      data: { read: true }
    });

    return res.json({ success: true, message: "Cleared all unread notifications." });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to clear notifications: " + error.message });
  }
}
