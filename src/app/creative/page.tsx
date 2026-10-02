'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { CreativeStudioDashboard } from '@/features/creative/components/CreativeStudioDashboard';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativePage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <CreativeStudioDashboard userId={user?.uid || 'guest_user'} />;
}
