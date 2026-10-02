'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { ImageGeneratorStudio } from '@/features/creative/components/ImageGeneratorStudio';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativeImagePage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <ImageGeneratorStudio userId={user?.uid || 'guest_user'} />;
}
