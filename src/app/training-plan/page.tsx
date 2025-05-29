'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { TrainingPlanSetup } from '@/components/training-plan/TrainingPlanSetup';
import { TrainingPlanDisplay } from '@/components/training-plan/TrainingPlanDisplay';
import { useUser, useFirestore, useDoc } from '@/firebase';
import type { User as AppUser, TrainingPlan as AppTrainingPlan } from '@/lib/firebase-schemas';
import { doc, DocumentReference } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';

export default function TrainingPlanPage() {
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const firestore = useFirestore();

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
            <Alert variant="destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {userError?.message || trainingPlanError?.message || "Could not load training plan data."}
              </AlertDescription>
            </Alert>
        </AppLayout>
      </AuthGuard>
    );
  }

  const planExistsAndIsActive = trainingPlanData && !isPast(parseISO(trainingPlanData.endDate));
  const planExistsButEnded = trainingPlanData && isPast(parseISO(trainingPlanData.endDate));


  return (
    <AuthGuard>
      <AppLayout>
        <div className="container mx-auto py-8">
          {showSetupForm || (!trainingPlanData && !isTrainingPlanLoading && userData) ? (
            userData && <TrainingPlanSetup currentUserData={userData} onPlanGenerated={handlePlanGenerated} />
          ) : trainingPlanData ? (
            <TrainingPlanDisplay plan={trainingPlanData} onSetupNewPlan={() => setShowSetupForm(true)} />
          ) : (
            // This case: no plan ID on user, or plan ID exists but planData is null (still loading or error handled above)
            // If userData is loaded, means no planId is set.
            userData && !isTrainingPlanLoading && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>No Active Training Plan</AlertTitle>
                    <AlertDescription>
                        You don&apos;t have an active training plan. Generate one now to get started!
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
                </AlertDescription>
            </Alert>
           )}
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
