import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql, or } from "drizzle-orm";
import {
  organizations,
  appUsers,
  employees,
  attendance,
  payslips,
  holidays,
  leaveRequests,
  onboardingTasks,
  notifications,
  type InsertOrganization,
  type Organization,
  type InsertAppUser,
  type AppUser,
  type InsertEmployee,
  type Employee,
  type InsertAttendance,
  type Attendance,
  type InsertPayslip,
  type Payslip,
  type InsertHoliday,
  type Holiday,
  type InsertLeaveRequest,
  type LeaveRequest,
  type InsertOnboardingTask,
  type OnboardingTask,
  type InsertNotification,
  type Notification,
} from "@shared/schema";

export interface IStorage {
  // Organizations
  getOrganizations(): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined>;
  updateOrganizationStatus(id: string, isActive: boolean): Promise<Organization | undefined>;
  
  // App Users
  getAppUserByEmail(email: string): Promise<AppUser | undefined>;
  getAppUserById(id: string): Promise<AppUser | undefined>;
  getAppUserByInviteToken(token: string): Promise<AppUser | undefined>;
  getAppUsersByOrg(organizationId: string): Promise<AppUser[]>;
  getAllAppUsers(): Promise<AppUser[]>;
  createAppUser(user: InsertAppUser): Promise<AppUser>;
  updateAppUser(id: string, data: Partial<InsertAppUser>): Promise<AppUser | undefined>;
  updateAppUserPassword(id: string, hashedPassword: string): Promise<void>;
  
  // Employees
  getEmployeesByOrg(organizationId: string): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(organizationId: string, email: string): Promise<Employee | undefined>;
  createEmployee(emp: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined>;
  
  // Attendance
  getAttendanceByOrg(organizationId: string, month: string): Promise<Attendance[]>;
  getAttendanceByEmployee(employeeId: string, month?: string): Promise<Attendance[]>;
  createOrUpdateAttendance(records: InsertAttendance[]): Promise<void>;
  
  // Payslips
  getPayslipsByOrg(organizationId: string): Promise<Payslip[]>;
  getPayslipsByEmployee(employeeId: string): Promise<Payslip[]>;
  getPayslip(id: string): Promise<Payslip | undefined>;
  createPayslip(payslip: InsertPayslip): Promise<Payslip>;
  deletePayslip(id: string): Promise<void>;
  
  // Holidays
  getHolidaysByOrg(organizationId: string, industry?: string): Promise<Holiday[]>;
  getDefaultHolidays(): Promise<Holiday[]>;
  getUpcomingHolidays(organizationId: string, industry?: string): Promise<Holiday[]>;
  getHoliday(id: string): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: string, data: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: string): Promise<void>;
  
  // Leave Requests
  getLeaveRequestsByOrg(organizationId: string): Promise<LeaveRequest[]>;
  getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getPendingLeaveRequests(organizationId: string): Promise<LeaveRequest[]>;
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  
  // Onboarding Tasks
  getOnboardingTasksByOrg(organizationId: string): Promise<OnboardingTask[]>;
  getOnboardingTasksByEmployee(employeeId: string): Promise<OnboardingTask[]>;
  getPendingOnboardingTasks(organizationId: string): Promise<OnboardingTask[]>;
  getOnboardingTask(id: string): Promise<OnboardingTask | undefined>;
  createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask>;
  updateOnboardingTask(id: string, data: Partial<InsertOnboardingTask>): Promise<OnboardingTask | undefined>;
  
  // Notifications
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  
  // Stats
  getSuperAdminStats(): Promise<{
    totalOrganizations: number;
    activeOrganizations: number;
    totalEmployees: number;
    industriesBreakdown: Record<string, number>;
  }>;
  getOrgStats(organizationId: string): Promise<{
    totalEmployees: number;
    activeEmployees: number;
    exitedEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
  }>;
  getEmployeeStats(employeeId: string): Promise<{
    presentThisMonth: number;
    absentThisMonth: number;
    leaveThisMonth: number;
    totalPayslips: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async getOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return updated;
  }

  async updateOrganizationStatus(id: string, isActive: boolean): Promise<Organization | undefined> {
    const [updated] = await db.update(organizations).set({ isActive }).where(eq(organizations.id, id)).returning();
    return updated;
  }

  // App Users
  async getAppUserByEmail(email: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.email, email.toLowerCase()));
    return user;
  }

  async getAppUserById(id: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return user;
  }

  async getAppUserByInviteToken(token: string): Promise<AppUser | undefined> {
    const [user] = await db.select().from(appUsers).where(
      and(
        eq(appUsers.inviteToken, token),
        eq(appUsers.isPending, true)
      )
    );
    return user;
  }

  async getAppUsersByOrg(organizationId: string): Promise<AppUser[]> {
    return db.select().from(appUsers).where(eq(appUsers.organizationId, organizationId));
  }

  async getAllAppUsers(): Promise<AppUser[]> {
    return db.select().from(appUsers);
  }

  async createAppUser(user: InsertAppUser): Promise<AppUser> {
    const [created] = await db.insert(appUsers).values(user).returning();
    return created;
  }

  async updateAppUser(id: string, data: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    const [updated] = await db.update(appUsers).set(data).where(eq(appUsers.id, id)).returning();
    return updated;
  }

  async updateAppUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(appUsers).set({ password: hashedPassword }).where(eq(appUsers.id, id));
  }

  // Employees
  async getEmployeesByOrg(organizationId: string): Promise<Employee[]> {
    return db.select().from(employees).where(eq(employees.organizationId, organizationId)).orderBy(asc(employees.firstName));
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  }

  async getEmployeeByEmail(organizationId: string, email: string): Promise<Employee | undefined> {
    const [emp] = await db.select().from(employees).where(
      and(eq(employees.organizationId, organizationId), eq(employees.email, email))
    );
    return emp;
  }

  async createEmployee(emp: InsertEmployee): Promise<Employee> {
    const [created] = await db.insert(employees).values(emp).returning();
    return created;
  }

  async updateEmployee(id: string, data: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const [updated] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
    return updated;
  }

  // Attendance
  private getMonthEndDate(month: string): string {
    const [year, mon] = month.split('-').map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    return `${month}-${String(lastDay).padStart(2, '0')}`;
  }

  async getAttendanceByOrg(organizationId: string, month: string): Promise<Attendance[]> {
    const startDate = `${month}-01`;
    const endDate = this.getMonthEndDate(month);
    return db.select().from(attendance).where(
      and(
        eq(attendance.organizationId, organizationId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate)
      )
    );
  }

  async getAttendanceByEmployee(employeeId: string, month?: string): Promise<Attendance[]> {
    if (month) {
      const startDate = `${month}-01`;
      const endDate = this.getMonthEndDate(month);
      return db.select().from(attendance).where(
        and(
          eq(attendance.employeeId, employeeId),
          gte(attendance.date, startDate),
          lte(attendance.date, endDate)
        )
      ).orderBy(desc(attendance.date));
    }
    return db.select().from(attendance).where(eq(attendance.employeeId, employeeId)).orderBy(desc(attendance.date));
  }

  async createOrUpdateAttendance(records: InsertAttendance[]): Promise<void> {
    for (const record of records) {
      const existing = await db.select().from(attendance).where(
        and(
          eq(attendance.employeeId, record.employeeId),
          eq(attendance.date, record.date)
        )
      );

      if (existing.length > 0) {
        await db.update(attendance).set(record).where(eq(attendance.id, existing[0].id));
      } else {
        await db.insert(attendance).values(record);
      }
    }
  }

  // Payslips
  async getPayslipsByOrg(organizationId: string): Promise<Payslip[]> {
    return db.select().from(payslips).where(eq(payslips.organizationId, organizationId)).orderBy(desc(payslips.uploadedAt));
  }

  async getPayslipsByEmployee(employeeId: string): Promise<Payslip[]> {
    return db.select().from(payslips).where(eq(payslips.employeeId, employeeId)).orderBy(desc(payslips.year), desc(payslips.month));
  }

  async getPayslip(id: string): Promise<Payslip | undefined> {
    const [payslip] = await db.select().from(payslips).where(eq(payslips.id, id));
    return payslip;
  }

  async createPayslip(payslip: InsertPayslip): Promise<Payslip> {
    const [created] = await db.insert(payslips).values(payslip).returning();
    return created;
  }

  async deletePayslip(id: string): Promise<void> {
    await db.delete(payslips).where(eq(payslips.id, id));
  }

  // Holidays
  async getHolidaysByOrg(organizationId: string, industry?: string): Promise<Holiday[]> {
    const orgHolidays = await db.select().from(holidays).where(eq(holidays.organizationId, organizationId));
    
    const defaultHolidays = await db.select().from(holidays).where(
      and(
        sql`${holidays.organizationId} IS NULL`,
        or(
          sql`${holidays.industry} IS NULL`,
          industry ? eq(holidays.industry, industry as any) : sql`1=1`
        )
      )
    );

    return [...orgHolidays, ...defaultHolidays].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async getDefaultHolidays(): Promise<Holiday[]> {
    return db.select().from(holidays).where(sql`${holidays.organizationId} IS NULL`).orderBy(asc(holidays.date));
  }

  async getUpcomingHolidays(organizationId: string, industry?: string): Promise<Holiday[]> {
    const today = new Date().toISOString().split('T')[0];
    const allHolidays = await this.getHolidaysByOrg(organizationId, industry);
    return allHolidays.filter(h => h.date >= today);
  }

  async getHoliday(id: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [created] = await db.insert(holidays).values(holiday).returning();
    return created;
  }

  async updateHoliday(id: string, data: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const [updated] = await db.update(holidays).set(data).where(eq(holidays.id, id)).returning();
    return updated;
  }

  async deleteHoliday(id: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  // Leave Requests
  async getLeaveRequestsByOrg(organizationId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.organizationId, organizationId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequestsByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId)).orderBy(desc(leaveRequests.createdAt));
  }

  async getPendingLeaveRequests(organizationId: string): Promise<LeaveRequest[]> {
    return db.select().from(leaveRequests).where(
      and(
        eq(leaveRequests.organizationId, organizationId),
        eq(leaveRequests.status, "pending")
      )
    ).orderBy(desc(leaveRequests.createdAt));
  }

  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const [request] = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return request;
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [created] = await db.insert(leaveRequests).values(request).returning();
    return created;
  }

  async updateLeaveRequest(id: string, data: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const [updated] = await db.update(leaveRequests).set(data).where(eq(leaveRequests.id, id)).returning();
    return updated;
  }

  // Onboarding Tasks
  async getOnboardingTasksByOrg(organizationId: string): Promise<OnboardingTask[]> {
    return db.select().from(onboardingTasks).where(eq(onboardingTasks.organizationId, organizationId)).orderBy(desc(onboardingTasks.createdAt));
  }

  async getOnboardingTasksByEmployee(employeeId: string): Promise<OnboardingTask[]> {
    return db.select().from(onboardingTasks).where(eq(onboardingTasks.employeeId, employeeId)).orderBy(asc(onboardingTasks.dueDate));
  }

  async getPendingOnboardingTasks(organizationId: string): Promise<OnboardingTask[]> {
    return db.select().from(onboardingTasks).where(
      and(
        eq(onboardingTasks.organizationId, organizationId),
        or(
          eq(onboardingTasks.status, "pending"),
          eq(onboardingTasks.status, "in_progress")
        )
      )
    ).orderBy(asc(onboardingTasks.dueDate));
  }

  async getOnboardingTask(id: string): Promise<OnboardingTask | undefined> {
    const [task] = await db.select().from(onboardingTasks).where(eq(onboardingTasks.id, id));
    return task;
  }

  async createOnboardingTask(task: InsertOnboardingTask): Promise<OnboardingTask> {
    const [created] = await db.insert(onboardingTasks).values(task).returning();
    return created;
  }

  async updateOnboardingTask(id: string, data: Partial<InsertOnboardingTask>): Promise<OnboardingTask | undefined> {
    const [updated] = await db.update(onboardingTasks).set(data).where(eq(onboardingTasks.id, id)).returning();
    return updated;
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    ).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // Stats
  async getSuperAdminStats() {
    const orgs = await db.select().from(organizations);
    const allEmployees = await db.select().from(employees);

    const industriesBreakdown: Record<string, number> = {};
    orgs.forEach(org => {
      const ind = org.industry || 'other';
      industriesBreakdown[ind] = (industriesBreakdown[ind] || 0) + 1;
    });

    return {
      totalOrganizations: orgs.length,
      activeOrganizations: orgs.filter(o => o.isActive).length,
      totalEmployees: allEmployees.length,
      industriesBreakdown,
    };
  }

  async getOrgStats(organizationId: string) {
    const emps = await db.select().from(employees).where(eq(employees.organizationId, organizationId));
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await db.select().from(attendance).where(
      and(eq(attendance.organizationId, organizationId), eq(attendance.date, today))
    );

    return {
      totalEmployees: emps.length,
      activeEmployees: emps.filter(e => e.status === 'active').length,
      exitedEmployees: emps.filter(e => e.status === 'exited').length,
      presentToday: todayAttendance.filter(a => a.status === 'present').length,
      absentToday: todayAttendance.filter(a => a.status === 'absent').length,
      onLeaveToday: todayAttendance.filter(a => a.status === 'leave').length,
    };
  }

  async getEmployeeStats(employeeId: string) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthAttendance = await this.getAttendanceByEmployee(employeeId, month);
    const allPayslips = await this.getPayslipsByEmployee(employeeId);

    return {
      presentThisMonth: monthAttendance.filter(a => a.status === 'present').length,
      absentThisMonth: monthAttendance.filter(a => a.status === 'absent').length,
      leaveThisMonth: monthAttendance.filter(a => a.status === 'leave').length,
      totalPayslips: allPayslips.length,
    };
  }
}

export const storage = new DatabaseStorage();
