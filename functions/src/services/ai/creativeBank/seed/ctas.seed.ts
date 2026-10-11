/**
 * PHASE 10.37 — Seed Initial Creative Intelligence Bank
 * 15 High-Quality CTA Mechanisms
 */

import type { SeedItemDefinition } from "./psychology.seed";

export const CTA_SEEDS: SeedItemDefinition[] = [
  {
    id: "cta_reserve_table_now",
    type: "CTA",
    canonicalName: "Reserve Table Now",
    definition: "Direct low-friction booking action button taking user straight to real-time table selector.",
    purpose: "Convert hungry diners with immediate seat confirmation.",
    useCases: ["Restaurant social ads", "Google Search ads"],
    antiPatterns: ["Directing to broken or slow phone call numbers"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.95,
    relationships: [{ targetItemId: "psychology_cognitive_ease", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.95 }]
  },
  {
    id: "cta_claim_your_voucher",
    type: "CTA",
    canonicalName: "Claim Your Exclusive Voucher",
    definition: "Value-centric CTA prompting instant digital discount code collection.",
    purpose: "Capture customer phone/email lead details in exchange for savings.",
    useCases: ["Salon intro discount", "First order food voucher"],
    antiPatterns: ["Requiring 10 mandatory form fields to get voucher"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [{ targetItemId: "psychology_anchoring_effect", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.93 }]
  },
  {
    id: "cta_book_free_consultation",
    type: "CTA",
    canonicalName: "Book Free Consultation",
    definition: "Risk-free invitation to consult an expert before purchasing high-value services.",
    purpose: "Lower commitment barrier for high-ticket property or beauty packages.",
    useCases: ["Bridal hair makeup trial", "Real estate project walkthrough"],
    antiPatterns: ["Charging hidden consultation fees"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [{ targetItemId: "psychology_risk_reversal", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.94 }]
  },
  {
    id: "cta_order_on_whatsapp",
    type: "CTA",
    canonicalName: "Order Direct On WhatsApp",
    definition: "One-click button launching pre-filled WhatsApp message chat with customer support.",
    purpose: "Provide highest conversational ease for local customers in India.",
    useCases: ["Local cloud kitchen delivery", "Salon appointment query"],
    antiPatterns: ["Slow auto-reply bot with delayed human response"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.96,
    relationships: [{ targetItemId: "psychology_cognitive_ease", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.96 }]
  },
  {
    id: "cta_download_brochure_floorplan",
    type: "CTA",
    canonicalName: "Download Project Floorplan PDF",
    definition: "Utility lead magnet providing immediate floorplan architectural details.",
    purpose: "Capture high-intent homebuyer inquiries.",
    useCases: ["Gated community launching", "Commercial office leasing"],
    antiPatterns: ["Requiring long manual verification before download"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [{ targetItemId: "psychology_authority_bias", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.9 }]
  },
  {
    id: "cta_get_instant_quote",
    type: "CTA",
    canonicalName: "Get Instant Price Quote",
    definition: "Interactive pricing calculator link delivering personalized estimate in under 30 seconds.",
    purpose: "Provide immediate pricing transparency.",
    useCases: ["Home interior renovation", "Catering for events"],
    antiPatterns: ["Forcing sales call without providing price quote"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [{ targetItemId: "psychology_cognitive_ease", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.92 }]
  },
  {
    id: "cta_grab_remaining_slots",
    type: "CTA",
    canonicalName: "Grab Remaining Slots Before They Expire",
    definition: "Urgency CTA showing real-time low slot counter.",
    purpose: "Drive instant impulse booking for limited availability.",
    useCases: ["Weekend spa slots", "Masterclass seating"],
    antiPatterns: ["Fake static counters that never change"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.93,
    relationships: [{ targetItemId: "psychology_loss_aversion", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.94 }]
  },
  {
    id: "cta_explore_the_menu",
    type: "CTA",
    canonicalName: "Explore Full Digital Menu",
    definition: "Low-friction exploration CTA inviting users to browse dish photos and prices.",
    purpose: "Warm up early-funnel foodies looking at menu options.",
    useCases: ["Cafe Instagram profile link", "New restaurant launch"],
    antiPatterns: ["Directing to low-quality PDF menu scan"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.9,
    relationships: [{ targetItemId: "psychology_curiosity_gap", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.89 }]
  },
  {
    id: "cta_schedule_site_visit",
    type: "CTA",
    canonicalName: "Schedule VIP Site Visit",
    definition: "Direct action button offering complimentary cab pickup for real estate property tour.",
    purpose: "Convert interested online homebuyers to physical site visitors.",
    useCases: ["Luxury apartment sales", "Villa project tours"],
    antiPatterns: ["Failing to follow up within 2 hours of booking"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [{ targetItemId: "psychology_status_signaling", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.91 }]
  },
  {
    id: "cta_try_it_risk_free",
    type: "CTA",
    canonicalName: "Try It 100% Risk-Free",
    definition: "Reassurance CTA emphasizing money-back guarantee right next to click button.",
    purpose: "Overcome final payment security doubts.",
    useCases: ["Salon beauty treatment packages", "Meal subscription plans"],
    antiPatterns: ["Vague terms of trial refund"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.94,
    relationships: [{ targetItemId: "psychology_risk_reversal", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.95 }]
  },
  {
    id: "cta_join_the_vip_waitlist",
    type: "CTA",
    canonicalName: "Join The VIP Waitlist",
    definition: "Exclusivity CTA for upcoming brand openings or limited product drops.",
    purpose: "Build pre-launch excitement and qualified email lists.",
    useCases: ["New flagship lounge opening", "Limited seasonal menu release"],
    antiPatterns: ["Leaving waitlist subscribers ignored for months"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [{ targetItemId: "psychology_status_signaling", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.9 }]
  },
  {
    id: "cta_call_us_now_direct",
    type: "CTA",
    canonicalName: "Call Direct Concierge Now",
    definition: "Immediate phone call tap button connecting to live customer manager.",
    purpose: "Capture urgent phone reservations or emergency home services.",
    useCases: ["Emergency plumbing", "Same-day party table booking"],
    antiPatterns: ["Unanswered calls or ringing to busy line"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.91,
    relationships: [{ targetItemId: "psychology_instant_gratification", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.92 }]
  },
  {
    id: "cta_send_us_a_dm",
    type: "CTA",
    canonicalName: "Send Us A Direct Message",
    definition: "Social media native DM prompt inviting informal chat inquiry.",
    purpose: "Engage Gen-Z and millennial audiences on Instagram and TikTok.",
    useCases: ["Salon style customization query", "Custom cake inquiry"],
    antiPatterns: ["Leaving DMs unread for over 24 hours"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.88,
    relationships: [{ targetItemId: "psychology_cognitive_ease", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.89 }]
  },
  {
    id: "cta_view_customer_reviews",
    type: "CTA",
    canonicalName: "Read 500+ Google Reviews",
    definition: "Proof CTA directing user to external verified review ratings.",
    purpose: "Reassure cautious buyers looking for peer validation.",
    useCases: ["Dental clinic promotion", "High-end salon ad"],
    antiPatterns: ["Directing to low rating review pages"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.92,
    relationships: [{ targetItemId: "psychology_social_proof", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.94 }]
  },
  {
    id: "cta_unlock_secret_offer",
    type: "CTA",
    canonicalName: "Unlock Today's Secret Offer",
    definition: "Gamified mystery CTA revealing personalized special discount.",
    purpose: "Drive curiosity clicks and engagement.",
    useCases: ["Cafe secret menu perk", "Salon mystery voucher"],
    antiPatterns: ["Secret offer turns out to be zero discount"],
    scope: "GLOBAL",
    maturity: "DRAFT",
    confidence: 0.89,
    relationships: [{ targetItemId: "psychology_curiosity_gap", relationshipType: "ACTIVATES_PSYCHOLOGY", confidence: 0.9 }]
  }
];
