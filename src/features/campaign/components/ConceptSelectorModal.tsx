'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export interface ConceptRoute {
  id: string;
  title: string;
  badge: string;
  hook: string;
  copyAngle: string;
  visualDirection: string;
  reasoning: string;
  offerAngle: string;
}

export interface SelectedConcept {
  routeId: string;
  title: string;
  hook: string;
  copyAngle: string;
  visualDirection: string;
  reasoning: string;
}

const DEFAULT_ROUTES: ConceptRoute[] = [
  {
    id: 'route-1',
    title: 'Direct Solution & Clear Value',
    badge: 'High Conversion',
    hook: 'Struggling to find [Product/Service] that actually works?',
    copyAngle: 'Focus on immediate benefit, transparent pricing, and instant availability.',
    visualDirection: 'Clean product hero shot with bold high-contrast headline overlay.',
    reasoning:
      'Reduces cognitive load for ready-to-buy customers by putting value front and center.',
    offerAngle: 'Featured Item + Special Welcome Discount',
  },
  {
    id: 'route-2',
    title: 'Social Proof & Local Relatability',
    badge: 'Trust Builder',
    hook: 'Why locals in [City] are choosing this [Product/Service]...',
    copyAngle: 'Emphasize real customer satisfaction, community trust, and verified facts.',
    visualDirection: 'Natural lifestyle photo showing real usage and authentic community vibe.',
    reasoning: 'Builds strong social validation for first-time buyers seeking reassurance.',
    offerAngle: 'Exclusive Local First-Timer Perk',
  },
  {
    id: 'route-3',
    title: 'Curiosity & Pattern Interrupt',
    badge: 'High Engagement',
    hook: 'The one mistake people make when ordering [Product/Service]...',
    copyAngle: 'Hook with an unexpected insight before revealing the perfect recommendation.',
    visualDirection: 'Dynamic split-screen or carousel showing transformation before/after.',
    reasoning: 'Captures fast-scrolling feed attention with an intriguing question.',
    offerAngle: 'Limited-Time Bonus Add-On',
  },
];

interface ConceptSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  sessionId?: string | null;
  onSelectConcept: (concept: SelectedConcept) => void;
}

export function ConceptSelectorModal({
  isOpen,
  onClose,
  businessId,
  sessionId,
  onSelectConcept,
}: ConceptSelectorModalProps) {
  const { showToast } = useToast();
  const [routes, setRoutes] = useState<ConceptRoute[]>(DEFAULT_ROUTES);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-1');
  const [isExploring, setIsExploring] = useState(false);

  if (!isOpen) return null;

  const handleExploreMore = async () => {
    setIsExploring(true);
    try {
      if (sessionId) {
        const response = await callFunction<any, any>({
          functionName: 'exploreCreativeDirectionEndpoint',
          data: {
            businessId,
            sessionId,
            confirmationId: `conf_${Date.now()}`,
            revision: 1,
            idempotencyKey: `idemp_${Date.now()}`,
          },
        });
        if (response?.directions?.length > 0) {
          const newRoutes: ConceptRoute[] = response.directions
            .slice(0, 3)
            .map((d: any, i: number) => ({
              id: d.id || `route-${i + 1}`,
              title: d.title || `Strategic Route ${i + 1}`,
              badge: d.category || 'Alternative Route',
              hook: d.hook || 'Alternative Hook Pattern',
              copyAngle: d.copyAngle || 'Alternative copy positioning',
              visualDirection: d.visualStyle || 'Adaptive visual composition',
              reasoning: d.rationale || 'Alternative strategic positioning',
              offerAngle: d.offerStructure || 'Standard Business Offer',
            }));
          setRoutes(newRoutes);
          setSelectedRouteId(newRoutes[0]?.id || 'route-1');
          showToast('Generated alternative creative routes!', 'success');
          setIsExploring(false);
          return;
        }
      }

      // Fallback mix shuffle if no live server response
      const shuffled = [...DEFAULT_ROUTES].reverse().map((r, i) => ({
        ...r,
        id: `route-alt-${i + 1}`,
        title:
          i === 0
            ? 'Seasonal Urgency Angle'
            : i === 1
              ? 'Expert Recommendation'
              : 'Unbeatable Convenience',
      }));
      setRoutes(shuffled);
      setSelectedRouteId(shuffled[0]!.id);
      showToast('Refreshed creative concept options!', 'info');
    } catch (err) {
      console.error('Failed to explore alternative directions:', err);
      showToast('Could not load alternatives. Using client routing.', 'error');
    } finally {
      setIsExploring(false);
    }
  };

  const currentSelected = routes.find((r) => r.id === selectedRouteId) || routes[0]!;

  const handleConfirmSelection = () => {
    onSelectConcept({
      routeId: currentSelected.id,
      title: currentSelected.title,
      hook: currentSelected.hook,
      copyAngle: currentSelected.copyAngle,
      visualDirection: currentSelected.visualDirection,
      reasoning: currentSelected.reasoning,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Select Strategic Creative Concept
                </h2>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Mitra Creative Brain developed 3 distinct strategic angles for your business. Choose
                one or request alternative mixes.
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Route Options Grid */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {routes.map((route) => {
              const isSelected = route.id === selectedRouteId;
              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40'
                      : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                      {route.badge}
                    </span>
                    <input
                      type="radio"
                      name="concept-route"
                      checked={isSelected}
                      onChange={() => setSelectedRouteId(route.id)}
                      className="accent-amber-500"
                    />
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-white">{route.title}</h3>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-slate-400">Hook: </span>
                      <p className="mt-0.5 text-slate-200 italic">"{route.hook}"</p>
                    </div>

                    <div>
                      <span className="font-medium text-slate-400">Visual Style: </span>
                      <p className="mt-0.5 text-slate-300">{route.visualDirection}</p>
                    </div>

                    <div>
                      <span className="font-medium text-slate-400">Strategic Reasoning: </span>
                      <p className="mt-0.5 text-slate-400">{route.reasoning}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Detail Summary Card */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
            <h4 className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              Selected Direction Details
            </h4>
            <div className="mt-2 grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
              <div>
                <span className="text-slate-400">Headline / Copy Angle:</span>
                <p className="mt-0.5 font-medium text-white">{currentSelected.copyAngle}</p>
              </div>
              <div>
                <span className="text-slate-400">Offer Structure:</span>
                <p className="mt-0.5 font-medium text-white">{currentSelected.offerAngle}</p>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExploreMore}
              disabled={isExploring}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              {isExploring ? 'Exploring Mixes...' : '🔄 Request Alternative Mixes'}
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSelection}
                className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
              >
                Approve Concept & Continue →
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
