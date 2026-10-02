'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { ReelGeneratorStudio } from '@/features/creative/components/ReelGeneratorStudio';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativeReelPage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <ReelGeneratorStudio userId={user?.uid || 'guest_user'} />;
}
