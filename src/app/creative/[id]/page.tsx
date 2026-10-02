'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { CreativeDetailStudio } from '@/features/creative/components/CreativeDetailStudio';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativeDetailPage() {
  const { user, status } = useAuth();
  const params = useParams();
  const rawId = Array.isArray(params?.['id']) ? params['id'][0] : params?.['id'];
  const id = rawId || 'cr_1';

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <CreativeDetailStudio userId={user?.uid || 'guest_user'} creativeId={id} />;
}
