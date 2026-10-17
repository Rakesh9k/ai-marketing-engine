/**
 * The first-value journey, derived ONLY from facts that are already saved (business, campaigns). Nothing here
 * writes anything or charges anything; it describes where the owner is and what the one next action is.
 *
 * Sequence (the guided first campaign):
 *   1 Set up your business (saved once in Business Brain; never asked again)
 *   2 Create your first campaign: say what to promote, review what Mitra understood, correct it, then generate.
 *     Reviewing is free; credits are used only when the owner presses Generate.
 *   3 See what was created and how to use it (download, copy, share)
 *   4 Make a second campaign (reusing the same business facts)
 */
export interface JourneyFacts {
  hasBusiness: boolean;
  /** Campaigns this owner has started for the selected business. */
  campaignCount: number;
  /** At least one campaign that finished and produced something usable. */
  hasFinishedCampaign: boolean;
}

export type JourneyStepStatus = 'done' | 'current' | 'upcoming';

export interface JourneyStep {
  id: 'business' | 'first_campaign' | 'use_it' | 'second_campaign';
  title: string;
  detail: string;
  status: JourneyStepStatus;
}

export interface Journey {
  steps: JourneyStep[];
  /** Null once every step is done. */
  next: { label: string; href: string } | null;
  allDone: boolean;
}

export function deriveJourney(facts: JourneyFacts): Journey {
  const done = {
    business: facts.hasBusiness,
    first_campaign: facts.hasBusiness && facts.campaignCount >= 1,
    use_it: facts.hasFinishedCampaign,
    second_campaign: facts.campaignCount >= 2,
  };
  const defs: Omit<JourneyStep, 'status'>[] = [
    {
      id: 'business',
      title: 'Tell Mitra about your business',
      detail: 'Saved once in your Business Brain, so you are not asked again.',
    },
    {
      id: 'first_campaign',
      title: 'Create your first campaign',
      detail: 'Say what you want to promote, check what Mitra understood, then generate.',
    },
    {
      id: 'use_it',
      title: 'Use what Mitra made',
      detail: 'Download the images, copy the captions, share on WhatsApp yourself.',
    },
    {
      id: 'second_campaign',
      title: 'Make your next campaign',
      detail: 'It starts from the same business facts, so it is quicker.',
    },
  ];
  let currentAssigned = false;
  const steps: JourneyStep[] = defs.map((d) => {
    if (done[d.id]) return { ...d, status: 'done' };
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...d, status: 'current' };
    }
    return { ...d, status: 'upcoming' };
  });
  const current = steps.find((s) => s.status === 'current');
  const next = !current
    ? null
    : current.id === 'business'
      ? { label: 'Set up your business', href: '/onboarding' }
      : current.id === 'use_it'
        ? { label: 'Open your campaign', href: '/campaigns' }
        : {
            label:
              current.id === 'first_campaign'
                ? 'Create your first campaign'
                : 'Create another campaign',
            href: '/campaigns/new',
          };
  return { steps, next, allDone: current === undefined };
}
