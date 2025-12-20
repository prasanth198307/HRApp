import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { UserPlus, Search, Users, UserCog } from "lucide-react";
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
import type { Employee, AppUser } from "@shared/schema";
import { format } from "date-fns";

const userAccountFormSchema = z.object({
  employeeId: z.string().min(1, "Select an employee"),
});

type UserAccountFormValues = z.infer<typeof userAccountFormSchema>;

interface AppUserWithEmployee extends AppUser {
  employee?: Employee;
}

export default function UserAccountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: userAccounts, isLoading } = useQuery<AppUserWithEmployee[]>({
    queryKey: ["/api/user-accounts"],
  });

  const form = useForm<UserAccountFormValues>({
    resolver: zodResolver(userAccountFormSchema),
    defaultValues: {
      employeeId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: UserAccountFormValues) =>
      apiRequest("POST", "/api/user-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-accounts"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: "User account created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create user account", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/user-accounts/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-accounts"] });
      toast({ title: "Account status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: UserAccountFormValues) => {
    createMutation.mutate(values);
  };

  const activeEmployees = employees?.filter(emp => emp.status === "active") ?? [];
  
  const employeesWithoutAccounts = activeEmployees.filter(emp => {
    return !userAccounts?.some(ua => ua.employeeId === emp.id);
  });

  const filteredAccounts = userAccounts?.filter((ua) => {
    const empName = ua.employee
      ? `${ua.employee.firstName} ${ua.employee.lastName}`.toLowerCase()
      : "";
    return empName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            User Accounts
          </h1>
          <p className="text-muted-foreground mt-2">
            Create login accounts for employees
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-account" disabled={employeesWithoutAccounts.length === 0}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Create Employee Account</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-4">
              Select an employee to create a login account for. They will be able to sign in 
              using Replit Auth and view their attendance and payslips.
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employeesWithoutAccounts.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} ({emp.employeeCode})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-account">
                    {createMutation.isPending ? "Creating..." : "Create Account"}
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
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Accounts
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-accounts"
              />
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
          ) : filteredAccounts && filteredAccounts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                            {account.employee
                              ? `${account.employee.firstName.charAt(0)}${account.employee.lastName.charAt(0)}`
                              : "??"
                            }
                          </div>
                          <div>
                            <p className="font-medium">
                              {account.employee
                                ? `${account.employee.firstName} ${account.employee.lastName}`
                                : "Unknown"
                              }
                            </p>
                            {account.employee && (
                              <p className="text-sm text-muted-foreground">
                                {account.employee.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {account.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.createdAt
                          ? format(new Date(account.createdAt), "MMM d, yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.isActive ? "default" : "destructive"}>
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({
                            id: account.id,
                            isActive: !account.isActive,
                          })}
                          disabled={toggleMutation.isPending}
                          data-testid={`button-toggle-${account.id}`}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          {account.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No user accounts found</p>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Try a different search term"
                  : "Create accounts for employees to let them sign in"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
