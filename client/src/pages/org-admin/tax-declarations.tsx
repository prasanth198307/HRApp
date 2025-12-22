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
  DialogFooter,
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
import { Eye, CheckCircle, RotateCcw, FileText, Clock, Users } from "lucide-react";
import type { TaxDeclaration, TaxDeclarationItem } from "@shared/schema";

// All categories for display purposes
const TAX_CATEGORIES = [
  // Old Regime categories
  { value: "HRA", label: "HRA - House Rent Allowance" },
  { value: "LTA", label: "LTA - Leave Travel Allowance" },
  { value: "HOME_LOAN_INTEREST", label: "Home Loan Interest - Section 24(b)" },
  { value: "80C", label: "Section 80C Investments" },
  { value: "80CCD_EMPLOYEE", label: "Section 80CCD(1B) - Employee NPS" },
  { value: "80CCD_EMPLOYER", label: "Section 80CCD(2) - Employer NPS" },
  { value: "80D", label: "Section 80D - Health Insurance" },
  { value: "80DD", label: "Section 80DD - Disabled Dependent" },
  { value: "80DDB", label: "Section 80DDB - Medical Treatment" },
  { value: "80E", label: "Section 80E - Education Loan Interest" },
  { value: "80EE", label: "Section 80EE/80EEA - First Home Buyer" },
  { value: "80G", label: "Section 80G - Donations" },
  { value: "80GG", label: "Section 80GG - Rent (No HRA)" },
  { value: "80TTA", label: "Section 80TTA/80TTB - Savings Interest" },
  { value: "80U", label: "Section 80U - Person with Disability" },
  { value: "OTHER", label: "Other Deductions" },
  // New Regime categories
  { value: "AGNIVEER", label: "Section 80CCH - Agniveer Corpus Fund" },
  { value: "HOME_LOAN_INTEREST_LET_OUT", label: "Home Loan Interest (Let-Out Property)" },
  { value: "FAMILY_PENSION", label: "Family Pension Deduction" },
  { value: "TRANSPORT_DISABLED", label: "Transport Allowance (Disabled)" },
  { value: "GRATUITY", label: "Gratuity Exemption" },
  { value: "LEAVE_ENCASHMENT", label: "Leave Encashment Exemption" },
] as const;

const CATEGORY_SUBTYPES: Record<string, { value: string; label: string }[]> = {
  "80C": [
    { value: "PPF", label: "Public Provident Fund (PPF)" },
    { value: "ELSS", label: "ELSS Mutual Funds" },
    { value: "LIC", label: "Life Insurance Premium" },
    { value: "ULIP", label: "Unit Linked Insurance Plan" },
    { value: "NSC", label: "National Savings Certificate" },
    { value: "TAX_SAVER_FD", label: "5-Year Tax Saver Fixed Deposit" },
    { value: "TUITION", label: "Children's Tuition Fees" },
    { value: "HOME_LOAN_PRINCIPAL", label: "Home Loan Principal Repayment" },
    { value: "SUKANYA", label: "Sukanya Samriddhi Yojana" },
    { value: "SCSS", label: "Senior Citizens Savings Scheme" },
    { value: "EPF", label: "Employee Provident Fund (EPF)" },
    { value: "OTHER_80C", label: "Other 80C Investment" },
  ],
  "80D": [
    { value: "SELF_FAMILY", label: "Self & Family Health Insurance" },
    { value: "SELF_SENIOR", label: "Self Health Insurance - Senior Citizen" },
    { value: "PARENTS", label: "Parents Health Insurance" },
    { value: "PARENTS_SENIOR", label: "Parents Health Insurance - Senior" },
    { value: "PREVENTIVE_CHECKUP", label: "Preventive Health Checkup" },
  ],
  "HRA": [
    { value: "RENT_PAID", label: "Rent Paid During the Year" },
  ],
  "HOME_LOAN_INTEREST": [
    { value: "SELF_OCCUPIED", label: "Self-Occupied Property" },
    { value: "LET_OUT", label: "Let-Out/Rented Property" },
  ],
  "80G": [
    { value: "100_PERCENT", label: "100% Deduction" },
    { value: "50_PERCENT", label: "50% Deduction" },
    { value: "WITH_LIMIT", label: "With Qualifying Limit" },
  ],
};

interface DeclarationWithEmployee extends TaxDeclaration {
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
  } | null;
}

interface DeclarationDetail {
  declaration: TaxDeclaration;
  items: TaxDeclarationItem[];
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
    designation: string;
  } | null;
}

function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 3) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export default function OrgAdminTaxDeclarationsPage() {
  const [selectedYear, setSelectedYear] = useState(getCurrentFinancialYear());
  const [viewDeclaration, setViewDeclaration] = useState<string | null>(null);
  const [approvedAmounts, setApprovedAmounts] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    `${currentYear}-${currentYear + 1}`,
    `${currentYear - 1}-${currentYear}`,
    `${currentYear - 2}-${currentYear - 1}`,
  ];

  const { data: declarations, isLoading } = useQuery<DeclarationWithEmployee[]>({
    queryKey: ["/api/org/tax-declarations", selectedYear],
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<DeclarationDetail>({
    queryKey: ["/api/org/tax-declarations", viewDeclaration],
    enabled: !!viewDeclaration,
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!detailData?.items) {
        throw new Error("No items to verify");
      }
      const approvedItems = detailData.items.map((item) => ({
        itemId: item.id,
        amountApproved: parseFloat(approvedAmounts[item.id] ?? item.amountDeclared),
      }));
      const res = await apiRequest("POST", `/api/org/tax-declarations/${viewDeclaration}/verify`, {
        approvedItems,
        remarks,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Declaration verified successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/org/tax-declarations"] });
      setViewDeclaration(null);
      setApprovedAmounts({});
      setRemarks("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/org/tax-declarations/${viewDeclaration}/request-changes`, {
        remarks,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Changes requested", description: "The employee will be notified to update their declaration" });
      queryClient.invalidateQueries({ queryKey: ["/api/org/tax-declarations"] });
      setViewDeclaration(null);
      setApprovedAmounts({});
      setRemarks("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" data-testid="badge-status-draft"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case "submitted":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400" data-testid="badge-status-submitted"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "verified":
        return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400" data-testid="badge-status-verified"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = declarations?.filter((d) => d.status === "submitted").length || 0;
  const verifiedCount = declarations?.filter((d) => d.status === "verified").length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tax Declarations</h1>
          <p className="text-muted-foreground">Review and verify employee tax declarations</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px]" data-testid="select-year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year}>FY {year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Declarations</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2" data-testid="text-total-declarations">
              <Users className="w-5 h-5 text-muted-foreground" />
              {declarations?.length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Verification</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-amber-600" data-testid="text-pending-count">
              <Clock className="w-5 h-5" />
              {pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-green-600" data-testid="text-verified-count">
              <CheckCircle className="w-5 h-5" />
              {verifiedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Declarations</CardTitle>
          <CardDescription>FY {selectedYear}</CardDescription>
        </CardHeader>
        <CardContent>
          {!declarations || declarations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No tax declarations found for this financial year.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Declared</TableHead>
                  <TableHead className="text-right">Total Approved</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {declarations.map((dec) => (
                  <TableRow key={dec.id} data-testid={`row-declaration-${dec.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {dec.employee ? `${dec.employee.firstName} ${dec.employee.lastName}` : "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground">{dec.employee?.employeeCode}</p>
                      </div>
                    </TableCell>
                    <TableCell>{dec.employee?.department || "-"}</TableCell>
                    <TableCell>{getStatusBadge(dec.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(dec.totalDeclared)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {dec.totalApproved ? formatCurrency(dec.totalApproved) : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewDeclaration(dec.id)}
                        data-testid={`button-view-${dec.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewDeclaration} onOpenChange={(open) => {
        if (!open) {
          setViewDeclaration(null);
          setApprovedAmounts({});
          setRemarks("");
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tax Declaration Details</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">
                    {detailData.employee
                      ? `${detailData.employee.firstName} ${detailData.employee.lastName}`
                      : "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">{detailData.employee?.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department / Designation</p>
                  <p className="font-medium">{detailData.employee?.department || "-"}</p>
                  <p className="text-sm text-muted-foreground">{detailData.employee?.designation || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(detailData.declaration.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Financial Year</p>
                  <p className="font-medium">{detailData.declaration.financialYear}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax Regime</p>
                  <Badge variant={detailData.declaration.taxRegime === "new" ? "outline" : "secondary"} data-testid="badge-tax-regime">
                    {detailData.declaration.taxRegime === "new" ? "New Regime" : "Old Regime"}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Declared Investments</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Declared</TableHead>
                      {detailData.declaration.status === "submitted" && (
                        <TableHead className="text-right w-[150px]">Approved Amount</TableHead>
                      )}
                      {detailData.declaration.status === "verified" && (
                        <TableHead className="text-right">Approved</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailData.items.map((item) => {
                      const catInfo = TAX_CATEGORIES.find((c) => c.value === item.category);
                      const subInfo = CATEGORY_SUBTYPES[item.category]?.find((s) => s.value === item.subType);
                      return (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium" data-testid={`text-category-${item.id}`}>{catInfo?.label || item.category}</p>
                              {subInfo && <p className="text-sm text-muted-foreground">{subInfo.label}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.providerName && <p>{item.providerName}</p>}
                              {item.policyNumber && <p className="text-muted-foreground">{item.policyNumber}</p>}
                              {item.description && <p className="text-muted-foreground">{item.description}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium" data-testid={`text-declared-${item.id}`}>
                            {formatCurrency(item.amountDeclared)}
                          </TableCell>
                          {detailData.declaration.status === "submitted" && (
                            <TableCell>
                              <Input
                                type="number"
                                placeholder={item.amountDeclared}
                                value={approvedAmounts[item.id] ?? item.amountDeclared}
                                onChange={(e) => setApprovedAmounts({
                                  ...approvedAmounts,
                                  [item.id]: e.target.value,
                                })}
                                className="w-full text-right"
                                data-testid={`input-approved-${item.id}`}
                              />
                            </TableCell>
                          )}
                          {detailData.declaration.status === "verified" && (
                            <TableCell className="text-right font-medium text-green-600">
                              {item.amountApproved ? formatCurrency(item.amountApproved) : "-"}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {detailData.declaration.status === "submitted" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Remarks (Optional)</label>
                    <Textarea
                      placeholder="Add any remarks or notes..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="mt-1"
                      data-testid="textarea-remarks"
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={() => requestChangesMutation.mutate()}
                      disabled={requestChangesMutation.isPending || !remarks}
                      data-testid="button-request-changes"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => verifyMutation.mutate()}
                      disabled={verifyMutation.isPending}
                      data-testid="button-verify"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Declaration
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {detailData.declaration.remarks && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Admin Remarks</p>
                  <p className="text-sm text-muted-foreground">{detailData.declaration.remarks}</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
