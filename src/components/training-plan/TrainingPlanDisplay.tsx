
'use client';

import type { TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { CalendarIcon as CalendarIconLucideTab, Info, ListChecks } from 'lucide-react'; 
import { CalendarIcon as CalendarIconHeader } from 'lucide-react';
import { format, parseISO, isPast, isValid, isWithinInterval, compareAsc } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';

interface TrainingPlanDisplayProps {
  plan: AppTrainingPlan;
  onSetupNewPlan: () => void;
}

interface ParsedWorkout {
  date: Date;
  description: string;
  isPrimary: boolean; 
}

interface PlanListItem {
  id: string;
  text: string;
  isWeekHeader: boolean;
  isDateLine: boolean;
}

// Parser for workouts with YYYY-MM-DD prefix for calendar view
function parseCalendarWorkouts(rawPlanText: string, planStartDateStr: string, planEndDateStr: string): ParsedWorkout[] {
  const parsed: ParsedWorkout[] = [];
  const lines = rawPlanText.split('\n').filter(line => line.trim() !== '');

  // These dates are mainly for context or potential future validation,
  // but the core parsing will rely on the dates found in the text.
  const planStartDate = parseISO(planStartDateStr);
  const planEndDate = parseISO(planEndDateStr);

  if (!isValid(planStartDate) || !isValid(planEndDate)) {
    // This is a problem with the plan's metadata, not necessarily the raw text.
    console.error("Invalid plan start or end date metadata provided for calendar context.");
    // We might still attempt to parse the rawPlanText if it contains valid dates.
  }

  const datePrefixRegex = /^(\d{4}-\d{2}-\d{2})\s*[:\-–—]?\s*(.*)/;
  let lastValidDate: Date | null = null;

  for (const line of lines) {
    const match = line.match(datePrefixRegex);
    if (match) {
      const dateStr = match[1];
      const description = match[2].trim();
      try {
        const date = parseISO(dateStr);
        if (isValid(date)) {
          // If the line matches the date prefix and the date is valid,
          // we consider it a primary entry for that date.
          // Add it if there's a description.
          if (description) {
            parsed.push({ date, description, isPrimary: true });
          }
          // Update lastValidDate regardless of description, so continuation lines can attach.
          lastValidDate = date;
        } else if (description && lastValidDate) {
          // Regex matched a date-like pattern, but parseISO failed (e.g., "2024-99-99: text")
          // Treat as continuation of the previous valid date.
          parsed.push({ date: lastValidDate, description: line.trim(), isPrimary: false });
        }
        // If regex matched, date was invalid, AND no description, this line is skipped.
      } catch (e) {
         // Catch errors specifically from parseISO (e.g., completely malformed string)
         if (lastValidDate && line.trim()) { // If there's text and a previous date context
            parsed.push({ date: lastValidDate, description: line.trim(), isPrimary: false });
          }
      }
    } else if (lastValidDate && line.trim() && !line.toLowerCase().startsWith('week ')) {
      // This is a continuation line (doesn't start with YYYY-MM-DD)
      parsed.push({ date: lastValidDate, description: line.trim(), isPrimary: false });
    }
  }
  return parsed.sort((a, b) => compareAsc(a.date, b.date));
}


function getScheduleListItems(rawPlanText: string): PlanListItem[] {
  const datePrefixRegex = /^(\d{4}-\d{2}-\d{2})/;
  const dayNameRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
  const weekHeaderRegex = /^week\s+\d+/i;

  return rawPlanText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== "")
      .map((line, index) => ({ 
        id: `item-${index}`, 
        text: line,
        isWeekHeader: weekHeaderRegex.test(line),
        isDateLine: datePrefixRegex.test(line) || dayNameRegex.test(line)
      }));
}


export function TrainingPlanDisplay({ plan, onSetupNewPlan }: TrainingPlanDisplayProps) {
  const planEnded = isPast(parseISO(plan.endDate));
  const [activeTab, setActiveTab] = useState("schedule");
  
  const [calendarWorkouts, setCalendarWorkouts] = useState<ParsedWorkout[]>([]);
  const [scheduleListItems, setScheduleListItems] = useState<PlanListItem[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>();


  useEffect(() => {
    if (plan?.rawPlanText && plan.startDate && plan.endDate) {
      setCalendarWorkouts(parseCalendarWorkouts(plan.rawPlanText, plan.startDate, plan.endDate));
      setScheduleListItems(getScheduleListItems(plan.rawPlanText));
    } else {
      setCalendarWorkouts([]);
      setScheduleListItems([]);
    }
  }, [plan]);

  const workoutsByDate = useMemo(() => {
    const map = new Map<string, ParsedWorkout[]>();
    calendarWorkouts.forEach(workout => {
      const dateKey = format(workout.date, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(workout);
    });
    return map;
  }, [calendarWorkouts]);

  const calendarWorkoutDays = useMemo(() => {
    return calendarWorkouts.map(w => w.date);
  }, [calendarWorkouts]);

  const handleDayClick = (day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    if (workoutsByDate.has(dayKey)) {
      setSelectedCalendarDate(day);
    } else {
      setSelectedCalendarDate(undefined); 
    }
  };
  
  const initialCalendarMonth = useMemo(() => {
    return plan && isValid(parseISO(plan.startDate)) ? parseISO(plan.startDate) : new Date();
  }, [plan]);


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Your Training Plan</CardTitle>
            <CardDescription>
              From {plan.startDate ? format(parseISO(plan.startDate), 'MMMM d, yyyy') : 'N/A'} to {plan.endDate ? format(parseISO(plan.endDate), 'MMMM d, yyyy') : 'N/A'}
            </CardDescription>
          </div>
          <CalendarIconHeader className="h-8 w-8 text-primary" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm mt-2 pt-2 border-t">
            <p><span className="font-medium">Goal:</span> {plan.goal}</p>
            <p><span className="font-medium">Level:</span> {plan.fitnessLevel}</p>
            <p><span className="font-medium">Days/Week:</span> {plan.daysPerWeek}</p>
            <p className="col-span-2 md:col-span-1"><span className="font-medium">Experience:</span> {plan.runningExperience}</p>
        </div>
      </CardHeader>
      <CardContent>
        {planEnded && (
          <Alert variant="default" className="mb-6 bg-accent/30 border-accent">
            <Info className="h-4 w-4 text-accent-foreground" />
            <AlertTitle className="text-accent-foreground">Plan Completed!</AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              Congratulations on completing your training plan! You can generate a new plan below or check your dashboard for daily workout suggestions.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="schedule" className="gap-1">
              <ListChecks className="h-4 w-4"/> Schedule
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1">
              <CalendarIconLucideTab className="h-4 w-4"/> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Workout Schedule</CardTitle>
                <CardDescription>Your day-by-day training activities.</CardDescription>
              </CardHeader>
              <CardContent>
                {scheduleListItems.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <ul className="space-y-1">
                      {scheduleListItems.map((item) => (
                        <li 
                          key={item.id} 
                          className={`
                            ${item.isWeekHeader ? 'font-bold text-lg text-primary mt-4 pt-2 border-t-2 border-primary/70 mb-2' : ''}
                            ${item.isDateLine && !item.isWeekHeader ? 'font-semibold text-md text-primary-focus mt-3 border-b border-border pb-1' : ''}
                            ${!item.isWeekHeader && !item.isDateLine ? 'pl-4 text-sm text-muted-foreground' : ''}
                          `}
                        >
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground">No schedule items to display. The raw plan might be empty or could not be parsed into a list.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Training Calendar</CardTitle>
                <CardDescription>Visualize your workouts. Click on a day for details.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {calendarWorkouts.length > 0 && isValid(parseISO(plan.startDate)) && isValid(parseISO(plan.endDate)) ? (
                  <Popover open={!!selectedCalendarDate} onOpenChange={(isOpen) => !isOpen && setSelectedCalendarDate(undefined)}>
                    <PopoverTrigger asChild>
                      <div> 
                        <ShadcnCalendar
                          mode="single"
                          selected={selectedCalendarDate}
                          onSelect={setSelectedCalendarDate} 
                          onDayClick={handleDayClick}
                          month={initialCalendarMonth} 
                          fromDate={parseISO(plan.startDate)}
                          toDate={parseISO(plan.endDate)}
                          modifiers={{ 
                            workoutDay: calendarWorkoutDays,
                            disabled: (date) => !isWithinInterval(date, {start: parseISO(plan.startDate), end: parseISO(plan.endDate)})
                          }}
                          modifiersClassNames={{
                            workoutDay: 'bg-primary/30 rounded-md !text-primary-foreground font-semibold',
                          }}
                          className="rounded-md border shadow-sm"
                        />
                      </div>
                    </PopoverTrigger>
                    {selectedCalendarDate && workoutsByDate.get(format(selectedCalendarDate, 'yyyy-MM-dd')) && (
                      <PopoverContent className="w-80 max-h-96 overflow-y-auto">
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">
                              {format(selectedCalendarDate, 'EEEE, MMMM d')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Workout(s) for today:
                            </p>
                          </div>
                          <ul className="text-sm space-y-1">
                            {workoutsByDate.get(format(selectedCalendarDate, 'yyyy-MM-dd'))!.map((workout, index) => (
                              <li key={index} className={`${workout.isPrimary ? 'font-semibold' : 'pl-2'}`}>{workout.description}</li>
                            ))}
                          </ul>
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                ) : (
                  <p className="text-muted-foreground p-4 text-center">
                    No workouts with recognizable dates (YYYY-MM-DD) found in the plan to display on the calendar.
                    Ensure the generated plan follows this format for each day.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </CardContent>
      <CardFooter>
        <Button onClick={onSetupNewPlan} variant="outline">
          {planEnded ? "Generate New Plan" : "Start a Different Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}

