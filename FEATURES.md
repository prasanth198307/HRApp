# HUMANE - HR Management System

## Features Documentation

---

## 1. Multi-Tenant Architecture

- **Shared Database Model**: Single database with organization-level data isolation using organizationId filtering
- **Role-Based Access Control (RBAC)**: Three distinct user roles with specific permissions
  - **Super Admin**: Manages all organizations, default holidays, bulk operations, and data exports
  - **Organization Admin**: Manages employees, attendance, payslips, leave policies, and organization-specific settings
  - **Employee**: Access to personal HR data, leave requests, attendance, and payslips

---

## 2. Organization Management

- Create and edit organizations with comprehensive details
- **Organization Code**: Unique identifier (2-10 characters, uppercase alphanumeric) used for auto-generating employee codes
- **Industry Classification**: Categorize organizations by industry type
- **Compliance Fields**: GST Number, PAN Number, TAN Number, CIN Number, UDYAM Number
- Activate/deactivate organizations
- Organization contact details (address, phone, email, website)

---

## 3. Employee Management

### Employee Records
- Complete employee profiles with personal and professional information
- Department and designation tracking
- Salary information
- Emergency contact details

### Auto-Generated Employee Codes
- Employee codes automatically generated based on organization code
- Format: `[ORG_CODE][4-digit sequence]` (e.g., ACME0001, ACME0002)
- Sequential numbering ensures uniqueness within organization

### Employee Lifecycle
- Onboarding with date of joining
- Active employee management
- Exit management with exit date and reason tracking
- Complete lifecycle visibility

### Bulk Operations
- **CSV Bulk Upload**: Import multiple employees via CSV file
- Available for both Super Admin (across organizations) and Org Admin (within organization)
- Automatic employee code generation during bulk import
- Upload results showing success/failure per row

---

## 4. Leave Management System

### Leave Policies
- Configurable leave types: Casual Leave (CL), Privilege Leave (PL), Sick Leave (SL), Compensatory Off (COMP_OFF)
- Organization-level policy configuration
- Annual quota settings
- Accrual rules
- Carry forward policies

### Leave Balance Tracking
- Opening balance
- Accrued leaves
- Used leaves
- Adjustments
- Real-time balance calculation

### Leave Request Workflow
- Employee submits leave request
- Organization Admin approval/rejection
- Request status tracking (Pending, Approved, Rejected)
- Leave history

### Half-Day Leave Support
- AM session (morning half)
- PM session (afternoon half)
- Accurate balance deduction for half-days

### Compensatory Off (Comp Off)
- Grant comp off for overtime or holiday work
- Track comp off grants with expiry
- Use comp off as leave type

### Holiday Calendar Integration
- Leave day calculations automatically exclude:
  - Weekends (Saturday and Sunday)
  - Organization holidays
  - Default industry holidays
- Real-time working days preview when applying for leave

---

## 5. Attendance Management

### Monthly Attendance Tracking
- Visual calendar view for attendance
- Mark attendance status: Present, Absent, Half-Day, On Leave, Holiday, Weekend
- Monthly attendance reports

### Half-Day Attendance
- Support for half-day attendance entries
- AM/PM session tracking

### Employee Time Clock
- Self-service check-in/check-out
- Time entry recording
- Working hours calculation

---

## 6. Holiday Calendar

### Default Holidays
- Industry-specific default holiday templates
- Super Admin manages default holidays by industry

### Organization Holidays
- Custom holidays specific to each organization
- Override or extend default holidays
- Holiday types: National, Regional, Religious, Company-specific

### Integration
- Holidays automatically considered in:
  - Leave day calculations
  - Attendance marking
  - Working days computation

---

## 7. Payslip Distribution

- Secure payslip upload by Organization Admin
- Employee access to personal payslips
- Monthly payslip organization
- Download functionality

---

## 8. Data Export (Super Admin)

Export organizational data as CSV files:
- Employee data
- Attendance records
- Leave requests
- Holiday calendars
- Leave balances

---

## 9. Authentication & Security

### Custom Authentication
- Email/password based authentication
- Secure password hashing using bcrypt
- Session management with express-session

### Password Management
- User-initiated password changes
- "Forgot Password" workflow with admin-mediated resets
- Super Admin emergency password reset capability

### Security Features
- Role-based route protection
- Organization-level data isolation
- Session-based authentication

---

## 10. User Interface

### Theme Support
- Dark mode and light mode
- Theme persistence across sessions
- User preference saving

### Responsive Design
- Mobile-friendly interface
- Tablet and desktop optimized
- Adaptive layouts for all screen sizes

### Navigation
- Role-based sidebar navigation
- Context-aware menu items
- Quick access to frequently used features

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, TypeScript, Vite |
| Styling | TailwindCSS, Shadcn UI |
| State Management | TanStack Query |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Authentication | bcrypt, express-session |

---

## User Roles Summary

| Feature | Super Admin | Org Admin | Employee |
|---------|-------------|-----------|----------|
| Manage Organizations | Yes | No | No |
| Manage Default Holidays | Yes | No | No |
| Bulk Employee Upload (All Orgs) | Yes | No | No |
| Data Export | Yes | No | No |
| Manage Employees | No | Yes | No |
| Manage Attendance | No | Yes | No |
| Manage Leave Policies | No | Yes | No |
| Approve Leave Requests | No | Yes | No |
| Upload Payslips | No | Yes | No |
| Manage Org Holidays | No | Yes | No |
| Grant Comp Off | No | Yes | No |
| View Own Profile | No | Yes | Yes |
| Apply for Leave | No | No | Yes |
| View Leave Balance | No | No | Yes |
| Check-in/Check-out | No | No | Yes |
| View Own Payslips | No | No | Yes |
| View Own Attendance | No | No | Yes |
