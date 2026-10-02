'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { AssistantWorkspace } from '@/features/assistant/components/AssistantWorkspace';

export default function AssistantPage() {
  return (
    <Sidebar>
      <AssistantWorkspace />
    </Sidebar>
  );
}
