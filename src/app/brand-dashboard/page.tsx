'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { mergedProfileService } from '@/services/mergedProfileService';
import type { Business, BrandKit, DesignIdentity } from '@/types';

export default function BrandDashboardPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const loading = status === 'loading';

  const [business, setBusiness] = useState<Business | null>(null);
  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [design, setDesign] = useState<DesignIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load merged profile once the user is known
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { business, brand, design } = await mergedProfileService.fetchAll(user.uid);
        setBusiness(business);
        setBrand(brand);
        setDesign(design);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load profile';
        setError(msg);
      }
    })();
  }, [user]);

  if (loading) {
    return <PageSkeleton variant="cards" label="Loading Dashboard…" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <p className="text-sm font-medium text-neutral-600">Please sign in to view your brand dashboard.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h3 className="text-lg font-bold text-red-800">Dashboard Error</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-12">
      {/* Header with mascot */}
      <div className="flex flex-col items-center gap-4">
        <MitraMascot pose="cheerful" size="lg" />
        <h1 className="text-3xl font-bold">Your Brand &amp; Business Dashboard</h1>
        <p className="text-sm text-neutral-500">A quick snapshot of the data you just supplied during onboarding.</p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Business card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Business</h2>
          </CardHeader>
          <CardContent>
            {business ? (
              <ul className="space-y-2 text-sm">
                <li><strong>Name:</strong> {business.name}</li>
                <li><strong>Industry:</strong> {business.industry}</li>
                <li><strong>Status:</strong> {business.status}</li>
              </ul>
            ) : (
              <p className="text-neutral-400">No business data.</p>
            )}
          </CardContent>
        </Card>

        {/* Brand kit card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Brand</h2>
          </CardHeader>
          <CardContent>
            {brand ? (
              <ul className="space-y-2 text-sm">
                <li><strong>Logo URL:</strong> <a href={brand.logoUrl} target="_blank" rel="noopener noreferrer" className="underline">view</a></li>
                <li><strong>Primary Color:</strong> <span className="inline-block h-4 w-8 rounded border" style={{ backgroundColor: brand.primaryColor }} /></li>
                <li><strong>Tagline:</strong> {brand.tagline}</li>
              </ul>
            ) : (
              <p className="text-neutral-400">No brand data.</p>
            )}
          </CardContent>
        </Card>

        {/* Design identity card */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Design</h2>
          </CardHeader>
          <CardContent>
            {design ? (
              <ul className="space-y-2 text-sm">
                <li><strong>Style:</strong> {design.style}</li>
                <li><strong>Tone:</strong> {design.tone}</li>
                <li><strong>Fonts:</strong> {design.fonts?.join(', ')}</li>
              </ul>
            ) : (
              <p className="text-neutral-400">No design data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call‑to‑action button */}
      <div className="flex justify-center">
        <Button onClick={() => router.push('/products')} className="mt-4 px-6 py-3 text-lg">
          Manage Products & Services
        </Button>
      </div>
    </div>
  );
}
