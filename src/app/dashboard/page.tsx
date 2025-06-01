
'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { MotivationalGreeting } from '@/components/dashboard/MotivationalGreeting';
import { WeatherForecast } from '@/components/dashboard/WeatherForecast';
import { DailyWorkout } from '@/components/dashboard/DailyWorkout';
import { RunningNews } from '@/components/dashboard/RunningNews';
import { DressMyRunSection } from '@/components/dashboard/DressMyRun';
import { useUser, useFirestore, useDoc, setDocumentNonBlocking } from '@/firebase';
import type { User as AppUser, TrainingPlan as AppTrainingPlan, DashboardCache as AppDashboardCache } from '@/lib/firebase-schemas';
import { doc, DocumentReference } from 'firebase/firestore';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
    return doc(firestore, 'dashboardCache', authUser.uid) as DocumentReference<AppDashboardCache>;
  }, [firestore, authUser]);
  const { data: cachedDashboardData, isLoading: isCacheLoading, error: cacheError } = useDoc<AppDashboardCache>(dashboardCacheDocRef);

  const [dashboardContent, setDashboardContent] = useState<Partial<AppDashboardCache & { dressMyRunSuggestion: any }>>({});
  const [isGeneratingCache, setIsGeneratingCache] = useState(false);

  const generateAndCacheDashboard = useCallback(async (
      currentMotivationalGreeting: string,
      currentWeatherInfo: AppDashboardCache['weatherInfo'],
      currentDailyWorkout: string,
      currentRunningNews: string[],
      currentDressMyRunSuggestion: any
    ) => {
    if (!authUser?.uid || !firestore || !dashboardCacheDocRef) return;
    
    setIsGeneratingCache(true);
    const newCache: AppDashboardCache & { dressMyRunSuggestion: any } = {
      id: authUser.uid,
      userId: authUser.uid,
      cacheDate: todayISO,
      motivationalGreeting: currentMotivationalGreeting,
      weatherInfo: currentWeatherInfo,
      dailyWorkout: currentDailyWorkout,
      runningNews: currentRunningNews,
      dressMyRunSuggestion: currentDressMyRunSuggestion,
    };
    setDocumentNonBlocking(dashboardCacheDocRef, newCache, { merge: true });
    setDashboardContent(newCache); 
    setIsGeneratingCache(false);
  }, [authUser?.uid, firestore, dashboardCacheDocRef, todayISO]);


  useEffect(() => {
    const profileSettingsChanged = userData && cachedDashboardData && 
      (cachedDashboardData.weatherInfo?.locationCity !== userData.profile.locationCity || 
       cachedDashboardData.weatherInfo?.weatherUnit !== userData.profile.weatherUnit);

    if (cachedDashboardData && cachedDashboardData.cacheDate === todayISO && !profileSettingsChanged) {
      setDashboardContent(cachedDashboardData as AppDashboardCache & { dressMyRunSuggestion: any });
    } else if (!isCacheLoading && authUser && userData && !cacheError) {
       setDashboardContent({
           motivationalGreeting: undefined,
           weatherInfo: undefined,
           dailyWorkout: undefined,
           runningNews: undefined,
           dressMyRunSuggestion: undefined,
       });
    }
  }, [cachedDashboardData, todayISO, isCacheLoading, authUser, userData, cacheError]);

  const handleComponentGenerated = useCallback((type: keyof (AppDashboardCache & { dressMyRunSuggestion: any }), value: any) => {
    setDashboardContent(prev => {
        const newState = {...prev, [type]: value };
        const profileSettingsChanged = userData && cachedDashboardData && 
            (cachedDashboardData.weatherInfo?.locationCity !== userData.profile.locationCity || 
             cachedDashboardData.weatherInfo?.weatherUnit !== userData.profile.weatherUnit);

        if (
            newState.motivationalGreeting !== undefined &&
            newState.weatherInfo !== undefined &&
            newState.dailyWorkout !== undefined &&
            newState.runningNews !== undefined && 
            newState.dressMyRunSuggestion !== undefined &&
            (!cachedDashboardData || cachedDashboardData.cacheDate !== todayISO || profileSettingsChanged) 
        ) {
            generateAndCacheDashboard(
                newState.motivationalGreeting as string,
                newState.weatherInfo as AppDashboardCache['weatherInfo'],
                newState.dailyWorkout as string,
                newState.runningNews as string[],
                newState.dressMyRunSuggestion
            );
        }
        return newState;
    });
  }, [cachedDashboardData, todayISO, generateAndCacheDashboard, userData]);


  if (isAuthUserLoading || isUserDataLoading || (isCacheLoading && !cachedDashboardData)) {
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

  return (
    <AuthGuard>
      <AppLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <MotivationalGreeting 
              user={userData} 
              cachedGreeting={dashboardContent.motivationalGreeting}
              onGreetingGenerated={(g) => handleComponentGenerated('motivationalGreeting', g)}
            />
          </div>
          
          <div> {/* WeatherForecast will take the first column on md+ */}
            <WeatherForecast 
              locationCity={userData?.profile?.locationCity}
              weatherUnit={userData?.profile?.weatherUnit}
              cachedWeather={dashboardContent.weatherInfo}
              onWeatherGenerated={(w) => handleComponentGenerated('weatherInfo', w)}
            />
          </div>

          <div> {/* DailyWorkout will take the second column on md+ */}
             <DailyWorkout
                user={userData}
                trainingPlan={trainingPlanData}
                isLoadingPlan={isTrainingPlanLoading}
                cachedWorkout={dashboardContent.dailyWorkout}
                onWorkoutGenerated={(w) => handleComponentGenerated('dailyWorkout', w)}
              />
          </div>
        
          {dashboardContent.weatherInfo && ( // Keep this conditional for DressMyRun
            <div className="md:col-span-2">
              <DressMyRunSection 
                suggestion={dashboardContent.dressMyRunSuggestion}
                // You might need an onDressMyRunGenerated callback here if it's async
                // and update handleComponentGenerated and generateAndCacheDashboard accordingly
              />
            </div>
          )}
          
          <div className="md:col-span-2">
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
