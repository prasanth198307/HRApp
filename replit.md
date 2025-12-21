# HR Manager - Multi-Tenant HR Management System

## Overview
A comprehensive multi-tenant HR management application with three user roles (Super Admin, Org Admin, Employee). Features include organization management, employee lifecycle tracking, attendance management, payslip uploads and distribution, holiday calendar management with industry-based defaults and customization, monthly attendance reports, and role-based access control.

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, Vite, TailwindCSS, Shadcn UI
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom email/password (bcrypt hashing, express-session)
- **State Management**: TanStack Query

### Key Features
1. **Multi-Tenant Architecture**: Complete data isolation between organizations
2. **Role-Based Access Control**:
   - Super Admin: Manage all organizations, set default holidays
   - Org Admin: Manage employees, attendance, payslips, holidays
   - Employee: View personal dashboard, attendance, payslips, holidays
3. **Employee Lifecycle**: Full tracking from onboarding to exit
4. **Attendance Management**: Monthly tracking with visual calendar
5. **Payslip System**: Upload and distribute payslips
6. **Holiday Calendar**: Industry-specific defaults plus custom organization holidays

## Project Structure

```
├── client/src/
│   ├── App.tsx                    # Main app with routing
│   ├── components/
│   │   ├── app-sidebar.tsx        # Role-based navigation sidebar
│   │   ├── theme-toggle.tsx       # Dark/light mode toggle
│   │   └── ui/                    # Shadcn UI components
│   ├── lib/
│   │   ├── theme-provider.tsx     # Theme context provider
│   │   ├── user-context.tsx       # User role context
│   │   └── queryClient.ts         # API request utilities
│   ├── pages/
│   │   ├── landing.tsx            # Public landing page
│   │   ├── super-admin/           # Super admin pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── organizations.tsx
│   │   │   └── default-holidays.tsx
│   │   ├── org-admin/             # Organization admin pages
│   │   │   ├── dashboard.tsx
│   │   │   ├── employees.tsx
│   │   │   ├── attendance.tsx
│   │   │   ├── payslips.tsx
│   │   │   ├── holidays.tsx
│   │   │   ├── reports.tsx
│   │   │   └── user-accounts.tsx
│   │   └── employee/              # Employee pages
│   │       ├── dashboard.tsx
│   │       ├── my-attendance.tsx
│   │       ├── my-payslips.tsx
│   │       └── holidays.tsx
│   └── hooks/
│       └── use-auth.ts            # Authentication hook
├── server/
│   ├── index.ts                   # Express server setup
│   ├── routes.ts                  # API endpoints
│   ├── storage.ts                 # Database operations
│   └── db.ts                      # Database connection
└── shared/
    └── schema.ts                  # Database schema & types
```

## Database Schema

### Tables
- **organizations**: Multi-tenant organizations with industry classification
- **app_users**: User accounts linked to auth and organization
- **employees**: Employee records with full lifecycle data
- **attendance**: Daily attendance tracking
- **payslips**: Uploaded payslip files
- **holidays**: Both default (industry-specific) and custom organization holidays

## API Endpoints

### Super Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET/POST /api/organizations` - Manage organizations
- `PATCH /api/organizations/:id` - Update organization
- `POST /api/org-admins` - Create org admin account
- `GET /api/org-admins/:organizationId` - Get org admins for an organization
- `POST /api/admin/reset-password/:userId` - Reset any user's password
- `GET/POST/PATCH/DELETE /api/admin/holidays` - Default holidays

### Organization Admin
- `GET /api/org/stats` - Organization statistics
- `GET/POST /api/employees` - Employee management
- `PATCH /api/employees/:id` - Update employee
- `POST /api/employees/:id/exit` - Record employee exit
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/bulk` - Bulk update attendance
- `GET/POST /api/payslips` - Payslip management
- `POST /api/payslips/upload` - Upload payslip file
- `GET/POST/PATCH/DELETE /api/holidays` - Organization holidays
- `GET/POST/PATCH /api/user-accounts` - Employee account management

### Employee
- `GET /api/employee/stats` - Personal statistics
- `GET /api/employee/attendance` - Personal attendance
- `GET /api/employee/payslips` - Personal payslips

### All Users
- `POST /api/user/change-password` - Change own password (requires current password)
- `POST /api/password-reset-request` - Request password reset (public, no auth required)

## Running the Application

```bash
npm run dev          # Start development server
npm run db:push      # Push database schema changes
```

## User Preferences
- Dark mode support with theme persistence
- Responsive design for all screen sizes

## Password Management

### For All Users
- **Change Password**: Click user menu in sidebar > "Change Password"
- Requires current password and new password (min 8 characters)
- **Forgot Password**: Click "Forgot your password?" on the login page to submit a reset request

### Password Reset Request Workflow
1. User clicks "Forgot your password?" on the login page
2. User enters their email and submits the request
3. Admin sees the request on their dashboard
4. Admin resets the password via User Accounts (Org Admin) or Organizations > Manage Admins (Super Admin)
5. Admin dismisses the request from the dashboard

### For Super Admin
- **Reset Org Admin Password**: Organizations page > Click "Manage Admins" (Users icon) > Click "Reset Password" (Key icon)
- Sets a new password directly without knowing the old password
- **View Reset Requests**: Dashboard shows pending reset requests from all organizations

### Emergency Super Admin Password Reset (Database Command)
If you're locked out of the Super Admin account, run this SQL command:

```sql
-- First, generate a bcrypt hash for your new password using Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('yournewpassword', 12).then(console.log);

-- Then update the password in the database:
UPDATE app_users 
SET password = 'YOUR_BCRYPT_HASH_HERE' 
WHERE email = 'admin@test.com';
```

Or use this one-liner in the database tool:
```sql
UPDATE app_users SET password = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.Fqj.c6.6.K.QE.' WHERE email = 'admin@test.com';
-- This sets password to: password123
```

## Leave Management System

### Leave Types
- **CL**: Casual Leave
- **PL**: Privilege Leave  
- **SL**: Sick Leave
- **COMP_OFF**: Compensatory Off

### Leave Policy Configuration (Org Admin)
- Configure annual quota for each leave type
- Set accrual method: monthly, yearly, or none
- Configure carry forward: none, limited (with max limit), or unlimited
- Enable/disable policies per organization

### Employee Leave Balance
- **Formula**: Opening + Accrued - Used + Adjustment = Current Balance
- Balance tracked per employee, per policy, per year
- Automatic initialization when employee is linked to organization

### Leave Request Workflow
1. Employee submits leave request (must be within same calendar year)
2. Org Admin reviews pending requests
3. On approval: Balance deducted, transaction recorded, attendance marked as "leave"
4. On rejection: Employee notified, no balance changes

### Half-Day Leave Support
- Employees can request half-day leave (AM or PM session)
- Deducts 0.5 days from balance instead of full day
- Visual indicator shows half-day requests in leave history

### Design Decisions
- **No cross-year requests**: Leave requests cannot span multiple calendar years. Employees must submit separate requests for each year.
- **Balance year alignment**: Balance deductions use the leave start date's year
- **Missing balance validation**: Approval fails if no balance record exists for the requested year
- **Numeric balance fields**: Leave balances use numeric type for fractional day support (0.5, 1.5, etc.)

## Comp Off (Compensatory Off) Management

### Overview
Comp Off allows organizations to grant compensatory time off to employees for overtime work or work on holidays.

### Comp Off Workflow
1. Org Admin navigates to "Comp Off" page in sidebar
2. Admin creates a grant specifying:
   - Employee to receive the grant
   - Number of days (supports half-days like 0.5)
   - Work date (when the overtime/holiday work occurred)
   - Reason for the grant
3. Grant is saved as "pending" status
4. Admin clicks "Apply" to add the grant to employee's COMP_OFF leave balance
5. Employee can then use their COMP_OFF balance when requesting leave

### API Endpoints
- `GET /api/comp-off-grants` - List all grants for organization
- `POST /api/comp-off-grants` - Create new grant
- `POST /api/comp-off-grants/:id/apply` - Apply grant to employee balance

### Time Entry Tracking (Infrastructure)
- **time_entries** table for tracking employee check-in/check-out times
- Can be used for calculating overtime for Comp Off grants
- API endpoints: POST /api/time-entries (check-in/check-out)

### API Endpoints
- `GET/POST/PATCH /api/leave-policies` - Org Admin: Manage leave policies
- `GET /api/employee/leave-policies` - Employee: View active policies
- `GET /api/employee/leave-balances` - Employee: View personal balances
- `POST /api/employee/leave-requests` - Employee: Submit leave request
- `GET /api/leave-requests` - Org Admin: View all requests
- `PATCH /api/leave-requests/:id` - Org Admin: Approve/reject requests

## Time Tracking System

### Employee Time Clock
- Check-in/check-out buttons on employee dashboard
- Real-time status display showing current work session
- Automatic time calculation with duration display

### Time Entry Pages
- **Employee > My Time Entries**: Personal time log history with monthly filtering
- **Org Admin > Time Reports**: Organization-wide time reports with monthly filtering
- Each day shows check-in/check-out times and total hours worked

### API Endpoints
- `GET /api/employee/time-entries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Personal time entries
- `GET /api/employee/time-entries/today` - Today's check-in/out entries
- `POST /api/time-entries` - Create check-in or check-out entry
- `GET /api/time-entries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Org Admin: All employee time entries

## Bulk Employee Upload

### Overview
Both Org Admins and Super Admins can upload multiple employees at once via CSV file.

### How to Use
1. Click "Bulk Upload" button on the Employees page (Org Admin) or Manage Organization > Employees tab (Super Admin)
2. Download the CSV template using "Download Template"
3. Fill in employee data following the template format
4. Upload the completed CSV file
5. Review success/error results

### CSV Template Fields
- **employeeCode** (required): Unique employee identifier
- **firstName** (required): Employee's first name
- **lastName** (required): Employee's last name
- **email** (required): Employee's email address
- **dateOfJoining** (required): Date in YYYY-MM-DD format
- **phone**: Contact phone number
- **department**: Department name
- **designation**: Job title
- **salary**: Annual salary (numbers only)
- **address**: Full address
- **emergencyContact**: Emergency contact info

### Validation
- Required fields: employeeCode, firstName, lastName, email, dateOfJoining
- Duplicate email/employee code checks
- Row-level error reporting for failed entries
- Employment periods automatically created for successful uploads

### API Endpoints
- `POST /api/employees/bulk` - Org Admin: Upload employees to their organization
- `POST /api/super-admin/employees/bulk` - Super Admin: Upload employees to any organization

## Recent Changes
- Added bulk employee upload feature for Org Admin and Super Admin with CSV template
- Added time clock feature with check-in/check-out functionality on employee dashboard
- Added My Time Entries page for employees to view their time logs with monthly filtering
- Added Time Reports page for Org Admins to view all employee working hours
- Fixed date range filtering for time entries using startDate/endDate query parameters
- Added Comp Off management page for Org Admins to grant compensatory leave
- Added half-day leave request support (AM/PM sessions) for employees
- Added visual indicators for half-day leaves in request history tables
- Added time_entries and comp_off_grants database tables
- Added comprehensive leave management system with policies, balances, and approval workflow
- Added password reset request feature for offline password recovery workflow
- Initial implementation of complete HR management system
- Multi-tenant architecture with PostgreSQL
- Role-based access control system
- Employee management with lifecycle tracking
- Attendance tracking with monthly calendar view
- Payslip upload and download functionality
- Industry-based holiday calendar with customization
- Password management features (change password, reset password)
