'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { useUser } from '@/firebase'; // To prefill name/email

export default function FeedbackPage() {
  const { user } = useUser();

  return (
    <AuthGuard>
      <AppLayout>
        <div className="container mx-auto py-8">
          <FeedbackForm userName={user?.displayName || undefined} userEmail={user?.email || undefined} />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
