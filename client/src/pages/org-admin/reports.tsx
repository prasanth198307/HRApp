import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, ChevronLeft, ChevronRight } from "lucide-react";
import type { Employee, Attendance } from "@shared/schema";
import { attendanceStatusOptions } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDaysInMonth } from "date-fns";

interface AttendanceReport {
  employee: Employee;
  summary: {
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    holiday: number;
    total: number;
  };
  dailyRecords: Record<string, string>;
}

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function ReportsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalDays = getDaysInMonth(currentMonth);

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: attendance, isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", format(currentMonth, "yyyy-MM")],
  });

  const activeEmployees = employees?.filter(emp => emp.status !== "exited") ?? [];

  const generateReport = (): AttendanceReport[] => {
    const employeesToShow = selectedEmployee === "all"
      ? activeEmployees
      : activeEmployees.filter(e => e.id === selectedEmployee);

    return employeesToShow.map(emp => {
      const empAttendance = attendance?.filter(a => a.employeeId === emp.id) ?? [];
      
      const summary = {
        present: 0,
        absent: 0,
        halfDay: 0,
        leave: 0,
        holiday: 0,
        total: totalDays,
      };

      const dailyRecords: Record<string, string> = {};

      empAttendance.forEach(record => {
        dailyRecords[record.date] = record.status;
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

      return {
        employee: emp,
        summary,
        dailyRecords,
      };
    });
  };

  const reports = generateReport();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-500 text-white";
      case "absent":
        return "bg-red-500 text-white";
      case "half_day":
        return "bg-yellow-500 text-white";
      case "leave":
        return "bg-blue-500 text-white";
      case "holiday":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-200 dark:bg-gray-700";
    }
  };

  const getStatusAbbrev = (status: string) => {
    switch (status) {
      case "present":
        return "P";
      case "absent":
        return "A";
      case "half_day":
        return "H";
      case "leave":
        return "L";
      case "holiday":
        return "HO";
      default:
        return "-";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Employee Code",
      "Name",
      "Department",
      ...daysInMonth.map(d => format(d, "d")),
      "Present",
      "Absent",
      "Half Day",
      "Leave",
      "Holiday",
    ];

    const rows = reports.map(r => [
      r.employee.employeeCode,
      `${r.employee.firstName} ${r.employee.lastName}`,
      r.employee.department || "",
      ...daysInMonth.map(d => getStatusAbbrev(r.dailyRecords[format(d, "yyyy-MM-dd")] || "")),
      r.summary.present,
      r.summary.absent,
      r.summary.halfDay,
      r.summary.leave,
      r.summary.holiday,
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${format(currentMonth, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Attendance Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate and export monthly attendance reports
          </p>
        </div>
        <Button onClick={exportToCSV} data-testid="button-export-csv">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {format(currentMonth, "MMMM yyyy")} Report
            </CardTitle>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48" data-testid="select-employee-filter">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {activeEmployees.map((emp) => (
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
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap gap-4">
            {attendanceStatusOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2 text-sm">
                <div className={`flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${getStatusColor(option.value)}`}>
                  {getStatusAbbrev(option.value)}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[180px]">
                      Employee
                    </TableHead>
                    {daysInMonth.map((day) => (
                      <TableHead
                        key={day.toISOString()}
                        className="min-w-[40px] text-center p-1"
                      >
                        <div className="text-xs">{format(day, "d")}</div>
                      </TableHead>
                    ))}
                    <TableHead className="min-w-[50px] text-center bg-green-50 dark:bg-green-900/20">P</TableHead>
                    <TableHead className="min-w-[50px] text-center bg-red-50 dark:bg-red-900/20">A</TableHead>
                    <TableHead className="min-w-[50px] text-center bg-yellow-50 dark:bg-yellow-900/20">H</TableHead>
                    <TableHead className="min-w-[50px] text-center bg-blue-50 dark:bg-blue-900/20">L</TableHead>
                    <TableHead className="min-w-[50px] text-center bg-purple-50 dark:bg-purple-900/20">HO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.employee.id} data-testid={`row-report-${report.employee.id}`}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div>
                          <p className="text-sm font-medium">
                            {report.employee.firstName} {report.employee.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {report.employee.employeeCode}
                          </p>
                        </div>
                      </TableCell>
                      {daysInMonth.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const status = report.dailyRecords[dateStr] || "";
                        return (
                          <TableCell
                            key={day.toISOString()}
                            className="text-center p-1"
                          >
                            <div
                              className={`mx-auto flex h-6 w-6 items-center justify-center rounded text-xs font-medium ${getStatusColor(status)}`}
                            >
                              {getStatusAbbrev(status)}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center font-medium bg-green-50 dark:bg-green-900/20">
                        {report.summary.present}
                      </TableCell>
                      <TableCell className="text-center font-medium bg-red-50 dark:bg-red-900/20">
                        {report.summary.absent}
                      </TableCell>
                      <TableCell className="text-center font-medium bg-yellow-50 dark:bg-yellow-900/20">
                        {report.summary.halfDay}
                      </TableCell>
                      <TableCell className="text-center font-medium bg-blue-50 dark:bg-blue-900/20">
                        {report.summary.leave}
                      </TableCell>
                      <TableCell className="text-center font-medium bg-purple-50 dark:bg-purple-900/20">
                        {report.summary.holiday}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No data available</p>
              <p className="text-muted-foreground">
                No attendance records found for this period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
