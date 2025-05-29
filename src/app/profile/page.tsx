import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <AppLayout>
        <div className="container mx-auto py-8">
          <ProfileForm />
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
