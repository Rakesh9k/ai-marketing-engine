'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { businessService, productService } from '@/services/database';
import { callFunction } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { REEL_DEFAULT_DURATION_SECONDS } from '@/features/reel/constants';
import { REEL_MIN_CLIPS } from '@/features/reel/services/reelClipValidation';
import { ReelGoalSelector } from '@/features/reel/components/ReelGoalSelector';
import { ReelStyleSelector } from '@/features/reel/components/ReelStyleSelector';
import { ReelDurationSelector } from '@/features/reel/components/ReelDurationSelector';
import { ReelClipUploader, type ClipEntry } from '@/features/reel/components/ReelClipUploader';
import { ReelGenerationProgress } from '@/features/reel/components/ReelGenerationProgress';
import { ReelPreview } from '@/features/reel/components/ReelPreview';
import { SavedStylePicker } from '@/features/style/components/SavedStylePicker';
import { createReelProject, generateReel } from '@/features/reel/services/reelService';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { MagneticWrap } from '@/components/motion/MagneticWrap';
import type {
  Business,
  CreativeObjective,
  Product,
  ReelDurationSeconds,
  ReelGoal,
  ReelProject,
  ReelStyle,
} from '@/types';

type WizardStep = 'goal' | 'style' | 'template' | 'duration' | 'upload' | 'generating' | 'preview';

const STEP_ORDER: WizardStep[] = [
  'goal',
  'style',
  'template',
  'duration',
  'upload',
  'generating',
  'preview',
];
const STEP_LABELS: Record<WizardStep, string> = {
  goal: 'Goal',
  style: 'Style',
  template: 'Template',
  duration: 'Duration',
  upload: 'Upload Clips',
  generating: 'Generate',
  preview: 'Preview',
};

function mapGoalToCreativeObjective(goal: ReelGoal): CreativeObjective {
  switch (goal) {
    case 'food_showcase':
      return 'awareness';
    case 'behind_the_scenes':
      return 'engagement';
    case 'offer_promotion':
      return 'promotion';
    case 'new_product':
      return 'launch';
    case 'local_attraction':
      return 'awareness';
    case 'surprise_me':
      return 'engagement';
    default:
      return 'awareness';
  }
}

function WizardStepper({ current }: { current: WizardStep }) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {STEP_ORDER.map((step, index) => {
        const isActive = step === current;
        const isDone = index < currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : isDone
                    ? 'bg-success-100 text-success-700'
                    : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {index + 1}
            </span>
            <span className={isActive ? 'font-medium text-neutral-900' : 'text-neutral-500'}>
              {STEP_LABELS[step]}
            </span>
            {index < STEP_ORDER.length - 1 && <span className="text-neutral-300">/</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function ReelWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  const [step, setStep] = useState<WizardStep>('goal');
  const [goal, setGoal] = useState<ReelGoal | null>(null);
  const [style, setStyle] = useState<ReelStyle | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [savedStyleId, setSavedStyleId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; description: string }>
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState<ReelDurationSeconds>(
    REEL_DEFAULT_DURATION_SECONDS
  );
  const [offer, setOffer] = useState('');
  const [cta, setCta] = useState('');
  const [additionalMessage, setAdditionalMessage] = useState('');

  const [reelId, setReelId] = useState<string | null>(null);
  const [reel, setReel] = useState<ReelProject | null>(null);
  const [clips, setClips] = useState<ClipEntry[]>([]);
  const [creatingProject, setCreatingProject] = useState(false);
  const [startingGeneration, setStartingGeneration] = useState(false);

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
        showToast('Failed to load businesses', 'error');
      } finally {
        setLoadingBusinesses(false);
      }
    }
    void loadBusinesses();
  }, [user, showToast]);

  useEffect(() => {
    async function loadTemplateOptions() {
      if (!selectedBusinessId) return;
      const selectedBusiness = businesses.find(
        (business) => business.businessId === selectedBusinessId
      );
      if (!selectedBusiness) return;
      const objective = goal ? mapGoalToCreativeObjective(goal) : undefined;
      try {
        setLoadingTemplates(true);
        const response = await callFunction<
          { type: 'reel'; objective?: CreativeObjective; vertical?: string },
          {
            templates: Array<{
              id: string;
              name: string;
              description: string;
              objectives: CreativeObjective[];
            }>;
          }
        >({
          functionName: 'listCreativeTemplates',
          data: {
            type: 'reel',
            objective,
            vertical: selectedBusiness.category,
          },
        });
        const nextTemplates = response.templates || [];
        setTemplates(nextTemplates);
        setTemplateId((current) => {
          if (current && nextTemplates.some((item) => item.id === current)) return current;
          return nextTemplates[0]?.id ?? null;
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to load reel templates', 'error');
      } finally {
        setLoadingTemplates(false);
      }
    }
    void loadTemplateOptions();
  }, [businesses, goal, selectedBusinessId, showToast]);

  useEffect(() => {
    async function loadProducts() {
      if (!selectedBusinessId) {
        setProducts([]);
        return;
      }
      try {
        const data = await productService.listByBusiness(selectedBusinessId);
        setProducts(data);
        setSelectedProductId((current) => {
          if (current && data.some((product) => product.productId === current)) return current;
          return data[0]?.productId ?? null;
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to load products', 'error');
      }
    }
    void loadProducts();
  }, [selectedBusinessId, showToast]);

  const uploadedCount = clips.filter((c) => c.status === 'uploaded').length;
  const anyUploading = clips.some((c) => c.status === 'uploading');
  const canGenerate = uploadedCount >= REEL_MIN_CLIPS && !anyUploading;

  const resetWizard = useCallback(() => {
    setStep('goal');
    setGoal(null);
    setStyle(null);
    setTemplateId(null);
    setSavedStyleId(null);
    setSelectedProductId(null);
    setTemplates([]);
    setDurationSeconds(REEL_DEFAULT_DURATION_SECONDS);
    setOffer('');
    setCta('');
    setAdditionalMessage('');
    setReelId(null);
    setReel(null);
    setClips([]);
  }, []);

  const handleProceedToUpload = useCallback(async () => {
    if (!selectedBusinessId || !goal || !style || !templateId) {
      showToast('Please finish the reel setup before continuing.', 'error');
      return;
    }
    if (!selectedProductId) {
      showToast('Please select a product for this reel.', 'error');
      return;
    }
    setCreatingProject(true);
    try {
      const { reelId: newReelId, reel: newReel } = await createReelProject({
        businessId: selectedBusinessId,
        goal,
        style,
        templateId,
        creativeObjective: mapGoalToCreativeObjective(goal),
        productId: selectedProductId,
        styleId: savedStyleId || undefined,
        durationSeconds,
        offer: offer.trim() || undefined,
        cta: cta.trim() || undefined,
        additionalMessage: additionalMessage.trim() || undefined,
      });
      setReelId(newReelId);
      setReel(newReel);
      setStep('upload');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create Reel project';
      showToast(message, 'error');
    } finally {
      setCreatingProject(false);
    }
  }, [
    selectedBusinessId,
    goal,
    style,
    templateId,
    selectedProductId,
    savedStyleId,
    durationSeconds,
    offer,
    cta,
    additionalMessage,
    showToast,
  ]);

  const handleGenerate = useCallback(async () => {
    if (!selectedBusinessId || !reelId) return;
    setStartingGeneration(true);
    try {
      const response = await generateReel({ businessId: selectedBusinessId, reelId });
      setReel(response.reel);
      setStep('generating');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start Reel generation';
      showToast(message, 'error');
    } finally {
      setStartingGeneration(false);
    }
  }, [selectedBusinessId, reelId, showToast]);

  const handleCompleted = useCallback((completedReel: ReelProject) => {
    setReel(completedReel);
    setStep('preview');
  }, []);

  if (loadingBusinesses) {
    return <PageSkeleton variant="form" />;
  }

  if (businesses.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <h3 className="text-lg font-medium text-neutral-900">No business set up yet</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Create your first business before making a Reel.
        </p>
        <Button className="mt-6" onClick={() => router.push('/onboarding/business')}>
          Create Business
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Create a Reel</h1>
          <p className="mt-1 text-neutral-500">
            Upload a few raw clips. Mitra turns them into a ready-to-post Reel.
          </p>
        </div>
        {step === 'goal' && (
          <BusinessSelector
            businesses={businesses}
            selectedBusinessId={selectedBusinessId}
            onSelect={setSelectedBusinessId}
          />
        )}
      </div>

      <WizardStepper current={step} />

      {step === 'goal' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-neutral-900">What&apos;s this Reel about?</h2>
          <ReelGoalSelector value={goal} onChange={setGoal} />
          <div className="flex justify-end">
            <Button disabled={!goal || !selectedBusinessId} onClick={() => setStep('style')}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'style' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-neutral-900">Pick a style</h2>
          <ReelStyleSelector value={style} onChange={setStyle} />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('goal')}>
              Back
            </Button>
            <Button disabled={!style} onClick={() => setStep('template')}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'template' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-neutral-900">Choose a reel template</h2>
          <p className="text-sm text-neutral-500">
            Mitra uses the selected template to shape the story and shot plan for this reel.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {loadingTemplates && <p className="text-sm text-neutral-500">Loading templates...</p>}
            {!loadingTemplates && templates.length === 0 && (
              <p className="text-sm text-neutral-500">
                No reel templates available for this business.
              </p>
            )}
            {templates.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTemplateId(item.id)}
                aria-pressed={templateId === item.id}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  templateId === item.id
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                <p className="font-medium text-neutral-900">{item.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-900">Select a product</h3>
              {products.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">
                  No products found for this business yet.
                </p>
              ) : (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {products.map((product) => (
                    <button
                      key={product.productId}
                      type="button"
                      onClick={() => setSelectedProductId(product.productId)}
                      aria-pressed={selectedProductId === product.productId}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selectedProductId === product.productId
                          ? 'border-brand-600 bg-brand-50'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <p className="font-medium text-neutral-900">{product.name}</p>
                      <p className="mt-1 text-sm text-neutral-500">
                        ₹{product.price.toLocaleString('en-IN')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <SavedStylePicker
            businessId={selectedBusinessId}
            value={savedStyleId}
            onChange={setSavedStyleId}
          />

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('style')}>
              Back
            </Button>
            <Button
              disabled={!style || !templateId || !selectedProductId}
              onClick={() => setStep('duration')}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'duration' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-neutral-900">Choose a duration</h2>
          <ReelDurationSelector value={durationSeconds} onChange={setDurationSeconds} />

          <div className="space-y-4 pt-4">
            <Input
              label="Offer (optional)"
              placeholder="e.g. 20% off this weekend"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
            />
            <Input
              label="Call to action (optional)"
              placeholder="e.g. Order now on WhatsApp"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
            />
            <Input
              label="Anything else Mitra should know? (optional)"
              placeholder="e.g. Highlight our new outdoor seating"
              value={additionalMessage}
              onChange={(e) => setAdditionalMessage(e.target.value)}
            />
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('template')}>
              Back
            </Button>
            <Button
              loading={creatingProject}
              disabled={creatingProject}
              onClick={() => void handleProceedToUpload()}
            >
              Next: Upload Clips
            </Button>
          </div>
        </div>
      )}

      {step === 'upload' && reelId && selectedBusinessId && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-neutral-900">Upload your raw clips</h2>
          <p className="text-sm text-neutral-500">
            Upload {REEL_MIN_CLIPS}-10 short clips from your phone. Mitra will pick the best moments
            automatically.
          </p>
          <ReelClipUploader
            businessId={selectedBusinessId}
            reelId={reelId}
            clips={clips}
            onClipsChange={setClips}
          />
          <div className="flex justify-end">
            <MagneticWrap strength={5}>
              <Button
                loading={startingGeneration}
                disabled={!canGenerate || startingGeneration}
                onClick={() => void handleGenerate()}
              >
                Generate Reel
              </Button>
            </MagneticWrap>
          </div>
        </div>
      )}

      {step === 'generating' && reelId && (
        <ReelGenerationProgress
          reelId={reelId}
          initialReel={reel}
          onCompleted={handleCompleted}
          onRetry={() => void handleGenerate()}
        />
      )}

      {step === 'preview' && reel && <ReelPreview reel={reel} onCreateAnother={resetWizard} />}
    </div>
  );
}
