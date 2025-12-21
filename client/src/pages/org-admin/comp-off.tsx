import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Check, X } from "lucide-react";
import type { Employee, CompOffGrant } from "@shared/schema";
import { format } from "date-fns";

export default function CompOffPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [hoursWorked, setHoursWorked] = useState("8");
  const [daysGranted, setDaysGranted] = useState("1");
  const [source, setSource] = useState<"overtime" | "holiday_work" | "manual">("overtime");
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: grants, isLoading: grantsLoading } = useQuery<CompOffGrant[]>({
    queryKey: ["/api/comp-off-grants"],
  });

  const activeEmployees = employees?.filter(emp => emp.status === "active") ?? [];

  const createMutation = useMutation({
    mutationFn: (data: {
      employeeId: string;
      workDate: string;
      hoursWorked: string;
      daysGranted: string;
      source: string;
      reason?: string;
    }) => apiRequest("POST", "/api/comp-off-grants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-grants"] });
      toast({ title: "Comp Off granted successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to grant Comp Off", description: error.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/comp-off-grants/${id}/apply`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comp-off-grants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leave-balances"] });
      toast({ title: "Comp Off applied to leave balance" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to apply Comp Off", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedEmployeeId("");
    setWorkDate("");
    setHoursWorked("8");
    setDaysGranted("1");
    setSource("overtime");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || !workDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      employeeId: selectedEmployeeId,
      workDate,
      hoursWorked,
      daysGranted,
      source,
      reason: reason || undefined,
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const emp = employees?.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case "overtime": return "Overtime";
      case "holiday_work": return "Holiday Work";
      case "manual": return "Manual";
      default: return src;
    }
  };

  const isLoading = employeesLoading || grantsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Comp Off Management</h1>
          <p className="text-muted-foreground">
            Grant compensatory off for overtime or holiday work
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-grant-comp-off">
          <Plus className="mr-2 h-4 w-4" />
          Grant Comp Off
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Grants</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-grants">
              {grants?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Application</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-grants">
              {grants?.filter(g => !g.isApplied).length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied to Balance</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-applied-grants">
              {grants?.filter(g => g.isApplied).length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comp Off Grants</CardTitle>
          <CardDescription>
            View and manage compensatory off grants. Apply pending grants to update employee leave balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : grants && grants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Work Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Days Granted</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => (
                  <TableRow key={grant.id} data-testid={`row-grant-${grant.id}`}>
                    <TableCell className="font-medium">
                      {getEmployeeName(grant.employeeId)}
                    </TableCell>
                    <TableCell>{grant.workDate}</TableCell>
                    <TableCell>{grant.hoursWorked}</TableCell>
                    <TableCell>{grant.daysGranted}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getSourceLabel(grant.source)}</Badge>
                    </TableCell>
                    <TableCell>
                      {grant.isApplied ? (
                        <Badge variant="secondary">Applied</Badge>
                      ) : (
                        <Badge>Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!grant.isApplied && (
                        <Button
                          size="sm"
                          onClick={() => applyMutation.mutate(grant.id)}
                          disabled={applyMutation.isPending}
                          data-testid={`button-apply-${grant.id}`}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Apply to Balance
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No comp off grants found. Click "Grant Comp Off" to create one.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant Comp Off</DialogTitle>
            <DialogDescription>
              Grant compensatory off to an employee for overtime or holiday work.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workDate">Work Date</Label>
              <Input
                id="workDate"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                data-testid="input-work-date"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hoursWorked">Hours Worked</Label>
                <Input
                  id="hoursWorked"
                  type="number"
                  step="0.5"
                  min="0"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  data-testid="input-hours-worked"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daysGranted">Days Granted</Label>
                <Input
                  id="daysGranted"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={daysGranted}
                  onChange={(e) => setDaysGranted(e.target.value)}
                  data-testid="input-days-granted"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger data-testid="select-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overtime">Overtime</SelectItem>
                  <SelectItem value="holiday_work">Holiday Work</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Worked on Saturday for project deadline"
                data-testid="input-reason"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-grant">
                {createMutation.isPending ? "Granting..." : "Grant Comp Off"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
