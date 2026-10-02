import type {
  BetaBusinessProfile,
  BetaFrictionLog,
  BetaCohortSummary,
  ResolutionStatus,
} from '@/types/beta';

export const INITIAL_BETA_COHORT: BetaBusinessProfile[] = [
  {
    betaId: 'beta_biz_01',
    businessId: 'biz_hyderabad_biryani_house',
    businessName: 'Hyderabad Biryani House',
    vertical: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Madhapur' },
    primaryContact: {
      name: 'Ramesh Reddy',
      email: 'ramesh@hyderabadbiryani.test',
      phone: '+91 98765 43210',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: true,
      instagramHandle: '@hyderabadbiryanihouse',
    },
    onboardingCompleted: true,
    campaignsCount: 3,
    publishedCount: 2,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-01',
    betaStatus: 'completed',
    notes:
      'Active social presence; successfully published weekend offer and special thali campaigns.',
  },
  {
    betaId: 'beta_biz_02',
    businessId: 'biz_spicy_tandoor_kitchen',
    businessName: 'Spicy Tandoor Cloud Kitchen',
    vertical: 'cloud_kitchen',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli' },
    primaryContact: {
      name: 'Anish Verma',
      email: 'anish@spicytandoor.test',
      phone: '+91 98765 43211',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: true,
      instagramHandle: '@spicytandoor_hyd',
    },
    onboardingCompleted: true,
    campaignsCount: 2,
    publishedCount: 1,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-03',
    betaStatus: 'active_campaign_2',
    notes: 'Cloud kitchen targeting IT corridor professionals; uses English & Telugu mixing.',
  },
  {
    betaId: 'beta_biz_03',
    businessId: 'biz_cafe_jubilee',
    businessName: 'Cafe Jubilee & Artisanal Bakery',
    vertical: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Jubilee Hills' },
    primaryContact: {
      name: 'Priya Sharma',
      email: 'priya@cafejubilee.test',
      phone: '+91 98765 43212',
      preferredChannel: 'email',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: false,
      instagramHandle: '@cafejubileehills',
    },
    onboardingCompleted: true,
    campaignsCount: 2,
    publishedCount: 1,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-05',
    betaStatus: 'published_1',
    notes: 'Premium continental breakfast & dessert promotions; strong visual focus.',
  },
  {
    betaId: 'beta_biz_04',
    businessId: 'biz_kebabs_and_more',
    businessName: 'Kebabs & More Grill House',
    vertical: 'restaurant',
    location: { city: 'Bangalore', state: 'Karnataka', locality: 'Koramangala' },
    primaryContact: {
      name: 'Vikram Rao',
      email: 'vikram@kebabsandmore.test',
      phone: '+91 98765 43213',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: true,
      instagramHandle: '@kebabsandmore_blr',
    },
    onboardingCompleted: true,
    campaignsCount: 1,
    publishedCount: 1,
    secondCampaignCompleted: false,
    betaStartDate: '2026-09-10',
    betaStatus: 'active_campaign_1',
    notes: 'Focused on weekend family dining platter promotions.',
  },
  {
    betaId: 'beta_biz_05',
    businessId: 'biz_deccan_bowl_express',
    businessName: 'Deccan Bowl Express',
    vertical: 'cloud_kitchen',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Hitec City' },
    primaryContact: {
      name: 'Suresh Kumar',
      email: 'suresh@deccanbowl.test',
      phone: '+91 98765 43214',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: false,
      instagramHandle: '@deccanbowlexpress',
    },
    onboardingCompleted: true,
    campaignsCount: 2,
    publishedCount: 2,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-12',
    betaStatus: 'completed',
    notes: 'Fast-casual lunch bowl subscriptions for corporate workers.',
  },
  {
    betaId: 'beta_biz_06',
    businessId: 'biz_royal_bawarchi',
    businessName: 'Royal Bawarchi Family Dining',
    vertical: 'restaurant',
    location: { city: 'Hyderabad', state: 'Telangana', locality: 'Kukatpally' },
    primaryContact: {
      name: 'Mohd Ibrahim',
      email: 'ibrahim@royalbawarchi.test',
      phone: '+91 98765 43215',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: false,
      facebookConnected: true,
      instagramHandle: undefined,
    },
    onboardingCompleted: true,
    campaignsCount: 1,
    publishedCount: 0,
    secondCampaignCompleted: false,
    betaStartDate: '2026-09-15',
    betaStatus: 'onboarding',
    notes: 'Limited social experience; founder assistance required for Meta connection.',
  },
  {
    betaId: 'beta_biz_07',
    businessId: 'biz_south_spice_canteen',
    businessName: 'South Spice Canteen',
    vertical: 'restaurant',
    location: { city: 'Chennai', state: 'Tamil Nadu', locality: 'T. Nagar' },
    primaryContact: {
      name: 'Karthik Raja',
      email: 'karthik@southspice.test',
      phone: '+91 98765 43216',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: true,
      instagramHandle: '@southspicecanteen',
    },
    onboardingCompleted: true,
    campaignsCount: 2,
    publishedCount: 1,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-18',
    betaStatus: 'active_campaign_2',
    notes: 'Authentic South Indian breakfast combos & evening snack offers.',
  },
  {
    betaId: 'beta_biz_08',
    businessId: 'biz_wok_n_roll_express',
    businessName: 'Wok & Roll Asian Kitchen',
    vertical: 'cloud_kitchen',
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    primaryContact: {
      name: 'Neha Mehta',
      email: 'neha@woknroll.test',
      phone: '+91 98765 43217',
      preferredChannel: 'whatsapp',
    },
    socialPresence: {
      instagramConnected: true,
      facebookConnected: true,
      instagramHandle: '@woknrollmumbai',
    },
    onboardingCompleted: true,
    campaignsCount: 2,
    publishedCount: 2,
    secondCampaignCompleted: true,
    betaStartDate: '2026-09-20',
    betaStatus: 'completed',
    notes: 'Late-night delivery bowls and bento box promotions.',
  },
];

export const INITIAL_FRICTION_LOGS: BetaFrictionLog[] = [
  {
    logId: 'flog_101',
    businessId: 'biz_royal_bawarchi',
    businessName: 'Royal Bawarchi Family Dining',
    date: '2026-09-15',
    workflowStage: 'meta_connection',
    issueType: 'CONFUSION',
    severity: 'P2',
    userQuote: 'Where do I find my Facebook Page admin role in Meta Business Suite?',
    founderIntervention: true,
    description:
      'User struggled to navigate Meta permissions to select the correct Page during OAuth.',
    resolutionStatus: 'resolved',
  },
  {
    logId: 'flog_102',
    businessId: 'biz_spicy_tandoor_kitchen',
    businessName: 'Spicy Tandoor Cloud Kitchen',
    date: '2026-09-04',
    workflowStage: 'billing',
    issueType: 'UX_FRICTION',
    severity: 'P2',
    userQuote: 'Do I get charged credits when I change a scheduled post time?',
    founderIntervention: false,
    description:
      'User expressed concern about whether rescheduling consumes credits. Verified zero credit cost for scheduling/rescheduling.',
    resolutionStatus: 'resolved',
  },
  {
    logId: 'flog_103',
    businessId: 'biz_cafe_jubilee',
    businessName: 'Cafe Jubilee & Artisanal Bakery',
    date: '2026-09-06',
    workflowStage: 'campaign_generation',
    issueType: 'CONTENT_QUALITY',
    severity: 'P3',
    userQuote: 'The caption sounds a bit too formal for our hipster bakery vibe.',
    founderIntervention: false,
    description:
      'User requested regeneration with brand tone set to "friendly & casual". Resolved via tone adjustment in Business Brain.',
    resolutionStatus: 'resolved',
  },
  {
    logId: 'flog_104',
    businessId: 'biz_hyderabad_biryani_house',
    businessName: 'Hyderabad Biryani House',
    date: '2026-09-02',
    workflowStage: 'publishing',
    issueType: 'CONFUSION',
    severity: 'P2',
    userQuote: 'Did it publish to both Instagram and Facebook or just Instagram?',
    founderIntervention: true,
    description:
      'User sought explicit confirmation of multi-platform post status on the Publishing Dashboard.',
    resolutionStatus: 'resolved',
  },
  {
    logId: 'flog_105',
    businessId: 'biz_south_spice_canteen',
    businessName: 'South Spice Canteen',
    date: '2026-09-19',
    workflowStage: 'performance',
    issueType: 'CONFUSION',
    severity: 'P3',
    userQuote: 'Why are impressions showing dashes right after publishing?',
    founderIntervention: false,
    description:
      'User checked performance 5 minutes after publishing. Clarified Meta API sync latency of ~1 hour.',
    resolutionStatus: 'resolved',
  },
];

let inMemoryFrictionLogs = [...INITIAL_FRICTION_LOGS];

export const betaService = {
  getCohortSummary(): BetaCohortSummary {
    const total = INITIAL_BETA_COHORT.length;
    const activated = INITIAL_BETA_COHORT.filter((b) => b.campaignsCount > 0).length;
    const published = INITIAL_BETA_COHORT.filter((b) => b.publishedCount > 0).length;
    const returning = INITIAL_BETA_COHORT.filter((b) => b.secondCampaignCompleted).length;
    const totalCampaigns = INITIAL_BETA_COHORT.reduce((acc, b) => acc + b.campaignsCount, 0);
    const totalPublished = INITIAL_BETA_COHORT.reduce((acc, b) => acc + b.publishedCount, 0);
    const p0 = inMemoryFrictionLogs.filter(
      (l) => l.severity === 'P0' && l.resolutionStatus === 'open'
    ).length;
    const p1 = inMemoryFrictionLogs.filter(
      (l) => l.severity === 'P1' && l.resolutionStatus === 'open'
    ).length;

    return {
      totalBusinesses: total,
      activatedCount: activated,
      publishedCount: published,
      returningSecondCampaignCount: returning,
      totalCampaignsGenerated: totalCampaigns,
      totalCampaignsPublished: totalPublished,
      p0Blockers: p0,
      p1Blockers: p1,
    };
  },

  listCohortBusinesses(): BetaBusinessProfile[] {
    return INITIAL_BETA_COHORT;
  },

  listFrictionLogs(): BetaFrictionLog[] {
    return inMemoryFrictionLogs;
  },

  logFrictionIssue(log: BetaFrictionLog): void {
    inMemoryFrictionLogs = [log, ...inMemoryFrictionLogs];
  },

  updateFrictionResolution(logId: string, status: ResolutionStatus): void {
    inMemoryFrictionLogs = inMemoryFrictionLogs.map((log) =>
      log.logId === logId ? { ...log, resolutionStatus: status } : log
    );
  },
};
