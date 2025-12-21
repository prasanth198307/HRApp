import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Users, Plus, Search, Edit, UserMinus, UserPlus, Eye } from "lucide-react";
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
import type { Employee, InsertEmployee } from "@shared/schema";
import { employmentStatusOptions } from "@shared/schema";
import { format } from "date-fns";

const employeeFormSchema = z.object({
  employeeCode: z.string().min(1, "Employee code required"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  dateOfJoining: z.string().min(1, "Date of joining required"),
  salary: z.coerce.number().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
});

const exitFormSchema = z.object({
  dateOfExit: z.string().min(1, "Exit date required"),
  exitReason: z.string().min(1, "Exit reason required"),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
type ExitFormValues = z.infer<typeof exitFormSchema>;

export default function Employees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [exitingEmployee, setExitingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();

  const { data: employees, isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeCode: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      dateOfJoining: "",
      salary: undefined,
      address: "",
      emergencyContact: "",
    },
  });

  const exitForm = useForm<ExitFormValues>({
    resolver: zodResolver(exitFormSchema),
    defaultValues: {
      dateOfExit: "",
      exitReason: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertEmployee) =>
      apiRequest("POST", "/api/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/stats"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: "Employee added successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add employee", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertEmployee> }) =>
      apiRequest("PATCH", `/api/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setEditingEmployee(null);
      form.reset();
      toast({ title: "Employee updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update employee", description: error.message, variant: "destructive" });
    },
  });

  const exitMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExitFormValues }) =>
      apiRequest("POST", `/api/employees/${id}/exit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/stats"] });
      setExitingEmployee(null);
      exitForm.reset();
      toast({ title: "Employee exit recorded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record exit", description: error.message, variant: "destructive" });
    },
  });

  const rejoinMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/employees/${id}/rejoin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org/stats"] });
      toast({ title: "Employee rejoined successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record exit", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: EmployeeFormValues) => {
    const data: InsertEmployee = {
      ...values,
      organizationId: "",
      phone: values.phone || null,
      department: values.department || null,
      designation: values.designation || null,
      salary: values.salary || null,
      address: values.address || null,
      emergencyContact: values.emergencyContact || null,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const onExitSubmit = (values: ExitFormValues) => {
    if (exitingEmployee) {
      exitMutation.mutate({ id: exitingEmployee.id, data: values });
    }
  };

  const openEditDialog = (emp: Employee) => {
    setEditingEmployee(emp);
    form.reset({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone || "",
      department: emp.department || "",
      designation: emp.designation || "",
      dateOfJoining: emp.dateOfJoining,
      salary: emp.salary || undefined,
      address: emp.address || "",
      emergencyContact: emp.emergencyContact || "",
    });
  };

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Employees
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization's employees
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-employee">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="employeeCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="EMP001" {...field} data-testid="input-emp-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfJoining"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Joining *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-emp-doj" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} data-testid="input-emp-firstname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} data-testid="input-emp-lastname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john.doe@company.com" {...field} data-testid="input-emp-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} data-testid="input-emp-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salary</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000" {...field} data-testid="input-emp-salary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Engineering" {...field} data-testid="input-emp-department" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="Software Engineer" {...field} data-testid="input-emp-designation" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St, City, Country" {...field} data-testid="input-emp-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input placeholder="Name - Phone" {...field} data-testid="input-emp-emergency" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-employee">
                    {createMutation.isPending ? "Adding..." : "Add Employee"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>All Employees</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-employees"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {employmentStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEmployees && filteredEmployees.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                            <p className="text-sm text-muted-foreground">{emp.employeeCode}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.department || "-"}</TableCell>
                      <TableCell>{emp.designation || "-"}</TableCell>
                      <TableCell>{format(new Date(emp.dateOfJoining), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge
                          variant={emp.status === "active" ? "default" : emp.status === "on_notice" ? "secondary" : "destructive"}
                        >
                          {emp.status === "on_notice" ? "On Notice" : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingEmployee(emp)}
                            data-testid={`button-view-employee-${emp.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(emp)}
                            data-testid={`button-edit-employee-${emp.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {emp.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExitingEmployee(emp)}
                              title="Record Exit"
                              data-testid={`button-exit-employee-${emp.id}`}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                          {emp.status === "exited" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => rejoinMutation.mutate(emp.id)}
                              disabled={rejoinMutation.isPending}
                              title="Rejoin Employee"
                              data-testid={`button-rejoin-employee-${emp.id}`}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No employees found</p>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try different search criteria"
                  : "Add your first employee to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employeeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateOfJoining"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Joining *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {viewingEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
                  {viewingEmployee.firstName.charAt(0)}{viewingEmployee.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {viewingEmployee.firstName} {viewingEmployee.lastName}
                  </h3>
                  <p className="text-muted-foreground">{viewingEmployee.employeeCode}</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Email</span>
                  <span>{viewingEmployee.email}</span>
                </div>
                {viewingEmployee.phone && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{viewingEmployee.phone}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Department</span>
                  <span>{viewingEmployee.department || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Designation</span>
                  <span>{viewingEmployee.designation || "-"}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Date of Joining</span>
                  <span>{format(new Date(viewingEmployee.dateOfJoining), "MMMM d, yyyy")}</span>
                </div>
                {viewingEmployee.dateOfExit && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Date of Exit</span>
                    <span>{format(new Date(viewingEmployee.dateOfExit), "MMMM d, yyyy")}</span>
                  </div>
                )}
                {viewingEmployee.exitReason && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Exit Reason</span>
                    <span>{viewingEmployee.exitReason}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={viewingEmployee.status === "active" ? "default" : "destructive"}>
                    {viewingEmployee.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!exitingEmployee} onOpenChange={(open) => !open && setExitingEmployee(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Employee Exit</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Record exit details for {exitingEmployee?.firstName} {exitingEmployee?.lastName}
          </p>
          <Form {...exitForm}>
            <form onSubmit={exitForm.handleSubmit(onExitSubmit)} className="space-y-4">
              <FormField
                control={exitForm.control}
                name="dateOfExit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Exit *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-exit-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exitForm.control}
                name="exitReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Exit *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Resignation, Termination, etc." {...field} data-testid="input-exit-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setExitingEmployee(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={exitMutation.isPending} data-testid="button-confirm-exit">
                  {exitMutation.isPending ? "Recording..." : "Record Exit"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
