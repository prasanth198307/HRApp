import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { TimeEntry, Employee } from "@shared/schema";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, differenceInMinutes, eachDayOfInterval } from "date-fns";

interface EmployeeTimeData {
  employee: Employee;
  entries: TimeEntry[];
  totalMinutes: number;
  daysWorked: number;
}

export default function TimeReports() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", monthStart, monthEnd],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries?startDate=${monthStart}&endDate=${monthEnd}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });

  const calculateEmployeeData = (): EmployeeTimeData[] => {
    if (!timeEntries || !employees) return [];

    const employeeMap: Record<string, EmployeeTimeData> = {};

    employees.forEach((emp) => {
      if (emp.status === "active") {
        employeeMap[emp.id] = {
          employee: emp,
          entries: [],
          totalMinutes: 0,
          daysWorked: 0,
        };
      }
    });

    timeEntries.forEach((entry) => {
      if (employeeMap[entry.employeeId]) {
        employeeMap[entry.employeeId].entries.push(entry);
      }
    });

    Object.values(employeeMap).forEach((data) => {
      const entriesByDate: Record<string, TimeEntry[]> = {};
      data.entries.forEach((entry) => {
        if (!entriesByDate[entry.date]) {
          entriesByDate[entry.date] = [];
        }
        entriesByDate[entry.date].push(entry);
      });

      data.daysWorked = Object.keys(entriesByDate).length;

      Object.values(entriesByDate).forEach((dayEntries) => {
        dayEntries.sort((a, b) =>
          new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
        );

        for (let i = 0; i < dayEntries.length - 1; i += 2) {
          if (dayEntries[i].entryType === "check_in" && dayEntries[i + 1]?.entryType === "check_out") {
            data.totalMinutes += differenceInMinutes(
              new Date(dayEntries[i + 1].entryTime),
              new Date(dayEntries[i].entryTime)
            );
          }
        }
      });
    });

    return Object.values(employeeMap)
      .filter((data) => selectedEmployee === "all" || data.employee.id === selectedEmployee)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const employeeData = calculateEmployeeData();
  const totalMinutesAll = employeeData.reduce((sum, e) => sum + e.totalMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Time Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            View employee working hours and attendance
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]" data-testid="select-employee">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees
                ?.filter((e) => e.status === "active")
                .map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-hours">
              {formatDuration(totalMinutesAll)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees with Time Entries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-employee-count">
              {employeeData.filter((e) => e.entries.length > 0).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Hours/Employee</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-hours">
              {employeeData.filter((e) => e.entries.length > 0).length > 0
                ? formatDuration(
                    Math.round(
                      totalMinutesAll / employeeData.filter((e) => e.entries.length > 0).length
                    )
                  )
                : "0h 0m"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Employee Time Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : employeeData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No employee data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Days Worked</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Avg Hours/Day</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeData.map((data) => (
                  <TableRow key={data.employee.id} data-testid={`row-employee-${data.employee.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {data.employee.firstName} {data.employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {data.employee.employeeCode}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{data.employee.department || "-"}</TableCell>
                    <TableCell className="text-center">{data.daysWorked}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatDuration(data.totalMinutes)}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.daysWorked > 0
                        ? formatDuration(Math.round(data.totalMinutes / data.daysWorked))
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
