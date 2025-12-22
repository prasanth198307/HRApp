import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Trash2, Send, FileText, AlertCircle, CheckCircle, Clock, Edit2 } from "lucide-react";
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
import type { TaxDeclaration, TaxDeclarationItem } from "@shared/schema";

const TAX_CATEGORIES = [
  { value: "80C", label: "Section 80C", limit: 150000, description: "PPF, ELSS, Insurance Premium, etc." },
  { value: "80CCD", label: "Section 80CCD (NPS)", limit: 50000, description: "National Pension Scheme additional" },
  { value: "80D", label: "Section 80D (Medical)", limit: 100000, description: "Health Insurance Premium" },
  { value: "80E", label: "Section 80E", limit: null, description: "Education Loan Interest" },
  { value: "80G", label: "Section 80G", limit: null, description: "Donations" },
  { value: "HRA", label: "HRA Exemption", limit: null, description: "House Rent Allowance" },
  { value: "LTA", label: "LTA", limit: null, description: "Leave Travel Allowance" },
  { value: "OTHER", label: "Other Deductions", limit: null, description: "Any other tax saving investments" },
] as const;

const CATEGORY_SUBTYPES: Record<string, { value: string; label: string }[]> = {
  "80C": [
    { value: "PPF", label: "Public Provident Fund (PPF)" },
    { value: "ELSS", label: "ELSS Mutual Funds" },
    { value: "LIC", label: "Life Insurance Premium" },
    { value: "ULIP", label: "ULIP" },
    { value: "NSC", label: "National Savings Certificate" },
    { value: "TAX_SAVER_FD", label: "Tax Saver Fixed Deposit" },
    { value: "TUITION", label: "Tuition Fees" },
    { value: "HOME_LOAN_PRINCIPAL", label: "Home Loan Principal" },
    { value: "SUKANYA", label: "Sukanya Samriddhi Yojana" },
    { value: "OTHER_80C", label: "Other 80C Investment" },
  ],
  "80D": [
    { value: "SELF_FAMILY", label: "Self & Family Health Insurance" },
    { value: "PARENTS", label: "Parents Health Insurance" },
    { value: "PREVENTIVE_CHECKUP", label: "Preventive Health Checkup" },
  ],
};

const taxItemSchema = z.object({
  category: z.string().min(1, "Select a category"),
  subType: z.string().optional(),
  description: z.string().optional(),
  amountDeclared: z.string().min(1, "Amount is required").refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be positive"),
  providerName: z.string().optional(),
  policyNumber: z.string().optional(),
});

type TaxItemFormValues = z.infer<typeof taxItemSchema>;

interface TaxDeclarationResponse {
  declaration: TaxDeclaration;
  items: TaxDeclarationItem[];
}

export default function TaxDeclarationsPage() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<TaxDeclarationItem | null>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<TaxDeclarationResponse>({
    queryKey: ["/api/employee/tax-declarations/current"],
  });

  const form = useForm<TaxItemFormValues>({
    resolver: zodResolver(taxItemSchema),
    defaultValues: {
      category: "",
      subType: "",
      description: "",
      amountDeclared: "",
      providerName: "",
      policyNumber: "",
    },
  });

  const selectedCategory = form.watch("category");
  const categoryInfo = TAX_CATEGORIES.find((c) => c.value === selectedCategory);
  const subtypes = selectedCategory ? CATEGORY_SUBTYPES[selectedCategory] : [];

  const addItemMutation = useMutation({
    mutationFn: async (values: TaxItemFormValues) => {
      const res = await apiRequest("POST", `/api/employee/tax-declarations/${data?.declaration.id}/items`, values);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Investment added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/tax-declarations/current"] });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, values }: { itemId: string; values: TaxItemFormValues }) => {
      const res = await apiRequest("PATCH", `/api/employee/tax-declarations/${data?.declaration.id}/items/${itemId}`, values);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Investment updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/tax-declarations/current"] });
      setEditItem(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("DELETE", `/api/employee/tax-declarations/${data?.declaration.id}/items/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Investment removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/tax-declarations/current"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/employee/tax-declarations/${data?.declaration.id}/submit`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Declaration submitted for verification" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/tax-declarations/current"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateRegimeMutation = useMutation({
    mutationFn: async (regime: "old" | "new") => {
      const res = await apiRequest("PATCH", `/api/employee/tax-declarations/${data?.declaration.id}/regime`, { taxRegime: regime });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tax regime updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/tax-declarations/current"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: TaxItemFormValues) => {
    if (editItem) {
      updateItemMutation.mutate({ itemId: editItem.id, values });
    } else {
      addItemMutation.mutate(values);
    }
  };

  const openEditDialog = (item: TaxDeclarationItem) => {
    setEditItem(item);
    form.reset({
      category: item.category,
      subType: item.subType || "",
      description: item.description || "",
      amountDeclared: item.amountDeclared,
      providerName: item.providerName || "",
      policyNumber: item.policyNumber || "",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary" data-testid="badge-status-draft"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case "submitted":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400" data-testid="badge-status-submitted"><Clock className="w-3 h-3 mr-1" />Pending Verification</Badge>;
      case "verified":
        return <Badge variant="outline" className="border-green-500 text-green-600 dark:text-green-400" data-testid="badge-status-verified"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getCategoryTotals = () => {
    if (!data?.items) return {};
    const totals: Record<string, number> = {};
    data.items.forEach((item) => {
      totals[item.category] = (totals[item.category] || 0) + parseFloat(item.amountDeclared);
    });
    return totals;
  };

  const categoryTotals = getCategoryTotals();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const declaration = data?.declaration;
  const items = data?.items || [];
  const isDraft = declaration?.status === "draft";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Tax Declarations (Form 12BB)</h1>
          <p className="text-muted-foreground">Financial Year: {declaration?.financialYear}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {declaration && getStatusBadge(declaration.status)}
          {isDraft && items.length > 0 && (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit-declaration"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Verification
            </Button>
          )}
        </div>
      </div>

      {declaration?.remarks && declaration.status === "draft" && (
        <Card className="border-amber-500">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">Changes Requested</p>
              <p className="text-sm text-muted-foreground">{declaration.remarks}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tax Regime Selection</CardTitle>
          <CardDescription>
            Choose your preferred tax regime for this financial year. New regime has lower rates but fewer deductions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Select
              value={declaration?.taxRegime || "old"}
              onValueChange={(value: "old" | "new") => updateRegimeMutation.mutate(value)}
              disabled={!isDraft || updateRegimeMutation.isPending}
            >
              <SelectTrigger className="w-[200px]" data-testid="select-tax-regime">
                <SelectValue placeholder="Select regime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="old" data-testid="option-old-regime">Old Regime</SelectItem>
                <SelectItem value="new" data-testid="option-new-regime">New Regime</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {declaration?.taxRegime === "new" ? (
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  New regime: Most deductions (80C, 80D, HRA, LTA) are not applicable
                </span>
              ) : (
                <span>Old regime: All deductions and exemptions applicable</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tax Regime</CardDescription>
            <CardTitle className="text-lg" data-testid="text-tax-regime">
              {declaration?.taxRegime === "new" ? "New Regime" : "Old Regime"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Declared</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-declared">
              {formatCurrency(declaration?.totalDeclared || "0")}
            </CardTitle>
          </CardHeader>
        </Card>
        {declaration?.totalApproved && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Approved</CardDescription>
              <CardTitle className="text-2xl text-green-600" data-testid="text-total-approved">
                {formatCurrency(declaration.totalApproved)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Investment Declarations</CardTitle>
            <CardDescription>Add your tax-saving investments and deductions</CardDescription>
          </div>
          {isDraft && (
            <Dialog open={addDialogOpen || !!editItem} onOpenChange={(open) => {
              if (!open) {
                setAddDialogOpen(false);
                setEditItem(null);
                form.reset();
              } else {
                setAddDialogOpen(true);
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-investment">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Investment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editItem ? "Edit Investment" : "Add Investment"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TAX_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {categoryInfo && (
                            <FormDescription>
                              {categoryInfo.description}
                              {categoryInfo.limit && ` (Limit: ${formatCurrency(categoryInfo.limit.toString())})`}
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {subtypes && subtypes.length > 0 && (
                      <FormField
                        control={form.control}
                        name="subType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-subtype">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subtypes.map((sub) => (
                                  <SelectItem key={sub.value} value={sub.value}>
                                    {sub.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="amountDeclared"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (INR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter amount"
                              {...field}
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="providerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider/Institution Name (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., LIC, HDFC Bank"
                              {...field}
                              data-testid="input-provider"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="policyNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy/Account Number (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Policy number or account"
                              {...field}
                              data-testid="input-policy"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Any additional details"
                              {...field}
                              data-testid="input-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={addItemMutation.isPending || updateItemMutation.isPending}
                        data-testid="button-save-investment"
                      >
                        {editItem ? "Update" : "Add"} Investment
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No investments declared yet.</p>
              {isDraft && <p className="text-sm">Click "Add Investment" to get started.</p>}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Declared</TableHead>
                  {declaration?.status === "verified" && (
                    <TableHead className="text-right">Approved</TableHead>
                  )}
                  {isDraft && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const catInfo = TAX_CATEGORIES.find((c) => c.value === item.category);
                  const subInfo = CATEGORY_SUBTYPES[item.category]?.find((s) => s.value === item.subType);
                  return (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{catInfo?.label || item.category}</p>
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amountDeclared)}
                      </TableCell>
                      {declaration?.status === "verified" && (
                        <TableCell className="text-right font-medium text-green-600">
                          {item.amountApproved ? formatCurrency(item.amountApproved) : "-"}
                        </TableCell>
                      )}
                      {isDraft && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Summary</CardTitle>
          <CardDescription>Total declarations by category with applicable limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TAX_CATEGORIES.map((cat) => {
              const total = categoryTotals[cat.value] || 0;
              const isOverLimit = cat.limit && total > cat.limit;
              return (
                <div
                  key={cat.value}
                  className={`p-3 rounded-md border ${isOverLimit ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" : ""}`}
                  data-testid={`summary-${cat.value}`}
                >
                  <p className="text-sm text-muted-foreground">{cat.label}</p>
                  <p className={`text-lg font-semibold ${isOverLimit ? "text-amber-600" : ""}`}>
                    {formatCurrency(total.toString())}
                  </p>
                  {cat.limit && (
                    <p className="text-xs text-muted-foreground">
                      Limit: {formatCurrency(cat.limit.toString())}
                      {isOverLimit && (
                        <span className="text-amber-600 ml-1">(Exceeds limit)</span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
