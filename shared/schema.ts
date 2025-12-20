import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["super_admin", "org_admin", "employee"]);
export const industryEnum = pgEnum("industry", [
  "technology", "healthcare", "finance", "education", "manufacturing", 
  "retail", "hospitality", "construction", "government", "other"
]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "half_day", "leave", "holiday"]);
export const employmentStatusEnum = pgEnum("employment_status", ["active", "exited", "on_notice"]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  industry: industryEnum("industry").notNull().default("other"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// App Users (extends auth users with role and org)
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authUserId: varchar("auth_user_id"),
  inviteEmail: varchar("invite_email"),
  inviteToken: varchar("invite_token"),
  isPending: boolean("is_pending").notNull().default(false),
  organizationId: varchar("organization_id").references(() => organizations.id),
  role: userRoleEnum("role").notNull().default("employee"),
  employeeId: varchar("employee_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employees table
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  employeeCode: text("employee_code").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  department: text("department"),
  designation: text("designation"),
  dateOfJoining: date("date_of_joining").notNull(),
  dateOfExit: date("date_of_exit"),
  status: employmentStatusEnum("status").notNull().default("active"),
  exitReason: text("exit_reason"),
  salary: integer("salary"),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  date: date("date").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payslips table
export const payslips = pgTable("payslips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Holidays table
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  date: date("date").notNull(),
  industry: industryEnum("industry"),
  isNational: boolean("is_national").notNull().default(false),
  isCustom: boolean("is_custom").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  employees: many(employees),
  appUsers: many(appUsers),
  attendance: many(attendance),
  payslips: many(payslips),
  holidays: many(holidays),
}));

export const appUsersRelations = relations(appUsers, ({ one }) => ({
  organization: one(organizations, {
    fields: [appUsers.organizationId],
    references: [organizations.id],
  }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [employees.organizationId],
    references: [organizations.id],
  }),
  attendance: many(attendance),
  payslips: many(payslips),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  employee: one(employees, {
    fields: [attendance.employeeId],
    references: [employees.id],
  }),
  organization: one(organizations, {
    fields: [attendance.organizationId],
    references: [organizations.id],
  }),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  organization: one(organizations, {
    fields: [payslips.organizationId],
    references: [organizations.id],
  }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  organization: one(organizations, {
    fields: [holidays.organizationId],
    references: [organizations.id],
  }),
}));

// Insert Schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertAppUserSchema = createInsertSchema(appUsers).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
});

export const insertPayslipSchema = createInsertSchema(payslips).omit({
  id: true,
  uploadedAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type AppUser = typeof appUsers.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslips.$inferSelect;

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

// Industry options for frontend
export const industryOptions = [
  { value: "technology", label: "Technology" },
  { value: "healthcare", label: "Healthcare" },
  { value: "finance", label: "Finance" },
  { value: "education", label: "Education" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "hospitality", label: "Hospitality" },
  { value: "construction", label: "Construction" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
] as const;

export const attendanceStatusOptions = [
  { value: "present", label: "Present", color: "green" },
  { value: "absent", label: "Absent", color: "red" },
  { value: "half_day", label: "Half Day", color: "yellow" },
  { value: "leave", label: "Leave", color: "blue" },
  { value: "holiday", label: "Holiday", color: "purple" },
] as const;

export const employmentStatusOptions = [
  { value: "active", label: "Active" },
  { value: "exited", label: "Exited" },
  { value: "on_notice", label: "On Notice" },
] as const;
