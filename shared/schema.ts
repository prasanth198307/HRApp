import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, date, timestamp, pgEnum, numeric } from "drizzle-orm/pg-core";
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
export const leaveStatusEnum = pgEnum("leave_status", ["pending", "approved", "rejected"]);
export const leaveTypeEnum = pgEnum("leave_type", ["annual", "sick", "personal", "maternity", "paternity", "unpaid", "other"]);
export const leavePolicyCodeEnum = pgEnum("leave_policy_code", ["CL", "PL", "SL", "COMP_OFF"]);
export const accrualMethodEnum = pgEnum("accrual_method", ["monthly", "yearly", "none"]);
export const carryForwardTypeEnum = pgEnum("carry_forward_type", ["none", "limited", "unlimited"]);
export const leaveTransactionTypeEnum = pgEnum("leave_transaction_type", ["accrual", "request", "adjustment", "carry_forward", "lapse"]);
export const notificationTypeEnum = pgEnum("notification_type", ["leave_request", "leave_approved", "leave_rejected", "onboarding_task", "task_completed", "general", "password_reset_request"]);
export const onboardingTaskStatusEnum = pgEnum("onboarding_task_status", ["pending", "in_progress", "completed"]);
export const timeEntryTypeEnum = pgEnum("time_entry_type", ["check_in", "check_out"]);
export const halfDaySessionEnum = pgEnum("half_day_session", ["AM", "PM"]);
export const compOffSourceEnum = pgEnum("comp_off_source", ["overtime", "holiday_work", "manual"]);
export const documentTypeEnum = pgEnum("document_type", ["offer_letter", "appointment_letter", "aadhar", "pan", "photo", "other"]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code"),
  legalName: text("legal_name"),
  industry: industryEnum("industry").notNull().default("other"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoUrl: text("logo_url"),
  gstNumber: text("gst_number"),
  panNumber: text("pan_number"),
  tanNumber: text("tan_number"),
  cinNumber: text("cin_number"),
  udyamNumber: text("udyam_number"),
  fssaiNumber: text("fssai_number"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// App Users (extends auth users with role and org)
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  role: userRoleEnum("role").notNull().default("employee"),
  employeeId: varchar("employee_id"),
  isActive: boolean("is_active").notNull().default(true),
  inviteToken: varchar("invite_token"),
  isPending: boolean("is_pending").notNull().default(false),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
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

// Employee Documents table
export const employeeDocuments = pgTable("employee_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  documentType: documentTypeEnum("document_type").notNull(),
  documentName: text("document_name"),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => appUsers.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Employment Periods table (tracks employment history - join/exit cycles)
export const employmentPeriods = pgTable("employment_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  exitReason: text("exit_reason"),
  rejoinNotes: text("rejoin_notes"),
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

// Leave Requests table
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  policyId: varchar("policy_id").references(() => leavePolicies.id), // Reference to leave policy
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: numeric("total_days", { precision: 4, scale: 1 }).notNull().default("1"), // Support 0.5 for half days
  isHalfDay: boolean("is_half_day").notNull().default(false), // True if requesting half day
  halfDaySession: halfDaySessionEnum("half_day_session"), // AM or PM for half-day requests
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("pending"),
  reviewedBy: varchar("reviewed_by").references(() => appUsers.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Onboarding Tasks table
export const onboardingTasks = pgTable("onboarding_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date"),
  status: onboardingTaskStatusEnum("status").notNull().default("pending"),
  assignedTo: varchar("assigned_to").references(() => appUsers.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Requests table
export const passwordResetRequests = pgTable("password_reset_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, dismissed
  completedBy: varchar("completed_by").references(() => appUsers.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Policies table (organization-specific leave configuration)
export const leavePolicies = pgTable("leave_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  code: leavePolicyCodeEnum("code").notNull(), // CL, PL, SL, COMP_OFF
  displayName: text("display_name").notNull(), // Casual Leave, Privilege Leave, etc.
  annualQuota: integer("annual_quota").notNull().default(0), // Total leaves per year
  accrualMethod: accrualMethodEnum("accrual_method").notNull().default("yearly"), // How leaves are credited
  monthlyAccrualRate: integer("monthly_accrual_rate").default(0), // If monthly accrual, how many per month
  carryForwardType: carryForwardTypeEnum("carry_forward_type").notNull().default("none"),
  carryForwardLimit: integer("carry_forward_limit").default(0), // Max leaves that can be carried forward
  allowNegativeBalance: boolean("allow_negative_balance").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Employee Leave Balances table
export const employeeLeaveBalances = pgTable("employee_leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  policyId: varchar("policy_id").notNull().references(() => leavePolicies.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  year: integer("year").notNull(), // Financial year
  openingBalance: numeric("opening_balance", { precision: 6, scale: 1 }).notNull().default("0"), // Balance at start of year (carry forward)
  accrued: numeric("accrued", { precision: 6, scale: 1 }).notNull().default("0"), // Total accrued during the year
  used: numeric("used", { precision: 6, scale: 1 }).notNull().default("0"), // Total used during the year (supports half days)
  adjustment: numeric("adjustment", { precision: 6, scale: 1 }).notNull().default("0"), // Manual adjustments (+/-)
  currentBalance: numeric("current_balance", { precision: 6, scale: 1 }).notNull().default("0"), // Computed: opening + accrued - used + adjustment
  lastAccruedAt: timestamp("last_accrued_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leave Transactions table (audit trail)
export const leaveTransactions = pgTable("leave_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  balanceId: varchar("balance_id").notNull().references(() => employeeLeaveBalances.id),
  policyId: varchar("policy_id").notNull().references(() => leavePolicies.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  transactionType: leaveTransactionTypeEnum("transaction_type").notNull(),
  amount: numeric("amount", { precision: 6, scale: 1 }).notNull(), // Positive for credit, negative for debit (supports 0.5)
  balanceAfter: numeric("balance_after", { precision: 6, scale: 1 }).notNull(), // Balance after this transaction
  referenceId: varchar("reference_id"), // e.g., leave request ID
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => appUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => appUsers.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Time Entries table (check-in/check-out tracking)
export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  attendanceId: varchar("attendance_id").references(() => attendance.id),
  date: date("date").notNull(),
  entryType: timeEntryTypeEnum("entry_type").notNull(), // check_in or check_out
  entryTime: timestamp("entry_time").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comp Off Grants table (track comp off credits from overtime/holiday work)
export const compOffGrants = pgTable("comp_off_grants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  workDate: date("work_date").notNull(), // Date when overtime/holiday work occurred
  hoursWorked: numeric("hours_worked", { precision: 4, scale: 2 }).notNull(), // Hours worked
  daysGranted: numeric("days_granted", { precision: 4, scale: 1 }).notNull(), // Comp off days earned (e.g., 0.5 or 1)
  source: compOffSourceEnum("source").notNull(), // overtime, holiday_work, or manual
  reason: text("reason"),
  isApplied: boolean("is_applied").notNull().default(false), // Has this been added to balance
  appliedAt: timestamp("applied_at"),
  grantedBy: varchar("granted_by").references(() => appUsers.id),
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

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  employee: one(employees, {
    fields: [leaveRequests.employeeId],
    references: [employees.id],
  }),
  organization: one(organizations, {
    fields: [leaveRequests.organizationId],
    references: [organizations.id],
  }),
  reviewer: one(appUsers, {
    fields: [leaveRequests.reviewedBy],
    references: [appUsers.id],
  }),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({ one }) => ({
  employee: one(employees, {
    fields: [onboardingTasks.employeeId],
    references: [employees.id],
  }),
  organization: one(organizations, {
    fields: [onboardingTasks.organizationId],
    references: [organizations.id],
  }),
  assignee: one(appUsers, {
    fields: [onboardingTasks.assignedTo],
    references: [appUsers.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(appUsers, {
    fields: [notifications.userId],
    references: [appUsers.id],
  }),
  organization: one(organizations, {
    fields: [notifications.organizationId],
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

export const insertEmploymentPeriodSchema = createInsertSchema(employmentPeriods).omit({
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

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertOnboardingTaskSchema = createInsertSchema(onboardingTasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetRequestSchema = createInsertSchema(passwordResetRequests).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertLeavePolicySchema = createInsertSchema(leavePolicies).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeLeaveBalanceSchema = createInsertSchema(employeeLeaveBalances).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveTransactionSchema = createInsertSchema(leaveTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  createdAt: true,
});

export const insertCompOffGrantSchema = createInsertSchema(compOffGrants).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeDocumentSchema = createInsertSchema(employeeDocuments).omit({
  id: true,
  uploadedAt: true,
});

// Types
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertAppUser = z.infer<typeof insertAppUserSchema>;
export type AppUser = typeof appUsers.$inferSelect;

export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export type InsertEmploymentPeriod = z.infer<typeof insertEmploymentPeriodSchema>;
export type EmploymentPeriod = typeof employmentPeriods.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslips.$inferSelect;

export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

export type InsertOnboardingTask = z.infer<typeof insertOnboardingTaskSchema>;
export type OnboardingTask = typeof onboardingTasks.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertPasswordResetRequest = z.infer<typeof insertPasswordResetRequestSchema>;
export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;

export type InsertLeavePolicy = z.infer<typeof insertLeavePolicySchema>;
export type LeavePolicy = typeof leavePolicies.$inferSelect;

export type InsertEmployeeLeaveBalance = z.infer<typeof insertEmployeeLeaveBalanceSchema>;
export type EmployeeLeaveBalance = typeof employeeLeaveBalances.$inferSelect;

export type InsertLeaveTransaction = z.infer<typeof insertLeaveTransactionSchema>;
export type LeaveTransaction = typeof leaveTransactions.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export type InsertCompOffGrant = z.infer<typeof insertCompOffGrantSchema>;
export type CompOffGrant = typeof compOffGrants.$inferSelect;

export type InsertEmployeeDocument = z.infer<typeof insertEmployeeDocumentSchema>;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;

// Document type options for frontend
export const documentTypeOptions = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "appointment_letter", label: "Appointment Letter" },
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "photo", label: "Passport Photo" },
  { value: "other", label: "Other Document" },
] as const;

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

export const leaveTypeOptions = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "other", label: "Other" },
] as const;

export const leaveStatusOptions = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "approved", label: "Approved", color: "green" },
  { value: "rejected", label: "Rejected", color: "red" },
] as const;

export const onboardingTaskStatusOptions = [
  { value: "pending", label: "Pending", color: "gray" },
  { value: "in_progress", label: "In Progress", color: "blue" },
  { value: "completed", label: "Completed", color: "green" },
] as const;

export const leavePolicyCodeOptions = [
  { value: "CL", label: "Casual Leave", color: "blue" },
  { value: "PL", label: "Privilege Leave", color: "green" },
  { value: "SL", label: "Sick Leave", color: "orange" },
  { value: "COMP_OFF", label: "Compensatory Off", color: "purple" },
] as const;

export const accrualMethodOptions = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly (Full credit at start)" },
  { value: "none", label: "No Accrual (Manual only)" },
] as const;

export const carryForwardTypeOptions = [
  { value: "none", label: "No Carry Forward" },
  { value: "limited", label: "Limited (with max limit)" },
  { value: "unlimited", label: "Unlimited Carry Forward" },
] as const;
