import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, FileSpreadsheet, Users, Calendar, CalendarDays, CalendarCheck, Wallet, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Organization } from "@shared/schema";

const exportTypes = [
  { id: "employees", label: "Employees", description: "All employee records with personal and employment details", icon: Users },
  { id: "attendance", label: "Attendance", description: "Monthly attendance records (requires month selection)", icon: Calendar },
  { id: "leave-requests", label: "Leave Requests", description: "All leave requests with status and details", icon: CalendarCheck },
  { id: "holidays", label: "Holidays", description: "Organization holidays including national and custom", icon: CalendarDays },
  { id: "leave-balances", label: "Leave Balances", description: "Employee leave balances for all policies", icon: Wallet },
  { id: "tax-declarations", label: "Tax Declarations", description: "Employee tax declarations (Form 12BB) with regime and amounts", icon: Receipt },
];

export default function DataExportPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [attendanceMonth, setAttendanceMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [downloading, setDownloading] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const handleExport = async (type: string) => {
    if (!selectedOrg) {
      toast({ title: "Please select an organization first", variant: "destructive" });
      return;
    }

    setDownloading(type);
    try {
      let url = `/api/super-admin/export/${type}?organizationId=${selectedOrg}`;
      if (type === "attendance") {
        url += `&month=${attendanceMonth}`;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Export failed" }));
        throw new Error(errorData.message || "Export failed");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `export_${type}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({ title: "Export downloaded successfully" });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const selectedOrgName = organizations.find(o => o.id === selectedOrg)?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Data Export</h1>
        <p className="text-muted-foreground">Export organization data as CSV files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Select Organization
          </CardTitle>
          <CardDescription>Choose an organization to export data from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger data-testid="select-organization">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select organization"} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id} data-testid={`option-org-${org.id}`}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedOrg && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exportTypes.map((exportType) => {
            const Icon = exportType.icon;
            return (
              <Card key={exportType.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {exportType.label}
                  </CardTitle>
                  <CardDescription className="text-sm">{exportType.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {exportType.id === "attendance" && (
                    <div className="mb-3 space-y-2">
                      <Label htmlFor="attendance-month">Month</Label>
                      <Input
                        id="attendance-month"
                        type="month"
                        value={attendanceMonth}
                        onChange={(e) => setAttendanceMonth(e.target.value)}
                        data-testid="input-attendance-month"
                      />
                    </div>
                  )}
                  <Button
                    onClick={() => handleExport(exportType.id)}
                    disabled={downloading === exportType.id}
                    className="w-full"
                    data-testid={`button-export-${exportType.id}`}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading === exportType.id ? "Downloading..." : "Download CSV"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!selectedOrg && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an organization above to see available export options
          </CardContent>
        </Card>
      )}
    </div>
  );
}
