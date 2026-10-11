/**
 * Phase 28 — Cross-Industry & Local/Cultural Creative Mechanisms (V1 Core Library)
 */

import type { CreativeMechanism } from '../bank.types';

export const LOCAL_CROSS_INDUSTRY_MECHANISMS: CreativeMechanism[] = [
  {
    id: 'mech_neighborhood_identity',
    name: 'Neighborhood Identity & Pride',
    version: '1.0.0',
    category: ['LOCAL', 'IDENTITY'],
    strategicDescription:
      'Ties the brand/product deeply to local neighborhood pride, landmarks, and community culture.',
    psychologicalBasis:
      'In-group social identity and local belonging motivation.',
    humanTensionResolved:
      'Feeling alien in one\'s own city due to cookie-cutter corporate chains.',
    whyAudienceCares:
      'Locals love supporting businesses that truly embody their neighborhood spirit.',
    creativeChanges:
      'Features recognizable local street names, murals, and community landmarks.',
    whenAppropriate:
      'Local retail, neighborhood coffee shops, local gyms, community services.',
    whenToAvoid:
      'National eCommerce shipping brands without local physical ties.',
    trigger: 'Local community pride and shared neighborhood identity.',
    desiredEmotionalResponse: ['Pride', 'Belonging', 'Loyalty'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['local_resident', 'community_advocate'],
    compatibleOfferRoles: ['neighborhood_special', 'community_sponsor'],
    hookDirections: [
      'Made in Brooklyn, loved by the neighborhood since day one.',
      'If you know this street corner, you know what\'s coming inside.'
    ],
    visualDirections: ['Local storefront set against recognizable neighborhood mural or street sign.'],
    storyDirections: ['Serving our neighbors right here on 4th Street for over a decade.'],
    copyDirections: ['Proudly independent and rooted in our community.'],
    proofTypes: ['community_event_photos', 'local_history_visuals'],
    ctaPatterns: ['Support Local - Visit Us', 'Join Our Neighborhood Club'],
    strengths: ['Builds impenetrable local brand moat against chains'],
    risks: ['Limited geographic reach'],
    antiPatterns: ['Using generic stock photos that look like another state'],
    status: 'active'
  },
  {
    id: 'mech_shared_local_experience',
    name: 'Shared Local Weather & Seasonality',
    version: '1.0.0',
    category: ['LOCAL', 'OCCASION'],
    strategicDescription:
      'Connects the offering to immediate local weather conditions, heatwaves, rainstorms, or seasonal shifts.',
    psychologicalBasis:
      'Contextual relevance and immediate situational empathy.',
    humanTensionResolved:
      'Reluctance to go out or deal with bad/hot weather.',
    whyAudienceCares:
      'Directly addresses what everyone in town is experiencing right now.',
    creativeChanges:
      'Adapts copy and imagery dynamically to real-time weather triggers.',
    whenAppropriate:
      'Iced drinks during heatwaves, cozy soups/comfort during winter storms, AC tune-ups before summer.',
    whenToAvoid:
      'Generic evergreen messaging ignored during extreme weather events.',
    trigger: 'Current local weather condition or sudden temperature shift.',
    desiredEmotionalResponse: ['Relief', 'Complicity', 'Urgency'],
    applicableIndustries: ['all', 'restaurant', 'salon'],
    compatibleAudienceSituations: ['weather_impacted', 'seasonal_shift'],
    compatibleOfferRoles: ['weather_special', 'seasonal_promo'],
    hookDirections: [
      '95 degrees outside? Our AC is blasting and the cold brew is flowing.',
      'Rainy day slump? Let us bring warm comfort food right to your door.'
    ],
    visualDirections: ['Steaming mug on rainy window pane or condensation-dripping cold drink.'],
    storyDirections: ['We\'re keeping the neighborhood cool all weekend long.'],
    copyDirections: ['Show this ad for $2 off any iced beverage during today\'s heatwave.'],
    proofTypes: ['live_weather_overlay', 'seasonal_menu_spotlight'],
    ctaPatterns: ['Cool Off Today', 'Warm Up With Us'],
    strengths: ['Immediate relevance and impulse action'],
    risks: ['Requires agile marketing activation based on weather forecast'],
    antiPatterns: ['Promoting hot coffee on a 100°F summer day'],
    status: 'active'
  },
  {
    id: 'mech_cultural_moment',
    name: 'Cultural Festival & Holiday Celebration',
    version: '1.0.0',
    category: ['OCCASION', 'LOCAL'],
    strategicDescription:
      'Aligns business offerings with cultural festivals, heritage months, and local celebrations (Diwali, Lunar New Year, Cinco de Mayo, Local Pride).',
    psychologicalBasis:
      'Cultural resonance and shared festive joy.',
    humanTensionResolved:
      'Desire to celebrate heritage and community festivals with authentic local touch points.',
    whyAudienceCares:
      'Validates and celebrates cultural identity.',
    creativeChanges:
      'Uses authentic festival colors, cultural symbols, and special holiday bundles.',
    whenAppropriate:
      'Major cultural holidays, neighborhood heritage festivals.',
    whenToAvoid:
      'Superficial tokenism without genuine cultural respect or context.',
    trigger: 'Cultural holiday or community festival calendar.',
    desiredEmotionalResponse: ['Joy', 'Cultural Pride', 'Celebration'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['cultural_celebration', 'festive_gathering'],
    compatibleOfferRoles: ['festive_bundle', 'limited_holiday_edition'],
    hookDirections: [
      'Celebrate Diwali with our hand-crafted festive sweet boxes.',
      'Get festive-ready with our holiday styling packages.'
    ],
    visualDirections: ['Vibrant festive colors, authentic traditional decor, family warmth.'],
    storyDirections: ['Bringing traditional flavors and festive warmth to your family table.'],
    copyDirections: ['Limited festival edition packages available now for pre-order.'],
    proofTypes: ['authentic_artisan_craft', 'festive_setup'],
    ctaPatterns: ['Pre-Order Festive Box', 'Book Holiday Appointment'],
    strengths: ['Massive seasonal demand spikes'],
    risks: ['Must remain culturally authentic and respectful'],
    antiPatterns: ['Cliché lazy stereotypes'],
    status: 'active'
  },
  {
    id: 'mech_local_code_switching',
    name: 'Local Slang & Code-Switching',
    version: '1.0.0',
    category: ['LOCAL', 'IDENTITY'],
    strategicDescription:
      'Uses local regional dialects, neighborhood phrases, and localized humor that resonate deeply with locals.',
    psychologicalBasis:
      'In-group linguistic markers establishing instant insider status.',
    humanTensionResolved:
      'Corporate ads feeling cold, polished, and out of touch with local culture.',
    whyAudienceCares:
      'Locals instantly recognize when a brand speaks their actual language.',
    creativeChanges:
      'Replaces sterile corporate copy with natural, localized conversational phrasing.',
    whenAppropriate:
      'Social media ads targeted strictly to specific cities or regions.',
    whenToAvoid:
      'Broad national campaigns where slang will confuse outside audiences.',
    trigger: 'Regional identity and localized humor.',
    desiredEmotionalResponse: ['Amusement', 'Relatability', 'Connection'],
    applicableIndustries: ['all', 'restaurant', 'salon'],
    compatibleAudienceSituations: ['local_insider', 'youth_demographic'],
    compatibleOfferRoles: ['local_hero_offer'],
    hookDirections: [
      'Y\'all already know Friday nights require real BBQ.',
      'No cap, this is the smoothest haircut in the borough.'
    ],
    visualDirections: ['Casual authentic video reel shot on iPhone with local street backdrop.'],
    storyDirections: ['Made by locals who speak your language.'],
    copyDirections: ['Stop by today — you already know where we\'re at.'],
    proofTypes: ['local_creator_collab', 'authentic_ugc'],
    ctaPatterns: ['Pull Up Today', 'Grab Yours'],
    strengths: ['Extremely high engagement on social feeds'],
    risks: ['If forced or fake, can feel cringe ("fellow kids" trap)'],
    antiPatterns: ['Forced use of outdated slang by corporate copywriters'],
    status: 'active'
  },
  {
    id: 'mech_everyday_hero',
    name: 'Everyday Community Hero Spotlight',
    version: '1.0.0',
    category: ['SOCIAL', 'PROOF'],
    strategicDescription:
      'Honors local teachers, nurses, firefighters, and small business workers with dedicated appreciation offers.',
    psychologicalBasis:
      'Reciprocity and communal gratitude.',
    humanTensionResolved:
      'Feeling unappreciated in high-stress essential public roles.',
    whyAudienceCares:
      'Shows business values people over pure profit.',
    creativeChanges:
      'Shifts focus from product pitch to honoring local frontline contributors.',
    whenAppropriate:
      'Teachers appreciation week, nurses week, first responder discounts.',
    whenToAvoid:
      'Exploitative posturing without actual discount or tangible perk.',
    trigger: 'Appreciation week or community service recognition.',
    desiredEmotionalResponse: ['Gratitude', 'Respect', 'Warmth'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['community_worker', 'essential_worker'],
    compatibleOfferRoles: ['hero_discount', 'gratitude_perk'],
    hookDirections: [
      'Calling all local teachers: your first coffee is on us this Friday.',
      'To our healthcare workers: 20% off all relaxing spa treatments this month.'
    ],
    visualDirections: ['Real local teacher or nurse smiling in their work environment.'],
    storyDirections: ['A small token of gratitude for those who serve our community every day.'],
    copyDirections: ['Show your valid ID and enjoy our Community Hero special all week.'],
    proofTypes: ['community_partner_logos', 'hero_stories'],
    ctaPatterns: ['Claim Hero Discount', 'Tag a Teacher'],
    strengths: ['Massive positive word-of-mouth and brand Goodwill'],
    risks: ['Must be easy to redeem without humiliating verification steps'],
    antiPatterns: ['Token 2% discounts with 10 pages of fine print'],
    status: 'active'
  },
  {
    id: 'mech_behind_the_scenes_craft',
    name: 'Behind-The-Scenes Craft',
    version: '1.0.0',
    category: ['STORY', 'PROOF'],
    strategicDescription:
      'Takes customers behind the curtain to witness the painstaking labor, preparation, and skill invested.',
    psychologicalBasis:
      'Labor illusion theory — people value output significantly more when they see the effort required.',
    humanTensionResolved:
      'Questioning why a service or product costs what it does.',
    whyAudienceCares:
      'Builds deep respect for craftsmanship and quality.',
    creativeChanges:
      'Replaces finished product glamour shots with raw process video.',
    whenAppropriate:
      'Artisanal products, custom tailoring, hand-crafted food, specialized technical work.',
    whenToAvoid:
      'Mass-produced industrial drop-shipping.',
    trigger: 'Curiosity about how quality products/services are made.',
    desiredEmotionalResponse: ['Appreciation', 'Trust', 'Fascination'],
    applicableIndustries: ['all', 'restaurant', 'salon'],
    compatibleAudienceSituations: ['craft_appreciator', 'quality_conscious'],
    compatibleOfferRoles: ['signature_craft'],
    hookDirections: [
      'What 5 hours of painstaking hand-detailing looks like in 20 seconds.',
      'The process behind making our signature sourdough.'
    ],
    visualDirections: ['Close up footage of skilled hands carefully crafting or assembling.'],
    storyDirections: ['No assembly lines. Every piece is crafted individually with precision.'],
    copyDirections: ['Experience true craftsmanship made right here in our workshop.'],
    proofTypes: ['process_video', 'artisan_interview'],
    ctaPatterns: ['Discover Our Process', 'Book Craft Experience'],
    strengths: ['Justifies premium pricing naturally'],
    risks: ['Video pacing must remain crisp and captivating'],
    antiPatterns: ['Boring slow footage without good audio/editing'],
    status: 'active'
  },
  {
    id: 'mech_scarcity_with_integrity',
    name: 'Scarcity with Integrity',
    version: '1.0.0',
    category: ['BEHAVIOR', 'VALUE'],
    strategicDescription:
      'Communicates genuine capacity limits (e.g. only 10 consultation slots this week, 25 loaves baked daily) based on real constraints.',
    psychologicalBasis:
      'Loss aversion and perceived rarity value.',
    humanTensionResolved:
      'Procrastination and delaying action on booking or buying.',
    whyAudienceCares:
      'Gives a legitimate reason to act now rather than later.',
    creativeChanges:
      'Emphasizes physical batch size or appointment calendar caps.',
    whenAppropriate:
      'Bespoke service providers, boutique salons, micro-bakeries, limited inventory runs.',
    whenToAvoid:
      'Digital products with unlimited inventory where fake countdown timers look scammy.',
    trigger: 'Real physical inventory or appointment schedule limit.',
    desiredEmotionalResponse: ['Urgency', 'Exclusivity', 'Focus'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['evaluating_booking', 'limited_time_decision'],
    compatibleOfferRoles: ['limited_batch', 'slot_cap'],
    hookDirections: [
      'We only bake 40 cinnamon rolls every morning. When they\'re gone, they\'re gone.',
      'Only 4 weekend appointment slots left for this month.'
    ],
    visualDirections: ['Fresh batch resting on counter with small count counter badge.'],
    storyDirections: ['We keep our client volume low so every single client gets 100% of our focus.'],
    copyDirections: ['Reserve your spot before our calendar locks for the week.'],
    proofTypes: ['live_booking_schedule', 'batch_number_tag'],
    ctaPatterns: ['Lock In Your Slot', 'Pre-Order Batch'],
    strengths: ['High conversion acceleration'],
    risks: ['Scarcity MUST be real; fake timers destroy trust permanently'],
    antiPatterns: ['Resetting fake countdown timers every time page reloads'],
    status: 'active'
  },
  {
    id: 'mech_honest_imperfection',
    name: 'Honest Imperfection & Vulnerability',
    version: '1.0.0',
    category: ['PROOF', 'STORY'],
    strategicDescription:
      'Shares a candid behind-the-scenes mistake, trial, or honest trade-off that highlights brand authenticity.',
    psychologicalBasis:
      'Pratfall effect — admitting minor flaws increases perceived trustworthiness and warmth.',
    humanTensionResolved:
      'Skepticism toward overly polished corporate perfection.',
    whyAudienceCares:
      'People trust human honesty far more than slick corporate PR.',
    creativeChanges:
      'Leads with an unscripted founder story or behind-the-scenes reality check.',
    whenAppropriate:
      'Founder stories, new product launches, small business updates.',
    whenToAvoid:
      'Safety-critical health/medical procedures where mistakes are dangerous.',
    trigger: 'Desire for raw, unvarnished brand transparency.',
    desiredEmotionalResponse: ['Empathy', 'Trust', 'Affection'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['brand_discovery', 'seeking_transparency'],
    compatibleOfferRoles: ['founder_message'],
    hookDirections: [
      'Our first batch completely burned... but here is what we learned.',
      'We aren\'t the cheapest in town, and here is why we refuse to cut corners.'
    ],
    visualDirections: ['Founder speaking candidly directly into camera without heavy studio lighting.'],
    storyDirections: ['Building this local business wasn\'t easy, but your support made it possible.'],
    copyDirections: ['We promise to always give you 100% honest quality.'],
    proofTypes: ['founder_video', 'raw_unfiltered_photos'],
    ctaPatterns: ['Read Our Story', 'Support Our Journey'],
    strengths: ['Creates fierce emotional brand loyalty'],
    risks: ['Flaw must be minor/relatable, not a failure of core competence'],
    antiPatterns: ['Staged fake vulnerability for viral clout'],
    status: 'active'
  },
  {
    id: 'mech_unexpected_contrast',
    name: 'Unexpected Contrast & Juxtaposition',
    version: '1.0.0',
    category: ['ATTENTION', 'STORY'],
    strategicDescription:
      'Combines two opposing ideas (e.g., luxury fine dining in a casual backyard setting, high-tech barbershop with retro vinyl).',
    psychologicalBasis:
      'Pattern interrupt and novelty detection in the brain.',
    humanTensionResolved:
      'Monotony from seeing the exact same industry ad formats over and over.',
    whyAudienceCares:
      'Captures interest immediately because it breaks expected rules.',
    creativeChanges:
      'Pairs contrasting visual elements or unexpected value propositions.',
    whenAppropriate:
      'Rebranding, standing out in overcrowded markets, boutique services.',
    whenToAvoid:
      'Standard traditional conservative services requiring predictable safety.',
    trigger: 'Pattern interrupt needed in noisy feed.',
    desiredEmotionalResponse: ['Surprise', 'Curiosity', 'Amusement'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['seeking_novelty', 'bored_with_options'],
    compatibleOfferRoles: ['differentiated_hero'],
    hookDirections: [
      'Fine dining quality... served in a paper basket.',
      'A 1920s vintage barbershop experience with 2026 digital precision.'
    ],
    visualDirections: ['Elegant crystal glass holding casual artisanal street food.'],
    storyDirections: ['We broke the rules of traditional dining to give you amazing food without the snobbery.'],
    copyDirections: ['Experience luxury comfort without the stiff formality.'],
    proofTypes: ['concept_contrast_video', 'customer_surprise_quotes'],
    ctaPatterns: ['Experience The Contrast', 'Book Your Visit'],
    strengths: ['High thumb-stop rate on social media'],
    risks: ['Contrast must make logical sense, not just be bizarre'],
    antiPatterns: ['Random confusing imagery unrelated to product'],
    status: 'active'
  },
  {
    id: 'mech_community_celebration',
    name: 'Community Celebration & Cause',
    version: '1.0.0',
    category: ['SOCIAL', 'LOCAL'],
    strategicDescription:
      'Partners with local charities, school sports teams, or community shelters to give back with every purchase.',
    psychologicalBasis:
      'Warm-glow giving effect and prosocial consumption.',
    humanTensionResolved:
      'Guilt over discretionary spending.',
    whyAudienceCares:
      'Purchasing directly helps their local neighbors in need.',
    creativeChanges:
      'Highlights percentage of sales donated or meals provided to local shelter.',
    whenAppropriate:
      'Community fundraiser drives, charity partnerships, holiday giving.',
    whenToAvoid:
      'Using charity as a cynical marketing shield without real donations.',
    trigger: 'Desire for ethical, community-focused purchasing.',
    desiredEmotionalResponse: ['Pride', 'Generosity', 'Warmth'],
    applicableIndustries: ['all', 'restaurant', 'salon', 'real_estate'],
    compatibleAudienceSituations: ['ethically_minded', 'community_supporter'],
    compatibleOfferRoles: ['cause_promo', 'fundraiser_deal'],
    hookDirections: [
      'Every pizza sold this Tuesday donates $2 to the Eastside Youth Shelter.',
      'Help us raise $5,000 for local parks this month.'
    ],
    visualDirections: ['Business owner handing donation check or meals to local shelter coordinator.'],
    storyDirections: ['Because a great business should make its hometown better every day.'],
    copyDirections: ['Enjoy your favorite meal while giving back to your community.'],
    proofTypes: ['donation_receipts', 'charity_partner_statement'],
    ctaPatterns: ['Dine & Give Back', 'Support The Cause'],
    strengths: ['Unites community behind brand'],
    risks: ['Donations must be transparently documented'],
    antiPatterns: ['Vague promises ("a portion of proceeds will be donated")'],
    status: 'active'
  }
];
