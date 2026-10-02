'use client';

import { use } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AssistantWorkspace } from '@/features/assistant/components/AssistantWorkspace';

export default function AssistantConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);

  return (
    <Sidebar>
      <AssistantWorkspace conversationId={conversationId} />
    </Sidebar>
  );
}
