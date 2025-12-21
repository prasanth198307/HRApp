import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Save } from "lucide-react";
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
import type { InsertOrganization } from "@shared/schema";
import { industryOptions } from "@shared/schema";
import { Link, useLocation } from "wouter";

const createOrgSchema = z.object({
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
  adminEmail: z.string().email("Valid admin email required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminFirstName: z.string().min(1, "First name required"),
  adminLastName: z.string().min(1, "Last name required"),
});

type CreateOrgFormValues = z.infer<typeof createOrgSchema>;

export default function OrganizationCreate() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<CreateOrgFormValues>({
    resolver: zodResolver(createOrgSchema),
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
      adminEmail: "",
      adminPassword: "",
      adminFirstName: "",
      adminLastName: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertOrganization) =>
      apiRequest("POST", "/api/organizations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Organization created successfully" });
      setLocation("/organizations");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create organization", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: CreateOrgFormValues) => {
    const data = {
      name: values.name,
      legalName: values.legalName || null,
      industry: values.industry,
      address: values.address || null,
      phone: values.phone || null,
      email: values.email || null,
      website: values.website || null,
      gstNumber: values.gstNumber || null,
      panNumber: values.panNumber || null,
      tanNumber: values.tanNumber || null,
      cinNumber: values.cinNumber || null,
      udyamNumber: values.udyamNumber || null,
      admin: {
        email: values.adminEmail,
        password: values.adminPassword,
        firstName: values.adminFirstName,
        lastName: values.adminLastName,
      },
    };
    createMutation.mutate(data as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/organizations">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Create Organization</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" {...field} data-testid="input-org-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Legal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Registered legal name" {...field} data-testid="input-legal-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
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
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="org@example.com" {...field} data-testid="input-org-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} data-testid="input-org-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} data-testid="input-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Organization address" {...field} data-testid="input-org-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Compliance Details</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter statutory identification numbers for the organization.
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input placeholder="22AAAAA0000A1Z5" {...field} data-testid="input-gst-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="panNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input placeholder="AAAAA0000A" {...field} data-testid="input-pan-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tanNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TAN Number</FormLabel>
                        <FormControl>
                          <Input placeholder="AAAA00000A" {...field} data-testid="input-tan-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cinNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CIN Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Company Identification Number" {...field} data-testid="input-cin-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="udyamNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UDYAM Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Udyam-XX-00-0000000" {...field} data-testid="input-udyam-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Admin Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create the primary administrator account for this organization.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="adminFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} data-testid="input-admin-first-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} data-testid="input-admin-last-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="admin@example.com" {...field} data-testid="input-admin-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Minimum 8 characters" {...field} data-testid="input-admin-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Link href="/organizations">
                  <Button type="button" variant="outline" data-testid="button-cancel">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save">
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
