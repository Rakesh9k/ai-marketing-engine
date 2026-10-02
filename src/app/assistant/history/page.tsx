'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { AssistantHistoryView } from '@/features/assistant/components/AssistantHistoryView';

export default function AssistantHistoryPage() {
  return (
    <Sidebar>
      <AssistantHistoryView />
    </Sidebar>
  );
}
