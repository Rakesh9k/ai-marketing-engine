/**
 * Phase 28 — Real Estate Creative Mechanisms (V1 Core Library)
 */

import type { CreativeMechanism } from '../bank.types';

export const REAL_ESTATE_MECHANISMS: CreativeMechanism[] = [
  {
    id: 'mech_future_self_real_estate',
    name: 'Future Self & Home Projection',
    version: '1.0.0',
    category: ['EMOTION', 'IDENTITY', 'STORY'],
    strategicDescription:
      'Invites prospective buyers to picture their daily life, morning coffee, and milestone moments inside the property.',
    psychologicalBasis:
      'Mental simulation and emotional ownership pre-attachment.',
    humanTensionResolved:
      'Viewing a property as an abstract architectural listing rather than a living home.',
    whyAudienceCares:
      'Buying a house is an emotional life-stage decision.',
    creativeChanges:
      'Replaces sterile room spec dimensions with lifestyle storytelling.',
    whenAppropriate:
      'Residential home listings, family suburban homes, luxury penthouses.',
    whenToAvoid:
      'Distressed teardown land sales or raw commercial warehouse space.',
    trigger: 'Desire to upgrade life stage and home environment.',
    desiredEmotionalResponse: ['Belonging', 'Aspiration', 'Excitement'],
    applicableIndustries: ['real_estate'],
    compatibleSubIndustries: ['residential_sales', 'luxury_homes', 'new_developments'],
    compatibleAudienceSituations: ['first_time_buyer', 'upsizing_family', 'relocating'],
    compatibleOfferRoles: ['featured_listing', 'open_house'],
    hookDirections: [
      'Imagine drinking your morning coffee with this sunrise view.',
      'This isn\'t just a kitchen — it\'s where Sunday morning family pancakes happen.',
      'Welcome to your next chapter in Oakridge.'
    ],
    visualDirections: [
      'Sun-drenched living room with cozy furniture and wide garden windows.',
      'Cinematic walkthrough video panning from sunroom to back patio.'
    ],
    storyDirections: ['Built for making memories: 4 bedrooms, peaceful cul-de-sac, top schools.'],
    copyDirections: [
      'Step into a home designed for effortless living and entertaining. Schedule your private tour.'
    ],
    proofTypes: ['lifestyle_video_walkthrough', 'neighborhood_vibe_photos'],
    ctaPatterns: ['Schedule Private Tour', 'View Photo Gallery'],
    strengths: ['Drives emotional attachment before physical tour'],
    risks: ['Must match actual property condition'],
    antiPatterns: ['Staging cold empty room photos without warm lighting'],
    status: 'active'
  },
  {
    id: 'mech_lifestyle_projection',
    name: 'Lifestyle Projection',
    version: '1.0.0',
    category: ['IDENTITY', 'LOCAL'],
    strategicDescription:
      'Highlights the surrounding neighborhood amenities (walkability, cafes, parks, culture) as part of the home offer.',
    psychologicalBasis:
      'Contextual extended self identity.',
    humanTensionResolved:
      'Uncertainty about neighborhood culture and daily conveniences.',
    whyAudienceCares:
      'You buy the neighborhood just as much as the house.',
    creativeChanges:
      'Combines interior home features with neighborhood lifestyle footage.',
    whenAppropriate:
      'Urban condos, walkable suburban pockets, resort-style communities.',
    whenToAvoid:
      'Isolated rural property sales where amenities are far away.',
    trigger: 'Desire for specific daily lifestyle (walkable, active, quiet).',
    desiredEmotionalResponse: ['Excitement', 'Belonging', 'Desire'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['urban_professional', 'active_retiree', 'relocating'],
    compatibleOfferRoles: ['location_spotlight', 'condo_listing'],
    hookDirections: [
      'Walk to your favorite coffee shop in 3 minutes.',
      'Live steps away from the best trails and downtown dining.'
    ],
    visualDirections: ['Quick montage: sunrise home view -> local cafe -> neighborhood park.'],
    storyDirections: ['Everything your family needs is right outside your front door.'],
    copyDirections: ['Prime location with a 92 WalkScore. Experience urban living at its best.'],
    proofTypes: ['walk_score_map', 'neighborhood_amenity_guide'],
    ctaPatterns: ['Explore Neighborhood', 'Book Property Visit'],
    strengths: ['Differentiates listings in competitive markets'],
    risks: ['Claims about neighborhood must be accurate'],
    antiPatterns: ['Only showing house interior and zero surroundings'],
    status: 'active'
  },
  {
    id: 'mech_location_story',
    name: 'Location & School Story',
    version: '1.0.0',
    category: ['PROOF', 'LOCAL'],
    strategicDescription:
      'Focuses on school district ratings, safety metrics, and community stability for family buyers.',
    psychologicalBasis:
      'Security motivation and long-term asset protection.',
    humanTensionResolved:
      'Anxiety over family safety and educational quality for children.',
    whyAudienceCares:
      'School district drives long-term home resale value.',
    creativeChanges:
      'Elevates school ratings and neighborhood longevity metrics.',
    whenAppropriate:
      'Suburban family homes, top-ranked school district areas.',
    whenToAvoid:
      'Downtown studio apartments targeted at young single professionals.',
    trigger: 'Parental concern for children\'s education and safety.',
    desiredEmotionalResponse: ['Security', 'Trust', 'Relief'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['family_with_kids', 'planning_a_family'],
    compatibleOfferRoles: ['family_home_special'],
    hookDirections: [
      'Located in the top-rated Lincoln School District.',
      'A quiet, tree-lined cul-de-sac where kids still play outside.'
    ],
    visualDirections: ['Clean suburban street view with green lawns and nearby elementary school.'],
    storyDirections: ['Safe, friendly neighborhood where neighbors know each other.'],
    copyDirections: ['10/10 school ratings, 5 minutes to parks, zero through-traffic.'],
    proofTypes: ['school_rating_badges', 'crime_rate_stats'],
    ctaPatterns: ['See School Ratings & Home Details', 'Schedule Tour'],
    strengths: ['High urgency for families moving before school term starts'],
    risks: ['Must comply with Fair Housing regulations'],
    antiPatterns: ['Violating fair housing guidelines in copy'],
    status: 'active'
  },
  {
    id: 'mech_decision_relief_real_estate',
    name: 'Real Estate Decision Relief',
    version: '1.0.0',
    category: ['AUDIENCE_TENSION', 'VALUE'],
    strategicDescription:
      'Simplifies complex home buying or selling processes into clear, manageable steps.',
    psychologicalBasis:
      'Cognitive load reduction during high-stress financial decisions.',
    humanTensionResolved:
      'Overwhelm and confusion from real estate terminology and paperwork.',
    whyAudienceCares:
      'Reduces anxiety associated with the biggest purchase of their life.',
    creativeChanges:
      'Replaces aggressive sales jargon with clear roadmap step guides.',
    whenAppropriate:
      'First-time homebuyer seminars, buyer representation, seller listings.',
    whenToAvoid:
      'Institutional investor transactions.',
    trigger: 'Confusion over mortgages, bidding, and home search steps.',
    desiredEmotionalResponse: ['Clarity', 'Relief', 'Confidence'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['first_time_buyer', 'stressed_seller'],
    compatibleOfferRoles: ['consultation_guide', 'buyer_agent'],
    hookDirections: [
      'Buying your first home doesn\'t have to feel overwhelming.',
      'Our 4-step guide to selling your home for top dollar stress-free.'
    ],
    visualDirections: ['Friendly agent presenting clear digital roadmap diagram.'],
    storyDirections: ['We guide you from pre-approval to keys in hand step by step.'],
    copyDirections: ['Download our free 2026 First-Time Homebuyer Roadmap today.'],
    proofTypes: ['process_infographic', 'client_relief_testimonials'],
    ctaPatterns: ['Download Free Buyer Guide', 'Book Free Buyer Consultation'],
    strengths: ['Generates high-intent leads earlier in buyer journey'],
    risks: ['Information must remain practical and up to date'],
    antiPatterns: ['Overcomplicating explanation with dense legalese'],
    status: 'active'
  },
  {
    id: 'mech_proof_stack_real_estate',
    name: 'Real Estate Proof Stack',
    version: '1.0.0',
    category: ['PROOF', 'VALUE'],
    strategicDescription:
      'Piles up market evidence (recent neighborhood sales, days on market, price per sq ft) to validate listing value.',
    psychologicalBasis:
      'Anchoring and objective verification bias.',
    humanTensionResolved:
      'Fear of overpaying for a home or underpricing a property.',
    whyAudienceCares:
      'Real estate requires analytical validation before committing.',
    creativeChanges:
      'Uses verified MLS market stats alongside property visuals.',
    whenAppropriate:
      'Seller market updates, price-adjusted listings, investment properties.',
    whenToAvoid:
      'Purely emotional luxury staging campaigns where numbers are secondary.',
    trigger: 'Analytical buyer/seller evaluating market price fairness.',
    desiredEmotionalResponse: ['Certainty', 'Confidence', 'Urgency'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['analytical_buyer', 'seller_evaluating_market'],
    compatibleOfferRoles: ['market_report', 'value_listing'],
    hookDirections: [
      'Priced $25k below recent neighborhood comps.',
      'Why homes in Maplewood sold in 6 days average last month.'
    ],
    visualDirections: ['Chart of recent neighborhood sales overlaid on property exterior shot.'],
    storyDirections: ['Transparent pricing based on exact 90-day neighborhood sale data.'],
    copyDirections: ['Explore full CMA report and comparable home sales data.'],
    proofTypes: ['cma_data_summary', 'days_on_market_stats'],
    ctaPatterns: ['Get Free Market Report', 'View Property Comps'],
    strengths: ['Resonates strongly with rational, analytical buyers'],
    risks: ['Requires accurate verified local market data'],
    antiPatterns: ['Cherry-picking misleading historical data'],
    status: 'active'
  },
  {
    id: 'mech_family_future_real_estate',
    name: 'Generational Family Future',
    version: '1.0.0',
    category: ['EMOTION', 'STORY'],
    strategicDescription:
      'Positions the home as a long-term anchor for family growth, holiday gatherings, and stability.',
    psychologicalBasis:
      'Generational legacy and nesting impulse.',
    humanTensionResolved:
      'Outgrowing temporary rental spaces and craving permanent roots.',
    whyAudienceCares:
      'Provides physical security and space for growing families.',
    creativeChanges:
      'Emphasizes backyard space, storage, expandable rooms, and sturdy build quality.',
    whenAppropriate:
      '4+ bedroom suburban listings, custom homes, large yard properties.',
    whenToAvoid:
      'Compact studio apartments.',
    trigger: 'Growing family needing room to expand.',
    desiredEmotionalResponse: ['Stability', 'Pride', 'Warmth'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['expanding_family', 'long_term_nesting'],
    compatibleOfferRoles: ['family_home'],
    hookDirections: [
      'A yard big enough for birthday parties, pets, and summer BBQs.',
      'Space for your family to grow over the next 20 years.'
    ],
    visualDirections: ['Large green backyard with patio set and sunlit play area.'],
    storyDirections: ['Designed for multi-generational comfort with ground-floor suite.'],
    copyDirections: ['5 bedrooms, huge backyard, and open family room for game nights.'],
    proofTypes: ['lot_size_diagram', 'family_living_space_tour'],
    ctaPatterns: ['Tour Family Home', 'See Floor Plan'],
    strengths: ['Strong high-intent buyer motivation'],
    risks: ['Focus on space must be backed up by actual footage'],
    antiPatterns: ['Wide-angle lens distortion that misrepresents room sizes'],
    status: 'active'
  },
  {
    id: 'mech_investment_logic',
    name: 'Investment & Equity Logic',
    version: '1.0.0',
    category: ['VALUE', 'BEHAVIOR'],
    strategicDescription:
      'Frames homeownership or property investment as a smart wealth-building decision over renting.',
    psychologicalBasis:
      'Loss aversion (stop throwing money away on rent) and wealth accumulation drive.',
    humanTensionResolved:
      'Frustration with paying someone else\'s mortgage through rent.',
    whyAudienceCares:
      'Real estate is a primary vehicle for building long-term equity.',
    creativeChanges:
      'Compares monthly rent payments to mortgage equity building.',
    whenAppropriate:
      'Starter homes, multi-family duplexes, investment condos.',
    whenToAvoid:
      'Ultra-luxury trophy properties buyable only in cash.',
    trigger: 'Rent inflation and desire for financial freedom.',
    desiredEmotionalResponse: ['Smart feeling', 'Ambition', 'Urgency'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['renter_to_buyer', 'investor_seeking_cashflow'],
    compatibleOfferRoles: ['starter_home', 'duplex_opportunity'],
    hookDirections: [
      'Stop paying 100% interest on your landlord\'s mortgage.',
      'Why buying this starter home costs less per month than renting downtown.'
    ],
    visualDirections: ['Side-by-side calculation graphic: Rent vs Equity over 5 years.'],
    storyDirections: ['Build your net worth while securing a home of your own.'],
    copyDirections: ['Estimated mortgage payment of $2,100/mo vs area average rent of $2,400/mo.'],
    proofTypes: ['mortgage_vs_rent_calculator', 'neighborhood_appreciation_graph'],
    ctaPatterns: ['Calculate Your Mortgage', 'Explore Starter Homes'],
    strengths: ['High conversion among long-term renters'],
    risks: ['Mortgage rates and calculations must be realistic'],
    antiPatterns: ['Ignoring property taxes and HOA fees in estimates'],
    status: 'active'
  },
  {
    id: 'mech_space_transformation',
    name: 'Space Transformation / Staging',
    version: '1.0.0',
    category: ['ATTENTION', 'PROOF'],
    strategicDescription:
      'Shows virtual or physical home staging transformations to reveal full spatial potential.',
    psychologicalBasis:
      'Visual completion effect — bridging the gap between empty shell and dream home.',
    humanTensionResolved:
      'Inability to visualize potential in empty or outdated rooms.',
    whyAudienceCares:
      'Helps buyers recognize hidden value in listings.',
    creativeChanges:
      'Features slider transitions between vacant/outdated space and professionally staged room.',
    whenAppropriate:
      'Vacant homes, outdated fixer-uppers, virtual staging listings.',
    whenToAvoid:
      'Already impeccably furnished model homes.',
    trigger: 'Unfurnished listing needing spatial clarity.',
    desiredEmotionalResponse: ['Inspiration', 'Vision', 'Surprise'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['fixer_upper_buyer', 'vacant_home_viewer'],
    compatibleOfferRoles: ['staged_listing', 'renovation_potential'],
    hookDirections: [
      'See what professional staging did for this vacant listing.',
      'From outdated 1980s kitchen to modern open-concept dream.'
    ],
    visualDirections: ['Interactive or video slider reveal from empty room to warm living space.'],
    storyDirections: ['Unlocking the full potential of every square foot.'],
    copyDirections: ['Virtually staged to show how effortlessly your furniture fits.'],
    proofTypes: ['staging_before_after', 'renovation_cost_estimate'],
    ctaPatterns: ['See Full Staged Gallery', 'Schedule Showing'],
    strengths: ['Drastically increases click-through rates on vacant listings'],
    risks: ['Must explicitly state if staging is virtual'],
    antiPatterns: ['Misrepresenting structural realities via CGI'],
    status: 'active'
  },
  {
    id: 'mech_comparison_clarity_real_estate',
    name: 'Listing Comparison Clarity',
    version: '1.0.0',
    category: ['VALUE', 'AUDIENCE_TENSION'],
    strategicDescription:
      'Provides a clean feature-by-feature comparison showing why this property outperforms competing area listings.',
    psychologicalBasis:
      'Direct contrast and dominant choice framing.',
    humanTensionResolved:
      'Exhaustion from touring 15 similar homes without a clear winner.',
    whyAudienceCares:
      'Streamlines property shortlisting.',
    creativeChanges:
      'Juxtaposes key upgrade features (garage, yard, renovated roof) against market averages.',
    whenAppropriate:
      'Feature-rich listings competing in dense subdivisions.',
    whenToAvoid:
      'Unique historic properties with no direct comps.',
    trigger: 'Buyer evaluating multiple homes in same neighborhood.',
    desiredEmotionalResponse: ['Clarity', 'Certainty', 'Decision readiness'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['shortlisting_homes', 'active_touring'],
    compatibleOfferRoles: ['standout_listing'],
    hookDirections: [
      'The only home under $500k in Pine Crest with a 3-car garage & pool.',
      'Compare this turn-key listing against other local options.'
    ],
    visualDirections: ['Checkmark comparison matrix highlighting premium upgrades.'],
    storyDirections: ['Renovated HVAC, new roof, and designer finishes already done for you.'],
    copyDirections: ['Move-in ready with $40k in recent owner upgrades included.'],
    proofTypes: ['upgrade_feature_list', 'inspector_report_highlights'],
    ctaPatterns: ['View Full Feature List', 'Schedule Tour'],
    strengths: ['Shortens buyer decision timeframe'],
    risks: ['Claims must be 100% accurate'],
    antiPatterns: ['Bashing competitor listings directly'],
    status: 'active'
  },
  {
    id: 'mech_trust_builder_agent',
    name: 'Agent Trust Builder & Track Record',
    version: '1.0.0',
    category: ['PROOF', 'IDENTITY'],
    strategicDescription:
      'Highlights the real estate agent\'s local track record, client reviews, and negotiation achievements.',
    psychologicalBasis:
      'Social proof and expert fiduciary representation trust.',
    humanTensionResolved:
      'Fear of hiring an inexperienced or lazy real estate agent.',
    whyAudienceCares:
      'Real estate transactions involve hundreds of thousands of dollars.',
    creativeChanges:
      'Replaces generic agent glamour shots with client success stories and closing stats.',
    whenAppropriate:
      'Agent personal branding, seller listing presentation ads, buyer representation campaigns.',
    whenToAvoid:
      'Property-specific listing ads where the house is the primary hero.',
    trigger: 'Homeowner searching for an agent to sell their home.',
    desiredEmotionalResponse: ['Trust', 'Confidence', 'Relief'],
    applicableIndustries: ['real_estate'],
    compatibleAudienceSituations: ['seeking_listing_agent', 'first_time_seller'],
    compatibleOfferRoles: ['agent_branding', 'free_home_valuation'],
    hookDirections: [
      'How we sold 34 local homes for an average of 103% of list price in 2025.',
      '"He saved us $18,000 during negotiations." — Verified Client Review'
    ],
    visualDirections: ['Agent standing warmly outside a recently sold home holding key.'],
    storyDirections: ['Over 15 years protecting homeowners\' equity in this community.'],
    copyDirections: ['Get a precise, zero-obligation home valuation from local top producer.'],
    proofTypes: ['recent_sales_map', 'client_video_reviews', 'avg_days_on_market_stats'],
    ctaPatterns: ['Get Free Home Valuation', 'Read Client Reviews'],
    strengths: ['Generates high-value seller listing leads'],
    risks: ['Stats must be verified by local MLS'],
    antiPatterns: ['Overly arrogant billboard-style agent self-promotion'],
    status: 'active'
  }
];
