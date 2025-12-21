import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeEntry } from "@shared/schema";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, differenceInMinutes } from "date-fns";

interface DayTimeData {
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
}

export default function MyTimeEntries() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/employee/time-entries", monthStart, monthEnd],
    queryFn: async () => {
      const res = await fetch(`/api/employee/time-entries?startDate=${monthStart}&endDate=${monthEnd}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch time entries");
      return res.json();
    },
  });

  const groupEntriesByDate = (entries: TimeEntry[]): DayTimeData[] => {
    const grouped: Record<string, TimeEntry[]> = {};
    
    entries.forEach((entry) => {
      if (!grouped[entry.date]) {
        grouped[entry.date] = [];
      }
      grouped[entry.date].push(entry);
    });

    return Object.entries(grouped)
      .map(([date, dayEntries]) => {
        dayEntries.sort((a, b) => 
          new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime()
        );
        
        let totalMinutes = 0;
        for (let i = 0; i < dayEntries.length - 1; i += 2) {
          if (dayEntries[i].entryType === "check_in" && dayEntries[i + 1]?.entryType === "check_out") {
            totalMinutes += differenceInMinutes(
              new Date(dayEntries[i + 1].entryTime),
              new Date(dayEntries[i].entryTime)
            );
          }
        }

        return {
          date,
          entries: dayEntries,
          totalMinutes,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const dayData = timeEntries ? groupEntriesByDate(timeEntries) : [];
  const totalMonthMinutes = dayData.reduce((sum, day) => sum + day.totalMinutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold" data-testid="text-page-title">
            My Time Entries
          </h1>
          <p className="text-muted-foreground mt-2">
            View your check-in and check-out history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monthly Summary
          </CardTitle>
          <span className="text-lg font-semibold" data-testid="text-total-hours">
            Total: {formatDuration(totalMonthMinutes)}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : dayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">No time entries for this month</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check-in Times</TableHead>
                  <TableHead>Check-out Times</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dayData.map((day) => {
                  const checkIns = day.entries.filter(e => e.entryType === "check_in");
                  const checkOuts = day.entries.filter(e => e.entryType === "check_out");
                  
                  return (
                    <TableRow key={day.date} data-testid={`row-time-${day.date}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(parseISO(day.date), "EEEE")}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(day.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {checkIns.map((entry, idx) => (
                          <span key={entry.id}>
                            {format(new Date(entry.entryTime), "h:mm a")}
                            {idx < checkIns.length - 1 && ", "}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell>
                        {checkOuts.map((entry, idx) => (
                          <span key={entry.id}>
                            {format(new Date(entry.entryTime), "h:mm a")}
                            {idx < checkOuts.length - 1 && ", "}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatDuration(day.totalMinutes)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
