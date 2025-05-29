
'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingPlanSetup } from '@/components/training-plan/TrainingPlanSetup';
import { TrainingPlanDisplay } from '@/components/training-plan/TrainingPlanDisplay';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { User as AppUser, TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { doc, DocumentReference } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { Loader2, User as UserIconLucide, Info } from 'lucide-react'; // Added UserIconLucide
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card components
import { Button } from '@/components/ui/button'; // Added Button
import { useRouter } from 'next/navigation'; // Added useRouter
import { isPast, parseISO } from 'date-fns';

export default function TrainingPlanPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter(); // Initialized useRouter

  // User data
  const userDocRef = useMemo(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid) as DocumentReference<AppUser>;
  }, [firestore, authUser]);
  const { data: userData, isLoading: isUserDataLoading, error: userError } = useDoc<AppUser>(userDocRef);

  // Current Training Plan ID from User
  const [currentPlanId, setCurrentPlanId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (userData) {
      setCurrentPlanId(userData.trainingPlanId);
    }
  }, [userData]);

  // Training Plan data
  const trainingPlanDocRef = useMemo(() => {
    if (!firestore || !currentPlanId) return null;
    return doc(firestore, 'trainingPlans', currentPlanId) as DocumentReference<AppTrainingPlan>;
  }, [firestore, currentPlanId]);
  const { data: trainingPlanData, isLoading: isTrainingPlanLoading, error: trainingPlanError } = useDoc<AppTrainingPlan>(trainingPlanDocRef);

  // State to toggle between displaying plan and setting up a new one
  const [showSetupForm, setShowSetupForm] = useState(false);

  const handlePlanGenerated = (newPlanId: string) => {
    setCurrentPlanId(newPlanId); // This will trigger a re-fetch of the new plan
    setShowSetupForm(false); // Switch back to display view
  };
  
  const isLoading = isAuthUserLoading || isUserDataLoading || (currentPlanId !== undefined && currentPlanId !== null && isTrainingPlanLoading);

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }
  
  if (userError || trainingPlanError) {
    return (
       <AuthGuard>
        <AppLayout>
          <div className="container mx-auto py-8">
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {userError?.message || trainingPlanError?.message || "Could not load training plan data."}
              </AlertDescription>
            </Alert>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  // If authenticated, but no user document data yet (e.g., new user redirected from signup/login)
  if (authUser && !userData && !isUserDataLoading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="container mx-auto py-8 flex items-center justify-center min-h-[calc(100vh-15rem)]">
            <Card className="w-full max-w-lg text-center shadow-xl">
              <CardHeader>
                <UserIconLucide className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="text-2xl mt-4">Complete Your Profile</CardTitle>
                <CardDescription className="mt-2">
                  Please complete your profile to set up and view your training plan.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push('/profile')} className="w-full">
                  Go to Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  const planExistsAndIsActive = trainingPlanData && !isPast(parseISO(trainingPlanData.endDate));
  const planExistsButEnded = trainingPlanData && isPast(parseISO(trainingPlanData.endDate));

  // Determine if setup form should be shown
  // Show setup if:
  // 1. Explicitly requested (showSetupForm is true)
  // 2. OR User data is loaded, but there's no current plan data and we're not still loading the plan
  //    (this covers cases like no trainingPlanId on user, or a planId that doesn't resolve to a document)
  const shouldShowSetupForm = showSetupForm || (userData && !trainingPlanData && !isTrainingPlanLoading && currentPlanId === null);


  return (
    <AuthGuard>
      <AppLayout>
        <div className="container mx-auto py-8">
          {shouldShowSetupForm && userData ? (
            <TrainingPlanSetup currentUserData={userData} onPlanGenerated={handlePlanGenerated} />
          ) : trainingPlanData ? (
            <TrainingPlanDisplay plan={trainingPlanData} onSetupNewPlan={() => setShowSetupForm(true)} />
          ) : (
            // Fallback for when userData is loaded, no plan data, and not explicitly showing setup.
            // This could be initial state for a user with no planId.
             userData && !isTrainingPlanLoading && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Active Training Plan</AlertTitle>
                    <AlertDescription>
                        You don&apos;t have an active training plan. Generate one now to get started!
                         <Button variant="link" className="p-0 h-auto ml-1 text-primary" onClick={() => setShowSetupForm(true)}>
                            Create Plan
                        </Button>
                    </AlertDescription>
                </Alert>
            )
          )}
           {/* Message if plan ended, and not showing setup form yet */}
           {planExistsButEnded && !showSetupForm && (
             <Alert variant="default" className="mt-6 bg-accent/30 border-accent">
                <Info className="h-4 w-4 text-accent-foreground" />
                <AlertTitle className="text-accent-foreground">Previous Plan Ended</AlertTitle>
                <AlertDescription className="text-accent-foreground/80">
                  Your previous training plan has ended. You can generate a new one or check your dashboard for daily workout suggestions.
                   <Button variant="link" className="p-0 h-auto ml-1 text-accent-foreground" onClick={() => setShowSetupForm(true)}>
                     Generate New Plan
                  </Button>
                </AlertDescription>
            </Alert>
           )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}

