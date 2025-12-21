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
import { Building2, Plus, Search, Edit, UserPlus } from "lucide-react";
import { Link } from "wouter";
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
import type { Organization, InsertOrganization } from "@shared/schema";
import { industryOptions } from "@shared/schema";

const editOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  legalName: z.string().optional(),
  industry: z.string().min(1, "Please select an industry"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  tanNumber: z.string().optional(),
  cinNumber: z.string().optional(),
  udyamNumber: z.string().optional(),
  fssaiNumber: z.string().optional(),
});

const adminFormSchema = z.object({
  email: z.string().email("Valid email required"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
});

type EditOrgFormValues = z.infer<typeof editOrgSchema>;
type AdminFormValues = z.infer<typeof adminFormSchema>;

export default function Organizations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [addAdminOrg, setAddAdminOrg] = useState<Organization | null>(null);
  const { toast } = useToast();

  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const editForm = useForm<EditOrgFormValues>({
    resolver: zodResolver(editOrgSchema),
    defaultValues: {
      name: "",
      legalName: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      gstNumber: "",
      panNumber: "",
      tanNumber: "",
      cinNumber: "",
      udyamNumber: "",
      fssaiNumber: "",
    },
  });

  const adminForm = useForm<AdminFormValues>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertOrganization> }) =>
      apiRequest("PATCH", `/api/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setEditingOrg(null);
      editForm.reset();
      toast({ title: "Organization updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update organization", description: error.message, variant: "destructive" });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: (data: AdminFormValues & { organizationId: string }) =>
      apiRequest("POST", "/api/org-admins", data),
    onSuccess: () => {
      setAddAdminOrg(null);
      adminForm.reset();
      toast({ title: "Admin account created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create admin", description: error.message, variant: "destructive" });
    },
  });

  const onEditSubmit = (values: EditOrgFormValues) => {
    if (editingOrg) {
      const data = {
        name: values.name,
        legalName: values.legalName || null,
        industry: values.industry as any,
        address: values.address || null,
        phone: values.phone || null,
        email: values.email || null,
        website: values.website || null,
        gstNumber: values.gstNumber || null,
        panNumber: values.panNumber || null,
        tanNumber: values.tanNumber || null,
        cinNumber: values.cinNumber || null,
        udyamNumber: values.udyamNumber || null,
        fssaiNumber: values.fssaiNumber || null,
      };
      updateMutation.mutate({ id: editingOrg.id, data });
    }
  };

  const onAdminSubmit = (values: AdminFormValues) => {
    if (addAdminOrg) {
      createAdminMutation.mutate({ ...values, organizationId: addAdminOrg.id });
    }
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    editForm.reset({
      name: org.name || "",
      legalName: org.legalName || "",
      industry: org.industry || "",
      address: org.address || "",
      phone: org.phone || "",
      email: org.email || "",
      website: org.website || "",
      gstNumber: org.gstNumber || "",
      panNumber: org.panNumber || "",
      tanNumber: org.tanNumber || "",
      cinNumber: org.cinNumber || "",
      udyamNumber: org.udyamNumber || "",
      fssaiNumber: org.fssaiNumber || "",
    });
  };

  const filteredOrgs = organizations?.filter((org) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            Organizations
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage all registered organizations
          </p>
        </div>
        <Link href="/organizations/new">
          <Button data-testid="button-add-org">
            <Plus className="mr-2 h-4 w-4" />
            Add Organization
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>All Organizations</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-orgs"
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
          ) : filteredOrgs && filteredOrgs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} data-testid={`row-org-${org.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            {org.address && (
                              <p className="text-sm text-muted-foreground">{org.address}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {org.industry?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {org.email && <p>{org.email}</p>}
                          {org.phone && <p className="text-muted-foreground">{org.phone}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.isActive ? "default" : "destructive"}>
                          {org.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(org)}
                            data-testid={`button-edit-org-${org.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAddAdminOrg(org)}
                            data-testid={`button-add-admin-${org.id}`}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No organizations found</p>
              <p className="text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Create your first organization to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-org-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-legal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-industry">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-edit-org-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-org-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-org-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Compliance Details</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={editForm.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-gst" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-pan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="tanNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TAN Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-tan" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="cinNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIN Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-cin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="udyamNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UDYAM Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-udyam" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="fssaiNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FSSAI Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-fssai" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingOrg(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-org-edit">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addAdminOrg} onOpenChange={(open) => !open && setAddAdminOrg(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Organization Admin</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Create an admin account for {addAdminOrg?.name}
          </p>
          <Form {...adminForm}>
            <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
              <FormField
                control={adminForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="admin@company.com" {...field} data-testid="input-admin-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adminForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-admin-firstname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={adminForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-admin-lastname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setAddAdminOrg(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAdminMutation.isPending} data-testid="button-submit-admin">
                  {createAdminMutation.isPending ? "Creating..." : "Create Admin"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
