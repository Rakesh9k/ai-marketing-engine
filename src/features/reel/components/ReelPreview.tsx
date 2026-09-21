'use client';

import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { ReelProject } from '@/types';

interface ReelPreviewProps {
  reel: ReelProject;
  onCreateAnother?: () => void;
}

export function ReelPreview({ reel, onCreateAnother }: ReelPreviewProps) {
  return (
    <div className="mx-auto max-w-sm space-y-4 text-center">
      {reel.outputUrl ? (
        <video
          controls
          poster={reel.thumbnailUrl}
          className="mx-auto aspect-[9/16] w-full rounded-lg bg-black shadow-sm"
        >
          <source src={reel.outputUrl} />
          Your browser does not support the video tag.
        </video>
      ) : (
        <div className="flex aspect-[9/16] w-full items-center justify-center rounded-lg bg-neutral-100 text-neutral-400">
          Reel preview unavailable
        </div>
      )}

      <div className="flex flex-col gap-2">
        {reel.outputUrl && (
          <a href={reel.outputUrl} download>
            <Button variant="primary" fullWidth>
              Download Reel
            </Button>
          </a>
        )}
        {onCreateAnother && (
          <Button variant="outline" fullWidth onClick={onCreateAnother}>
            Create Another
          </Button>
        )}
        <Link href="/dashboard">
          <Button variant="ghost" fullWidth>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
