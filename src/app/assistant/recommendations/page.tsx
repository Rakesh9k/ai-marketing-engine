'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { AssistantRecommendationsView } from '@/features/assistant/components/AssistantRecommendationsView';

export default function AssistantRecommendationsPage() {
  return (
    <Sidebar>
      <AssistantRecommendationsView />
    </Sidebar>
  );
}
