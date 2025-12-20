import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import type { Attendance } from "@shared/schema";
import { attendanceStatusOptions } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend, getDaysInMonth } from "date-fns";

export default function MyAttendance() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = getDaysInMonth(currentMonth);

  const { data: attendance, isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/employee/attendance", format(currentMonth, "yyyy-MM")],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500";
      case "absent":
        return "bg-red-500";
      case "half_day":
        return "bg-yellow-500";
      case "leave":
        return "bg-blue-500";
      case "holiday":
        return "bg-purple-500";
      default:
        return "bg-gray-200 dark:bg-gray-700";
    }
  };

  const getAttendanceForDate = (date: Date): Attendance | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return attendance?.find(a => a.date === dateStr);
  };

  const summary = {
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
  };

  attendance?.forEach(record => {
    switch (record.status) {
      case "present":
        summary.present++;
        break;
      case "absent":
        summary.absent++;
        break;
      case "half_day":
        summary.halfDay++;
        break;
      case "leave":
        summary.leave++;
        break;
      case "holiday":
        summary.holiday++;
        break;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          My Attendance
        </h1>
        <p className="text-muted-foreground mt-2">
          View your attendance history
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summary.present}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {summary.absent}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Half Day</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {summary.halfDay}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leave</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary.leave}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Holiday</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {summary.holiday}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(currentMonth, "MMMM yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                data-testid="button-next-month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            {attendanceStatusOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2 text-sm">
                <div className={`h-4 w-4 rounded-full ${getStatusColor(option.value)}`} />
                <span>{option.label}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {daysInMonth.map((day) => {
                const record = getAttendanceForDate(day);
                const weekend = isWeekend(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative flex flex-col items-center rounded-md border p-2 ${
                      weekend ? "bg-muted/50" : ""
                    }`}
                    data-testid={`cell-date-${format(day, "yyyy-MM-dd")}`}
                  >
                    <span className="text-sm font-medium">{format(day, "d")}</span>
                    {record && (
                      <div
                        className={`mt-1 h-3 w-3 rounded-full ${getStatusColor(record.status)}`}
                        title={record.status.replace("_", " ")}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
