'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { MitraMascot } from '@/components/ui/MitraMascot';

interface DemoPreset {
  id: string;
  name: string;
  category: string;
  photo: string;
  offer: string;
  location: string;
  creativeDirections: {
    craving: { title: string; caption: string; reelConcept: string; cta: string };
    offer: { title: string; caption: string; reelConcept: string; cta: string };
    local: { title: string; caption: string; reelConcept: string; cta: string };
  };
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'biryani',
    name: 'Hyderabad Biryani House',
    category: 'Restaurant',
    photo:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    offer: '₹299 Weekend Family Combo',
    location: 'Kondapur, Hyderabad',
    creativeDirections: {
      craving: {
        title: '01 — Craving Angle (Visual & Emotional)',
        caption:
          'Craving authentic Hyderabadi Dum Biryani this weekend? Savor rich aromatic spices, tender meat, and saffron rice delivered hot to your doorstep! 🍲✨',
        reelConcept:
          'Opening slow-mo pan of steam rising off freshly opened Dum Biryani pot, layered text: "Weekend plans sorted." Ends with WhatsApp ordering button.',
        cta: 'Order Now on WhatsApp',
      },
      offer: {
        title: '02 — Offer Angle (Direct Conversion)',
        caption:
          'Flat ₹299 Weekend Feast Combo! Get 1 Special Chicken Biryani + 1 Mirchi Ka Salan + 2 ThumsUp. Valid Friday to Sunday in Kondapur.',
        reelConcept:
          'Fast 3-cut reel: 1. Price tag slam ₹299, 2. Combo elements layout, 3. Customer smiling receiving parcel.',
        cta: 'Claim ₹299 Combo Deal',
      },
      local: {
        title: '03 — Local Angle (Community & Location)',
        caption:
          'Hey Kondapur & HITEC City! Skip the kitchen duty this Saturday. Kondapur’s favorite Dum Biryani spot has your weekend lunch ready.',
        reelConcept:
          'POV walking into Kondapur store, greeting staff, packing hot combo with local Telugu voiceover audio.',
        cta: 'Visit Us in Kondapur',
      },
    },
  },
  {
    id: 'salon',
    name: 'Glow Beauty Studio',
    category: 'Salon & Beauty',
    photo:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
    offer: 'Festive Glow Facial + Spa Package',
    location: 'Jubilee Hills, Hyderabad',
    creativeDirections: {
      craving: {
        title: '01 — Radiance Angle (Emotional Benefit)',
        caption:
          'Get skin that glows brighter than festive lights! Experience our signature Glass Skin Facial with organic botanical serums. ✨💆‍♀️',
        reelConcept:
          'Before & After split screen with smooth glowing skin transition and relaxing ambient music track.',
        cta: 'Book Glow Session',
      },
      offer: {
        title: '02 — Offer Angle (Festive Bundle)',
        caption:
          'Festive Special: Hair Spa + Hydra Facial Combo at just ₹1,499 (Save 35%). Limited slots available for this weekend!',
        reelConcept:
          'Text overlay counter "Only 12 slots left this Saturday" showing relaxing salon ambiance.',
        cta: 'Reserve Slot on WhatsApp',
      },
      local: {
        title: '03 — Local Angle (Jubilee Hills Community)',
        caption:
          'Jubilee Hills ladies — prep your festive look without waiting in long weekend queues. Private sanctuary booking now open.',
        reelConcept:
          'Behind the scenes tour of Jubilee Hills studio with customer testimonial quote.',
        cta: 'Get Directions & Book',
      },
    },
  },
  {
    id: 'realestate',
    name: 'Urban Height Properties',
    category: 'Real Estate',
    photo:
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
    offer: '2BHK Luxury Apartments from ₹65 Lakhs',
    location: 'Gachibowli, Hyderabad',
    creativeDirections: {
      craving: {
        title: '01 — Lifestyle Angle (Dream Home)',
        caption:
          'Imagine waking up to lush green balcony views just 5 minutes from your IT office. 2BHK luxury residences with clubhouse & pool. 🏙️🏡',
        reelConcept:
          'Cinematic drone shot of modern apartment facade panning into sunlit living room balcony view.',
        cta: 'Schedule Private Site Visit',
      },
      offer: {
        title: '02 — Value Angle (Zero GST Offer)',
        caption:
          'Exclusive Launch Offer: Pay 10% now & zero GST on bookings before Sunday! 2BHK starting ₹65 Lakhs in Gachibowli tech corridor.',
        reelConcept:
          'Stat overlay displaying EMI breakdown starting ₹38,000/mo vs current rent comparison.',
        cta: 'Download Price Sheet',
      },
      local: {
        title: '03 — Local Angle (IT Corridor Proximity)',
        caption:
          'Work in Gachibowli or Financial District? Cut your daily commute to 5 mins. Move into Gachibowli’s newest gated community.',
        reelConcept:
          'Map animation showing 3-minute commute from Financial District to apartment gates.',
        cta: 'WhatsApp Us for Floor Plans',
      },
    },
  },
];

export function LiveMitraDemo({ onGetStarted }: { onGetStarted: () => void }) {
  const reduceMotion = useReducedMotion();
  const [selectedPresetId, setSelectedPresetId] = useState<string>('biryani');
  const [activeAngle, setActiveAngle] = useState<'craving' | 'offer' | 'local'>('craving');
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [workStep, setWorkStep] = useState<string>('');

  const currentPreset = DEMO_PRESETS.find((p) => p.id === selectedPresetId) || DEMO_PRESETS[0]!;

  const handleRunDemo = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsWorking(true);
    setWorkStep('Reading business context & offer...');

    setTimeout(() => {
      setWorkStep('Designing localized creative & reel concepts...');
    }, 600);

    setTimeout(() => {
      setWorkStep('Generating multi-angle campaign directions...');
    }, 1200);

    setTimeout(() => {
      setIsWorking(false);
    }, 1800);
  };

  const currentContent = currentPreset.creativeDirections[activeAngle];

  return (
    <section
      id="demo"
      className="bg-surface/50 border-border-light relative overflow-hidden border-y py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <div className="border-brand-500/20 bg-brand-50 text-brand-600 mb-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-bold">
            <span>✨ Interactive Product Demo</span>
          </div>
          <h2 className="text-text-primary text-2xl font-extrabold tracking-tight sm:text-4xl">
            See how Mitra turns your input into a complete campaign
          </h2>
          <p className="text-text-secondary mt-3 text-sm sm:text-base">
            Select an industry below to see how Mitra takes a photo and an offer to build
            multi-format, ready-to-use campaigns.
          </p>
        </div>

        {/* Industry Selector Tabs */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {DEMO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleRunDemo(preset.id)}
              className={`cursor-pointer rounded-full px-4 py-2.5 text-xs font-bold transition-all sm:text-sm ${
                selectedPresetId === preset.id
                  ? 'bg-brand-500 shadow-brand-500/20 text-white shadow-md'
                  : 'bg-surface border-border-medium text-text-secondary hover:border-brand-500 border'
              }`}
            >
              {preset.category} ({preset.name})
            </button>
          ))}
        </div>

        {/* Demo Stage Container */}
        <div className="bg-surface border-border-light grid grid-cols-1 items-center gap-8 rounded-3xl border p-6 shadow-xl sm:p-8 lg:grid-cols-12">
          {/* Left Column: Input Card */}
          <div className="space-y-4 lg:col-span-4">
            <div className="text-brand-600 text-xs font-bold tracking-wider uppercase">
              INPUT — Business Photo & Offer
            </div>

            <div className="border-border-light group relative overflow-hidden rounded-2xl border shadow-sm">
              <img
                src={currentPreset.photo}
                alt={currentPreset.name}
                className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-56"
              />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
                <span className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">
                  {currentPreset.location}
                </span>
                <span className="text-base font-bold">{currentPreset.name}</span>
              </div>
            </div>

            <div className="bg-bg-secondary border-border-light space-y-2 rounded-2xl border p-4">
              <div className="text-text-tertiary flex items-center justify-between text-xs font-semibold">
                <span>Promotional Offer:</span>
                <span className="text-brand-600 font-bold">Active</span>
              </div>
              <p className="text-text-primary text-sm font-bold">{currentPreset.offer}</p>
            </div>

            <Button
              onClick={() => handleRunDemo(currentPreset.id)}
              disabled={isWorking}
              variant="secondary"
              className="border-brand-500/30 text-brand-600 hover:bg-brand-50 w-full rounded-xl border py-3 text-xs font-bold"
            >
              {isWorking ? 'Mitra is Working...' : '🔄 Re-generate Live Demo'}
            </Button>
          </div>

          {/* Center Column: Mascot Engine Status */}
          <div className="flex flex-col items-center justify-center py-4 text-center lg:col-span-2">
            <div className="relative my-2">
              <MitraMascot pose={isWorking ? 'working' : 'presenting'} size="md" glow animated />
            </div>
            {isWorking ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-brand-600 mt-2 animate-pulse text-xs font-bold"
              >
                {workStep}
              </motion.div>
            ) : (
              <span className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
                Campaign Generated!
              </span>
            )}
          </div>

          {/* Right Column: Output Creative Directions */}
          <div className="space-y-4 lg:col-span-6">
            <div className="flex items-center justify-between">
              <div className="text-brand-600 text-xs font-bold tracking-wider uppercase">
                OUTPUT — 3 Creative Angles
              </div>
              <span className="text-text-tertiary text-xs">Select angle to preview</span>
            </div>

            {/* Creative Angle Selector Pills */}
            <div className="grid grid-cols-3 gap-2">
              {(['craving', 'offer', 'local'] as const).map((angleKey) => (
                <button
                  key={angleKey}
                  onClick={() => setActiveAngle(angleKey)}
                  className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-bold capitalize transition-all ${
                    activeAngle === angleKey
                      ? 'bg-brand-500 text-white shadow-xs'
                      : 'bg-bg-secondary border-border-light text-text-secondary hover:text-text-primary border'
                  }`}
                >
                  {angleKey === 'craving'
                    ? '01 Craving'
                    : angleKey === 'offer'
                      ? '02 Offer'
                      : '03 Local'}
                </button>
              ))}
            </div>

            {/* Selected Angle Preview Box */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeAngle + selectedPresetId + (isWorking ? 'w' : 'd')}
                initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-bg-primary border-border-light space-y-3 rounded-2xl border p-5 shadow-xs"
              >
                <h4 className="text-text-primary text-sm font-bold">{currentContent.title}</h4>

                <div className="space-y-1">
                  <span className="text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                    Instagram Caption & Copy:
                  </span>
                  <p className="text-text-secondary bg-surface border-border-light rounded-xl border p-3 text-xs leading-relaxed">
                    {currentContent.caption}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-text-tertiary text-[10px] font-bold tracking-wider uppercase">
                    Reel Concept & Script:
                  </span>
                  <p className="text-text-secondary bg-surface border-border-light rounded-xl border p-3 text-xs leading-relaxed italic">
                    🎬 {currentContent.reelConcept}
                  </p>
                </div>

                <div className="border-border-light flex items-center justify-between border-t pt-2">
                  <span className="text-brand-600 text-xs font-semibold">
                    CTA: {currentContent.cta}
                  </span>
                  <Button
                    size="sm"
                    onClick={onGetStarted}
                    className="bg-brand-500 hover:bg-brand-600 cursor-pointer rounded-full px-5 py-2 text-xs font-bold text-white"
                  >
                    Create This Campaign →
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
