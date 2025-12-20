# HR Management Application - Design Guidelines

## Design Approach
**Selected Framework:** Material Design 3 with enterprise customization
**Rationale:** Information-dense enterprise application requiring clear hierarchy, familiar patterns, and scalability across role-based interfaces (Super Admin, Org Admin, Employee)

## Layout Architecture

**Shell Structure:**
- Persistent left sidebar navigation (240px desktop, collapsible to 64px)
- Top bar with org context switcher, notifications, user menu
- Main content area with max-width container (1440px)
- Three-tier hierarchy: Super Admin → Org Admin → Employee views

**Spacing System:**
Use Tailwind units: **2, 4, 6, 8, 12, 16** for consistent rhythm
- Card padding: `p-6`
- Section spacing: `space-y-8`
- Component gaps: `gap-4`
- Page margins: `px-6 lg:px-8`

## Typography Hierarchy

**Font Stack:** Inter (primary), Roboto Mono (data/tables)

**Scale:**
- Page Titles: `text-3xl font-semibold`
- Section Headers: `text-xl font-semibold`
- Card Titles: `text-lg font-medium`
- Body Text: `text-base`
- Data/Labels: `text-sm`
- Captions/Meta: `text-xs`

## Core Components

**Navigation:**
- Vertical sidebar with icon + label pattern
- Grouped sections (Dashboard, Employees, Attendance, Payroll, Reports, Settings)
- Active state indication with left border accent
- Badge notifications on relevant items

**Data Tables:**
- Sticky headers with sort indicators
- Row actions (view, edit, delete) on hover
- Bulk selection checkboxes
- Pagination + items per page selector
- Search and filter bar above table
- Export functionality (CSV, PDF) in header

**Cards:**
- Elevated cards (`shadow-md`) for distinct content blocks
- Stats cards: Large number display with label and trend indicator
- Employee cards: Avatar, name, role, department, quick actions

**Forms:**
- Left-aligned labels above inputs
- Input groups for related fields (First Name | Last Name)
- Clear field validation states with inline messages
- Multi-step forms for complex workflows (Employee onboarding)
- Required field indicators (*)

**Calendar Component:**
- Monthly grid view for holiday management
- Day cells with holiday indicators
- Legend for holiday types (National, Regional, Custom)
- Add/edit holiday modal

**Dashboard Widgets:**
- Grid layout: 3 columns desktop, 2 tablet, 1 mobile
- Quick stats: Total employees, Active, On leave, Pending approvals
- Recent activity feed
- Upcoming holidays widget
- Attendance summary graph (bar/line chart)

## Role-Based Layouts

**Super Admin Dashboard:**
- Organization list table with search/filter
- Add organization CTA button (primary action)
- System-wide stats overview
- Industry distribution chart

**Org Admin Dashboard:**
- Employee management as primary focus
- Department breakdown
- Attendance tracking grid
- Payslip upload interface with drag-drop zone
- Monthly report generation panel

**Employee Portal:**
- Personal dashboard with attendance record
- Downloadable payslips archive
- Leave request form
- Holiday calendar view (read-only)

## Interaction Patterns

**Modals:**
- Center-aligned, max-width 600px
- Header with title and close button
- Footer with Cancel (secondary) and Confirm (primary) actions
- Overlay with backdrop blur

**Empty States:**
- Centered icon, heading, description
- Primary CTA to add first item
- Example: "No employees yet. Add your first team member to get started"

**Notifications:**
- Toast notifications (top-right): Success, error, info, warning
- Auto-dismiss after 5 seconds
- Action buttons for critical alerts

**File Upload:**
- Drag-drop zones for payslips/documents
- Progress indicators for uploads
- File type and size validation
- Preview thumbnails for uploaded documents

## Data Visualization

**Attendance Reports:**
- Monthly view with color-coded cells (Present, Absent, Leave, Holiday)
- Summary row with totals
- Filter by employee, department, date range
- Export to Excel functionality

**Charts:**
- Use Chart.js via CDN
- Consistent chart styling across application
- Tooltips on hover for detailed data
- Responsive sizing

## Responsive Behavior

**Desktop (1024px+):** Full sidebar, 3-column grids
**Tablet (768-1023px):** Collapsible sidebar, 2-column grids
**Mobile (<768px):** Bottom navigation bar, single column stacks, hamburger menu for secondary nav

## Icons
**Library:** Heroicons via CDN
**Usage:** 
- Navigation icons (20px)
- Action buttons (16px)
- Status indicators (16px)
- Large feature icons (48px)

## Accessibility
- Semantic HTML structure
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus indicators on interactive elements
- High contrast ratios for text
- Screen reader announcements for dynamic content