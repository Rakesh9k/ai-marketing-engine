'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { PosterGeneratorStudio } from '@/features/creative/components/PosterGeneratorStudio';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativePosterPage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <PosterGeneratorStudio userId={user?.uid || 'guest_user'} />;
}
