'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { CampaignWizard } from '@/features/campaign/components/CampaignWizard';
import { PageSkeleton } from '@/components/motion/PageSkeleton';

export default function NewCampaignPage() {
  const { user } = useAuth();

  if (!user) {
    return <PageSkeleton variant="form" />;
  }

  return <CampaignWizard userId={user.uid} />;
}
