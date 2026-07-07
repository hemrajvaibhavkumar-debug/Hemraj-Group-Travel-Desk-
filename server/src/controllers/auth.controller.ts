import { Response } from "express";
import { prisma } from "../../../src/db/prisma";
import crypto from "crypto";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export function hashPassword(password: string): string {
  const salt = "hemraj-salt-12345";
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return testHash === hash;
}

export async function login(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await prisma.rbacUser.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        id: token,
        email: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });

    res.setHeader("Set-Cookie", `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { role: user.role }
    });

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      permissions: rolePermission ? rolePermission.permissions : []
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Login failed: " + error.message });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const list: Record<string, string> = {};
    cookieHeader.split(";").forEach(cookie => {
      const parts = cookie.split("=");
      list[parts.shift()!.trim()] = decodeURI(parts.join("="));
    });
    
    const token = list["session_token"];
    if (token) {
      await prisma.session.delete({ where: { id: token } }).catch(() => {});
    }
  } catch (err) {}
  
  res.setHeader("Set-Cookie", "session_token=; Path=/; HttpOnly; Max-Age=0");
  return res.json({ success: true });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const rolePermission = await prisma.rolePermission.findUnique({
      where: { role: req.user.role as any }
    });

    return res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      permissions: rolePermission ? rolePermission.permissions : []
    });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve session: " + error.message });
  }
}

export async function getPermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const permissions = await prisma.rolePermission.findMany();
    return res.json(permissions);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to get role permissions: " + error.message });
  }
}

export async function updatePermissions(req: AuthenticatedRequest, res: Response) {
  try {
    const { role, permissions } = req.body;
    if (!role || !Array.isArray(permissions)) {
      return res.status(400).json({ error: "Role and permissions array are required." });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { role: role as any },
      update: { permissions: JSON.parse(JSON.stringify(permissions)) },
      create: {
        role: role as any,
        permissions: JSON.parse(JSON.stringify(permissions))
      }
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to update role permissions: " + error.message });
  }
}

export async function getRbacConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const rbacUsers = await prisma.rbacUser.findMany();
    let rbacSettings = await prisma.rbacSettings.findUnique({ where: { id: 1 } });
    if (!rbacSettings) {
      rbacSettings = {
        id: 1,
        senderEmail: "travel-desk@hemraj-group.com",
        ccRecipients: "compliance-cc@hemraj-group.com, travel-archive@hemraj-group.com",
        activeSimulatedEmail: "superadmin@hemrajgroup.com",
        updated_at: new Date()
      };
    }
    return res.json({ rbacUsers, rbacSettings });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to retrieve RBAC settings: " + error.message });
  }
}

export async function createRbacUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "User Name is a required field." });
    if (!email || !email.trim()) return res.status(400).json({ error: "Email Address is a required field." });
    if (!role) return res.status(400).json({ error: "Role configuration is required." });
    if (!password || !password.trim()) return res.status(400).json({ error: "Login Password is required to create a new user." });

    const exists = await prisma.rbacUser.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (exists) {
      return res.status(409).json({ error: `Conflict: User with email ${email} already exists.` });
    }

    const newUser = await prisma.rbacUser.create({
      data: {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role as any,
        passwordHash: hashPassword(password.trim())
      }
    });
    return res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    return res.status(500).json({ error: "Exception creating RBAC user: " + error.message });
  }
}

export async function updateRbacUser(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

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
        role: role ? (role as any) : undefined,
        passwordHash: password && password.trim() ? hashPassword(password.trim()) : undefined
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
}

export async function deleteRbacUser(req: AuthenticatedRequest, res: Response) {
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
}

export async function updateRbacSettings(req: AuthenticatedRequest, res: Response) {
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
}
