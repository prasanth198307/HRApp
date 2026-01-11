import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { AppUser } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

const PgSession = connectPgSimple(session);

declare global {
  namespace Express {
    interface Request {
      appUser?: AppUser & { organization?: any };
    }
  }
}

export async function setupAuth(app: Express): Promise<void> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const isSecure = process.env.NODE_HTTPS === "true";
  console.log(`[Auth] Session config: secure=${isSecure}, NODE_HTTPS=${process.env.NODE_HTTPS}, NODE_ENV=${process.env.NODE_ENV}`);

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isSecure,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getAppUserByEmail(email);
      if (existingUser && !existingUser.isPending) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);

      let user: AppUser;
      if (existingUser && existingUser.isPending) {
        user = await storage.updateAppUser(existingUser.id, {
          password: hashedPassword,
          firstName,
          lastName,
          isPending: false,
          inviteToken: null,
        }) as AppUser;
      } else {
        const allUsers = await storage.getAllAppUsers();
        const role = allUsers.length === 0 ? "super_admin" : "employee";
        
        user = await storage.createAppUser({
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role,
          isActive: true,
          isPending: false,
        });
      }

      (req.session as any).userId = user.id;
      
      // Explicitly save session to ensure it persists
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getAppUserByEmail(email.toLowerCase());
      if (!user || user.isPending) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled" });
      }

      (req.session as any).userId = user.id;
      
      // Explicitly save session to ensure it persists
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      let organization = null;
      if (user.organizationId) {
        organization = await storage.getOrganization(user.organizationId);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.json({ user: null });
    }

    try {
      const user = await storage.getAppUserById(userId);
      if (!user || !user.isActive) {
        return res.json({ user: null });
      }

      let organization = null;
      if (user.organizationId) {
        organization = await storage.getOrganization(user.organizationId);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
        organization,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.json({ user: null });
    }
  });

  app.post("/api/auth/accept-invite", async (req: Request, res: Response) => {
    try {
      const { token, password, firstName, lastName } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const pendingUser = await storage.getAppUserByInviteToken(token);
      if (!pendingUser) {
        return res.status(400).json({ message: "Invalid or expired invite token" });
      }

      const hashedPassword = await hashPassword(password);

      const user = await storage.updateAppUser(pendingUser.id, {
        password: hashedPassword,
        firstName,
        lastName,
        isPending: false,
        inviteToken: null,
      }) as AppUser;

      (req.session as any).userId = user.id;
      
      // Explicitly save session to ensure it persists
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });
}

export async function appUserMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    next();
    return;
  }

  try {
    const appUser = await storage.getAppUserById(userId);
    if (appUser && appUser.isActive) {
      let organization = null;
      if (appUser.organizationId) {
        organization = await storage.getOrganization(appUser.organizationId);
      }
      req.appUser = { ...appUser, organization };
    }
  } catch (error) {
    console.error("Error in appUserMiddleware:", error);
  }

  next();
}
