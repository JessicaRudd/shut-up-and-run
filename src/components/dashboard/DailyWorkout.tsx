'use client';

import { useEffect, useState } from 'react';
import { generateDailyWorkout, suggestWorkoutWhenNoPlan } from '@/ai/flows'; // Assuming barrel export from src/ai/flows/index.ts
import type { User as AppUser, TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dumbbell } from 'lucide-react';
import { format } from 'date-fns';

interface DailyWorkoutProps {
  user: AppUser | null;
  trainingPlan: AppTrainingPlan | null | undefined; // undefined if loading, null if no plan
  isLoadingPlan: boolean;
  cachedWorkout?: string;
  onWorkoutGenerated: (workout: string) => void;
}

export function DailyWorkout({ user, trainingPlan, isLoadingPlan, cachedWorkout, onWorkoutGenerated }: DailyWorkoutProps) {
  const [workout, setWorkout] = useState<string | null>(cachedWorkout || null);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedWorkout);

  useEffect(() => {
    if (cachedWorkout) {
      setWorkout(cachedWorkout);
      setIsLoading(false);
      return;
    }

    async function fetchWorkout() {
      if (!user || isLoadingPlan) return;

      setIsLoading(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      const userProfileString = `Fitness Level: ${user.profile.fitnessLevel}, Experience: ${user.profile.runningExperience}, Goal: ${user.profile.goal}`;

      try {
        let result;
        if (trainingPlan && new Date(trainingPlan.endDate) >= new Date(today)) {
          // Active training plan
          const trainingScheduleString = trainingPlan.rawPlanText;
          result = await generateDailyWorkout({
            userProfile: userProfileString,
            trainingSchedule: trainingScheduleString,
            date: today,
          });
          setWorkout(result.workoutPlan);
          onWorkoutGenerated(result.workoutPlan);
        } else {
          // No active plan or plan ended
          result = await suggestWorkoutWhenNoPlan({
            fitnessLevel: user.profile.fitnessLevel,
            workoutPreferences: user.profile.preferredWorkoutTypes || 'running',
            availableTime: user.profile.availableTime || '30-60 minutes',
            equipmentAvailable: user.profile.equipmentAvailable || 'None',
          });
          setWorkout(result.workoutSuggestion);
          onWorkoutGenerated(result.workoutSuggestion);
        }
      } catch (error) {
        console.error("Failed to generate daily workout:", error);
        const fallback = "Today's workout: 30 minutes of moderate cardio. Listen to your body!";
        setWorkout(fallback);
        onWorkoutGenerated(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!workout && !isLoadingPlan) {
      fetchWorkout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, trainingPlan, isLoadingPlan, cachedWorkout]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">Today&apos;s Workout</CardTitle>
        <Dumbbell className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading || isLoadingPlan ? (
          <>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </>
        ) : (
          <CardDescription className="whitespace-pre-line text-sm">
            {workout || "No workout suggested for today. Enjoy a rest day or choose your own activity!"}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
