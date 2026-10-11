/**
 * Phase 28 — Salon / Beauty Creative Mechanisms (V1 Core Library)
 */

import type { CreativeMechanism } from '../bank.types';

export const SALON_MECHANISMS: CreativeMechanism[] = [
  {
    id: 'mech_transformation_reveal',
    name: 'Transformation Reveal',
    version: '1.0.0',
    category: ['ATTENTION', 'PROOF', 'EMOTION'],
    strategicDescription:
      'Showcases side-by-side or transition visuals demonstrating a dramatic hair/skin/nail improvement.',
    psychologicalBasis:
      'Contrast effect and aspirational identification.',
    humanTensionResolved:
      'Frustration with dull, damaged, or uninspired appearance.',
    whyAudienceCares:
      'It proves what is possible for their own look.',
    creativeChanges:
      'Shifts focus from salon price list to high-impact Before/After result.',
    whenAppropriate:
      'Balayage, color corrections, skin treatments, keratin smoothing, hair extensions.',
    whenToAvoid:
      'Minor routine trims with subtle unnoticeable differences.',
    trigger: 'Visual proof of dramatic aesthetic enhancement.',
    desiredEmotionalResponse: ['Aspiration', 'Confidence', 'Desire'],
    applicableIndustries: ['salon'],
    compatibleSubIndustries: ['hair_salon', 'med_spa', 'nail_studio', 'barbershop'],
    compatibleAudienceSituations: ['seeking_makeover', 'damaged_hair_fix', 'event_prep'],
    compatibleOfferRoles: ['hero_service', 'transformation_package'],
    hookDirections: [
      'From damaged brassy blonde to silky dimensional platinum.',
      'Watch this 3-hour hair transformation in 15 seconds.',
      'The difference a professional balayage actually makes.'
    ],
    visualDirections: [
      'Split screen Before (faded/dry) vs After (vibrant/glossy).',
      'Smooth swipe transition over client hair reel.'
    ],
    storyDirections: ['Client came in feeling stuck with dull hair — left glowing.'],
    copyDirections: [
      'Custom color correction tailored to her skin tone and hair health. Book your consultation today.'
    ],
    proofTypes: ['before_after_photos', 'client_glowing_reaction'],
    ctaPatterns: ['Book Your Transformation', 'Claim Consultation Spot'],
    strengths: ['Highest converting mechanism in beauty category'],
    risks: ['Must ensure honest non-filtered photography'],
    antiPatterns: ['Using heavy face-tuning filters that destroy authenticity'],
    status: 'active'
  },
  {
    id: 'mech_problem_recognition_beauty',
    name: 'Beauty Problem Recognition',
    version: '1.0.0',
    category: ['AUDIENCE_TENSION', 'ATTENTION'],
    strategicDescription:
      'Identifies a specific hair or skin issue (e.g. frizzy summer humidity, brassy tones) and introduces the exact salon treatment.',
    psychologicalBasis:
      'Problem-agitation-solution cognitive framework.',
    humanTensionResolved:
      'Annoyance with persistent hair/skin issues without knowing the right remedy.',
    whyAudienceCares:
      'Directly addresses personal frustration and daily beauty struggle.',
    creativeChanges:
      'Leads with the symptom rather than the service name.',
    whenAppropriate:
      'Keratin treatments, deep conditioning, anti-frizz, scalp detox.',
    whenToAvoid:
      'General maintenance appointments.',
    trigger: 'Daily beauty struggle or seasonal hair/skin damage.',
    desiredEmotionalResponse: ['Validation', 'Relief', 'Hope'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['struggling_with_hair_health', 'seasonal_change'],
    compatibleOfferRoles: ['targeted_treatment', 'solution_package'],
    hookDirections: [
      'Tired of spending 45 minutes blowing out frizzy hair every morning?',
      'Is your hair feeling brittle and dry after summer sun?'
    ],
    visualDirections: ['Close up of textured frizz vs smooth silky finish under salon lighting.'],
    storyDirections: ['Why home treatments often fail and what professional bonding actually does.'],
    copyDirections: ['Our 90-minute smoothing treatment lasts up to 12 weeks.'],
    proofTypes: ['macro_texture_shots', 'stylist_explainer'],
    ctaPatterns: ['Fix Your Hair Health Today', 'Book Smoothing Treatment'],
    strengths: ['Creates strong intent among high-need clients'],
    risks: ['Tone must remain empathetic, not shaming'],
    antiPatterns: ['Shaming clients for home maintenance mistakes'],
    status: 'active'
  },
  {
    id: 'mech_expert_diagnosis',
    name: 'Expert Diagnosis & Consultation',
    version: '1.0.0',
    category: ['PROOF', 'IDENTITY'],
    strategicDescription:
      'Positions the stylist/esthetician as a skilled beauty practitioner who customizes solutions for individual hair/skin types.',
    psychologicalBasis:
      'Authority bias and personalized care value.',
    humanTensionResolved:
      'Fear of getting a generic cookie-cutter haircut or ruined hair color.',
    whyAudienceCares:
      'Provides confidence that their unique features will be respected.',
    creativeChanges:
      'Highlights the consultation phase rather than just the final cut.',
    whenAppropriate:
      'First-time client acquisition, high-ticket color services, custom skincare.',
    whenToAvoid:
      'Quick express walk-in haircut shops.',
    trigger: 'Desire for personalized professional advice.',
    desiredEmotionalResponse: ['Trust', 'Reassurance', 'Prestige'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['first_time_client', 'bad_experience_elsewhere'],
    compatibleOfferRoles: ['consultation_included', 'custom_package'],
    hookDirections: [
      'Why we spend 15 minutes listening before touching your hair.',
      'No two color formulas are ever the same in our chair.'
    ],
    visualDirections: ['Stylist attentively assessing client hair texture during consultation.'],
    storyDirections: ['Every client gets a bespoke formula mixed specifically for their hair goals.'],
    copyDirections: ['Book your complimentary 15-minute hair consultation.'],
    proofTypes: ['behind_the_chair_dialogue', 'stylist_credentials'],
    ctaPatterns: ['Book Free Consultation', 'Meet Our Master Stylists'],
    strengths: ['Attracts high-value loyal clients'],
    risks: ['Requires staff to execute thorough consultations'],
    antiPatterns: ['Rushing clients through without consultation'],
    status: 'active'
  },
  {
    id: 'mech_confidence_shift',
    name: 'Confidence Shift',
    version: '1.0.0',
    category: ['EMOTION', 'IDENTITY'],
    strategicDescription:
      'Focuses on the emotional posture and inner confidence client gains after stepping out of the salon.',
    psychologicalBasis:
      'Self-efficacy and emotional elevation.',
    humanTensionResolved:
      'Feeling sluggish or invisible in daily routine.',
    whyAudienceCares:
      'Beauty services are bought for how they make people feel, not just look.',
    creativeChanges:
      'Replaces static hair pictures with dynamic strutting/smiling post-service reactions.',
    whenAppropriate:
      'General salon branding, blowout packages, fresh color launches.',
    whenToAvoid:
      'Pure price-discount flyer ads.',
    trigger: 'Desire for emotional boost and feeling attractive.',
    desiredEmotionalResponse: ['Empowerment', 'Joy', 'Self-Love'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['needing_pick_me_up', 'new_chapter_in_life'],
    compatibleOfferRoles: ['signature_experience', 'glow_up_package'],
    hookDirections: [
      'That "just walked out of the salon" feeling is priceless.',
      'When your hair looks this good, your whole week improves.'
    ],
    visualDirections: ['Client happily swishing fresh hair in natural outdoor sunlight, smiling.'],
    storyDirections: ['It\'s not just hair — it\'s how you carry yourself into the room.'],
    copyDirections: ['Treat yourself to the ultimate glow-up this week.'],
    proofTypes: ['client_video_testimonial', 'hair_flip_reels'],
    ctaPatterns: ['Treat Yourself Today', 'Book Your Glow-Up'],
    strengths: ['Strong emotional resonance across demographics'],
    risks: ['Must feel genuine rather than staged'],
    antiPatterns: ['Overly cheesy stock model poses'],
    status: 'active'
  },
  {
    id: 'mech_occasion_preparation_beauty',
    name: 'Occasion Preparation',
    version: '1.0.0',
    category: ['OCCASION', 'VALUE'],
    strategicDescription:
      'Ties beauty bookings directly to upcoming milestone events (weddings, galas, holidays, vacations).',
    psychologicalBasis:
      'Event urgency and readiness motivation.',
    humanTensionResolved:
      'Panic about looking unprepared for important photographed moments.',
    whyAudienceCares:
      'High stakes attached to milestone memories and photos.',
    creativeChanges:
      'Frames salon appointment as an essential event deadline checklist item.',
    whenAppropriate:
      'Bridal season, holiday party season, prom, summer vacation prep.',
    whenToAvoid:
      'Off-season generic timeframes without upcoming events.',
    trigger: 'Upcoming calendar event or holiday.',
    desiredEmotionalResponse: ['Urgency', 'Anticipation', 'Preparedness'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['event_upcoming', 'holiday_prep'],
    compatibleOfferRoles: ['event_package', 'early_booking_special'],
    hookDirections: [
      'Got a wedding next month? Lock in your hair & makeup date now.',
      'Holiday party season is coming — our peak slots are filling fast.'
    ],
    visualDirections: ['Elegant updos or polished glam makeup ready for evening event.'],
    storyDirections: ['Helping brides and guests feel picture-perfect for over 10 years.'],
    copyDirections: ['Reserve your event styling slot before our weekend calendar fills up.'],
    proofTypes: ['event_photo_gallery', 'client_event_tags'],
    ctaPatterns: ['Reserve Event Date', 'Book Holiday Glam'],
    strengths: ['High advance booking velocity'],
    risks: ['Requires early seasonal promotion timing'],
    antiPatterns: ['Advertising holiday packages 2 days before Christmas'],
    status: 'active'
  },
  {
    id: 'mech_identity_expression',
    name: 'Identity Expression',
    version: '1.0.0',
    category: ['IDENTITY', 'STORY'],
    strategicDescription:
      'Positions hair and beauty choices as a bold medium of personal self-expression and identity.',
    psychologicalBasis:
      'Self-actualization and social identity signaling.',
    humanTensionResolved:
      'Boredom with conventional, safe appearances.',
    whyAudienceCares:
      'Allows clients to show the world who they uniquely are.',
    creativeChanges:
      'Highlights creative color, edgy cuts, and unique individual style aesthetics.',
    whenAppropriate:
      'Vivid fantasy colors, signature cuts, barber art, trend styling.',
    whenToAvoid:
      'Conservative corporate styling campaigns.',
    trigger: 'Desire for self-expression and uniqueness.',
    desiredEmotionalResponse: ['Pride', 'Authenticity', 'Excitement'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['expressive_individual', 'style_evolution'],
    compatibleOfferRoles: ['creative_color', 'custom_cut'],
    hookDirections: [
      'Your hair is your best accessory. Make it unforgettable.',
      'Life is too short for boring hair.'
    ],
    visualDirections: ['Vibrant emerald or pastel lavender hair cuts styled with confidence.'],
    storyDirections: ['We turn your creative style vision into vibrant reality.'],
    copyDirections: ['Express your true self with custom fantasy color by our color specialists.'],
    proofTypes: ['portfolio_reels', 'stylist_artist_spotlight'],
    ctaPatterns: ['Express Your Style', 'Book Creative Color'],
    strengths: ['Attracts high-loyalty artistic client base'],
    risks: ['Niche appeal depending on salon market positioning'],
    antiPatterns: ['Telling clients to play it safe'],
    status: 'active'
  },
  {
    id: 'mech_trust_through_proof_salon',
    name: 'Trust Through Salon Proof',
    version: '1.0.0',
    category: ['PROOF', 'BEHAVIOR'],
    strategicDescription:
      'Builds trust by demonstrating pristine hygiene, organic non-toxic ingredients, and top-tier product brands.',
    psychologicalBasis:
      'Safety, cleanliness, and premium quality reassurance.',
    humanTensionResolved:
      'Anxiety about chemical damage, scalp irritation, or unsanitary conditions.',
    whyAudienceCares:
      'Protects their health and hair integrity.',
    creativeChanges:
      'Showcases clean tools, premium product lines (Olaplex, Kérastase), and organic certifications.',
    whenAppropriate:
      'Organic salons, scalp spa treatments, gentle color lines.',
    whenToAvoid:
      'Budget quick-cut establishments prioritizing speed only.',
    trigger: 'Concern over hair health or scalp sensitivity.',
    desiredEmotionalResponse: ['Safety', 'Trust', 'Peace of Mind'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['sensitive_scalp', 'health_conscious'],
    compatibleOfferRoles: ['organic_service', 'bond_building_treatment'],
    hookDirections: [
      'Ammonia-free color that protects your hair bond while delivering rich shine.',
      'Pristine sanitization and luxury organic care in every appointment.'
    ],
    visualDirections: ['Clean aesthetic salon interior, luxury product bottles neatly arranged.'],
    storyDirections: ['Why we exclusively use cruelty-free, bond-rebuilding formulations.'],
    copyDirections: ['Experience luxury care that keeps your hair healthy from root to tip.'],
    proofTypes: ['product_certifications', 'cleanliness_standards'],
    ctaPatterns: ['Book Safe Hair Care', 'Explore Our Products'],
    strengths: ['Attracts health-conscious, premium clients'],
    risks: ['Must maintain advertised product standards'],
    antiPatterns: ['Using unbranded mystery tubs in background'],
    status: 'active'
  },
  {
    id: 'mech_personalization_beauty',
    name: 'Personalized Beauty Plan',
    version: '1.0.0',
    category: ['VALUE', 'BEHAVIOR'],
    strategicDescription:
      'Offers a customized maintenance plan combining salon visits with tailored home product regimens.',
    psychologicalBasis:
      'Curated guidance and end-to-end outcome ownership.',
    humanTensionResolved:
      'Confusion over which products to use between salon appointments.',
    whyAudienceCares:
      'Extends the longevity of their salon investment.',
    creativeChanges:
      'Combines service with home care product recommendation.',
    whenAppropriate:
      'Color maintenance, skincare routines, curly hair routines.',
    whenToAvoid:
      'One-off single service walk-ins.',
    trigger: 'Desire to maintain salon results at home.',
    desiredEmotionalResponse: ['Empowerment', 'Clarity', 'Satisfaction'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['maintaining_color', 'skincare_regimen'],
    compatibleOfferRoles: ['bundle_package', 'regimen_special'],
    hookDirections: [
      'Keep your color fresh for 8+ weeks with this simple home regimen.',
      'How to maintain that salon shine between visits.'
    ],
    visualDirections: ['Stylist selecting exact shampoo and mask tailored for client.'],
    storyDirections: ['Great hair doesn\'t stop when you leave our chair.'],
    copyDirections: ['Get a customized hair prescription during your next appointment.'],
    proofTypes: ['routine_guide', 'longevity_proof'],
    ctaPatterns: ['Get Your Custom Plan', 'Book Appointment'],
    strengths: ['Increases retail product revenue'],
    risks: ['Avoid pushy high-pressure sales tone'],
    antiPatterns: ['Hard-selling inappropriate products'],
    status: 'active'
  },
  {
    id: 'mech_routine_ritual_beauty',
    name: 'Self-Care Ritual',
    version: '1.0.0',
    category: ['OCCASION', 'EMOTION'],
    strategicDescription:
      'Frames the salon visit as an essential mental reset and self-care sanctuary from busy life.',
    psychologicalBasis:
      'Stress recovery and self-reward psychology.',
    humanTensionResolved:
      'Guilt over spending time and money on personal pampering.',
    whyAudienceCares:
      'Reframes pampering as essential wellness and mental rest.',
    creativeChanges:
      'Emphasizes head massages, tranquil vibe, complimentary tea, and peaceful environment.',
    whenAppropriate:
      'Head spa treatments, manicures, facial pampering, weekend blowouts.',
    whenToAvoid:
      'Fast express barbershop cuts focused on speed.',
    trigger: 'Overwork, burnout, or need for relaxation.',
    desiredEmotionalResponse: ['Relaxation', 'Serenity', 'Well-being'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['overworked_parent', 'stress_relief_seeking'],
    compatibleOfferRoles: ['spa_package', 'relaxation_special'],
    hookDirections: [
      'You spend all week taking care of everyone else. Today is for you.',
      'Unplug for 60 minutes with our signature scalp massage & blowout.'
    ],
    visualDirections: ['Tranquil wash station with warm lighting, soothing water stream.'],
    storyDirections: ['Step out of the noise and into our calm sanctuary.'],
    copyDirections: ['Includes scalp treatment, warm aromatherapy towel, and glass of champagne.'],
    proofTypes: ['atmosphere_video', 'client_relaxation_quotes'],
    ctaPatterns: ['Book Your Reset Today', 'Reserve Self-Care Hour'],
    strengths: ['Removes buying guilt'],
    risks: ['Salon environment must actually feel peaceful'],
    antiPatterns: ['Noisy chaotic background in promo videos'],
    status: 'active'
  },
  {
    id: 'mech_expertise_story_salon',
    name: 'Stylist Master Craft Story',
    version: '1.0.0',
    category: ['STORY', 'PROOF'],
    strategicDescription:
      'Spotlights the advanced training, certifications, and years of experience of key team members.',
    psychologicalBasis:
      'Expertise heuristics and quality assurance.',
    humanTensionResolved:
      'Fear of getting an inexperienced junior stylist.',
    whyAudienceCares:
      'Assures premium outcomes when altering their appearance.',
    creativeChanges:
      'Focuses on master stylist technique, education, and accolades.',
    whenAppropriate:
      'Introducing new senior stylists, master colorist spotlights.',
    whenToAvoid:
      'Uncertified apprentice practice sessions.',
    trigger: 'Search for top-tier master beauty talent.',
    desiredEmotionalResponse: ['Confidence', 'Trust', 'Admiration'],
    applicableIndustries: ['salon'],
    compatibleAudienceSituations: ['seeking_top_stylist', 'high_stakes_cut'],
    compatibleOfferRoles: ['master_stylist_spotlight'],
    hookDirections: [
      'Meet Sarah: 12 years of balayage mastery and Vidal Sassoon certified.',
      'Why master colorists view hair formulation like fine art.'
    ],
    visualDirections: ['Stylist in action precisely hand-painting hair foils with intent focus.'],
    storyDirections: ['Dedicated to continuous education in Paris and New York.'],
    copyDirections: ['Book your hair with our senior master color specialists.'],
    proofTypes: ['certification_badges', 'portfolio_gallery'],
    ctaPatterns: ['Book With Master Stylist', 'View Stylist Portfolio'],
    strengths: ['Justifies higher service pricing tiers'],
    risks: ['Must highlight entire team, not just owner'],
    antiPatterns: ['Generic claims of being "the best" without proof'],
    status: 'active'
  }
];
