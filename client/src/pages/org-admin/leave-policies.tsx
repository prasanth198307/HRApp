import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, Plus, Edit, Trash2, FileText } from "lucide-react";
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
  FormDescription,
} from "@/components/ui/form";
import type { LeavePolicy, InsertLeavePolicy } from "@shared/schema";

const policyFormSchema = z.object({
  code: z.enum(["CL", "PL", "SL", "COMP_OFF"]),
  displayName: z.string().min(1, "Policy name required"),
  annualQuota: z.coerce.number().min(0).max(365),
  accrualMethod: z.enum(["monthly", "yearly", "none"]),
  carryForwardType: z.enum(["none", "limited", "unlimited"]),
  carryForwardLimit: z.coerce.number().min(0).optional(),
  isActive: z.boolean().default(true),
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

const policyCodeLabels: Record<string, string> = {
  CL: "Casual Leave",
  PL: "Privilege Leave / Earned Leave",
  SL: "Sick Leave",
  COMP_OFF: "Compensatory Off",
};

const accrualMethodLabels: Record<string, string> = {
  monthly: "Monthly (accrues each month)",
  yearly: "Yearly (full credit at start)",
  none: "None (manual only)",
};

const carryForwardLabels: Record<string, string> = {
  none: "No carry forward",
  limited: "Limited carry forward",
  unlimited: "Unlimited carry forward",
};

export default function LeavePoliciesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const { toast } = useToast();

  const { data: policies, isLoading } = useQuery<LeavePolicy[]>({
    queryKey: ["/api/leave-policies"],
  });

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      code: "CL",
      displayName: "",
      annualQuota: 0,
      accrualMethod: "yearly",
      carryForwardType: "none",
      carryForwardLimit: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertLeavePolicy) =>
      apiRequest("POST", "/api/leave-policies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-policies"] });
      setCreateDialogOpen(false);
      form.reset();
      toast({ title: "Leave policy created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create policy", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertLeavePolicy> }) =>
      apiRequest("PATCH", `/api/leave-policies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-policies"] });
      setEditingPolicy(null);
      form.reset();
      toast({ title: "Leave policy updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update policy", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/leave-policies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-policies"] });
      toast({ title: "Leave policy deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete policy", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: PolicyFormValues) => {
    const data = {
      code: values.code,
      displayName: values.displayName,
      annualQuota: values.annualQuota,
      accrualMethod: values.accrualMethod,
      carryForwardType: values.carryForwardType,
      carryForwardLimit: values.carryForwardType === "limited" ? (values.carryForwardLimit || 0) : 0,
      isActive: values.isActive,
    };

    if (editingPolicy) {
      updateMutation.mutate({ id: editingPolicy.id, data: data as Partial<InsertLeavePolicy> });
    } else {
      createMutation.mutate(data as InsertLeavePolicy);
    }
  };

  const openEditDialog = (policy: LeavePolicy) => {
    setEditingPolicy(policy);
    form.reset({
      code: policy.code as any,
      displayName: policy.displayName,
      annualQuota: policy.annualQuota,
      accrualMethod: policy.accrualMethod as any,
      carryForwardType: policy.carryForwardType as any,
      carryForwardLimit: policy.carryForwardLimit || 0,
      isActive: policy.isActive,
    });
  };

  const closeDialog = () => {
    setCreateDialogOpen(false);
    setEditingPolicy(null);
    form.reset();
  };

  const watchCarryForward = form.watch("carryForwardType");

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Leave Policies</h1>
        </div>
        <Dialog open={createDialogOpen || !!editingPolicy} onOpenChange={(open) => {
          if (!open) closeDialog();
          else setCreateDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-policy">
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPolicy ? "Edit Leave Policy" : "Add Leave Policy"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!editingPolicy}>
                        <FormControl>
                          <SelectTrigger data-testid="select-code">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CL">CL - Casual Leave</SelectItem>
                          <SelectItem value="PL">PL - Privilege/Earned Leave</SelectItem>
                          <SelectItem value="SL">SL - Sick Leave</SelectItem>
                          <SelectItem value="COMP_OFF">COMP_OFF - Compensatory Off</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Casual Leave" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualQuota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Quota (days)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min={0} max={365} data-testid="input-quota" />
                      </FormControl>
                      <FormDescription>Total leaves available per year</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accrualMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrual Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-accrual">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yearly">Yearly - Full quota at year start</SelectItem>
                          <SelectItem value="monthly">Monthly - Quota/12 each month</SelectItem>
                          <SelectItem value="none">None - Manual allocation only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="carryForwardType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carry Forward</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-carry">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None - Leaves lapse at year end</SelectItem>
                          <SelectItem value="limited">Limited - Carry up to max limit</SelectItem>
                          <SelectItem value="unlimited">Unlimited - All balance carries over</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchCarryForward === "limited" && (
                  <FormField
                    control={form.control}
                    name="carryForwardLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Carry Forward (days)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} data-testid="input-max-carry" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Employees can apply for this leave type</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingPolicy ? "Update" : "Create"} Policy
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Organization Leave Policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {policies && policies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Annual Quota</TableHead>
                  <TableHead>Accrual</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id} data-testid={`row-policy-${policy.id}`}>
                    <TableCell>
                      <Badge variant="outline">{policy.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{policy.displayName}</TableCell>
                    <TableCell>{policy.annualQuota} days</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground capitalize">{policy.accrualMethod}</span>
                    </TableCell>
                    <TableCell>
                      {policy.carryForwardType === "none" && "None"}
                      {policy.carryForwardType === "limited" && `Max ${policy.carryForwardLimit} days`}
                      {policy.carryForwardType === "unlimited" && "Unlimited"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.isActive ? "default" : "secondary"}>
                        {policy.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(policy)}
                          data-testid={`button-edit-${policy.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(policy.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${policy.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave policies configured yet.</p>
              <p className="text-sm">Add policies for CL, PL, SL, or Comp Off to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
