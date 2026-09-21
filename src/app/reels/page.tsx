'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService } from '@/services/database';
import { listReels } from '@/features/reel/services/reelService';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { Button } from '@/components/ui/Button';
import type { Business, ReelProject, ReelStatus } from '@/types';

const STATUS_STYLES: Record<ReelStatus, string> = {
  draft: 'bg-neutral-100 text-neutral-700',
  uploading: 'bg-neutral-100 text-neutral-700',
  analyzing: 'bg-brand-100 text-brand-700',
  planning: 'bg-brand-100 text-brand-700',
  rendering: 'bg-brand-100 text-brand-700',
  completed: 'bg-success-100 text-success-700',
  failed: 'bg-error-100 text-error-700',
};

function ReelCard({ reel }: { reel: ReelProject }) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="relative aspect-[9/16] w-full bg-neutral-100">
        {reel.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed thumbnail URL
          <img
            src={reel.thumbnailUrl}
            alt="Reel thumbnail"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🎥</div>
        )}
        <span
          className={`absolute top-2 left-2 rounded-full px-2 py-1 text-xs ${STATUS_STYLES[reel.status]}`}
        >
          {reel.status}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <p className="font-medium text-neutral-900 capitalize">{reel.goal.replace(/_/g, ' ')}</p>
        <p className="text-sm text-neutral-500">
          {reel.durationSeconds}s ·{' '}
          {new Date(reel.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
        <div className="flex gap-2 pt-2">
          {reel.status === 'completed' && reel.outputUrl && (
            <a href={reel.outputUrl} download className="flex-1">
              <Button variant="outline" size="sm" fullWidth>
                Download
              </Button>
            </a>
          )}
          {reel.status === 'failed' && (
            <Link href="/reels/new" className="flex-1">
              <Button variant="ghost" size="sm" fullWidth>
                Try Again
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 text-4xl" aria-hidden="true">
        🎥
      </div>
      <h3 className="text-lg font-medium text-neutral-900">No Reels yet</h3>
      <p className="mt-1 text-sm text-neutral-500">
        Upload a few raw clips and let Mitra turn them into a ready-to-post Reel.
      </p>
      <Link href="/reels/new" className="mt-6 inline-block">
        <Button>Create Reel</Button>
      </Link>
    </div>
  );
}

export default function ReelsPage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [reels, setReels] = useState<ReelProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBusinesses() {
      if (!user) return;
      try {
        const data = await businessService.getByUserId(user.uid);
        setBusinesses(data);
        if (data.length > 0) {
          setSelectedBusinessId(data[0]!.businessId);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load businesses');
      }
    }
    void loadBusinesses();
  }, [user]);

  useEffect(() => {
    if (!selectedBusinessId) return;
    const businessId = selectedBusinessId;
    async function loadReels() {
      try {
        setLoading(true);
        const { reels: reelsData } = await listReels({ businessId, limit: 50 });
        setReels(reelsData);
      } catch (err) {
        console.error(err);
        setError('Failed to load Reels');
      } finally {
        setLoading(false);
      }
    }
    void loadReels();
  }, [selectedBusinessId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="border-brand-600 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="bg-bg-primary min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Reels</h1>
          <p className="mt-1 text-neutral-500">Instagram Reels made from your raw clips</p>
        </div>
        <div className="flex items-center gap-3">
          {businesses.length > 0 && (
            <BusinessSelector
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              onSelect={setSelectedBusinessId}
            />
          )}
          <Link href="/reels/new">
            <Button>Create Reel</Button>
          </Link>
        </div>
      </div>

      {error && <p className="text-error-600 mb-4 text-sm">{error}</p>}

      {reels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reels.map((reel) => (
            <ReelCard key={reel.reelId} reel={reel} />
          ))}
        </div>
      )}
    </div>
  );
}
