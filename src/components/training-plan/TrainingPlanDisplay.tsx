
'use client';

import type { TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from '@/components/ui/button';
import { CalendarIcon as CalendarIconLucideTab, Info, ListChecks, Trophy } from 'lucide-react';
import { CalendarIcon as CalendarIconHeader } from 'lucide-react';
import { format, parseISO, isPast, isValid, isWithinInterval, compareAsc } from 'date-fns';
import { useState, useEffect, useMemo, type ComponentProps } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import type { DayPicker, DayProps } from 'react-day-picker';

interface TrainingPlanDisplayProps {
  plan: AppTrainingPlan;
  onSetupNewPlan: () => void;
}

interface ParsedWorkout {
  date: Date;
  description: string;
  weekHeader?: string;
  isRestDay?: boolean;
}

interface PlanListItem {
  id: string;
  text: string;
  isWeekHeader: boolean;
  isDateLine: boolean;
}

const weekRegexGlobal = /^(week\s+\d+.*)/i;

function parseCalendarWorkouts(rawPlanText: string): ParsedWorkout[] {
  const parsed: ParsedWorkout[] = [];
  if (!rawPlanText) return parsed;

  const lines = rawPlanText.split('\n').filter(line => line.trim() !== '');
  const datePrefixRegex = /^(\d{4}-\d{2}-\d{2})\s*[:\-–—]?\s*(.*)/;
  let lastValidDate: Date | null = null;
  let currentWeekHeader: string | undefined = undefined;
  
  // Map to store attributes (weekHeader, isRestDay) for the primary entry of a date
  const dateAttributesMap = new Map<string, { weekHeader?: string; isRestDay?: boolean }>();

  for (const line of lines) {
    const weekMatch = line.match(weekRegexGlobal);
    if (weekMatch) {
      currentWeekHeader = weekMatch[1].trim();
      continue; 
    }

    const match = line.match(datePrefixRegex);
    if (match) {
      const dateStr = match[1];
      const description = match[2].trim();
      const currentDayIsRest = description.toLowerCase().includes('rest');
      try {
        const date = parseISO(dateStr);
        if (isValid(date)) {
          if (description) {
            parsed.push({ date, description, weekHeader: currentWeekHeader, isRestDay: currentDayIsRest });
          }
          lastValidDate = date;
          // Store attributes for this primary date entry
          dateAttributesMap.set(format(date, 'yyyy-MM-dd'), { weekHeader: currentWeekHeader, isRestDay: currentDayIsRest });
        } else if (description && lastValidDate) {
           // Fallback for lines that seem like continuations but date parsing failed earlier for primary
           const lastDateStr = format(lastValidDate, 'yyyy-MM-dd');
           const attrs = dateAttributesMap.get(lastDateStr) || { weekHeader: currentWeekHeader, isRestDay: undefined };
           parsed.push({ date: lastValidDate, description: line.trim(), weekHeader: attrs.weekHeader, isRestDay: attrs.isRestDay });
        }
      } catch (e) {
         if (lastValidDate && line.trim()) {
            const lastDateStr = format(lastValidDate, 'yyyy-MM-dd');
            const attrs = dateAttributesMap.get(lastDateStr) || { weekHeader: currentWeekHeader, isRestDay: undefined };
            parsed.push({ date: lastValidDate, description: line.trim(), weekHeader: attrs.weekHeader, isRestDay: attrs.isRestDay });
          }
      }
    } else if (lastValidDate && line.trim()) {
      // This line is part of the previous date's workout. Inherit its attributes.
       const lastDateStr = format(lastValidDate, 'yyyy-MM-dd');
       const attrs = dateAttributesMap.get(lastDateStr) || { weekHeader: currentWeekHeader, isRestDay: undefined }; // Fallback to current if somehow primary not found yet
       parsed.push({ 
         date: lastValidDate, 
         description: line.trim(), 
         weekHeader: attrs.weekHeader,
         isRestDay: attrs.isRestDay 
       });
    }
  }
  return parsed.sort((a, b) => compareAsc(a.date, b.date));
}


function getScheduleListItems(rawPlanText: string): PlanListItem[] {
  if (!rawPlanText) return [];
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
  const planEnded = plan?.endDate ? isPast(parseISO(plan.endDate)) : false;
  const [activeTab, setActiveTab] = useState("schedule");

  const [calendarWorkouts, setCalendarWorkouts] = useState<ParsedWorkout[]>([]);
  const [scheduleListItems, setScheduleListItems] = useState<PlanListItem[]>([]);

  const initialCalendarMonth = useMemo(() => {
    return plan && plan.startDate && isValid(parseISO(plan.startDate)) ? parseISO(plan.startDate) : new Date();
  }, [plan]);

  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(initialCalendarMonth);
  const [selectedDayForStyle, setSelectedDayForStyle] = useState<Date | undefined>();


  useEffect(() => {
    setCurrentDisplayMonth(initialCalendarMonth);
  }, [initialCalendarMonth]);

  useEffect(() => {
    if (plan?.rawPlanText) {
      setCalendarWorkouts(parseCalendarWorkouts(plan.rawPlanText));
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

  const planStartDateValid = plan && plan.startDate && isValid(parseISO(plan.startDate));
  const planEndDateValid = plan && plan.endDate && isValid(parseISO(plan.endDate));
  const planEndDateForComparison = planEndDateValid ? parseISO(plan.endDate) : null;


  function CustomDay(props: DayProps): JSX.Element {
    const dayKey = format(props.date, 'yyyy-MM-dd');
    const dayWorkouts = workoutsByDate.get(dayKey) || [];
    
    const isRaceDay = !!(planEndDateForComparison && format(planEndDateForComparison, 'yyyy-MM-dd') === dayKey);

    const hasAnyWorkout = dayWorkouts.length > 0;
    const isActualRestDay = hasAnyWorkout && dayWorkouts.every(w => w.isRestDay);
    const isActualWorkoutDay = hasAnyWorkout && !isActualRestDay;

    const dayButtonBaseClass = cn(
      buttonVariants({ variant: "ghost" }),
      "h-9 w-9 p-0 font-normal",
      // These conditions are ordered by precedence (most specific/important first)
      props.modifiers?.selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
      !props.modifiers?.selected && props.modifiers?.today && "bg-accent text-accent-foreground",
      !props.modifiers?.selected && !props.modifiers?.today && isRaceDay && "bg-emerald-200 text-emerald-800 font-semibold hover:bg-emerald-300",
      !props.modifiers?.selected && !props.modifiers?.today && !isRaceDay && isActualWorkoutDay && "bg-primary/20 text-primary font-semibold hover:bg-primary/30",
      !props.modifiers?.selected && !props.modifiers?.today && !isRaceDay && isActualRestDay && "bg-accent/20 text-accent-foreground font-medium hover:bg-accent/30",
      // Fallbacks for disabled/outside, should apply if other active states don't
      props.modifiers?.disabled && "text-muted-foreground opacity-50",
      props.modifiers?.outside && !props.modifiers?.disabled && "text-muted-foreground opacity-50 day-outside" 
    );
    const dayButtonContent = format(props.date, "d");

    const showTooltip = isRaceDay || hasAnyWorkout;
    
    const weekHeader = dayWorkouts[0]?.weekHeader;

    if (showTooltip && !props.modifiers?.disabled && !props.modifiers?.outside) {
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                {...props.buttonProps}
                className={dayButtonBaseClass}
              >
                {dayButtonContent}
              </button>
            </TooltipTrigger>
            <TooltipContent className="w-80 max-h-96 overflow-y-auto text-left shadow-lg bg-card text-card-foreground p-4 rounded-md border">
              <div className="grid gap-2">
                {isRaceDay && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                    <h4 className="font-semibold leading-none text-md text-emerald-700">Race Day! Good Luck!</h4>
                  </div>
                )}
                {weekHeader && (
                  <h5 className={`font-medium leading-none text-sm ${isRaceDay && dayWorkouts.length > 0 ? 'text-muted-foreground pt-1' : 'text-primary'}`}>
                    {weekHeader}
                  </h5>
                )}
                {dayWorkouts.length > 0 && (
                  <ul className={`space-y-1 text-xs ${isRaceDay || weekHeader ? 'pl-4' : ''}`}>
                    {dayWorkouts.map((workout, index) => (
                      <li key={index} className={`${workout.isRestDay ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
                        {workout.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <button
        {...props.buttonProps}
        className={dayButtonBaseClass}
      >
        {dayButtonContent}
      </button>
    );
  }


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Your Training Plan</CardTitle>
            <CardDescription>
              From {planStartDateValid ? format(parseISO(plan.startDate), 'MMMM d, yyyy') : 'N/A'} to {planEndDateValid ? format(parseISO(plan.endDate), 'MMMM d, yyyy') : 'N/A'}
            </CardDescription>
          </div>
          <CalendarIconHeader className="h-8 w-8 text-primary" />
        </div>
        {plan && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm mt-2 pt-2 border-t">
              <p><span className="font-medium">Goal:</span> {plan.goal}</p>
              <p><span className="font-medium">Level:</span> {plan.fitnessLevel}</p>
              <p><span className="font-medium">Days/Week:</span> {plan.daysPerWeek}</p>
              <p className="col-span-2 md:col-span-1"><span className="font-medium">Experience:</span> {plan.runningExperience}</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {planEnded && !isPast(new Date()) && ( // Only show if plan ended but today is not past end date (e.g. plan ended yesterday)
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
                            ${item.isDateLine && !item.isWeekHeader ? 'font-semibold text-md text-foreground mt-3 border-b border-border pb-1' : ''}
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
                <CardDescription>Visualize your workouts. Hover over a day for details.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {calendarWorkouts.length > 0 && planStartDateValid && planEndDateValid ? (
                  <div>
                    <ShadcnCalendar
                      mode="single"
                      selected={selectedDayForStyle}
                      onSelect={setSelectedDayForStyle}
                      month={currentDisplayMonth}
                      onMonthChange={setCurrentDisplayMonth}
                      fromDate={parseISO(plan.startDate)}
                      toDate={parseISO(plan.endDate)}
                      modifiers={{
                        disabled: (date) => !isWithinInterval(date, {start: parseISO(plan.startDate), end: parseISO(plan.endDate)})
                      }}
                      components={{
                        Day: CustomDay,
                      }}
                      className="rounded-md border shadow-sm"
                    />
                  </div>
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

