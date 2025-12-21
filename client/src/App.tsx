import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProvider, useUserContext } from "@/lib/user-context";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import Organizations from "@/pages/super-admin/organizations";
import OrganizationCreate from "@/pages/super-admin/organization-create";
import DefaultHolidays from "@/pages/super-admin/default-holidays";
import ManageOrganization from "@/pages/super-admin/manage-organization";

import OrgAdminDashboard from "@/pages/org-admin/dashboard";
import Employees from "@/pages/org-admin/employees";
import AttendancePage from "@/pages/org-admin/attendance";
import PayslipsPage from "@/pages/org-admin/payslips";
import HolidaysPage from "@/pages/org-admin/holidays";
import LeavePoliciesPage from "@/pages/org-admin/leave-policies";
import LeaveRequestsPage from "@/pages/org-admin/leave-requests";
import ReportsPage from "@/pages/org-admin/reports";
import UserAccountsPage from "@/pages/org-admin/user-accounts";
import CompOffPage from "@/pages/org-admin/comp-off";

import EmployeeDashboard from "@/pages/employee/dashboard";
import MyAttendance from "@/pages/employee/my-attendance";
import MyPayslips from "@/pages/employee/my-payslips";
import EmployeeHolidays from "@/pages/employee/holidays";
import MyLeavesPage from "@/pages/employee/my-leaves";

function SuperAdminRouter() {
  return (
    <Switch>
      <Route path="/" component={SuperAdminDashboard} />
      <Route path="/organizations" component={Organizations} />
      <Route path="/organizations/new" component={OrganizationCreate} />
      <Route path="/manage-organization" component={ManageOrganization} />
      <Route path="/default-holidays" component={DefaultHolidays} />
      <Route component={NotFound} />
    </Switch>
  );
}

function OrgAdminRouter() {
  return (
    <Switch>
      <Route path="/" component={OrgAdminDashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/comp-off" component={CompOffPage} />
      <Route path="/payslips" component={PayslipsPage} />
      <Route path="/holidays" component={HolidaysPage} />
      <Route path="/leave-policies" component={LeavePoliciesPage} />
      <Route path="/leave-requests" component={LeaveRequestsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/user-accounts" component={UserAccountsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function EmployeeRouter() {
  return (
    <Switch>
      <Route path="/" component={EmployeeDashboard} />
      <Route path="/my-attendance" component={MyAttendance} />
      <Route path="/my-payslips" component={MyPayslips} />
      <Route path="/my-leaves" component={MyLeavesPage} />
      <Route path="/holidays" component={EmployeeHolidays} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { isSuperAdmin, isOrgAdmin, isLoading: contextLoading } = useUserContext();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  if (contextLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-14 items-center justify-between gap-4 border-b px-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {isSuperAdmin ? (
              <SuperAdminRouter />
            ) : isOrgAdmin ? (
              <OrgAdminRouter />
            ) : (
              <EmployeeRouter />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <UserProvider>
      <AuthenticatedApp />
    </UserProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="hr-app-theme">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
