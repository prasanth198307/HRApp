import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Save, ChevronLeft, ChevronRight } from "lucide-react";
import type { Employee, Attendance, InsertAttendance } from "@shared/schema";
import { attendanceStatusOptions } from "@shared/schema";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from "date-fns";

export default function AttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, string>>>({});
  const { toast } = useToast();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", format(currentMonth, "yyyy-MM")],
  });

  const activeEmployees = employees?.filter(emp => emp.status === "active") ?? [];

  const saveMutation = useMutation({
    mutationFn: (data: { records: InsertAttendance[] }) =>
      apiRequest("POST", "/api/attendance/bulk", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/stats"] });
      toast({ title: "Attendance saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save attendance", description: error.message, variant: "destructive" });
    },
  });

  const getExistingStatus = (employeeId: string, date: string): string => {
    if (attendanceData[employeeId]?.[date]) {
      return attendanceData[employeeId][date];
    }
    const record = existingAttendance?.find(
      a => a.employeeId === employeeId && a.date === date
    );
    return record?.status ?? "";
  };

  const handleStatusChange = (employeeId: string, date: string, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: status,
      },
    }));
  };

  const handleSave = () => {
    const records: InsertAttendance[] = [];
    
    Object.entries(attendanceData).forEach(([employeeId, dates]) => {
      Object.entries(dates).forEach(([date, status]) => {
        if (status) {
          records.push({
            employeeId,
            organizationId: "",
            date,
            status: status as any,
          });
        }
      });
    });

    if (records.length > 0) {
      saveMutation.mutate({ records });
    }
  };

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

  const isLoading = employeesLoading || attendanceLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Attendance
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and manage employee attendance
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending || Object.keys(attendanceData).length === 0}
          data-testid="button-save-attendance"
        >
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
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
                <div className={`h-3 w-3 rounded-full ${getStatusColor(option.value)}`} />
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
          ) : activeEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background min-w-[200px]">
                      Employee
                    </TableHead>
                    {daysInMonth.map((day) => (
                      <TableHead
                        key={day.toISOString()}
                        className={`min-w-[60px] text-center ${
                          isWeekend(day) ? "bg-muted/50" : ""
                        }`}
                      >
                        <div className="text-xs">{format(day, "EEE")}</div>
                        <div>{format(day, "d")}</div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeEmployees.map((emp) => (
                    <TableRow key={emp.id} data-testid={`row-attendance-${emp.id}`}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      {daysInMonth.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const status = getExistingStatus(emp.id, dateStr);
                        return (
                          <TableCell
                            key={day.toISOString()}
                            className={`text-center p-1 ${isWeekend(day) ? "bg-muted/50" : ""}`}
                          >
                            <Select
                              value={status}
                              onValueChange={(value) => handleStatusChange(emp.id, dateStr, value)}
                            >
                              <SelectTrigger className="h-8 w-14 p-0">
                                <div
                                  className={`mx-auto h-6 w-6 rounded-full ${getStatusColor(status)}`}
                                  title={status || "Not marked"}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  <span className="text-muted-foreground">Clear</span>
                                </SelectItem>
                                {attendanceStatusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-3 w-3 rounded-full ${getStatusColor(option.value)}`} />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No active employees</p>
              <p className="text-muted-foreground">
                Add employees to start tracking attendance
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
