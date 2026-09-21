'use client';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { CampaignWizard } from '@/features/campaign/components/CampaignWizard';

export default function NewCampaignPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  return <CampaignWizard userId={user.uid} />;
}
