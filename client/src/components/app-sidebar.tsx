import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  CalendarDays,
  CalendarCheck,
  CalendarX,
  Home,
  UserPlus,
  LogOut,
  ChevronDown,
  Heart,
  Building2,
  KeyRound,
  Clock,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useUserContext } from "@/lib/user-context";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const superAdminNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Organizations", url: "/organizations", icon: Building2 },
  { title: "Manage Organization", url: "/manage-organization", icon: Settings },
  { title: "Default Holidays", url: "/default-holidays", icon: CalendarDays },
];

const orgAdminNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Comp Off", url: "/comp-off", icon: Clock },
  { title: "Payslips", url: "/payslips", icon: FileText },
  { title: "Leave Policies", url: "/leave-policies", icon: CalendarCheck },
  { title: "Leave Requests", url: "/leave-requests", icon: CalendarX },
  { title: "Holidays", url: "/holidays", icon: CalendarDays },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "User Accounts", url: "/user-accounts", icon: UserPlus },
];

const employeeNavItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "My Attendance", url: "/my-attendance", icon: Calendar },
  { title: "My Payslips", url: "/my-payslips", icon: FileText },
  { title: "My Leaves", url: "/my-leaves", icon: CalendarCheck },
  { title: "Holidays", url: "/holidays", icon: CalendarDays },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isSuperAdmin, isOrgAdmin, organization } = useUserContext();
  const { toast } = useToast();
  
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("POST", "/api/user/change-password", data);
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to change password", description: error.message, variant: "destructive" });
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const navItems = isSuperAdmin
    ? superAdminNavItems
    : isOrgAdmin
    ? orgAdminNavItems
    : employeeNavItems;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.charAt(0) || "";
    const l = lastName?.charAt(0) || "";
    return (f + l).toUpperCase() || "U";
  };

  return (
    <>
    <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="input-confirm-password"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-submit-password">
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/25">
            <Heart className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent" data-testid="text-app-name">HUMANE</span>
            {organization && (
              <span className="text-xs text-muted-foreground" data-testid="text-org-name">
                {organization.name}
              </span>
            )}
            {isSuperAdmin && (
              <span className="text-xs text-muted-foreground">Super Admin</span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || (item.url === "/organizations" && location.startsWith("/organizations/"))}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-3 rounded-md p-2 hover-elevate active-elevate-2"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {getInitials(user?.firstName, user?.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left text-sm">
                <span className="font-medium" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="text-xs text-muted-foreground" data-testid="text-user-email">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)} data-testid="button-change-password">
              <KeyRound className="mr-2 h-4 w-4" />
              <span>Change Password</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
