import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CalendarX, Check, X, Eye, CalendarCheck } from "lucide-react";
import type { LeaveRequest, Employee, LeavePolicy } from "@shared/schema";
import { format, differenceInDays, parseISO } from "date-fns";

export default function LeaveRequestsPage() {
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: requests, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["/api/leave-requests"],
  });

  const { data: employees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: policies } = useQuery<LeavePolicy[]>({
    queryKey: ["/api/leave-policies"],
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/leave-requests/${id}`, { 
        status: "approved",
        reviewNotes 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setSelectedRequest(null);
      setReviewNotes("");
      toast({ title: "Leave request approved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/leave-requests/${id}`, { 
        status: "rejected",
        reviewNotes 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leave-requests"] });
      setSelectedRequest(null);
      setReviewNotes("");
      toast({ title: "Leave request rejected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reject", description: error.message, variant: "destructive" });
    },
  });

  const getEmployee = (employeeId: string) => {
    return employees?.find((e) => e.id === employeeId);
  };

  const getPolicy = (policyId: string | null) => {
    if (!policyId) return null;
    return policies?.find((p) => p.id === policyId);
  };

  const getDayCount = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
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

  const filteredRequests = requests?.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const pendingCount = requests?.filter((r) => r.status === "pending").length || 0;

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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Leave Requests</h1>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2">{pendingCount} pending</Badge>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests && filteredRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const emp = getEmployee(request.employeeId);
                  const policy = getPolicy(request.policyId);
                  const days = getDayCount(request.startDate, request.endDate);
                  return (
                    <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                      <TableCell className="font-medium">
                        {emp ? `${emp.firstName} ${emp.lastName}` : "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy?.code || request.leaveType}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(request.startDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(parseISO(request.endDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>{days}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedRequest(request)}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-green-600"
                                onClick={() => approveMutation.mutate(request.id)}
                                disabled={approveMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => rejectMutation.mutate(request.id)}
                                disabled={rejectMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarX className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests found.</p>
              <p className="text-sm">Employee leave requests will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="font-medium">
                    {(() => {
                      const emp = getEmployee(selectedRequest.employeeId);
                      return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
                    })()}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Leave Type</Label>
                  <p className="font-medium">
                    {getPolicy(selectedRequest.policyId)?.displayName || selectedRequest.leaveType}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p className="font-medium">{format(parseISO(selectedRequest.startDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">To</Label>
                  <p className="font-medium">{format(parseISO(selectedRequest.endDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Days</Label>
                  <p className="font-medium">{getDayCount(selectedRequest.startDate, selectedRequest.endDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium mt-1">{selectedRequest.reason}</p>
              </div>
              {selectedRequest.status === "pending" && (
                <>
                  <div>
                    <Label>Review Notes (Optional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add notes about your decision..."
                      className="mt-1"
                      data-testid="input-notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(selectedRequest.id)}
                      disabled={rejectMutation.isPending}
                      data-testid="button-reject-dialog"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate(selectedRequest.id)}
                      disabled={approveMutation.isPending}
                      data-testid="button-approve-dialog"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </>
              )}
              {selectedRequest.reviewNotes && (
                <div>
                  <Label className="text-muted-foreground">Review Notes</Label>
                  <p className="font-medium mt-1">{selectedRequest.reviewNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
