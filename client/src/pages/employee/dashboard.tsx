import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useUserContext } from "@/lib/user-context";
import { Calendar, FileText, CalendarDays, Clock } from "lucide-react";
import type { Attendance, Payslip, Holiday } from "@shared/schema";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface EmployeeStats {
  presentThisMonth: number;
  absentThisMonth: number;
  leaveThisMonth: number;
  totalPayslips: number;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { organization } = useUserContext();

  const { data: stats, isLoading: statsLoading } = useQuery<EmployeeStats>({
    queryKey: ["/api/employee/stats"],
  });

  const { data: recentAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/employee/attendance/recent"],
  });

  const { data: upcomingHolidays } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays/upcoming"],
  });

  const statCards = [
    {
      title: "Present This Month",
      value: stats?.presentThisMonth ?? 0,
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Absent This Month",
      value: stats?.absentThisMonth ?? 0,
      icon: Calendar,
      color: "text-red-500",
    },
    {
      title: "Leave Taken",
      value: stats?.leaveThisMonth ?? 0,
      icon: CalendarDays,
      color: "text-blue-500",
    },
    {
      title: "Payslips Available",
      value: stats?.totalPayslips ?? 0,
      icon: FileText,
      color: "text-purple-500",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "absent":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "half_day":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "leave":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "holiday":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          {organization?.name} - Employee Portal
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
              <Calendar className="h-5 w-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance && recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recentAttendance.slice(0, 7).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-md border p-3"
                    data-testid={`card-attendance-${record.id}`}
                  >
                    <div>
                      <p className="font-medium">
                        {format(new Date(record.date), "EEEE")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.date), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusColor(record.status)}`}
                    >
                      {record.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No recent attendance records</p>
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
    </div>
  );
}
