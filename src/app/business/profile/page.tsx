'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { BusinessBrainDashboard } from '@/features/business-brain/components/BusinessBrainDashboard';

export default function BusinessProfileSubroutePage() {
  const { user, status } = useAuth();
  const loading = status === 'loading';

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">
          Please sign in to access Business Brain.
        </p>
      </div>
    );
  }

  return <BusinessBrainDashboard userId={user.uid} initialTab="profile" />;
}
