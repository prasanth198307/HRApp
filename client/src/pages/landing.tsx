import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Calendar, FileText, Shield, BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Building2,
    title: "Multi-Tenant",
    description: "Manage multiple organizations with complete data isolation",
  },
  {
    icon: Users,
    title: "Employee Management",
    description: "Complete employee lifecycle from onboarding to exit",
  },
  {
    icon: Calendar,
    title: "Attendance Tracking",
    description: "Track daily attendance with detailed reports",
  },
  {
    icon: FileText,
    title: "Payslip Management",
    description: "Upload and distribute payslips securely",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Super Admin, Org Admin, and Employee roles",
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Generate comprehensive attendance reports",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">HR Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl" data-testid="text-hero-title">
              HR Management Made Simple
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground" data-testid="text-hero-description">
              A comprehensive multi-tenant HR solution for managing employees, attendance, 
              payslips, and holidays across multiple organizations.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" asChild data-testid="button-get-started">
                <a href="/api/login">Get Started</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold" data-testid="text-features-title">
              Everything You Need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Powerful features designed for modern HR teams
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="flex flex-col items-start p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
            <p className="mt-4 text-muted-foreground">
              Sign in to access your HR dashboard
            </p>
            <Button size="lg" className="mt-8" asChild data-testid="button-cta-login">
              <a href="/api/login">Sign In Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>HR Manager - Multi-Tenant HR Management System</p>
        </div>
      </footer>
    </div>
  );
}
