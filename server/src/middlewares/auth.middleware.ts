import { Request, Response, NextFunction } from "express";
import { prisma } from "../../../src/db/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach(cookie => {
    const parts = cookie.split("=");
    list[parts.shift()!.trim()] = decodeURI(parts.join("="));
  });
  return list;
}

export function requireAuth(permission?: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies["session_token"];
      if (!token) {
        return res.status(401).json({ error: "Access Denied: Session token missing." });
      }

      const session = await prisma.session.findUnique({
        where: { id: token }
      });
      if (!session || session.expiresAt.getTime() < Date.now()) {
        if (session) {
          await prisma.session.delete({ where: { id: token } }).catch(() => {});
        }
        return res.status(401).json({ error: "Access Denied: Invalid or expired session." });
      }

      const user = await prisma.rbacUser.findUnique({
        where: { email: session.email }
      });
      if (!user) {
        return res.status(401).json({ error: "Access Denied: User profile not found." });
      }

      if (user.role === "SUPERADMIN") {
        req.user = user;
        return next();
      }

      if (permission) {
        const rolePermission = await prisma.rolePermission.findUnique({
          where: { role: user.role }
        });
        const permissions = (rolePermission?.permissions as string[]) || [];
        if (!permissions.includes(permission)) {
          return res.status(403).json({ error: `Forbidden: Missing required permission "${permission}".` });
        }
      }

      req.user = user;
      next();
    } catch (err: any) {
      console.error("Authentication middleware error:", err);
      return res.status(500).json({ error: "Internal server error during authentication check." });
    }
  };
}
