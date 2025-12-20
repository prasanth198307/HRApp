import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Calendar, TrendingUp } from "lucide-react";
import type { Organization } from "@shared/schema";

interface DashboardStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalEmployees: number;
  industriesBreakdown: Record<string, number>;
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentOrgs, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const statCards = [
    {
      title: "Total Organizations",
      value: stats?.totalOrganizations ?? 0,
      icon: Building2,
      description: "Registered organizations",
    },
    {
      title: "Active Organizations",
      value: stats?.activeOrganizations ?? 0,
      icon: TrendingUp,
      description: "Currently active",
    },
    {
      title: "Total Employees",
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      description: "Across all organizations",
    },
    {
      title: "Industries",
      value: Object.keys(stats?.industriesBreakdown ?? {}).length,
      icon: Calendar,
      description: "Different industries served",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Super Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage all organizations and system settings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentOrgs && recentOrgs.length > 0 ? (
              <div className="space-y-3">
                {recentOrgs.slice(0, 5).map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between rounded-md border p-3"
                    data-testid={`card-org-${org.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {org.industry?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        org.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {org.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No organizations yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first organization to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Industry Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats?.industriesBreakdown && Object.keys(stats.industriesBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.industriesBreakdown).map(([industry, count]) => (
                  <div key={industry} className="flex items-center justify-between">
                    <span className="capitalize">{industry.replace("_", " ")}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
