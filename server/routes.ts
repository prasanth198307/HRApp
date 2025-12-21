import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import type { AppUser } from "@shared/schema";
import { setupAuth, registerAuthRoutes, appUserMiddleware, hashPassword } from "./auth";

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
  fssaiNumber: z.string().nullable().optional().transform(v => v?.trim() || null),
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

  app.post("/api/org-admins", requireAuth, requireSuperAdmin, async (req, res) => {
    try {
      const { organizationId, email } = req.body;
      
      if (!email || !organizationId) {
        return res.status(400).json({ message: "Email and organization are required" });
      }
      
      const existingByEmail = await storage.getAppUserByEmail(email);
      if (existingByEmail) {
        return res.status(400).json({ message: "A user or invitation already exists for this email" });
      }

      const inviteToken = generateInviteToken();
      const tempPassword = await hashPassword(generateInviteToken());
      
      const appUser = await storage.createAppUser({
        email: email.toLowerCase(),
        password: tempPassword,
        inviteToken,
        isPending: true,
        organizationId,
        role: "org_admin",
        isActive: false,
      });
      
      res.status(201).json({ ...appUser, inviteToken });
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
      res.status(201).json(emp);
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
        reviewedAt: new Date(),
      });

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
