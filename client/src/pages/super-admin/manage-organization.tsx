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
import { Building2, Users, FileText, Calendar, ChevronLeft, ChevronRight, Save, Upload, CalendarDays, Plus, Trash2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, getDay } from "date-fns";
import type { Organization, Employee, Attendance, Payslip, Holiday } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

const attendanceStatuses = [
  { value: "present", label: "P", color: "bg-green-500" },
  { value: "absent", label: "A", color: "bg-red-500" },
  { value: "half_day", label: "H", color: "bg-yellow-500" },
  { value: "leave", label: "L", color: "bg-blue-500" },
  { value: "holiday", label: "HO", color: "bg-purple-500" },
];

const dayAbbreviations = ["S", "M", "T", "W", "T", "F", "S"];

const holidayFormSchema = z.object({
  name: z.string().min(1, "Holiday name required"),
  date: z.string().min(1, "Date required"),
  isNational: z.boolean().default(false),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

export default function ManageOrganization() {
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceChanges, setAttendanceChanges] = useState<Record<string, Record<string, string>>>({});
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const { toast } = useToast();

  const holidayForm = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      name: "",
      date: "",
      isNational: false,
    },
  });

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

  const { data: holidays, isLoading: holidaysLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/super-admin/holidays", selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      const res = await fetch(`/api/super-admin/holidays?organizationId=${selectedOrgId}`);
      return res.json();
    },
    enabled: !!selectedOrgId,
  });

  const createHolidayMutation = useMutation({
    mutationFn: (data: HolidayFormValues & { organizationId: string }) =>
      apiRequest("POST", "/api/super-admin/holidays", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/holidays", selectedOrgId] });
      setHolidayDialogOpen(false);
      holidayForm.reset();
      toast({ title: "Holiday added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add holiday", description: error.message, variant: "destructive" });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/super-admin/holidays/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/holidays", selectedOrgId] });
      toast({ title: "Holiday deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete holiday", description: error.message, variant: "destructive" });
    },
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

  const onHolidaySubmit = (values: HolidayFormValues) => {
    createHolidayMutation.mutate({
      ...values,
      organizationId: selectedOrgId,
    });
  };

  const customHolidays = holidays?.filter((h) => h.isCustom) || [];
  const defaultHolidays = holidays?.filter((h) => !h.isCustom) || [];

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
          <TabsList className="grid w-full grid-cols-4 max-w-lg">
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
            <TabsTrigger value="holidays" data-testid="tab-holidays">
              <CalendarDays className="h-4 w-4 mr-2" />
              Holidays
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

          <TabsContent value="holidays" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <CardTitle>Holidays - {selectedOrg?.name}</CardTitle>
                    <CardDescription>
                      Manage custom holidays for this organization
                    </CardDescription>
                  </div>
                  <Button onClick={() => setHolidayDialogOpen(true)} data-testid="button-add-holiday">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {holidaysLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {customHolidays.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Custom Holidays</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Holiday Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customHolidays.map((holiday) => (
                              <TableRow key={holiday.id} data-testid={`row-holiday-${holiday.id}`}>
                                <TableCell>
                                  {format(new Date(holiday.date), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-medium">{holiday.name}</TableCell>
                                <TableCell>
                                  <Badge variant={holiday.isNational ? "default" : "secondary"}>
                                    {holiday.isNational ? "National" : "Organization"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                                    disabled={deleteHolidayMutation.isPending}
                                    data-testid={`button-delete-holiday-${holiday.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {defaultHolidays.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Default Holidays (from industry)</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Holiday Name</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {defaultHolidays.map((holiday) => (
                              <TableRow key={holiday.id} data-testid={`row-default-holiday-${holiday.id}`}>
                                <TableCell>
                                  {format(new Date(holiday.date), "MMM d, yyyy")}
                                </TableCell>
                                <TableCell className="font-medium">{holiday.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {holiday.isNational ? "National" : "Industry Default"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {customHolidays.length === 0 && defaultHolidays.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        No holidays configured for this organization
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Custom Holiday</DialogTitle>
          </DialogHeader>
          <Form {...holidayForm}>
            <form onSubmit={holidayForm.handleSubmit(onHolidaySubmit)} className="space-y-4">
              <FormField
                control={holidayForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Holiday Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Company Anniversary" {...field} data-testid="input-holiday-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={holidayForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-holiday-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={holidayForm.control}
                name="isNational"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-national-holiday"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>National Holiday</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setHolidayDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createHolidayMutation.isPending} data-testid="button-save-holiday">
                  {createHolidayMutation.isPending ? "Adding..." : "Add Holiday"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
