import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Calendar, FileText, Shield, BarChart3, Zap, Sparkles, Rocket } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: Building2,
    title: "Multi-Tenant Magic",
    description: "Run multiple organizations like a boss with bulletproof data isolation",
  },
  {
    icon: Users,
    title: "People Power",
    description: "From hello to goodbye - manage the complete employee journey",
  },
  {
    icon: Calendar,
    title: "Attendance Ace",
    description: "Who's in? Who's out? Know it all with smart tracking",
  },
  {
    icon: FileText,
    title: "Payslip Paradise",
    description: "Upload, distribute, done - payslips made painless",
  },
  {
    icon: Shield,
    title: "Access Control",
    description: "Right people, right access - Super Admin to Employee roles",
  },
  {
    icon: BarChart3,
    title: "Insights Galore",
    description: "Reports that actually make sense and drive decisions",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Crew<span className="text-primary">ly</span></span>
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
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-2 rounded-full bg-primary/10 px-4 py-2 w-fit">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">HR that doesn't suck</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl" data-testid="text-hero-title">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                People First.
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Paperwork Never.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl" data-testid="text-hero-description">
              The HR platform that gets out of your way. Manage teams, track attendance, 
              distribute payslips, and stay organized - all in one funky dashboard.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2" asChild data-testid="button-get-started">
                <a href="/api/login">
                  <Rocket className="h-4 w-4" />
                  Let's Go
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold md:text-4xl" data-testid="text-features-title">
                All the Good Stuff
              </h2>
              <p className="mt-4 text-muted-foreground">
                Packed with features that make HR teams actually happy
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="group hover-elevate transition-all duration-300">
                  <CardContent className="flex flex-col items-start p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
          <div className="container mx-auto px-4">
            <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-center text-primary-foreground md:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="relative">
                <h2 className="text-3xl font-bold md:text-4xl">Ready to Rock?</h2>
                <p className="mt-4 text-primary-foreground/80">
                  Join the HR revolution. Your team will thank you.
                </p>
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="mt-8 gap-2" 
                  asChild 
                  data-testid="button-cta-login"
                >
                  <a href="/api/login">
                    <Zap className="h-4 w-4" />
                    Get Started Free
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <Zap className="h-4 w-4" />
          <p>Crewly - People First. Paperwork Never.</p>
        </div>
      </footer>
    </div>
  );
}
