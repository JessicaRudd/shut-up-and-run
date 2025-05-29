'use client';

import type { TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { CalendarCheck, Info } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

interface TrainingPlanDisplayProps {
  plan: AppTrainingPlan;
  onSetupNewPlan: () => void;
}

export function TrainingPlanDisplay({ plan, onSetupNewPlan }: TrainingPlanDisplayProps) {
  const planEnded = isPast(parseISO(plan.endDate));

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Your Training Plan</CardTitle>
            <CardDescription>
              From {format(parseISO(plan.startDate), 'MMMM d, yyyy')} to {format(parseISO(plan.endDate), 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          <CalendarCheck className="h-8 w-8 text-primary" />
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
        <h3 className="text-lg font-semibold mb-2">Plan Details:</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4 p-3 bg-muted/50 rounded-md">
            <p><span className="font-medium">Goal:</span> {plan.goal}</p>
            <p><span className="font-medium">Fitness Level:</span> {plan.fitnessLevel}</p>
            <p><span className="font-medium">Days/Week:</span> {plan.daysPerWeek}</p>
            <p><span className="font-medium">Experience:</span> {plan.runningExperience}</p>
        </div>

        <h3 className="text-lg font-semibold mb-2">Full Plan Schedule:</h3>
        <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/20 p-4 rounded-md whitespace-pre-line overflow-auto max-h-[500px]">
          {plan.rawPlanText}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSetupNewPlan} variant="outline">
          {planEnded ? "Generate New Plan" : "Start a Different Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
