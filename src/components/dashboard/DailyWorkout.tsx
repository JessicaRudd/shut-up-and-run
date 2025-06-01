
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell } from 'lucide-react';

interface DailyWorkoutProps {
  workoutDescription?: string; // Made optional for loading state
}

export function DailyWorkout({ workoutDescription }: DailyWorkoutProps) {
  const isLoading = !workoutDescription;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Today&apos;s Workout</CardTitle>
        <Dumbbell className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </>
        ) : (
          <CardDescription className="whitespace-pre-line text-sm">
            {workoutDescription || "Loading workout..."}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
