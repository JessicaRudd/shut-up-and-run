
'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { MotivationalGreeting } from '@/components/dashboard/MotivationalGreeting';
import { WeatherForecast } from '@/components/dashboard/WeatherForecast';
import { DailyWorkout } from '@/components/dashboard/DailyWorkout';
import { RunningNews } from '@/components/dashboard/RunningNews';
import { DressMyRunSection } from '@/components/dashboard/DressMyRun';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking } from '@/firebase';
import type { User as AppUser, TrainingPlan as AppTrainingPlan, DashboardCache } from '@/lib/firebase-schemas';
import { generateDailyWorkout as generateDailyWorkoutFlow, suggestWorkoutWhenNoPlan } from '@/ai/flows';
import { generateDashboardContent, type GenerateDashboardInput, type GenerateDashboardOutput, type DailyForecastData } from '@/ai/flows/generate-dashboard-content';
import { fetchDetailedWeather } from '@/app/actions/weatherActions';
import { doc, DocumentReference } from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function DashboardPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const todayISO = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<AppUser>;
  }, [firestore, authUser]);
  const { data: userData, isLoading: isUserDataLoading, error: userError } = useDoc<AppUser>(userDocRef);

  const trainingPlanDocRef = useMemo(() => {
    if (!firestore || !userData?.trainingPlanId) return null;
    return doc(firestore, 'trainingPlans', userData.trainingPlanId) as DocumentReference<AppTrainingPlan>;
  }, [firestore, userData?.trainingPlanId]);
  const { data: trainingPlanData, isLoading: isTrainingPlanLoading } = useDoc<AppTrainingPlan>(trainingPlanDocRef);

  const dashboardCacheDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'dashboardCache', authUser.uid) as DocumentReference<DashboardCache>;
  }, [firestore, authUser]);
  const { data: cachedDashboardData, isLoading: isCacheLoading, error: cacheError } = useDoc<DashboardCache>(dashboardCacheDocRef);

  const [dashboardContent, setDashboardContent] = useState<GenerateDashboardOutput | null>(null);
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);


  const generateAndCacheDashboardContent = useCallback(async () => {
    if (!authUser?.uid || !userData || !firestore || !dashboardCacheDocRef) {
      return;
    }

    setIsGeneratingDashboard(true);
    setPageError(null);

    try {
      // 1. Generate Today's Workout String
      let todaysWorkoutStr = "Rest day or choose your own activity.";
      const userProfileStringForWorkout = `Fitness Level: ${userData.profile.fitnessLevel}, Experience: ${userData.profile.runningExperience}, Goal: ${userData.profile.goal}`;
      if (trainingPlanData && new Date(trainingPlanData.endDate) >= new Date(todayISO)) {
        const workoutResult = await generateDailyWorkoutFlow({
          userProfile: userProfileStringForWorkout,
          trainingSchedule: trainingPlanData.rawPlanText,
          date: todayISO,
        });
        todaysWorkoutStr = workoutResult.workoutPlan;
      } else {
        const suggestionResult = await suggestWorkoutWhenNoPlan({
          fitnessLevel: userData.profile.fitnessLevel,
          workoutPreferences: userData.profile.preferredWorkoutTypes || 'running',
          availableTime: userData.profile.availableTime || '30-60 minutes',
          equipmentAvailable: userData.profile.equipmentAvailable || 'None',
        });
        todaysWorkoutStr = suggestionResult.workoutSuggestion;
      }

      // 2. Fetch Detailed Weather
      let detailedWeatherData: DailyForecastData | { error: string; locationName?: string };
      if (userData.profile.locationCity) {
        detailedWeatherData = await fetchDetailedWeather(userData.profile.locationCity, userData.profile.weatherUnit);
      } else {
        detailedWeatherData = { error: "Location not set in profile.", locationName: "Unknown" };
      }

      // 3. Prepare input for the main dashboard content flow
      const dashboardFlowInput: GenerateDashboardInput = {
        userId: authUser.uid,
        userName: userData.firstName || 'Runner',
        locationCity: userData.profile.locationCity || 'Not set',
        runningLevel: userData.profile.fitnessLevel,
        goal: userData.profile.goal,
        todaysWorkout: todaysWorkoutStr,
        detailedWeather: detailedWeatherData,
        weatherUnit: userData.profile.weatherUnit,
        newsSearchCategories: userData.profile.newsSearchCategories,
      };

      // 4. Call the main Genkit flow
      const generatedContent = await generateDashboardContent(dashboardFlowInput);

      setDashboardContent(generatedContent);

      // 5. Cache the new content
      const newCacheData: DashboardCache = {
        id: authUser.uid,
        userId: authUser.uid,
        cacheDate: todayISO,
        greeting: generatedContent.greeting,
        weatherSummary: generatedContent.weatherSummary,
        workoutForDisplay: generatedContent.workoutForDisplay,
        topStories: generatedContent.topStories,
        planEndNotification: generatedContent.planEndNotification ?? null,
        dressMyRunSuggestion: generatedContent.dressMyRunSuggestion,
        cachedInputs: {
 locationCity: userData.profile.locationCity,
            weatherUnit: userData.profile.weatherUnit,
            newsSearchCategories: userData.profile.newsSearchCategories,
            trainingPlanId: userData.trainingPlanId ?? null, // Store current trainingPlanId
        }
      };
      setDocumentNonBlocking(dashboardCacheDocRef, newCacheData, { merge: true });

    } catch (error) {
      console.error("Error generating dashboard content:", error);
      setPageError(`Failed to generate dashboard. ${error instanceof Error ? error.message : 'Please try again.'}`);
      setDashboardContent({
        greeting: `Hello ${userData.firstName || 'Runner'}! We had trouble loading your dashboard.`,
        weatherSummary: "Weather data unavailable.",
        workoutForDisplay: "Workout data unavailable.",
        topStories: [],
        dressMyRunSuggestion: [],
        planEndNotification: null,
      });
    } finally {
      setIsGeneratingDashboard(false);
    }
  }, [authUser?.uid, userData, firestore, dashboardCacheDocRef, trainingPlanData, todayISO]);


  useEffect(() => {
    if (isAuthUserLoading || isUserDataLoading || isCacheLoading) {
      return;
    }

    if (!userData && !isAuthUserLoading) {
        return;
    }

    if (userError || cacheError) {
        setPageError(userError?.message || cacheError?.message || "Error loading page data.");
        return;
    }

    let profileSettingsChanged = false;
    if (userData && cachedDashboardData?.cachedInputs) {
        const inputs = cachedDashboardData.cachedInputs;
        const profile = userData.profile;
        profileSettingsChanged =
            inputs.locationCity !== profile.locationCity ||
            inputs.weatherUnit !== profile.weatherUnit ||
            JSON.stringify(inputs.newsSearchCategories?.sort()) !== JSON.stringify(profile.newsSearchCategories?.sort()) ||
            inputs.trainingPlanId !== (userData.trainingPlanId ?? null); // Compare with current plan ID
    }


    if (cachedDashboardData && cachedDashboardData.cacheDate === todayISO && !profileSettingsChanged) {
      setDashboardContent({
        greeting: cachedDashboardData.greeting,
        weatherSummary: cachedDashboardData.weatherSummary,
        workoutForDisplay: cachedDashboardData.workoutForDisplay,
        topStories: cachedDashboardData.topStories,
        planEndNotification: cachedDashboardData.planEndNotification ?? null,
        dressMyRunSuggestion: cachedDashboardData.dressMyRunSuggestion,
      });
    } else if (authUser && userData && (!isTrainingPlanLoading || trainingPlanData === undefined)) {
      generateAndCacheDashboardContent();
 }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthUserLoading, isUserDataLoading, isCacheLoading,
    authUser, userData, trainingPlanData, isTrainingPlanLoading,
    cachedDashboardData,
    todayISO,
    generateAndCacheDashboardContent,
    userError, cacheError
  ]);

 if (isAuthUserLoading || isUserDataLoading || isCacheLoading || isGeneratingDashboard || (authUser && userData && (!cachedDashboardData || cachedDashboardData.cacheDate !== todayISO || cachedDashboardData.cachedInputs?.trainingPlanId !== (userData.trainingPlanId ?? null)))) {
    if (!userData && !isAuthUserLoading) {
 // User is logged in but user doc is not found - likely first time login, show profile prompt
    } else {
 // Show loading/generating state
    }
 }
  if (isAuthUserLoading || (authUser && isUserDataLoading && !userData) || (isCacheLoading && !cachedDashboardData && !isGeneratingDashboard && !dashboardContent)) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!userData && !isUserDataLoading && authUser) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
          <h2 className="text-2xl font-semibold mb-2">Welcome to Shut Up and Run!</h2>
          <p className="mb-4 text-muted-foreground">Please complete your profile to get started.</p>
          <Button onClick={() => router.push('/profile')}>Go to Profile</Button>
        </div>
      </AppLayout>
    );
  }

  if (pageError && !isGeneratingDashboard) {
    return (
        <AppLayout>
            <Alert variant="destructive" className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Dashboard Error</AlertTitle>
              <AlertDescription>{pageError} Please try refreshing the page or check your profile settings.</AlertDescription>
            </Alert>
        </AppLayout>
    );
  }

  if (isGeneratingDashboard || !dashboardContent) {
     return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">Generating your personalized dashboard...</p>
        </div>
      </AppLayout>
    );
  }


  return (
    <AuthGuard>
      <AppLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <MotivationalGreeting
              greeting={dashboardContent.greeting}
              userName={userData?.firstName}
            />
          </div>

          <div>
            <WeatherForecast
              weatherSummary={dashboardContent.weatherSummary}
            />
          </div>

          <div>
             <DailyWorkout
                workoutDescription={dashboardContent.workoutForDisplay}
              />
          </div>

          <div className="md:col-span-2">
            <DressMyRunSection
              suggestion={dashboardContent.dressMyRunSuggestion}
            />
          </div>

          <div className="md:col-span-2">
            <RunningNews
              newsItems={dashboardContent.topStories}
              planNotification={dashboardContent.planEndNotification ?? undefined}
            />
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
