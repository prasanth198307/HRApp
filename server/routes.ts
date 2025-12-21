import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import type { AppUser } from "@shared/schema";
import { setupAuth, registerAuthRoutes, appUserMiddleware, hashPassword, verifyPassword } from "./auth";

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[0-9A-Z]{1}$/;

const complianceFields = {
  legalName: z.string().nullable().optional().transform(v => v || null),
  website: z.string().nullable().optional().transform(v => v || null),
  gstNumber: z.string().nullable().optional().transform(v => {
    if (!v) return null;
    const upper = v.toUpperCase().trim();
    return upper || null;
  }),
  panNumber: z.string().nullable().optional().transform(v => {
    if (!v) return null;
    const upper = v.toUpperCase().trim();
    return upper || null;
  }),
  tanNumber: z.string().nullable().optional().transform(v => {
    if (!v) return null;
    const upper = v.toUpperCase().trim();
    return upper || null;
  }),
  cinNumber: z.string().nullable().optional().transform(v => v?.trim() || null),
  udyamNumber: z.string().nullable().optional().transform(v => v?.trim() || null),
};

const createOrgWithAdminSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(1),
  address: z.string().nullable().optional().transform(v => v || null),
  phone: z.string().nullable().optional().transform(v => v || null),
  email: z.string().email().nullable().optional().or(z.literal("")).transform(v => v || null),
  ...complianceFields,
  admin: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),
});

const updateOrgSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(1),
  address: z.string().nullable().optional().transform(v => v || null),
  phone: z.string().nullable().optional().transform(v => v || null),
  email: z.string().email().nullable().optional().or(z.literal("")).transform(v => v || null),
  ...complianceFields,
});

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), "uploads", "payslips");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOC files are allowed"));
    }
  },
});


function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.appUser) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.appUser || req.appUser.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden - Super Admin required" });
  }
  next();
}

function requireOrgAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.appUser || (req.appUser.role !== "org_admin" && req.appUser.role !== "super_admin")) {
    return res.status(403).json({ message: "Forbidden - Org Admin required" });
  }
  next();
}

function requireOrgMember(req: Request, res: Response, next: NextFunction) {
  if (!req.appUser || !req.appUser.organizationId) {
    return res.status(403).json({ message: "Forbidden - Organization membership required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication first (session, passport)
  await setupAuth(app);
  
  // Register auth routes (/api/auth/user)
  registerAuthRoutes(app);
  
  app.use(appUserMiddleware);

  app.get("/api/user/context", requireAuth, async (req, res) => {
    res.json({
      appUser: req.appUser,
      organization: req.appUser?.organization || null,
    });
  });

  // Change own password (for any logged-in user)
  app.post("/api/user/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      const user = await storage.getAppUserById(req.appUser!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await verifyPassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateAppUserPassword(user.id, hashedNewPassword);
      
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Reset user password (sets a new password directly)
  app.post("/api/admin/reset-password/:userId", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      
      const user = await storage.getAppUserById(req.params.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow resetting super admin's own password through this endpoint
      if (user.role === "super_admin") {
        return res.status(403).json({ message: "Cannot reset super admin password through this endpoint" });
      }
      
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateAppUserPassword(user.id, hashedPassword);
      
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Public: Request password reset (no auth required)
  app.post("/api/password-reset-request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists
      const user = await storage.getAppUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists for security, just return success
        return res.json({ message: "If an account with this email exists, your request has been submitted to the administrator." });
      }
      
      // Create a password reset request
      await storage.createPasswordResetRequest({
        email,
        organizationId: user.organizationId || undefined,
        status: "pending",
      });
      
      res.json({ message: "Your password reset request has been submitted. An administrator will review it shortly." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Get all pending password reset requests
  app.get("/api/admin/password-reset-requests", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingPasswordResetRequests();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Org Admin: Get pending password reset requests for their org
  app.get("/api/org/password-reset-requests", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingPasswordResetRequests(req.appUser!.organizationId!);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Complete a password reset request (mark as done after resetting)
  app.post("/api/password-reset-requests/:id/complete", requireAuth, async (req, res) => {
    try {
      if (req.appUser!.role !== "super_admin" && req.appUser!.role !== "org_admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify org admin can only complete requests for their org
      if (req.appUser!.role === "org_admin") {
        const request = await storage.getPasswordResetRequestById(req.params.id);
        if (!request || request.organizationId !== req.appUser!.organizationId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      await storage.completePasswordResetRequest(req.params.id, req.appUser!.id);
      res.json({ message: "Request marked as completed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Dismiss a password reset request
  app.post("/api/password-reset-requests/:id/dismiss", requireAuth, async (req, res) => {
    try {
      if (req.appUser!.role !== "super_admin" && req.appUser!.role !== "org_admin") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify org admin can only dismiss requests for their org
      if (req.appUser!.role === "org_admin") {
        const request = await storage.getPasswordResetRequestById(req.params.id);
        if (!request || request.organizationId !== req.appUser!.organizationId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      await storage.dismissPasswordResetRequest(req.params.id);
      res.json({ message: "Request dismissed" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invite/check", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const pendingUser = await storage.getAppUserByInviteToken(token);
      if (!pendingUser || !pendingUser.isPending) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      res.json({
        email: pendingUser.email,
        role: pendingUser.role,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const stats = await storage.getSuperAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/organizations", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const orgs = await storage.getOrganizations();
      res.json(orgs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/organizations", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const parseResult = createOrgWithAdminSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const { admin, ...orgData } = parseResult.data;
      
      const existingUser = await storage.getAppUserByEmail(admin.email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }
      
      const org = await storage.createOrganization(orgData);
      
      const hashedPassword = await hashPassword(admin.password);
      await storage.createAppUser({
        email: admin.email.toLowerCase(),
        password: hashedPassword,
        firstName: admin.firstName,
        lastName: admin.lastName,
        organizationId: org.id,
        role: "org_admin",
        isActive: true,
        isPending: false,
      });
      
      res.status(201).json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/organizations/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const parseResult = updateOrgSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }
      
      const org = await storage.updateOrganization(req.params.id, parseResult.data);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/organizations/:id/status", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      const org = await storage.updateOrganizationStatus(req.params.id, isActive);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/org-admins", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, email, firstName, lastName, password } = req.body;
      
      if (!email || !organizationId) {
        return res.status(400).json({ message: "Email and organization are required" });
      }
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      const existingByEmail = await storage.getAppUserByEmail(email);
      if (existingByEmail) {
        return res.status(400).json({ message: "A user or invitation already exists for this email" });
      }

      const hashedPassword = await hashPassword(password);
      
      const appUser = await storage.createAppUser({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        isPending: false,
        organizationId,
        role: "org_admin",
        isActive: true,
      });
      
      const { password: _, ...safeUser } = appUser;
      res.status(201).json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get org admins for a specific organization (Super Admin only)
  app.get("/api/org-admins/:organizationId", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAppUsersByOrg(req.params.organizationId);
      const orgAdmins = users.filter(u => u.role === "org_admin");
      // Return safe user info (no password)
      const safeAdmins = orgAdmins.map(({ password, ...rest }) => rest);
      res.json(safeAdmins);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Toggle org admin active status
  app.patch("/api/org-admins/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }
      
      const user = await storage.getAppUserById(req.params.id);
      if (!user || user.role !== "org_admin") {
        return res.status(404).json({ message: "Org admin not found" });
      }
      
      const updated = await storage.updateAppUser(req.params.id, { isActive });
      if (!updated) {
        return res.status(404).json({ message: "Failed to update" });
      }
      
      const { password, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/holidays", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const holidayList = await storage.getDefaultHolidays();
      res.json(holidayList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/holidays", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const holiday = await storage.createHoliday({
        ...req.body,
        organizationId: null,
        isCustom: false,
      });
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/holidays/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const holiday = await storage.updateHoliday(req.params.id, req.body);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/admin/holidays/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteHoliday(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin - Manage any organization's data
  app.get("/api/super-admin/employees", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      const employees = await storage.getEmployeesByOrg(organizationId);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Super Admin: Bulk upload employees to any organization
  app.post("/api/super-admin/employees/bulk", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, employees: employeeData } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      
      if (!Array.isArray(employeeData) || employeeData.length === 0) {
        return res.status(400).json({ message: "No employee data provided" });
      }

      const results: { success: number; errors: Array<{ row: number; message: string }> } = {
        success: 0,
        errors: []
      };

      for (let i = 0; i < employeeData.length; i++) {
        const row = employeeData[i];
        try {
          // Validate required fields
          if (!row.employeeCode || !row.firstName || !row.lastName || !row.email || !row.dateOfJoining) {
            results.errors.push({ row: i + 1, message: "Missing required fields (employeeCode, firstName, lastName, email, dateOfJoining)" });
            continue;
          }

          // Check for duplicate email
          const existingByEmail = await storage.getEmployeeByEmail(organizationId, row.email);
          if (existingByEmail) {
            results.errors.push({ row: i + 1, message: `Employee with email ${row.email} already exists` });
            continue;
          }

          // Check for duplicate employee code
          const existingByCode = await storage.getEmployeeByCode(organizationId, row.employeeCode);
          if (existingByCode) {
            results.errors.push({ row: i + 1, message: `Employee with code ${row.employeeCode} already exists` });
            continue;
          }

          const emp = await storage.createEmployee({
            employeeCode: row.employeeCode,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone || null,
            department: row.department || null,
            designation: row.designation || null,
            dateOfJoining: row.dateOfJoining,
            salary: row.salary ? parseInt(row.salary) : null,
            address: row.address || null,
            emergencyContact: row.emergencyContact || null,
            organizationId: organizationId,
          });

          // Create initial employment period
          await storage.createEmploymentPeriod({
            employeeId: emp.id,
            organizationId: emp.organizationId,
            startDate: emp.dateOfJoining,
          });

          results.success++;
        } catch (err: any) {
          results.errors.push({ row: i + 1, message: err.message });
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/attendance", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      const month = req.query.month as string;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      const records = await storage.getAttendanceByOrg(organizationId, month);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/super-admin/attendance/bulk", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { records } = req.body;
      if (!records || !Array.isArray(records)) {
        return res.status(400).json({ message: "Records array is required" });
      }
      await storage.createOrUpdateAttendance(records);
      res.json({ message: "Attendance updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/payslips", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      const payslips = await storage.getPayslipsByOrg(organizationId);
      res.json(payslips);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/super-admin/holidays", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      const org = await storage.getOrganization(organizationId);
      const holidayList = await storage.getHolidaysByOrg(organizationId, org?.industry);
      res.json(holidayList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/super-admin/holidays", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, name, date, isNational } = req.body;
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }
      const holiday = await storage.createHoliday({
        organizationId,
        name,
        date,
        isNational: isNational || false,
        isCustom: true,
      });
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/super-admin/holidays/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const holiday = await storage.updateHoliday(req.params.id, req.body);
      res.json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/super-admin/holidays/:id", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteHoliday(req.params.id);
      res.json({ message: "Holiday deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Data Export endpoints for Super Admin
  app.get("/api/super-admin/export/:type", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const organizationId = req.query.organizationId as string;
      const exportType = req.params.type;
      
      if (!organizationId) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Helper to serialize dates/values for CSV
      const serializeValue = (val: any): string => {
        if (val === null || val === undefined) return "";
        if (val instanceof Date) return val.toISOString().split("T")[0];
        if (typeof val === "object" && val.toISOString) return val.toISOString().split("T")[0];
        return String(val);
      };

      const escapeCSV = (val: any) => {
        const str = serializeValue(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      let rows: Record<string, any>[] = [];
      let filename = "";
      let headers: string[] = [];

      switch (exportType) {
        case "employees": {
          const employees = await storage.getEmployeesByOrg(organizationId);
          headers = ["employeeCode", "firstName", "lastName", "email", "phone", "department", "designation", "dateOfJoining", "dateOfExit", "status", "salary", "address", "emergencyContact"];
          rows = employees.map(emp => ({
            employeeCode: emp.employeeCode,
            firstName: emp.firstName,
            lastName: emp.lastName,
            email: emp.email,
            phone: emp.phone,
            department: emp.department,
            designation: emp.designation,
            dateOfJoining: emp.dateOfJoining,
            dateOfExit: emp.dateOfExit,
            status: emp.status,
            salary: emp.salary,
            address: emp.address,
            emergencyContact: emp.emergencyContact,
          }));
          filename = `${org.name.replace(/\s+/g, "_")}_employees.csv`;
          break;
        }

        case "attendance": {
          const month = req.query.month as string;
          if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ message: "Valid month parameter required (YYYY-MM)" });
          }
          const attendanceRecords = await storage.getAttendanceByOrg(organizationId, month);
          headers = ["employeeCode", "employeeName", "date", "status", "checkIn", "checkOut", "notes"];
          rows = attendanceRecords.map(att => ({
            employeeCode: att.employee?.employeeCode || "",
            employeeName: att.employee ? `${att.employee.firstName} ${att.employee.lastName}` : "",
            date: att.date,
            status: att.status,
            checkIn: att.checkIn,
            checkOut: att.checkOut,
            notes: att.notes,
          }));
          filename = `${org.name.replace(/\s+/g, "_")}_attendance_${month}.csv`;
          break;
        }

        case "leave-requests": {
          const leaveRequests = await storage.getLeaveRequestsByOrg(organizationId);
          headers = ["employeeCode", "employeeName", "leaveType", "startDate", "endDate", "totalDays", "isHalfDay", "halfDaySession", "reason", "status", "reviewedAt", "reviewNotes", "createdAt"];
          rows = leaveRequests.map(lr => ({
            employeeCode: lr.employee?.employeeCode || "",
            employeeName: lr.employee ? `${lr.employee.firstName} ${lr.employee.lastName}` : "",
            leaveType: lr.leaveType,
            startDate: lr.startDate,
            endDate: lr.endDate,
            totalDays: lr.totalDays,
            isHalfDay: lr.isHalfDay ? "Yes" : "No",
            halfDaySession: lr.halfDaySession || "",
            reason: lr.reason,
            status: lr.status,
            reviewedAt: lr.reviewedAt,
            reviewNotes: lr.reviewNotes,
            createdAt: lr.createdAt,
          }));
          filename = `${org.name.replace(/\s+/g, "_")}_leave_requests.csv`;
          break;
        }

        case "holidays": {
          const holidayList = await storage.getHolidaysByOrg(organizationId, org.industry);
          headers = ["name", "date", "isNational", "isCustom"];
          rows = holidayList.map(h => ({
            name: h.name,
            date: h.date,
            isNational: h.isNational ? "Yes" : "No",
            isCustom: h.isCustom ? "Yes" : "No",
          }));
          filename = `${org.name.replace(/\s+/g, "_")}_holidays.csv`;
          break;
        }

        case "leave-balances": {
          const balances = await storage.getAllLeaveBalancesByOrg(organizationId);
          headers = ["employeeCode", "employeeName", "leaveType", "year", "openingBalance", "accruedBalance", "usedBalance", "adjustmentBalance", "currentBalance"];
          rows = balances.map(b => ({
            employeeCode: b.employee?.employeeCode || "",
            employeeName: b.employee ? `${b.employee.firstName} ${b.employee.lastName}` : "",
            leaveType: b.policy?.leaveType || "",
            year: b.year,
            openingBalance: b.openingBalance,
            accruedBalance: b.accruedBalance,
            usedBalance: b.usedBalance,
            adjustmentBalance: b.adjustmentBalance,
            currentBalance: b.currentBalance,
          }));
          filename = `${org.name.replace(/\s+/g, "_")}_leave_balances.csv`;
          break;
        }

        default:
          return res.status(400).json({ message: "Invalid export type" });
      }

      // Generate CSV
      const csvRows = [headers.join(",")];
      for (const row of rows) {
        const values = headers.map(h => escapeCSV(row[h]));
        csvRows.push(values.join(","));
      }
      const csvContent = csvRows.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/org/stats", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const stats = await storage.getOrgStats(req.appUser!.organizationId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employees", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const emps = await storage.getEmployeesByOrg(req.appUser!.organizationId!);
      res.json(emps);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employees", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const emp = await storage.createEmployee({
        ...req.body,
        organizationId: req.appUser!.organizationId!,
      });

      // Create initial employment period
      await storage.createEmploymentPeriod({
        employeeId: emp.id,
        organizationId: emp.organizationId,
        startDate: emp.dateOfJoining,
      });

      res.status(201).json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk upload employees (Org Admin)
  app.post("/api/employees/bulk", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const { employees: employeeData } = req.body;
      
      if (!Array.isArray(employeeData) || employeeData.length === 0) {
        return res.status(400).json({ message: "No employee data provided" });
      }

      const results: { success: number; errors: Array<{ row: number; message: string }> } = {
        success: 0,
        errors: []
      };

      for (let i = 0; i < employeeData.length; i++) {
        const row = employeeData[i];
        try {
          // Validate required fields
          if (!row.employeeCode || !row.firstName || !row.lastName || !row.email || !row.dateOfJoining) {
            results.errors.push({ row: i + 1, message: "Missing required fields (employeeCode, firstName, lastName, email, dateOfJoining)" });
            continue;
          }

          // Check for duplicate email
          const existingByEmail = await storage.getEmployeeByEmail(req.appUser!.organizationId!, row.email);
          if (existingByEmail) {
            results.errors.push({ row: i + 1, message: `Employee with email ${row.email} already exists` });
            continue;
          }

          // Check for duplicate employee code
          const existingByCode = await storage.getEmployeeByCode(req.appUser!.organizationId!, row.employeeCode);
          if (existingByCode) {
            results.errors.push({ row: i + 1, message: `Employee with code ${row.employeeCode} already exists` });
            continue;
          }

          const emp = await storage.createEmployee({
            employeeCode: row.employeeCode,
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone || null,
            department: row.department || null,
            designation: row.designation || null,
            dateOfJoining: row.dateOfJoining,
            salary: row.salary ? parseInt(row.salary) : null,
            address: row.address || null,
            emergencyContact: row.emergencyContact || null,
            organizationId: req.appUser!.organizationId!,
          });

          // Create initial employment period
          await storage.createEmploymentPeriod({
            employeeId: emp.id,
            organizationId: emp.organizationId,
            startDate: emp.dateOfJoining,
          });

          results.success++;
        } catch (err: any) {
          results.errors.push({ row: i + 1, message: err.message });
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/employees/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const existing = await storage.getEmployee(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }
      
      const emp = await storage.updateEmployee(req.params.id, req.body);
      res.json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employees/:id/exit", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const existing = await storage.getEmployee(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (existing.status === "exited") {
        return res.status(400).json({ message: "Employee is already exited" });
      }

      // Close the current employment period in history
      await storage.closeEmploymentPeriod(
        req.params.id,
        req.body.dateOfExit,
        req.body.exitReason
      );

      // Update employee status (but keep historical data - dateOfExit and exitReason on employee record)
      const emp = await storage.updateEmployee(req.params.id, {
        dateOfExit: req.body.dateOfExit,
        exitReason: req.body.exitReason,
        status: "exited",
      });
      res.json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get employment history for an employee
  app.get("/api/employees/:id/history", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const existing = await storage.getEmployee(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const history = await storage.getEmploymentHistory(req.params.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Rejoin an exited employee (preserves exit history)
  app.post("/api/employees/:id/rejoin", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const existing = await storage.getEmployee(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (existing.status !== "exited") {
        return res.status(400).json({ message: "Only exited employees can rejoin" });
      }

      const newJoinDate = req.body.rejoinDate || new Date().toISOString().split("T")[0];
      const rejoinNotes = req.body.rejoinNotes || null;

      // Create a new employment period (the old one was already closed on exit)
      await storage.createEmploymentPeriod({
        employeeId: req.params.id,
        organizationId: existing.organizationId,
        startDate: newJoinDate,
        rejoinNotes,
      });

      // Update employee status - keep previous exit info intact on record
      const emp = await storage.updateEmployee(req.params.id, {
        status: "active",
        dateOfJoining: newJoinDate, // New current join date
        // Don't clear dateOfExit/exitReason - they're historical data
      });
      res.json(emp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const monthFormatRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

  app.get("/api/attendance", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const month = req.query.month as string || new Date().toISOString().slice(0, 7);
      if (!monthFormatRegex.test(month)) {
        return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
      }
      const records = await storage.getAttendanceByOrg(req.appUser!.organizationId!, month);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/attendance/bulk", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const { records } = req.body;
      const orgId = req.appUser!.organizationId!;
      
      const enrichedRecords = records.map((r: any) => ({
        ...r,
        organizationId: orgId,
      }));

      await storage.createOrUpdateAttendance(enrichedRecords);
      res.status(200).json({ message: "Attendance saved" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/payslips", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const payslipList = await storage.getPayslipsByOrg(req.appUser!.organizationId!);
      const emps = await storage.getEmployeesByOrg(req.appUser!.organizationId!);
      
      const enriched = payslipList.map(p => ({
        ...p,
        employee: emps.find(e => e.id === p.employeeId),
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payslips/upload", requireAuth, requireOrgAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { employeeId, month, year } = req.body;
      
      const emp = await storage.getEmployee(employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(400).json({ message: "Invalid employee" });
      }

      const payslip = await storage.createPayslip({
        employeeId,
        organizationId: req.appUser!.organizationId!,
        month: parseInt(month),
        year: parseInt(year),
        fileName: req.file.originalname,
        fileUrl: `/uploads/payslips/${req.file.filename}`,
        fileSize: req.file.size,
      });

      res.status(201).json(payslip);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/payslips/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const payslip = await storage.getPayslip(req.params.id);
      if (!payslip || payslip.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Payslip not found" });
      }
      await storage.deletePayslip(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/holidays", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const org = req.appUser!.organization;
      const holidayList = await storage.getHolidaysByOrg(
        req.appUser!.organizationId!,
        org?.industry
      );
      res.json(holidayList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/holidays/upcoming", requireAuth, requireOrgMember, async (req, res) => {
    try {
      const org = req.appUser!.organization;
      const holidayList = await storage.getUpcomingHolidays(
        req.appUser!.organizationId!,
        org?.industry
      );
      res.json(holidayList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/holidays", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const holiday = await storage.createHoliday({
        ...req.body,
        organizationId: req.appUser!.organizationId!,
        isCustom: true,
      });
      res.status(201).json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/holidays/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const existing = await storage.getHoliday(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      const holiday = await storage.updateHoliday(req.params.id, req.body);
      res.json(holiday);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/holidays/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const existing = await storage.getHoliday(req.params.id);
      if (!existing || existing.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      await storage.deleteHoliday(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/user-accounts", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const users = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
      const emps = await storage.getEmployeesByOrg(req.appUser!.organizationId!);
      
      const enriched = users.filter(u => u.role === "employee").map(u => ({
        ...u,
        employee: emps.find(e => e.id === u.employeeId),
      }));
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/user-accounts", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const { employeeId } = req.body;
      
      const emp = await storage.getEmployee(employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(400).json({ message: "Invalid employee" });
      }

      const existingUsers = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
      if (existingUsers.some(u => u.employeeId === employeeId)) {
        return res.status(400).json({ message: "User account already exists for this employee" });
      }

      const existingByEmail = await storage.getAppUserByEmail(emp.email);
      if (existingByEmail) {
        return res.status(400).json({ message: "A user or invitation already exists for this email" });
      }

      const inviteToken = generateInviteToken();
      const tempPassword = await hashPassword(generateInviteToken());

      const user = await storage.createAppUser({
        email: emp.email.toLowerCase(),
        password: tempPassword,
        inviteToken,
        isPending: true,
        organizationId: req.appUser!.organizationId!,
        role: "employee",
        employeeId,
        isActive: false,
      });

      res.status(201).json({ ...user, inviteToken });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/user-accounts/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const user = await storage.updateAppUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/stats", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json({
          presentThisMonth: 0,
          absentThisMonth: 0,
          leaveThisMonth: 0,
          totalPayslips: 0,
        });
      }
      const stats = await storage.getEmployeeStats(req.appUser!.employeeId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/attendance", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const month = req.query.month as string;
      const records = await storage.getAttendanceByEmployee(req.appUser!.employeeId, month);
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/attendance/recent", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const records = await storage.getAttendanceByEmployee(req.appUser!.employeeId);
      res.json(records.slice(0, 10));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/payslips", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const payslipList = await storage.getPayslipsByEmployee(req.appUser!.employeeId);
      res.json(payslipList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.use("/uploads", (req, res, next) => {
    if (!req.appUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  });

  // Leave Requests - Employee endpoints
  app.get("/api/employee/leave-requests", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const requests = await storage.getLeaveRequestsByEmployee(req.appUser!.employeeId);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employee/leave-requests", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.status(400).json({ message: "Employee account required" });
      }

      // Validate dates
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      if (endDate < startDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      // Prevent cross-year leave requests
      if (startDate.getFullYear() !== endDate.getFullYear()) {
        return res.status(400).json({ message: "Leave requests cannot span across years. Please submit separate requests for each year." });
      }

      const request = await storage.createLeaveRequest({
        ...req.body,
        employeeId: req.appUser!.employeeId,
        organizationId: req.appUser!.organizationId!,
        status: "pending",
      });

      // Notify org admins about new leave request
      const orgAdmins = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
      const emp = await storage.getEmployee(req.appUser!.employeeId);
      for (const admin of orgAdmins.filter(u => u.role === "org_admin")) {
        await storage.createNotification({
          userId: admin.id,
          organizationId: req.appUser!.organizationId!,
          type: "leave_request",
          title: "New Leave Request",
          message: `${emp?.firstName} ${emp?.lastName} has requested leave from ${req.body.startDate} to ${req.body.endDate}`,
          relatedId: request.id,
          isRead: false,
        });
      }

      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leave Requests - Org Admin endpoints
  app.get("/api/leave-requests", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const requests = await storage.getLeaveRequestsByOrg(req.appUser!.organizationId!);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leave-requests/pending", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const requests = await storage.getPendingLeaveRequests(req.appUser!.organizationId!);
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leave-requests/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const request = await storage.getLeaveRequest(req.params.id);
      if (!request || request.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Leave request not found" });
      }

      const updated = await storage.updateLeaveRequest(req.params.id, {
        ...req.body,
        reviewedBy: req.appUser!.id,
      });

      // If approved, deduct from leave balance and create attendance records
      if (req.body.status === "approved" && request.policyId) {
        // Validate request doesn't span years (defensive check for legacy data)
        const startYear = new Date(request.startDate).getFullYear();
        const endYear = new Date(request.endDate).getFullYear();
        if (startYear !== endYear) {
          // Revert the approval
          await storage.updateLeaveRequest(req.params.id, {
            status: "rejected",
            reviewedBy: req.appUser!.id,
          });
          return res.status(400).json({ 
            message: `Cannot approve: Leave request spans multiple years (${startYear} to ${endYear}). Please reject this request and have the employee submit separate requests for each year.` 
          });
        }

        // Use the year from the leave start date to get the correct balance
        const leaveYear = startYear;
        const balance = await storage.getEmployeeLeaveBalance(request.employeeId, request.policyId, leaveYear);
        
        if (!balance) {
          // Revert the approval if no balance record exists
          await storage.updateLeaveRequest(req.params.id, {
            status: "pending",
            reviewedBy: undefined,
          });
          return res.status(400).json({ 
            message: `Cannot approve: No leave balance record found for year ${leaveYear}. Please ensure employee has initialized leave balances for this policy and year.` 
          });
        }

        const totalDays = parseFloat(request.totalDays) || 1;
        const currentUsed = parseFloat(balance.used);
        const currentBalance = parseFloat(balance.currentBalance);
        const newUsed = currentUsed + totalDays;
        const newBalance = currentBalance - totalDays;

        await storage.updateEmployeeLeaveBalance(balance.id, {
          used: String(newUsed),
          currentBalance: String(newBalance),
        });

        // Create transaction record
        await storage.createLeaveTransaction({
          employeeId: request.employeeId,
          balanceId: balance.id,
          policyId: request.policyId,
          organizationId: req.appUser!.organizationId!,
          transactionType: "request",
          amount: String(-totalDays),
          balanceAfter: String(newBalance),
          referenceId: request.id,
          notes: `Leave approved: ${request.startDate} to ${request.endDate}`,
          createdBy: req.appUser!.id,
        });

        // Create attendance records for each leave day
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        const attendanceRecords: any[] = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          attendanceRecords.push({
            employeeId: request.employeeId,
            organizationId: req.appUser!.organizationId!,
            date: dateStr,
            status: "leave",
            notes: `${request.leaveType} - Approved leave`,
          });
        }

        if (attendanceRecords.length > 0) {
          await storage.createOrUpdateAttendance(attendanceRecords);
        }
      }

      // Notify employee about decision
      const empUsers = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
      const empUser = empUsers.find(u => u.employeeId === request.employeeId);
      if (empUser) {
        const status = req.body.status;
        await storage.createNotification({
          userId: empUser.id,
          organizationId: req.appUser!.organizationId!,
          type: status === "approved" ? "leave_approved" : "leave_rejected",
          title: `Leave Request ${status === "approved" ? "Approved" : "Rejected"}`,
          message: `Your leave request from ${request.startDate} to ${request.endDate} has been ${status}`,
          relatedId: request.id,
          isRead: false,
        });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Leave Policies - Org Admin endpoints
  app.get("/api/leave-policies", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const policies = await storage.getLeavePoliciesByOrg(req.appUser!.organizationId!);
      res.json(policies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leave-policies/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const policy = await storage.getLeavePolicy(req.params.id);
      if (!policy || policy.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Leave policy not found" });
      }
      res.json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-policies", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const policy = await storage.createLeavePolicy({
        ...req.body,
        organizationId: req.appUser!.organizationId!,
      });
      res.status(201).json(policy);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leave-policies/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const policy = await storage.getLeavePolicy(req.params.id);
      if (!policy || policy.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Leave policy not found" });
      }
      const updated = await storage.updateLeavePolicy(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/leave-policies/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const policy = await storage.getLeavePolicy(req.params.id);
      if (!policy || policy.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Leave policy not found" });
      }
      await storage.deleteLeavePolicy(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee Leave Balances - Org Admin endpoints
  app.get("/api/leave-balances", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await storage.getAllLeaveBalancesByOrg(req.appUser!.organizationId!, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leave-balances/:employeeId", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const emp = await storage.getEmployee(req.params.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }
      const balances = await storage.getEmployeeLeaveBalances(req.params.employeeId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-balances/:employeeId/initialize", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const year = parseInt(req.body.year) || new Date().getFullYear();
      const emp = await storage.getEmployee(req.params.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }
      await storage.initializeEmployeeBalances(req.params.employeeId, req.appUser!.organizationId!, year);
      const balances = await storage.getEmployeeLeaveBalances(req.params.employeeId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leave-balances/:employeeId/adjust", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const { policyId, amount, notes } = req.body;
      const year = parseInt(req.body.year) || new Date().getFullYear();
      
      const emp = await storage.getEmployee(req.params.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }

      const balance = await storage.getEmployeeLeaveBalance(req.params.employeeId, policyId, year);
      if (!balance) {
        return res.status(404).json({ message: "Leave balance not found for this policy" });
      }

      const newBalance = balance.currentBalance + amount;
      const newAdjustment = balance.adjustment + amount;

      await storage.updateEmployeeLeaveBalance(balance.id, {
        adjustment: newAdjustment,
        currentBalance: newBalance,
      });

      // Create transaction record
      await storage.createLeaveTransaction({
        employeeId: req.params.employeeId,
        balanceId: balance.id,
        policyId,
        organizationId: req.appUser!.organizationId!,
        transactionType: "adjustment",
        amount,
        balanceAfter: newBalance,
        notes,
        createdBy: req.appUser!.id,
      });

      const updatedBalance = await storage.getEmployeeLeaveBalance(req.params.employeeId, policyId, year);
      res.json(updatedBalance);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee Leave Policies - read-only access for employees with active employee status
  app.get("/api/employee/leave-policies", requireAuth, requireOrgMember, async (req, res) => {
    try {
      // Require a valid employeeId for employee-level access
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }

      // Verify employee is active
      const emp = await storage.getEmployee(req.appUser!.employeeId);
      if (!emp || emp.status !== 'active' || emp.organizationId !== req.appUser!.organizationId) {
        return res.json([]);
      }

      const policies = await storage.getLeavePoliciesByOrg(req.appUser!.organizationId!);
      // Only return active policies to employees
      const activePolicies = policies.filter(p => p.isActive);
      res.json(activePolicies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee Leave Balances - Employee endpoints
  app.get("/api/employee/leave-balances", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await storage.getEmployeeLeaveBalances(req.appUser!.employeeId, year);
      res.json(balances);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/leave-transactions", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const transactions = await storage.getLeaveTransactionsByEmployee(req.appUser!.employeeId, year);
      res.json(transactions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time Entries - Employee endpoints
  app.get("/api/employee/time-entries", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const entries = await storage.getTimeEntriesByEmployee(req.appUser!.employeeId, startDate, endDate);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/employee/time-entries/today", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const entries = await storage.getTodayTimeEntries(req.appUser!.employeeId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/employee/time-entries", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.status(400).json({ message: "Employee account required" });
      }

      const today = new Date().toISOString().split('T')[0];
      const entry = await storage.createTimeEntry({
        employeeId: req.appUser!.employeeId,
        organizationId: req.appUser!.organizationId!,
        date: today,
        entryType: req.body.entryType,
        entryTime: new Date(),
        notes: req.body.notes || null,
      });
      res.status(201).json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Time Entries - Org Admin endpoints
  app.get("/api/time-entries", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const entries = await storage.getTimeEntriesByOrg(req.appUser!.organizationId!, startDate, endDate);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/time-entries/:employeeId", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const emp = await storage.getEmployee(req.params.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Employee not found" });
      }
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const entries = await storage.getTimeEntriesByEmployee(req.params.employeeId, startDate, endDate);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comp Off Grants - Employee endpoints
  app.get("/api/employee/comp-off-grants", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const grants = await storage.getCompOffGrantsByEmployee(req.appUser!.employeeId);
      res.json(grants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Comp Off Grants - Org Admin endpoints
  app.get("/api/comp-off-grants", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const grants = await storage.getCompOffGrantsByOrg(req.appUser!.organizationId!);
      res.json(grants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/comp-off-grants/pending", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const grants = await storage.getPendingCompOffGrants(req.appUser!.organizationId!);
      res.json(grants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/comp-off-grants", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const emp = await storage.getEmployee(req.body.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(400).json({ message: "Invalid employee" });
      }

      const grant = await storage.createCompOffGrant({
        employeeId: req.body.employeeId,
        organizationId: req.appUser!.organizationId!,
        workDate: req.body.workDate,
        hoursWorked: req.body.hoursWorked || "8",
        daysGranted: req.body.daysGranted,
        source: req.body.source,
        reason: req.body.reason || null,
        grantedBy: req.appUser!.id,
        isApplied: false,
      });

      // Notify employee about the comp off grant
      const empUsers = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
      const empUser = empUsers.find(u => u.employeeId === req.body.employeeId);
      if (empUser) {
        await storage.createNotification({
          userId: empUser.id,
          organizationId: req.appUser!.organizationId!,
          type: "general",
          title: "Comp Off Granted",
          message: `You have been granted ${req.body.daysGranted} day(s) of compensatory off for ${req.body.source.replace('_', ' ')}`,
          relatedId: grant.id,
          isRead: false,
        });
      }

      res.status(201).json(grant);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/comp-off-grants/:id/apply", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const grants = await storage.getCompOffGrantsByOrg(req.appUser!.organizationId!);
      const grant = grants.find(g => g.id === req.params.id);
      if (!grant) {
        return res.status(404).json({ message: "Comp off grant not found" });
      }
      if (grant.isApplied) {
        return res.status(400).json({ message: "Comp off already applied to balance" });
      }

      // Find COMP_OFF leave policy for this org
      const policies = await storage.getLeavePoliciesByOrg(req.appUser!.organizationId!);
      const compOffPolicy = policies.find(p => p.code === 'COMP_OFF' && p.isActive);
      if (!compOffPolicy) {
        return res.status(400).json({ message: "No active COMP_OFF leave policy found" });
      }

      // Get or create balance for current year
      const year = new Date().getFullYear();
      let balance = await storage.getEmployeeLeaveBalance(grant.employeeId, compOffPolicy.id, year);
      if (!balance) {
        balance = await storage.createEmployeeLeaveBalance({
          employeeId: grant.employeeId,
          policyId: compOffPolicy.id,
          organizationId: req.appUser!.organizationId!,
          year,
          openingBalance: "0",
          accrued: "0",
          used: "0",
          adjustment: "0",
          currentBalance: "0",
        });
      }

      // Add grant to balance
      const grantAmount = parseFloat(grant.daysGranted);
      const newAccrued = parseFloat(balance.accrued) + grantAmount;
      const newBalance = parseFloat(balance.currentBalance) + grantAmount;

      await storage.updateEmployeeLeaveBalance(balance.id, {
        accrued: String(newAccrued),
        currentBalance: String(newBalance),
      });

      // Create transaction
      await storage.createLeaveTransaction({
        employeeId: grant.employeeId,
        balanceId: balance.id,
        policyId: compOffPolicy.id,
        organizationId: req.appUser!.organizationId!,
        transactionType: "accrual",
        amount: String(grantAmount),
        balanceAfter: String(newBalance),
        notes: `Comp Off grant: ${grant.source.replace('_', ' ')} on ${grant.workDate}`,
        createdBy: req.appUser!.id,
      });

      // Mark grant as applied
      const updated = await storage.applyCompOffGrant(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Onboarding Tasks - Org Admin endpoints
  app.get("/api/onboarding-tasks", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const tasks = await storage.getOnboardingTasksByOrg(req.appUser!.organizationId!);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/onboarding-tasks/pending", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const tasks = await storage.getPendingOnboardingTasks(req.appUser!.organizationId!);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/onboarding-tasks", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const emp = await storage.getEmployee(req.body.employeeId);
      if (!emp || emp.organizationId !== req.appUser!.organizationId) {
        return res.status(400).json({ message: "Invalid employee" });
      }

      const task = await storage.createOnboardingTask({
        ...req.body,
        organizationId: req.appUser!.organizationId!,
        status: "pending",
      });

      // Notify assigned user if any
      if (req.body.assignedTo) {
        await storage.createNotification({
          userId: req.body.assignedTo,
          organizationId: req.appUser!.organizationId!,
          type: "onboarding_task",
          title: "New Onboarding Task Assigned",
          message: `New task: ${req.body.title} for ${emp.firstName} ${emp.lastName}`,
          relatedId: task.id,
          isRead: false,
        });
      }

      res.status(201).json(task);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/onboarding-tasks/:id", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const task = await storage.getOnboardingTask(req.params.id);
      if (!task || task.organizationId !== req.appUser!.organizationId) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updateData: any = { ...req.body };
      if (req.body.status === "completed" && task.status !== "completed") {
        updateData.completedAt = new Date();
      }

      const updated = await storage.updateOnboardingTask(req.params.id, updateData);

      // If task completed, notify org admins
      if (req.body.status === "completed" && task.status !== "completed") {
        const orgAdmins = await storage.getAppUsersByOrg(req.appUser!.organizationId!);
        for (const admin of orgAdmins.filter(u => u.role === "org_admin" && u.id !== req.appUser!.id)) {
          await storage.createNotification({
            userId: admin.id,
            organizationId: req.appUser!.organizationId!,
            type: "task_completed",
            title: "Onboarding Task Completed",
            message: `Task "${task.title}" has been completed`,
            relatedId: task.id,
            isRead: false,
          });
        }
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Employee onboarding tasks
  app.get("/api/employee/onboarding-tasks", requireAuth, requireOrgMember, async (req, res) => {
    try {
      if (!req.appUser!.employeeId) {
        return res.json([]);
      }
      const tasks = await storage.getOnboardingTasksByEmployee(req.appUser!.employeeId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notificationList = await storage.getNotificationsByUser(req.appUser!.id);
      res.json(notificationList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/notifications/unread", requireAuth, async (req, res) => {
    try {
      const notificationList = await storage.getUnreadNotifications(req.appUser!.id);
      res.json(notificationList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.appUser!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pending approvals count for dashboard
  app.get("/api/pending-approvals", requireAuth, requireOrgAdmin, async (req, res) => {
    try {
      const pendingLeave = await storage.getPendingLeaveRequests(req.appUser!.organizationId!);
      const pendingTasks = await storage.getPendingOnboardingTasks(req.appUser!.organizationId!);
      res.json({
        leaveRequests: pendingLeave.length,
        onboardingTasks: pendingTasks.length,
        total: pendingLeave.length + pendingTasks.length,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
