# HR Manager - Multi-Tenant HR Management System

## Overview
HR Manager is a comprehensive multi-tenant HR management application designed to streamline human resources operations for various organizations. It supports three distinct user roles: Super Admin, Organization Admin, and Employee. The system offers robust features including organization management, employee lifecycle tracking, attendance management, payslip distribution, and a flexible holiday calendar system. Its primary purpose is to provide a centralized platform for efficient HR processes, enhance employee self-service, and ensure role-based data security and access control.

## User Preferences
- Dark mode support with theme persistence
- Responsive design for all screen sizes

## System Architecture
The application is built with a multi-tenant architecture ensuring complete data isolation between organizations. It implements a robust Role-Based Access Control (RBAC) system with distinct permissions for Super Admins (managing organizations and default holidays), Organization Admins (managing employees, attendance, payslips, and organization-specific holidays), and Employees (accessing personal HR data).

**Frontend:**
-   **Framework:** React with TypeScript
-   **Build Tool:** Vite
-   **Styling:** TailwindCSS
-   **UI Components:** Shadcn UI
-   **State Management:** TanStack Query for API interactions
-   **Theming:** Dark/light mode with theme persistence
-   **Responsiveness:** Designed for all screen sizes

**Backend:**
-   **Framework:** Express.js with TypeScript
-   **Authentication:** Custom email/password authentication using bcrypt for hashing and `express-session` for session management.

**Database:**
-   **Type:** PostgreSQL
-   **ORM:** Drizzle ORM
-   **Schema:**
    -   `organizations`: Stores multi-tenant organization details and industry classification.
    -   `app_users`: Manages user accounts, linked to authentication and organizations.
    -   `employees`: Contains detailed employee records and lifecycle data (manual employee code entry).
    -   `attendance`: Tracks daily attendance for employees.
    -   `payslips`: Stores uploaded payslip files.
    -   `holidays`: Manages both default (industry-specific) and custom organization holidays.
    -   `time_entries`: Records employee check-in/check-out times.
    -   `comp_off_grants`: Manages compensatory off grants.
    -   `employee_documents`: Stores employee document metadata (offer letters, appointment letters, Aadhar, PAN, photos, and other documents).

**Key Features & Technical Implementations:**
-   **Employee Lifecycle Management:** Comprehensive tracking from onboarding to exit.
-   **Attendance Management:** Monthly tracking with a visual calendar and support for half-day entries. Includes employee self-service time clock.
-   **Payslip System:** Secure upload and distribution of payslips.
-   **Holiday Calendar:** Industry-specific default holidays with organization-level customization.
-   **Leave Management System:**
    -   Configurable leave policies by Org Admins (annual quota, accrual, carry forward).
    -   Employee leave balance tracking with opening, accrued, used, and adjustment components.
    -   Leave request workflow with Org Admin approval/rejection.
    -   Support for half-day leave requests (AM/PM sessions).
    -   Compensatory Off (Comp Off) management for granting time off for overtime/holiday work.
    -   **Holiday Calendar Integration:** Leave day calculations automatically exclude weekends (Saturday/Sunday) and holidays from the organization's holiday calendar. Employees see a real-time preview of working days when applying for leave.
-   **Password Management:**
    -   User-initiated password changes.
    -   "Forgot Password" workflow with admin-mediated password resets.
    -   Emergency Super Admin password reset via direct database update.
-   **Bulk Operations:**
    -   Bulk employee upload via CSV for both Org Admins and Super Admins.
-   **Data Export:**
    -   Super Admin functionality to export various organizational data (employees, attendance, leave requests, holidays, leave balances) as CSV.
-   **Employee Document Management:**
    -   Upload and manage employee documents (offer letters, appointment letters, Aadhar, PAN, photos, other documents).
    -   Secure file storage with download and delete capabilities.
    -   File type validation (PDF, DOC, DOCX, JPG, JPEG, PNG) with 10MB size limit.

## External Dependencies
-   **Database:** PostgreSQL
-   **Authentication Libraries:** `bcrypt` (for password hashing), `express-session` (for session management)