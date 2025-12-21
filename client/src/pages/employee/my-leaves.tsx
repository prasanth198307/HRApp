import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { CalendarPlus, CalendarCheck, CalendarX } from "lucide-react";
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
import type { LeaveRequest, LeavePolicy, EmployeeLeaveBalance } from "@shared/schema";
import { format, differenceInDays, parseISO } from "date-fns";

const leaveRequestSchema = z.object({
  policyId: z.string().min(1, "Select a leave type"),
  startDate: z.string().min(1, "Start date required"),
  endDate: z.string().min(1, "End date required"),
  reason: z.string().min(3, "Please provide a reason"),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type LeaveRequestFormValues = z.infer<typeof leaveRequestSchema>;

export default function MyLeavesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const { data: balances, isLoading: balancesLoading } = useQuery<EmployeeLeaveBalance[]>({
    queryKey: ["/api/employee/leave-balances", currentYear],
  });

  const { data: policies } = useQuery<LeavePolicy[]>({
    queryKey: ["/api/employee/leave-policies"],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/employee/leave-requests"],
  });

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      policyId: "",
      startDate: "",
      endDate: "",
      reason: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: LeaveRequestFormValues) => {
      const policy = policies?.find(p => p.id === data.policyId);
      return apiRequest("POST", "/api/employee/leave-requests", {
        ...data,
        leaveType: policy?.code || "CL",
        totalDays: differenceInDays(parseISO(data.endDate), parseISO(data.startDate)) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/leave-balances"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Leave request submitted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit request", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: LeaveRequestFormValues) => {
    submitMutation.mutate(values);
  };

  const getPolicy = (policyId: string) => {
    return policies?.find((p) => p.id === policyId);
  };

  const getBalance = (policyId: string) => {
    return balances?.find((b) => b.policyId === policyId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const activePolicies = policies?.filter(p => p.isActive) || [];

  if (balancesLoading || requestsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">My Leaves</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-apply-leave">
              <CalendarPlus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="policyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leave Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-leave-type">
                            <SelectValue placeholder="Select leave type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activePolicies.map((policy) => {
                            const balance = getBalance(policy.id);
                            return (
                              <SelectItem key={policy.id} value={policy.id}>
                                {policy.displayName} ({balance?.currentBalance || 0} available)
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Please provide a reason for your leave"
                          data-testid="input-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit">
                    Submit Request
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activePolicies.map((policy) => {
          const balance = getBalance(policy.id);
          return (
            <Card key={policy.id} data-testid={`card-balance-${policy.code}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                  {policy.displayName}
                  <Badge variant="outline">{policy.code}</Badge>
                </CardTitle>
                <CardDescription>Annual quota: {policy.annualQuota} days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{balance?.currentBalance || 0}</div>
                <p className="text-xs text-muted-foreground">days available</p>
                {balance && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Opening:</span>
                      <span>{balance.openingBalance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accrued:</span>
                      <span>+{balance.accrued}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Used:</span>
                      <span>-{balance.used}</span>
                    </div>
                    {balance.adjustment !== 0 && (
                      <div className="flex justify-between">
                        <span>Adjustment:</span>
                        <span>{balance.adjustment > 0 ? "+" : ""}{balance.adjustment}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {activePolicies.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <CalendarX className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No leave policies configured for your organization.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const policy = getPolicy(request.policyId || "");
                  const days = differenceInDays(parseISO(request.endDate), parseISO(request.startDate)) + 1;
                  return (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell>
                        <Badge variant="outline">{policy?.code || request.leaveType}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(request.startDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(parseISO(request.endDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {request.createdAt && format(new Date(request.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarX className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests yet.</p>
              <p className="text-sm">Apply for leave using the button above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
