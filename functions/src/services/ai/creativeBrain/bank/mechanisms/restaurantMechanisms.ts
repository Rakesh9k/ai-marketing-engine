/**
 * Phase 28 — Restaurant Creative Mechanisms (V1 Core Library)
 */

import type { CreativeMechanism } from '../bank.types';

export const RESTAURANT_MECHANISMS: CreativeMechanism[] = [
  {
    id: 'mech_craving_trigger',
    name: 'Craving Trigger',
    version: '1.0.0',
    category: ['ATTENTION', 'EMOTION', 'BEHAVIOR'],
    strategicDescription:
      'Stimulates immediate visceral desire by spotlighting golden textures, sizzle, melted layers, and fresh aroma cues.',
    psychologicalBasis:
      'Pavlovian sensory conditioning where hyper-focused visual/audio cues activate immediate hunger response.',
    humanTensionResolved:
      'Indecision over what to eat turned into an overwhelming, unambiguous craving.',
    whyAudienceCares:
      'It appeals directly to sensory gratification and appetite without requiring analytical thought.',
    creativeChanges:
      'Shifts focus from generic restaurant branding to extreme close-ups of signature dish preparation and sensory texture.',
    whenAppropriate:
      'Lunch/dinner rush promotions, new menu items, signature dish spotlight, weekend specials.',
    whenToAvoid:
      'Health/wellness detox messaging or high-end institutional corporate dining announcements.',
    trigger: 'Visceral sensory imagery of fresh, hot, textured food.',
    desiredEmotionalResponse: ['Hunger', 'Anticipation', 'Desire'],
    applicableIndustries: ['restaurant'],
    compatibleSubIndustries: ['casual_dining', 'quick_service', 'bakery', 'cafe'],
    compatibleAudienceSituations: ['impulse_hungry', 'after_work_dinner', 'weekend_treat'],
    compatibleOfferRoles: ['hero_item', 'limited_edition', 'combo_deal'],
    hookDirections: [
      'Stop scrolling if you can hear this crunch.',
      'This is your 12 PM sign to treat yourself.',
      'Look at that slow cheese pull.'
    ],
    visualDirections: [
      'Macro close-up shot of hot cheese melting over crisp crust.',
      'Slow-motion pour of signature sauce over steaming dish.',
      'Vibrant overhead shot highlighting fresh ingredients.'
    ],
    storyDirections: [
      'From sizzling kitchen grill to your plate in minutes.',
      'The secret behind our 18-hour slow-cooked signature dish.'
    ],
    copyDirections: [
      'Golden, crispy, and dripping with flavor. Made fresh every morning.',
      'Bite into perfection today.'
    ],
    proofTypes: ['kitchen_footage', 'customer_reaction', 'fresh_ingredient_closeups'],
    ctaPatterns: ['Order Now for Hot Delivery', 'Grab Yours Today', 'Visit Us for Lunch'],
    strengths: ['High immediate conversion', 'Universal sensory appeal'],
    risks: ['Can feel generic if visual quality is low'],
    antiPatterns: ['Using flat static stock photos of cold food'],
    status: 'active',
    compatibilityRules: {
      compatibleMechanismIds: ['mech_unexpected_value', 'mech_local_ritual'],
      incompatibleMechanismIds: []
    }
  },
  {
    id: 'mech_decision_relief_dining',
    name: 'Dining Decision Relief',
    version: '1.0.0',
    category: ['AUDIENCE_TENSION', 'VALUE'],
    strategicDescription:
      'Eliminates group dining debate by offering a pre-curated family/group feast that satisfies all preferences.',
    psychologicalBasis:
      'Choice overload resolution — reducing cognitive friction when coordinating multi-person meals.',
    humanTensionResolved:
      'The exhausting "What does everyone want to eat tonight?" argument.',
    whyAudienceCares:
      'Saves time and eliminates friction for busy parents or team organizers.',
    creativeChanges:
      'Reframes individual dishes into a unified, stress-free dining solution.',
    whenAppropriate:
      'Family meal bundles, weekend takeaway packs, office lunch catering.',
    whenToAvoid:
      'Single-person solo dining promotions.',
    trigger: 'Family or group mealtime indecision.',
    desiredEmotionalResponse: ['Relief', 'Ease', 'Satisfaction'],
    applicableIndustries: ['restaurant'],
    compatibleSubIndustries: ['family_dining', 'pizzeria', 'barbecue', 'asian_bistro'],
    compatibleAudienceSituations: ['busy_family_dinner', 'group_hangout', 'game_night'],
    compatibleOfferRoles: ['bundle_discount', 'family_pack', 'party_tray'],
    hookDirections: [
      'End the "What\'s for dinner?" debate in 30 seconds.',
      'Feed the whole family for under $40 without cooking tonight.',
      'Everyone gets what they want in one box.'
    ],
    visualDirections: [
      'Generous spread of mixed dishes displayed on a warm wooden table.',
      'Happy family/friends sharing food together comfortably.'
    ],
    storyDirections: [
      'Long day at work? Let us handle dinner for the entire family.'
    ],
    copyDirections: [
      'Includes 2 entrees, 2 sides, and drinks. Zero dishwashing required.'
    ],
    proofTypes: ['portion_scale_visuals', 'family_review_quotes'],
    ctaPatterns: ['Order Family Pack Now', 'Pick Up On Your Way Home'],
    strengths: ['High average order value', 'Strong problem-solution framing'],
    risks: ['Requires clear pricing transparency'],
    antiPatterns: ['Hiding what comes inside the bundle'],
    status: 'active'
  },
  {
    id: 'mech_sensory_reveal',
    name: 'Sensory Reveal',
    version: '1.0.0',
    category: ['ATTENTION', 'STORY'],
    strategicDescription:
      'Builds anticipation by revealing hidden textures, fillings, or secret preparation steps layer by layer.',
    psychologicalBasis:
      'Curiosity loop and visual reveal effect.',
    humanTensionResolved:
      'Doubt about whether food is freshly handmade or industrially processed.',
    whyAudienceCares:
      'It validates quality and offers visual intrigue.',
    creativeChanges:
      'Replaces finished dish photos with step-by-step assembly or dramatic slicing reveals.',
    whenAppropriate:
      'Artisanal bakeries, hand-pulled noodles, stuffed crusts, gourmet burgers.',
    whenToAvoid:
      'Pre-packaged fast grab-and-go snacks.',
    trigger: 'Visual reveal of interior richness or craft.',
    desiredEmotionalResponse: ['Awe', 'Fascination', 'Craving'],
    applicableIndustries: ['restaurant'],
    compatibleSubIndustries: ['bakery', 'gourmet_burger', 'artisanal', 'cafe'],
    compatibleAudienceSituations: ['foodie_exploration', 'weekend_brunch'],
    compatibleOfferRoles: ['signature_feature', 'new_release'],
    hookDirections: [
      'Wait until you see what is inside this pastry...',
      'Cutting into our famous lava cake live.'
    ],
    visualDirections: [
      'Knife slowly cutting through crisp exterior to reveal molten center.',
      'Hands pulling open freshly baked loaf revealing soft steam.'
    ],
    storyDirections: ['Hours of laminating dough lead to this moment.'],
    copyDirections: ['Crispy on the outside, silky warm on the inside.'],
    proofTypes: ['chef_craft_video', 'cross_section_photo'],
    ctaPatterns: ['Try the Original Today', 'Reserve Yours'],
    strengths: ['High social engagement', 'Establishes artisanal credibility'],
    risks: ['Requires authentic high-resolution video/images'],
    antiPatterns: ['Fake or overly edited food styling'],
    status: 'active'
  },
  {
    id: 'mech_occasion_ownership',
    name: 'Occasion Ownership',
    version: '1.0.0',
    category: ['OCCASION', 'LOCAL'],
    strategicDescription:
      'Anchors the restaurant as the default venue for specific recurring moments (e.g. Sunday Brunch, Friday Drinks).',
    psychologicalBasis:
      'Habit formation and contextual trigger association.',
    humanTensionResolved:
      'Unsure where to celebrate weekly milestones or casual meetups.',
    whyAudienceCares:
      'Creates a reliable ritual for connecting with friends/family.',
    creativeChanges:
      'Connects menu items to specific calendar triggers and social occasions.',
    whenAppropriate:
      'Sunday brunch, happy hour, date night, post-game celebrations.',
    whenToAvoid:
      'Generic non-occasion announcements.',
    trigger: 'Day of week or event occurrence.',
    desiredEmotionalResponse: ['Belonging', 'Excitement', 'Relaxation'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['weekend_social', 'after_work', 'date_night'],
    compatibleOfferRoles: ['recurring_event', 'special_menu'],
    hookDirections: [
      'Fridays were made for wood-fired pizza & cold craft beer.',
      'Your Sunday morning ritual is waiting.'
    ],
    visualDirections: [
      'Warm ambient lighting with friends clinking glasses over food.',
      'Vibrant brunch table set in sunlight.'
    ],
    storyDirections: ['Making memories around our table every weekend.'],
    copyDirections: ['Make Friday nights count with our chef special menu.'],
    proofTypes: ['atmosphere_shots', 'crowd_vibe_photos'],
    ctaPatterns: ['Book Your Table for Friday', 'Reserve Sunday Brunch'],
    strengths: ['Drives predictable recurring revenue', 'Builds brand habit'],
    risks: ['Needs consistent weekly execution'],
    antiPatterns: ['Generic imagery without atmospheric warmth'],
    status: 'active'
  },
  {
    id: 'mech_family_moment',
    name: 'Family Moment',
    version: '1.0.0',
    category: ['EMOTION', 'SOCIAL'],
    strategicDescription:
      'Highlights warmth, togetherness, and kid-friendly dining comforts.',
    psychologicalBasis:
      'Emotional warmth and parental nurture motivation.',
    humanTensionResolved:
      'Fear that bringing kids to a restaurant will be stressful or unwelcome.',
    whyAudienceCares:
      'Reassures parents that their family is genuinely welcome and cared for.',
    creativeChanges:
      'Shifts focus from formal gastronomy to cheerful family bonding.',
    whenAppropriate:
      'Kids eat free promos, family weekend lunches, community dinners.',
    whenToAvoid:
      'Late-night bar hours or adult-only cocktail lounges.',
    trigger: 'Parental desire for stress-free family bonding.',
    desiredEmotionalResponse: ['Warmth', 'Belonging', 'Joy'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['family_outing', 'kids_birthday', 'weekend_lunch'],
    compatibleOfferRoles: ['kids_promo', 'family_deal'],
    hookDirections: [
      'Where kids eat happy and parents actually get to relax.',
      'Sunday dinner without the kitchen mess.'
    ],
    visualDirections: ['Smiling kids enjoying ice cream alongside relaxed parents.'],
    storyDirections: ['A neighborhood table for families since 2012.'],
    copyDirections: ['Kid-approved meals made with fresh, real ingredients.'],
    proofTypes: ['happy_family_testimonials', 'kids_menu_highlights'],
    ctaPatterns: ['Bring the Family Today', 'View Kids Menu'],
    strengths: ['High customer loyalty and retention'],
    risks: ['Must deliver actual kid-friendly service'],
    antiPatterns: ['Overly rigid or sterile imagery'],
    status: 'active'
  },
  {
    id: 'mech_local_ritual',
    name: 'Local Ritual',
    version: '1.0.0',
    category: ['LOCAL', 'IDENTITY'],
    strategicDescription:
      'Celebrates local neighborhood traditions and ties the dish to community pride.',
    psychologicalBasis:
      'In-group social identity and local pride.',
    humanTensionResolved:
      'Feeling disconnected from corporate franchise dining options.',
    whyAudienceCares:
      'Supports local community identity and local business owners.',
    creativeChanges:
      'Uses local landmarks, street names, and neighborhood vernacular.',
    whenAppropriate:
      'Neighborhood anniversaries, local festival collabs, game day specials.',
    whenToAvoid:
      'National mass advertising campaigns.',
    trigger: 'Neighborhood pride and local heritage.',
    desiredEmotionalResponse: ['Pride', 'Connection', 'Loyalty'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['local_resident', 'neighborhood_pride'],
    compatibleOfferRoles: ['community_special', 'hometown_favorite'],
    hookDirections: [
      'If you grew up in East Austin, you know this smell.',
      'Serving Main Street the best bagels for 15 years.'
    ],
    visualDirections: ['Exterior storefront featuring local street icon or mural.'],
    storyDirections: ['Born and raised right here on 5th Avenue.'],
    copyDirections: ['Proudly family-owned and feeding our neighbors since day one.'],
    proofTypes: ['owner_story', 'community_award_badges'],
    ctaPatterns: ['Support Local - Visit Us Today', 'Stop By Main St'],
    strengths: ['Defends against national chain competition'],
    risks: ['Only resonates within geographic radius'],
    antiPatterns: ['Generic corporate stock photos'],
    status: 'active'
  },
  {
    id: 'mech_unexpected_value',
    name: 'Unexpected Value',
    version: '1.0.0',
    category: ['VALUE', 'ATTENTION'],
    strategicDescription:
      'Surprises the customer with premium quality ingredients at an surprisingly accessible price point.',
    psychologicalBasis:
      'Value perception discrepancy — feeling like you got more than you paid for.',
    humanTensionResolved:
      'Tension between wanting high quality and budget constraints.',
    whyAudienceCares:
      'Makes dining out feel guilt-free and smart.',
    creativeChanges:
      'Juxtaposes high-end ingredient visuals with surprisingly low price points.',
    whenAppropriate:
      'Lunch specials, combo deals, happy hour food items.',
    whenToAvoid:
      'Ultra-luxury Michelin dining where cheap pricing erodes prestige.',
    trigger: 'Price-to-quality surprise.',
    desiredEmotionalResponse: ['Delight', 'Smart feeling', 'Urgency'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['budget_conscious', 'quick_lunch'],
    compatibleOfferRoles: ['lunch_special', 'value_combo'],
    hookDirections: [
      'Gourmet truffle burger for under $12? Yes, really.',
      'The best lunch deal downtown.'
    ],
    visualDirections: ['Plated meal looking restaurant-grade next to clear price tag.'],
    storyDirections: ['We cut middle-men to give you premium steaks for less.'],
    copyDirections: ['Fresh wagyu blend, hand-cut fries, and drink for just $12.99.'],
    proofTypes: ['ingredient_list', 'price_comparison'],
    ctaPatterns: ['Claim Lunch Special', 'View Value Menu'],
    strengths: ['High conversion rate during tight economic times'],
    risks: ['Must avoid looking cheap or low quality'],
    antiPatterns: ['Discount flyer aesthetics'],
    status: 'active'
  },
  {
    id: 'mech_signature_discovery',
    name: 'Signature Discovery',
    version: '1.0.0',
    category: ['STORY', 'PROOF'],
    strategicDescription:
      'Positions one specific dish as a "must-try hero item" that defines the venue.',
    psychologicalBasis:
      'Social proof and FOMO (Fear Of Missing Out) on iconic dishes.',
    humanTensionResolved:
      'Unsure what is actually good on a crowded menu.',
    whyAudienceCares:
      'Gives first-time diners total confidence in what to order.',
    creativeChanges:
      'Elevates a single item into a local culinary legend.',
    whenAppropriate:
      'First-time visitor attraction, signature item spotlight.',
    whenToAvoid:
      'Promoting generic side items or seasonal closeout stock.',
    trigger: 'Search for the best local signature specialty.',
    desiredEmotionalResponse: ['Curiosity', 'Confidence', 'Excitement'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['first_time_visitor', 'foodie_tourist'],
    compatibleOfferRoles: ['hero_signature'],
    hookDirections: [
      'The dish that put our kitchen on the map.',
      'Why people travel across town for this one sandwich.'
    ],
    visualDirections: ['Hero beauty shot of single iconic dish under warm spotlight.'],
    storyDirections: ['Tested 47 recipes before perfecting this marinade.'],
    copyDirections: ['Over 10,000 served this year alone. Come taste why.'],
    proofTypes: ['sales_count', 'press_quote', 'chef_endorsement'],
    ctaPatterns: ['Try the Legendary Hero Dish', 'Order Signature Item'],
    strengths: ['Simplifies menu navigation for new guests'],
    risks: ['Puts heavy pressure on dish consistency'],
    antiPatterns: ['Promoting 10 signature items at once'],
    status: 'active'
  },
  {
    id: 'mech_social_proof_moment',
    name: 'Social Proof Moment',
    version: '1.0.0',
    category: ['PROOF', 'SOCIAL'],
    strategicDescription:
      'Uses genuine customer reactions, reviews, or packed dining room scenes to validate popularity.',
    psychologicalBasis:
      'Informational social influence — if everyone is loving it, it must be great.',
    humanTensionResolved:
      'Fear of picking an empty or disappointing restaurant.',
    whyAudienceCares:
      'Validates choice through peer experience.',
    creativeChanges:
      'Replaces brand claims with customer quotes, ratings, or crowd clips.',
    whenAppropriate:
      'New opening validation, milestone celebrations, campaign retargeting.',
    whenToAvoid:
      'Brand new unproven concept before initial reviews exist.',
    trigger: 'Need for external validation before visiting.',
    desiredEmotionalResponse: ['Trust', 'Validation', 'FOMO'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['evaluating_options', 'weekend_out_planning'],
    compatibleOfferRoles: ['popular_choice', 'top_rated'],
    hookDirections: [
      '"Best tacos I\'ve had outside Mexico City." — 5-Star Review',
      'See why 400+ people rated us 4.9 stars this month.'
    ],
    visualDirections: ['Authentic customer smiling while eating, overlay of 5-star rating.'],
    storyDirections: ['What our regulars are saying this week.'],
    copyDirections: ['Over 500 five-star reviews can\'t be wrong.'],
    proofTypes: ['google_reviews', 'video_reactions', 'award_badges'],
    ctaPatterns: ['Read Reviews & Book', 'See What The Hype Is About'],
    strengths: ['Removes trust barrier rapidly'],
    risks: ['Must use real, non-fabricated reviews'],
    antiPatterns: ['Fake-looking testimonial graphic templates'],
    status: 'active'
  },
  {
    id: 'mech_food_story',
    name: 'Food Story & Heritage',
    version: '1.0.0',
    category: ['STORY', 'IDENTITY'],
    strategicDescription:
      'Shares the origin, family recipe, or chef dedication behind the cooking process.',
    psychologicalBasis:
      'Storytelling transportation and craft appreciation.',
    humanTensionResolved:
      'Skepticism about commercialized mass food preparation.',
    whyAudienceCares:
      'Creates emotional connection to the human makers.',
    creativeChanges:
      'Takes viewers behind the kitchen doors to witness tradition.',
    whenAppropriate:
      'Authentic ethnic cuisine, family heritage spots, farm-to-table concepts.',
    whenToAvoid:
      'Fast food franchises built on standardized factory processing.',
    trigger: 'Appreciation for authentic craftsmanship and story.',
    desiredEmotionalResponse: ['Respect', 'Emotional connection', 'Appetite'],
    applicableIndustries: ['restaurant'],
    compatibleAudienceSituations: ['seeking_authenticity', 'special_dinner'],
    compatibleOfferRoles: ['heritage_special', 'chef_recommendation'],
    hookDirections: [
      'My grandmother brought this recipe from Naples in 1968.',
      'We slow-simmer this broth for 24 hours every single day.'
    ],
    visualDirections: ['Chef carefully hand-shaping pasta or simmering broth.'],
    storyDirections: ['Three generations of passion in every single bite.'],
    copyDirections: ['No shortcuts. No prep mixes. Just real family recipes.'],
    proofTypes: ['behind_the_scenes', 'historical_photo', 'ingredient_origin'],
    ctaPatterns: ['Taste the Heritage', 'Reserve Your Table'],
    strengths: ['High emotional brand equity'],
    risks: ['Requires genuine story to be believable'],
    antiPatterns: ['Made-up corporate heritage marketing blurbs'],
    status: 'active'
  }
];
