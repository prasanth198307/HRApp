import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, FileText, Calendar, ChevronLeft, ChevronRight, Save, Upload } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from "date-fns";
import type { Organization, Employee, Attendance, Payslip } from "@shared/schema";

const attendanceStatuses = [
  { value: "present", label: "P", color: "bg-green-500" },
  { value: "absent", label: "A", color: "bg-red-500" },
  { value: "half_day", label: "H", color: "bg-yellow-500" },
  { value: "leave", label: "L", color: "bg-blue-500" },
  { value: "holiday", label: "HO", color: "bg-purple-500" },
];

const dayAbbreviations = ["S", "M", "T", "W", "T", "F", "S"];

export default function ManageOrganization() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceChanges, setAttendanceChanges] = useState<Record<string, Record<string, string>>>({});
  const { toast } = useToast();

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const monthStr = format(currentMonth, "yyyy-MM");

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/super-admin/employees", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const res = await fetch(`/api/super-admin/employees?organizationId=${selectedOrgId}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/super-admin/attendance", selectedOrgId, monthStr],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const res = await fetch(`/api/super-admin/attendance?organizationId=${selectedOrgId}&month=${monthStr}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const { data: payslips, isLoading: payslipsLoading } = useQuery<Payslip[]>({
    queryKey: ["/api/super-admin/payslips", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const res = await fetch(`/api/super-admin/payslips?organizationId=${selectedOrgId}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (data: { records: any[] }) => {
      return apiRequest("POST", "/api/super-admin/attendance/bulk", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/attendance", selectedOrgId, monthStr] });
      setAttendanceChanges({});
      toast({ title: "Attendance saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save attendance", description: error.message, variant: "destructive" });
    },
  });

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    attendance?.forEach((record) => {
      if (!map[record.employeeId]) map[record.employeeId] = {};
      map[record.employeeId][record.date] = record.status;
    });
    return map;
  }, [attendance]);

  const getAttendanceStatus = (employeeId: string, date: string) => {
    return attendanceChanges[employeeId]?.[date] || attendanceMap[employeeId]?.[date] || "";
  };

  const setAttendanceStatus = (employeeId: string, date: string, status: string) => {
    setAttendanceChanges((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [date]: status,
      },
    }));
  };

  const handleSaveAttendance = () => {
    const records: any[] = [];
    Object.entries(attendanceChanges).forEach(([employeeId, dates]) => {
      Object.entries(dates).forEach(([date, status]) => {
        records.push({
          employeeId,
          organizationId: selectedOrgId,
          date,
          status,
        });
      });
    });
    if (records.length > 0) {
      saveAttendanceMutation.mutate({ records });
    }
  };

  const hasChanges = Object.keys(attendanceChanges).length > 0;
  const activeEmployees = employees?.filter((e) => e.status === "active") || [];

  const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Manage Organization
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage employees, attendance, and payslips for any organization
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgsLoading ? (
            <Skeleton className="h-10 w-full max-w-md" />
          ) : (
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="max-w-md" data-testid="select-organization">
                <SelectValue placeholder="Choose an organization to manage" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name} - {org.industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedOrgId && (
        <Tabs defaultValue="employees">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="employees" data-testid="tab-employees">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Calendar className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payslips" data-testid="tab-payslips">
              <FileText className="h-4 w-4 mr-2" />
              Payslips
            </TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Employees - {selectedOrg?.name}</CardTitle>
                <CardDescription>
                  {activeEmployees.length} active employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                {employeesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : activeEmployees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No employees found for this organization
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeEmployees.map((emp) => (
                        <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                          <TableCell className="font-mono">{emp.employeeCode}</TableCell>
                          <TableCell className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </TableCell>
                          <TableCell>{emp.email}</TableCell>
                          <TableCell>{emp.department || "-"}</TableCell>
                          <TableCell>{emp.designation || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                              {emp.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>Attendance Grid - {selectedOrg?.name}</CardTitle>
                    <CardDescription>
                      Mark attendance for all employees
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentMonth(newDate);
                        }}
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="font-medium min-w-[120px] text-center">
                        {format(currentMonth, "MMMM yyyy")}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentMonth(newDate);
                        }}
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    {hasChanges && (
                      <Button
                        onClick={handleSaveAttendance}
                        disabled={saveAttendanceMutation.isPending}
                        data-testid="button-save-attendance"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saveAttendanceMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {attendanceStatuses.map((status) => (
                    <div key={status.value} className="flex items-center gap-1">
                      <div className={`h-4 w-4 rounded ${status.color}`} />
                      <span className="text-xs">{status.label} - {status.value}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {attendanceLoading || employeesLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : activeEmployees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No employees found for this organization
                  </p>
                ) : (
                  <ScrollArea className="w-full">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                              Employee
                            </TableHead>
                            {daysInMonth.map((day) => {
                              const dayNum = getDay(day);
                              const isWkend = isWeekend(day);
                              return (
                                <TableHead
                                  key={day.toISOString()}
                                  className={`text-center min-w-[40px] px-1 ${isWkend ? "bg-muted/50" : ""}`}
                                >
                                  <div className="text-xs">{dayAbbreviations[dayNum]}</div>
                                  <div className="font-medium">{format(day, "d")}</div>
                                </TableHead>
                              );
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeEmployees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                <div>
                                  <div>{emp.firstName} {emp.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
                                </div>
                              </TableCell>
                              {daysInMonth.map((day) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const status = getAttendanceStatus(emp.id, dateStr);
                                const statusInfo = attendanceStatuses.find((s) => s.value === status);
                                const isWkend = isWeekend(day);
                                
                                return (
                                  <TableCell
                                    key={dateStr}
                                    className={`text-center p-0 ${isWkend ? "bg-muted/50" : ""}`}
                                  >
                                    <Select
                                      value={status}
                                      onValueChange={(value) => setAttendanceStatus(emp.id, dateStr, value)}
                                    >
                                      <SelectTrigger
                                        className={`h-8 w-10 border-0 ${statusInfo ? statusInfo.color + " text-white" : ""}`}
                                        data-testid={`select-attendance-${emp.id}-${dateStr}`}
                                      >
                                        <SelectValue>
                                          {statusInfo?.label || "-"}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {attendanceStatuses.map((s) => (
                                          <SelectItem key={s.value} value={s.value}>
                                            {s.label} - {s.value}
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
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payslips" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>Payslips - {selectedOrg?.name}</CardTitle>
                    <CardDescription>
                      View and upload payslips for employees
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {payslipsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !payslips || payslips.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No payslips found for this organization
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Month/Year</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Uploaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payslips.map((payslip) => {
                        const emp = employees?.find((e) => e.id === payslip.employeeId);
                        return (
                          <TableRow key={payslip.id} data-testid={`row-payslip-${payslip.id}`}>
                            <TableCell className="font-medium">
                              {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                            </TableCell>
                            <TableCell>
                              {format(new Date(payslip.year, payslip.month - 1), "MMMM yyyy")}
                            </TableCell>
                            <TableCell>
                              <a
                                href={payslip.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {payslip.fileName}
                              </a>
                            </TableCell>
                            <TableCell>
                              {payslip.uploadedAt
                                ? format(new Date(payslip.uploadedAt), "MMM d, yyyy")
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
