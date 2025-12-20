import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, CalendarDays, FileText, Clock } from "lucide-react";
import { useUserContext } from "@/lib/user-context";
import type { Employee, Holiday } from "@shared/schema";
import { format } from "date-fns";

interface OrgStats {
  totalEmployees: number;
  activeEmployees: number;
  exitedEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
}

export default function OrgAdminDashboard() {
  const { organization } = useUserContext();

  const { data: stats, isLoading: statsLoading } = useQuery<OrgStats>({
    queryKey: ["/api/org/stats"],
  });

  const { data: recentEmployees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: upcomingHolidays } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays/upcoming"],
  });

  const statCards = [
    {
      title: "Total Employees",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Active Employees",
      value: stats?.activeEmployees ?? 0,
      icon: UserCheck,
      color: "text-green-500",
    },
    {
      title: "Exited Employees",
      value: stats?.exitedEmployees ?? 0,
      icon: UserX,
      color: "text-red-500",
    },
    {
      title: "Present Today",
      value: stats?.presentToday ?? 0,
      icon: Clock,
      color: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's an overview of {organization?.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentEmployees && recentEmployees.length > 0 ? (
              <div className="space-y-3">
                {recentEmployees.slice(0, 5).map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between rounded-md border p-3"
                    data-testid={`card-employee-${emp.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-sm text-muted-foreground">
                          {emp.designation} - {emp.department}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        emp.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : emp.status === "on_notice"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {emp.status === "on_notice" ? "On Notice" : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No employees yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first employee to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Upcoming Holidays
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingHolidays && upcomingHolidays.length > 0 ? (
              <div className="space-y-3">
                {upcomingHolidays.slice(0, 5).map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-center justify-between rounded-md border p-3"
                    data-testid={`card-holiday-${holiday.id}`}
                  >
                    <div>
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(holiday.date), "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>
                    {holiday.isNational && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        National
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No upcoming holidays</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Present</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats?.presentToday ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Absent</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats?.absentToday ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On Leave</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {stats?.onLeaveToday ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/employees"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover-elevate"
              data-testid="link-quick-employees"
            >
              <Users className="h-4 w-4" />
              Manage Employees
            </a>
            <a
              href="/attendance"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover-elevate"
              data-testid="link-quick-attendance"
            >
              <Clock className="h-4 w-4" />
              Mark Attendance
            </a>
            <a
              href="/payslips"
              className="flex items-center gap-2 rounded-md p-2 text-sm hover-elevate"
              data-testid="link-quick-payslips"
            >
              <FileText className="h-4 w-4" />
              Upload Payslips
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organization Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{organization?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Industry</span>
                <span className="font-medium capitalize">{organization?.industry?.replace("_", " ")}</span>
              </div>
              {organization?.email && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{organization.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
