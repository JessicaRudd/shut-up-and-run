'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { MotivationalGreeting } from '@/components/dashboard/MotivationalGreeting';
import { WeatherForecast } from '@/components/dashboard/WeatherForecast';
import { DailyWorkout } from '@/components/dashboard/DailyWorkout';
import { RunningNews } from '@/components/dashboard/RunningNews';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { User as AppUser, TrainingPlan as AppTrainingPlan, DashboardCache as AppDashboardCache } from '@/lib/firebase-schemas';
import { doc, DocumentReference } from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const todayISO = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // User data
  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<AppUser>;
  }, [firestore, authUser]);
  const { data: userData, isLoading: isUserDataLoading, error: userError } = useDoc<AppUser>(userDocRef);

  // Training Plan data
  const trainingPlanDocRef = useMemo(() => {
    if (!firestore || !userData?.trainingPlanId) return null;
    return doc(firestore, 'trainingPlans', userData.trainingPlanId) as DocumentReference<AppTrainingPlan>;
  }, [firestore, userData?.trainingPlanId]);
  const { data: trainingPlanData, isLoading: isTrainingPlanLoading } = useDoc<AppTrainingPlan>(trainingPlanDocRef);
  
  // Dashboard Cache data
  const dashboardCacheDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'dashboardCache', authUser.uid) as DocumentReference<AppDashboardCache>;
  }, [firestore, authUser]);
  const { data: cachedDashboardData, isLoading: isCacheLoading, error: cacheError } = useDoc<AppDashboardCache>(dashboardCacheDocRef);

  const [dashboardContent, setDashboardContent] = useState<Partial<AppDashboardCache>>({});
  const [isGeneratingCache, setIsGeneratingCache] = useState(false);

  const generateAndCacheDashboard = useCallback(async (
      currentMotivationalGreeting: string,
      currentWeatherInfo: { forecast: string; clothingRecommendation: string },
      currentDailyWorkout: string,
      currentRunningNews: string[]
    ) => {
    if (!authUser?.uid || !firestore || !dashboardCacheDocRef) return;
    
    setIsGeneratingCache(true);
    const newCache: AppDashboardCache = {
      id: authUser.uid,
      userId: authUser.uid,
      cacheDate: todayISO,
      motivationalGreeting: currentMotivationalGreeting,
      weatherInfo: currentWeatherInfo,
      dailyWorkout: currentDailyWorkout,
      runningNews: currentRunningNews,
    };
    setDocumentNonBlocking(dashboardCacheDocRef, newCache, { merge: true });
    setDashboardContent(newCache); // Update local state immediately
    setIsGeneratingCache(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, firestore, dashboardCacheDocRef, todayISO]);


  useEffect(() => {
    if (cachedDashboardData && cachedDashboardData.cacheDate === todayISO) {
      setDashboardContent(cachedDashboardData);
    } else if (!isCacheLoading && authUser && userData && !cacheError) {
      // If cache is stale or not present, rely on individual components to generate
      // and then call their respective `onXGenerated` which will trigger cache update
      // For simplicity, we'll set an empty object, and let the callbacks fill it.
       setDashboardContent({
           motivationalGreeting: undefined,
           weatherInfo: undefined,
           dailyWorkout: undefined,
           runningNews: undefined,
       });
    }
  }, [cachedDashboardData, todayISO, isCacheLoading, authUser, userData, cacheError]);

  const handleComponentGenerated = useCallback((type: keyof AppDashboardCache, value: any) => {
    setDashboardContent(prev => {
        const newState = {...prev, [type]: value };
        // Check if all components have reported their generated values
        if (
            newState.motivationalGreeting !== undefined &&
            newState.weatherInfo !== undefined &&
            newState.dailyWorkout !== undefined &&
            newState.runningNews !== undefined &&
            (!cachedDashboardData || cachedDashboardData.cacheDate !== todayISO) // Only cache if stale
        ) {
            generateAndCacheDashboard(
                newState.motivationalGreeting as string,
                newState.weatherInfo as { forecast: string; clothingRecommendation: string },
                newState.dailyWorkout as string,
                newState.runningNews as string[]
            );
        }
        return newState;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cachedDashboardData, todayISO, generateAndCacheDashboard]);


  if (isAuthUserLoading || isUserDataLoading || isCacheLoading && !cachedDashboardData) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (userError) {
    return (
      <AppLayout>
        <div className="text-destructive p-4">Error loading user data: {userError.message}. Please try refreshing.</div>
      </AppLayout>
    );
  }
  
  if (!userData && !isUserDataLoading) {
     // This case implies that the user document doesn't exist in Firestore.
     // This could happen for a new anonymous user or if signup failed to create the doc.
     // For now, we'll prompt them to complete their profile.
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center p-4">
          <h2 className="text-2xl font-semibold mb-2">Welcome to RunMate!</h2>
          <p className="mb-4 text-muted-foreground">Please complete your profile to get started.</p>
          <Button onClick={() => router.push('/profile')}>Go to Profile</Button>
        </div>
      </AppLayout>
    );
  }


  return (
    <AuthGuard>
      <AppLayout>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="lg:col-span-2 xl:col-span-2">
            <MotivationalGreeting 
              user={userData} 
              cachedGreeting={dashboardContent.motivationalGreeting}
              onGreetingGenerated={(g) => handleComponentGenerated('motivationalGreeting', g)}
            />
          </div>
          <div className="lg:col-span-1 xl:col-span-2">
            <WeatherForecast 
              cachedWeather={dashboardContent.weatherInfo}
              onWeatherGenerated={(w) => handleComponentGenerated('weatherInfo', w)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
             <DailyWorkout
                user={userData}
                trainingPlan={trainingPlanData}
                isLoadingPlan={isTrainingPlanLoading}
                cachedWorkout={dashboardContent.dailyWorkout}
                onWorkoutGenerated={(w) => handleComponentGenerated('dailyWorkout', w)}
              />
          </div>
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <RunningNews 
              cachedNews={dashboardContent.runningNews}
              onNewsGenerated={(n) => handleComponentGenerated('runningNews', n)}
            />
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
