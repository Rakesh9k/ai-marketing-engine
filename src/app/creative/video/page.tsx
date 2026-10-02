'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { VideoGeneratorStudio } from '@/features/creative/components/VideoGeneratorStudio';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativeVideoPage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <VideoGeneratorStudio userId={user?.uid || 'guest_user'} />;
}
