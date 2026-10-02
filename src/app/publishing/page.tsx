'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PublishingDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/creative');
  }, [router]);

  return null;
}
