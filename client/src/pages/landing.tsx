import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Calendar, FileText, Shield, BarChart3, Rocket, Heart, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
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
    title: "Fort Knox Security",
    description: "Multi-tenant isolation with bulletproof access control",
  },
  {
    icon: BarChart3,
    title: "Insights That Pop",
    description: "Reports that actually make sense and drive decisions",
  },
  {
    icon: TrendingUp,
    title: "Scale Without Stress",
    description: "From 10 to 10,000 employees - we grow with you",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white shadow-lg shadow-rose-500/25">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">
                HUMANE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button 
              className="bg-gradient-to-r from-rose-500 to-orange-400 border-0 text-white" 
              data-testid="button-login"
              onClick={() => window.location.href = "/api/login"}
            >
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute bottom-20 right-10 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto mb-6 flex items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/5 px-4 py-2 w-fit">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">Where HR meets heart</span>
            </div>
            <h1 className="text-5xl font-black tracking-tight md:text-7xl lg:text-8xl" data-testid="text-hero-title">
              <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                HUMANE
              </span>
            </h1>
            <p className="mx-auto mt-2 text-xl font-medium text-muted-foreground md:text-2xl">
              Human Resources, Actually Human.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground" data-testid="text-hero-description">
              The HR platform that treats your people like people. 
              Manage teams, track time, handle payroll - all with a smile.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="gap-2 bg-gradient-to-r from-rose-500 to-orange-400 border-0 text-white text-lg px-8 py-6" 
                data-testid="button-get-started"
                onClick={() => window.location.href = "/api/login"}
              >
                <Rocket className="h-5 w-5" />
                Start Free
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No credit card required</p>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold md:text-4xl" data-testid="text-features-title">
                Everything Your Team Needs
              </h2>
              <p className="mt-4 text-muted-foreground">
                Powerful features wrapped in simplicity
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="group hover-elevate border-0 bg-card/50 backdrop-blur transition-all duration-300">
                  <CardContent className="flex flex-col items-start p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/10 to-orange-400/10 text-rose-500 transition-all group-hover:from-rose-500 group-hover:to-orange-400 group-hover:text-white group-hover:shadow-lg group-hover:shadow-rose-500/25">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold">{feature.title}</h3>
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
            <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-orange-400 to-amber-400 p-1">
              <div className="rounded-[22px] bg-background p-8 md:p-12 text-center">
                <Heart className="mx-auto h-12 w-12 text-rose-500 fill-rose-500" />
                <h2 className="mt-4 text-3xl font-black md:text-4xl">
                  Ready to Make HR <span className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent">Humane</span>?
                </h2>
                <p className="mt-4 text-muted-foreground text-lg">
                  Join thousands of teams who put their people first.
                </p>
                <Button 
                  size="lg" 
                  className="mt-8 gap-2 bg-gradient-to-r from-rose-500 to-orange-400 border-0 text-white text-lg px-8 py-6" 
                  data-testid="button-cta-login"
                  onClick={() => window.location.href = "/api/login"}
                >
                  Get Started Free
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
          <p className="font-medium">HUMANE - Human Resources, Actually Human.</p>
        </div>
      </footer>
    </div>
  );
}
