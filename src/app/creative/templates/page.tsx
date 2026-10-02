'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { TemplateExplorer } from '@/features/creative/components/TemplateExplorer';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function CreativeTemplatesPage() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageSkeleton variant="cards" />;
  }

  return <TemplateExplorer userId={user?.uid || 'guest_user'} />;
}
