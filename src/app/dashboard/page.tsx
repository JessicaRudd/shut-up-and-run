
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
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// Helper components for different loading/UI states for clarity
const FullScreenLoader = () => (
  <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

const ProfilePrompt = () => {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
      <h2 className="text-2xl font-semibold mb-2">Welcome to Shut Up and Run!</h2>
      <p className="mb-4 text-muted-foreground">Please complete your profile to get started.</p>
      <Button onClick={() => router.push('/profile')}>Go to Profile</Button>
    </div>
  );
};

const GeneratingIndicator = ({currentDate}: {currentDate: string}) => (
  <>
    <div className="mb-4 text-center md:text-left">
      <h2 className="text-xl font-semibold text-foreground">
        {currentDate}
      </h2>
    </div>
    <div className="flex flex-col items-center justify-center h-[calc(100vh-14rem)] text-center p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg text-muted-foreground">Generating your personalized dashboard...</p>
    </div>
  </>
);

const ErrorAlertDisplay = ({ errorMsg, currentDate }: { errorMsg: string, currentDate: string }) => (
  <>
    <div className="mb-4 text-center md:text-left">
      <h2 className="text-xl font-semibold text-foreground">
        {currentDate}
      </h2>
    </div>
    <Alert variant="destructive" className="mb-6">
      <Info className="h-4 w-4" />
      <AlertTitle>Dashboard Error</AlertTitle>
      <AlertDescription>{errorMsg} Please try refreshing the page or check your profile settings.</AlertDescription>
    </Alert>
  </>
);


export default function DashboardPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();

  const todayISO = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const currentDateFormatted = useMemo(() => format(new Date(), 'EEEE, MMMM do, yyyy'), []);

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<AppUser>;
  }, [firestore, authUser]);
  const { data: userData, isLoading: isUserDataLoading, error: userError } = useDoc<AppUser>(userDocRef);

  const trainingPlanDocRef = useMemo(() => {
    if (!firestore || !userData?.trainingPlanId) return null;
    return doc(firestore, 'trainingPlans', userData.trainingPlanId) as DocumentReference<AppTrainingPlan>;
  }, [firestore, userData?.trainingPlanId]);
  // trainingPlanData is used within generateAndCacheDashboardContent, so its loading is implicitly handled there.
  const { data: trainingPlanData, isLoading: isTrainingPlanLoading } = useDoc<AppTrainingPlan>(trainingPlanDocRef);


  const dashboardCacheDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'dashboardCache', authUser.uid) as DocumentReference<DashboardCache>;
  }, [firestore, authUser]);
  const { data: cachedDashboardData, isLoading: isCacheLoading, error: cacheError } = useDoc<DashboardCache>(dashboardCacheDocRef);

  const [dashboardContent, setDashboardContent] = useState<GenerateDashboardOutput | null>(null);
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);


  const generateAndCacheDashboardContent = useCallback(async () => {
    if (!authUser?.uid || !userData || !firestore || !dashboardCacheDocRef ) {
      if (isGeneratingRef.current) { // Reset ref if we are bailing early
        isGeneratingRef.current = false;
        setIsGeneratingDashboard(false);
      }
      return;
    }
    if (isGeneratingRef.current) return; // Already generating

    isGeneratingRef.current = true;
    setIsGeneratingDashboard(true);
    setPageError(null);

    try {
      let todaysWorkoutStr = "Rest day or choose your own activity.";
      const userProfileStringForWorkout = `Fitness Level: ${userData.profile.fitnessLevel}, Experience: ${userData.profile.runningExperience}, Goal: ${userData.profile.goal}`;
      
      // Use trainingPlanData directly here if it's loaded, otherwise the flow inside will adapt
      // This ensures that if trainingPlanData changes, this callback gets the latest.
      const currentTrainingPlan = trainingPlanData; // from useDoc hook

      if (currentTrainingPlan && new Date(currentTrainingPlan.endDate) >= new Date(todayISO)) {
        const workoutResult = await generateDailyWorkoutFlow({
          userProfile: userProfileStringForWorkout,
          trainingSchedule: currentTrainingPlan.rawPlanText,
          date: todayISO,
        });
        todaysWorkoutStr = workoutResult.workoutPlan;
      } else if (userData.profile.fitnessLevel) { // Ensure fitnessLevel is available for suggestion
        const suggestionResult = await suggestWorkoutWhenNoPlan({
          fitnessLevel: userData.profile.fitnessLevel,
          workoutPreferences: userData.profile.preferredWorkoutTypes || 'running',
          availableTime: userData.profile.availableTime || '30-60 minutes',
          equipmentAvailable: userData.profile.equipmentAvailable || 'None',
        });
        todaysWorkoutStr = suggestionResult.workoutSuggestion;
      }

      let detailedWeatherData: DailyForecastData | { error: string; locationName?: string };
      if (userData.profile.locationCity) {
        detailedWeatherData = await fetchDetailedWeather(userData.profile.locationCity, userData.profile.weatherUnit);
      } else {
        detailedWeatherData = { error: "Location not set in profile.", locationName: "Unknown" };
      }

      const dashboardFlowInput: GenerateDashboardInput = {
        userId: authUser.uid,
        userName: userData.firstName || 'Runner',
        locationCity: userData.profile.locationCity || 'Not set',
        runningLevel: userData.profile.fitnessLevel,
        goal: userData.profile.goal,
        todaysWorkout: todaysWorkoutStr,
        detailedWeather: detailedWeatherData,
        weatherUnit: userData.profile.weatherUnit,
        newsSearchCategories: userData.profile.newsSearchCategories || [],
      };

      const generatedContent = await generateDashboardContent(dashboardFlowInput);
      setDashboardContent(generatedContent);

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
            newsSearchCategories: userData.profile.newsSearchCategories || [],
            trainingPlanId: userData.trainingPlanId ?? null,
        }
      };
      setDocumentNonBlocking(dashboardCacheDocRef, newCacheData, { merge: true });

    } catch (error) {
      console.error("Error generating dashboard content:", error);
      setPageError(`Failed to generate dashboard. ${error instanceof Error ? error.message : 'Please try again.'}`);
      // Set a minimal dashboard content on error to prevent blank page
      setDashboardContent({
        greeting: `Hello ${userData.firstName || 'Runner'}! We had trouble loading your dashboard.`,
        weatherSummary: "Weather data could not be loaded.",
        workoutForDisplay: "Workout information is currently unavailable.",
        topStories: [],
        dressMyRunSuggestion: [],
        planEndNotification: null,
      });
    } finally {
      setIsGeneratingDashboard(false);
      isGeneratingRef.current = false;
    }
  }, [authUser?.uid, userData, firestore, dashboardCacheDocRef, trainingPlanData, todayISO]);


  useEffect(() => {
    // Stage 1: Handle initial loading states for auth and user data
    if (isAuthUserLoading) return; // Still waiting for auth status to be determined
    if (!authUser) return; // Auth loaded, but no user (e.g., logged out state, AuthGuard will redirect)
    if (isUserDataLoading && !userData && !userError) return; // AuthUser exists, but userData is still loading without an error

    // Stage 2: Handle user data errors or prompt for profile completion
    if (userError) {
      setPageError(userError.message || "Error loading your profile data.");
      if(isGeneratingDashboard) setIsGeneratingDashboard(false); // Stop generation if profile error
      return;
    }
    if (!userData && !isUserDataLoading) {
      // User is authenticated, user data has finished loading, but it's null (new user needs to complete profile)
      // UI will show ProfilePrompt. Ensure generating state is off.
      if(isGeneratingDashboard) setIsGeneratingDashboard(false);
      return;
    }

    // Stage 3: Handle cache loading
    if (isCacheLoading && !cachedDashboardData && !cacheError) return; // Cache still loading without an error

    // At this point: authUser and userData are definitely loaded and available.
    // cacheDashboardData is loaded, or null (if not found), or cacheError is set.
    // isGeneratingDashboard is false initially for this effect run.

    // Stage 4: Decide whether to use cache or generate new content
    let settingsOrPlanChanged = false;
    if (userData && cachedDashboardData?.cachedInputs) {
      const inputs = cachedDashboardData.cachedInputs;
      const profile = userData.profile;
      const currentNewsCategories = profile.newsSearchCategories || [];
      const cachedNewsCategories = inputs.newsSearchCategories || [];
      settingsOrPlanChanged =
        inputs.locationCity !== profile.locationCity ||
        inputs.weatherUnit !== profile.weatherUnit ||
        JSON.stringify(currentNewsCategories.sort()) !== JSON.stringify(cachedNewsCategories.sort()) ||
        inputs.trainingPlanId !== (userData.trainingPlanId ?? null);
    }

    const isCachePresentAndFresh = cachedDashboardData && cachedDashboardData.cacheDate === todayISO;
    const shouldUseCache = isCachePresentAndFresh && !settingsOrPlanChanged;

    if (shouldUseCache) {
      const newContentFromCache = {
        greeting: cachedDashboardData!.greeting,
        weatherSummary: cachedDashboardData!.weatherSummary,
        workoutForDisplay: cachedDashboardData!.workoutForDisplay,
        topStories: cachedDashboardData!.topStories,
        planEndNotification: cachedDashboardData!.planEndNotification ?? null,
        dressMyRunSuggestion: cachedDashboardData!.dressMyRunSuggestion,
      };
      if (JSON.stringify(dashboardContent) !== JSON.stringify(newContentFromCache)) {
        setDashboardContent(newContentFromCache);
      }
      if (isGeneratingDashboard) { // If somehow generating was true, reset it
        setIsGeneratingDashboard(false);
        isGeneratingRef.current = false;
      }
    } else {
      // Cache is not usable (stale, settings changed, cache error, or simply not found).
      // Generate new content, but only if not already in the process of generating.
      // Also, ensure userData is available for generation input.
      if (authUser && userData && !isGeneratingRef.current) {
        generateAndCacheDashboardContent();
      } else if (cacheError && !isGeneratingRef.current) {
        // If there was a cache read error, still try to generate.
         generateAndCacheDashboardContent();
      }
    }
  }, [
    authUser, userData, cachedDashboardData,
    isAuthUserLoading, isUserDataLoading, isCacheLoading,
    userError, cacheError,
    todayISO,
    dashboardContent, // To prevent re-setting identical cache
    isGeneratingDashboard, // For UI state mostly, ref is for callback guard
    generateAndCacheDashboardContent
  ]);


  // --- UI Rendering Logic ---
  if (isAuthUserLoading || (authUser && isUserDataLoading && !userData && !userError) ) {
    return <AppLayout><FullScreenLoader /></AppLayout>;
  }
  if (authUser && !userData && !isUserDataLoading && !userError) {
    return <AppLayout><ProfilePrompt /></AppLayout>;
  }
  if (pageError && !isGeneratingDashboard) {
    return <AppLayout><ErrorAlertDisplay errorMsg={pageError} currentDate={currentDateFormatted} /></AppLayout>;
  }
  if (isGeneratingDashboard || (!dashboardContent && authUser && userData && !pageError)) {
     return <AppLayout><GeneratingIndicator currentDate={currentDateFormatted}/></AppLayout>;
  }

  if (dashboardContent && userData) { // Ensure userData is present for greeting name
    return (
      <AuthGuard>
        <AppLayout>
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-xl font-semibold text-foreground">
              {currentDateFormatted}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <MotivationalGreeting
                greeting={dashboardContent.greeting}
                userName={userData.firstName}
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
  
  // Fallback if no other condition met (should be rare)
  return <AppLayout><FullScreenLoader /></AppLayout>;
}
