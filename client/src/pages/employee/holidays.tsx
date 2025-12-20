import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import type { Holiday } from "@shared/schema";
import { format, isPast, isToday } from "date-fns";

export default function EmployeeHolidays() {
  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ["/api/holidays"],
  });

  const sortedHolidays = holidays?.sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingHolidays = sortedHolidays?.filter(
    h => !isPast(new Date(h.date)) || isToday(new Date(h.date))
  );

  const pastHolidays = sortedHolidays?.filter(
    h => isPast(new Date(h.date)) && !isToday(new Date(h.date))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">
          Holiday Calendar
        </h1>
        <p className="text-muted-foreground mt-2">
          View all organization holidays
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Holidays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : upcomingHolidays && upcomingHolidays.length > 0 ? (
            <div className="space-y-3">
              {upcomingHolidays.map((holiday) => {
                const holidayDate = new Date(holiday.date);
                const today = isToday(holidayDate);
                return (
                  <div
                    key={holiday.id}
                    className={`flex items-center justify-between rounded-md border p-4 ${
                      today ? "border-primary bg-primary/5" : ""
                    }`}
                    data-testid={`card-holiday-${holiday.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                        <span className="text-xs font-medium uppercase">
                          {format(holidayDate, "MMM")}
                        </span>
                        <span className="text-xl font-bold">
                          {format(holidayDate, "d")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(holidayDate, "EEEE, MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {today && (
                        <Badge variant="default">Today</Badge>
                      )}
                      {holiday.isNational && (
                        <Badge variant="secondary">National</Badge>
                      )}
                      {holiday.isCustom && (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No upcoming holidays</p>
            </div>
          )}
        </CardContent>
      </Card>

      {pastHolidays && pastHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground">Past Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastHolidays.slice(-10).reverse().map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between rounded-md border p-3 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{holiday.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(holiday.date), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
