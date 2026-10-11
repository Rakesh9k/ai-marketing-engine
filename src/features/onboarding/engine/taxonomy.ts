import type { IndustryId } from './fields';

export interface Option {
  id: string;
  label: string;
  hint?: string;
}

export const INDUSTRIES: Array<Option & { id: IndustryId }> = [
  { id: 'restaurant_food', label: 'Restaurant & Food', hint: 'Restaurants, cafes, kitchens' },
  { id: 'salon_beauty', label: 'Salon & Beauty', hint: 'Salons, spas, makeup' },
  { id: 'real_estate', label: 'Real Estate', hint: 'Homes, plots, rentals' },
  { id: 'retail', label: 'Retail', hint: 'Shops and stores' },
  { id: 'professional_services', label: 'Professional Services', hint: 'Consultants, agencies' },
  { id: 'health_wellness', label: 'Healthcare / Wellness', hint: 'Clinics, therapy, care' },
  { id: 'education', label: 'Education', hint: 'Coaching, schools, courses' },
  { id: 'fitness', label: 'Fitness', hint: 'Gyms, studios, trainers' },
  { id: 'hospitality', label: 'Hospitality', hint: 'Hotels, stays, venues' },
  { id: 'home_services', label: 'Home Services', hint: 'Repairs, cleaning, interiors' },
  { id: 'other', label: 'Something else' },
];

export const OTHER_OPTION_ID = 'other';

/** Second-level question per industry: what it asks, and the choices. Extend here, not in JSX. */
export interface SubcategoryConfig {
  prompt: string;
  why: string;
  options: Option[];
}

const other: Option = { id: OTHER_OPTION_ID, label: 'Other' };

export const SUBCATEGORIES: Record<IndustryId, SubcategoryConfig> = {
  restaurant_food: {
    prompt: 'What kind of food business is it?',
    why: 'A cloud kitchen and a fine-dining room need very different marketing.',
    options: [
      { id: 'restaurant', label: 'Restaurant' },
      { id: 'cafe', label: 'Cafe' },
      { id: 'cloud_kitchen', label: 'Cloud Kitchen' },
      { id: 'tiffin_centre', label: 'Tiffin Centre' },
      { id: 'bakery', label: 'Bakery' },
      { id: 'fast_food', label: 'Fast Food' },
      { id: 'fine_dining', label: 'Fine Dining' },
      { id: 'food_truck', label: 'Food Truck' },
      { id: 'catering', label: 'Catering' },
      other,
    ],
  },
  salon_beauty: {
    prompt: 'What kind of beauty business is it?',
    why: 'It tells me who walks in and what they expect to see.',
    options: [
      { id: 'unisex_salon', label: 'Unisex Salon' },
      { id: 'ladies_salon', label: 'Ladies Salon' },
      { id: 'mens_salon', label: "Men's Salon" },
      { id: 'beauty_parlour', label: 'Beauty Parlour' },
      { id: 'spa', label: 'Spa' },
      { id: 'nail_studio', label: 'Nail Studio' },
      { id: 'makeup_studio', label: 'Makeup Studio' },
      { id: 'barbershop', label: 'Barbershop' },
      other,
    ],
  },
  real_estate: {
    prompt: 'What do you mainly work with?',
    why: 'Selling a plot and renting a flat are different stories to tell.',
    options: [
      { id: 'residential', label: 'Residential' },
      { id: 'commercial', label: 'Commercial' },
      { id: 'plots', label: 'Plots' },
      { id: 'luxury_homes', label: 'Luxury Homes' },
      { id: 'rentals', label: 'Rentals' },
      { id: 'property_management', label: 'Property Management' },
      { id: 'investment', label: 'Real Estate Investment' },
      other,
    ],
  },
  retail: {
    prompt: 'What do you mainly sell?',
    why: 'So I know what your shelves, and your customers, look like.',
    options: [
      { id: 'fashion', label: 'Fashion & Apparel' },
      { id: 'grocery', label: 'Grocery & Daily Needs' },
      { id: 'electronics', label: 'Electronics' },
      { id: 'jewellery', label: 'Jewellery' },
      { id: 'gifts_home', label: 'Gifts & Home Decor' },
      { id: 'books_stationery', label: 'Books & Stationery' },
      other,
    ],
  },
  professional_services: {
    prompt: 'What kind of service do you provide?',
    why: 'Trust is the product here, and it is built differently in each field.',
    options: [
      { id: 'consulting', label: 'Consulting' },
      { id: 'legal_finance', label: 'Legal / Finance / Tax' },
      { id: 'agency', label: 'Marketing / Design Agency' },
      { id: 'it_software', label: 'IT & Software' },
      { id: 'photography', label: 'Photography & Events' },
      other,
    ],
  },
  health_wellness: {
    prompt: 'What kind of care do you offer?',
    why: 'Healthcare marketing has to be careful, and I want to get the tone right.',
    options: [
      { id: 'clinic', label: 'Clinic' },
      { id: 'dental', label: 'Dental' },
      { id: 'physio', label: 'Physiotherapy' },
      { id: 'ayurveda', label: 'Ayurveda / Holistic' },
      { id: 'diagnostics', label: 'Diagnostics' },
      { id: 'counselling', label: 'Counselling' },
      other,
    ],
  },
  education: {
    prompt: 'What kind of learning do you offer?',
    why: 'Parents, students and professionals respond to very different messages.',
    options: [
      { id: 'coaching', label: 'Coaching Centre' },
      { id: 'school', label: 'School / Preschool' },
      { id: 'skills', label: 'Skills & Courses' },
      { id: 'music_arts', label: 'Music & Arts' },
      { id: 'online_courses', label: 'Online Courses' },
      other,
    ],
  },
  fitness: {
    prompt: 'What kind of fitness business is it?',
    why: 'Motivation looks different at a gym, a yoga studio and a personal trainer.',
    options: [
      { id: 'gym', label: 'Gym' },
      { id: 'yoga', label: 'Yoga / Pilates' },
      { id: 'crossfit', label: 'CrossFit / Functional' },
      { id: 'personal_training', label: 'Personal Training' },
      { id: 'dance_zumba', label: 'Dance / Zumba' },
      other,
    ],
  },
  hospitality: {
    prompt: 'What kind of stay or venue is it?',
    why: 'Guests are choosing an experience, so I want to know which one.',
    options: [
      { id: 'hotel', label: 'Hotel' },
      { id: 'resort', label: 'Resort' },
      { id: 'homestay', label: 'Homestay' },
      { id: 'banquet', label: 'Banquet / Event Venue' },
      { id: 'travel', label: 'Travel & Tours' },
      other,
    ],
  },
  home_services: {
    prompt: 'What kind of home service do you provide?',
    why: 'People hire these on trust and urgency, and I will write for that.',
    options: [
      { id: 'repairs', label: 'Repairs & Maintenance' },
      { id: 'cleaning', label: 'Cleaning' },
      { id: 'interiors', label: 'Interiors & Painting' },
      { id: 'pest_control', label: 'Pest Control' },
      { id: 'movers', label: 'Packers & Movers' },
      other,
    ],
  },
  // The generic path: no preset list, so the owner describes it in their own words.
  other: {
    prompt: 'In a few words, what does your business do?',
    why: 'I do not want to squeeze you into a box. Your own words work best.',
    options: [],
  },
};

/** Subcategories where customers order from afar rather than walk in. Changes how we phrase things. */
export const DELIVERY_FIRST_SUBCATEGORIES = ['cloud_kitchen', 'tiffin_centre', 'catering'];

/**
 * Starter choices for "what are you known for". They are only prompts: the owner can add their own
 * words, and Mitra's own guesses (when available) appear alongside, marked as guesses.
 */
export const OFFERING_PRESETS: Record<IndustryId, string[]> = {
  restaurant_food: ['Biryani', 'Meals', 'Tiffins', 'Snacks', 'Desserts', 'Beverages', 'Combos'],
  salon_beauty: ['Haircuts', 'Hair colour', 'Facials', 'Bridal makeup', 'Spa & massage', 'Nails'],
  real_estate: ['Apartments', 'Villas', 'Plots', 'Commercial spaces', 'Rentals', 'New launches'],
  retail: ['Clothing', 'Footwear', 'Accessories', 'Electronics', 'Groceries', 'Gifts'],
  professional_services: ['Consultations', 'Audits & filings', 'Design', 'Websites', 'Training'],
  health_wellness: ['Consultations', 'Check-ups', 'Therapy', 'Dental care', 'Diagnostics'],
  education: ['Classes', 'Courses', 'Tuition', 'Workshops', 'Exam prep', 'Online classes'],
  fitness: ['Memberships', 'Personal training', 'Group classes', 'Yoga', 'Diet plans'],
  hospitality: ['Rooms', 'Events & banquets', 'Packages', 'Weekend stays', 'Tours'],
  home_services: ['Repairs', 'Deep cleaning', 'Painting', 'Installation', 'Annual contracts'],
  other: [],
};

const GENERIC_AUDIENCES = [
  'Families',
  'Students',
  'Young professionals',
  'Working professionals',
  'Senior citizens',
  'Local residents',
  'Businesses',
  'Everyone',
];

export const AUDIENCE_PRESETS: Record<IndustryId, string[]> = {
  restaurant_food: [
    'Families',
    'Students',
    'Office crowd',
    'Foodies',
    'Couples',
    'Tourists',
    'Everyone',
  ],
  salon_beauty: [
    'Women',
    'Men',
    'Families',
    'Young professionals',
    'Brides',
    'Premium clients',
    'Students',
    'Everyone',
  ],
  real_estate: [
    'First-time buyers',
    'Families',
    'Investors',
    'Luxury buyers',
    'NRIs',
    'Tenants',
    'Commercial buyers',
  ],
  retail: GENERIC_AUDIENCES,
  professional_services: [
    'Small businesses',
    'Startups',
    'Families',
    'Working professionals',
    'Everyone',
  ],
  health_wellness: ['Families', 'Senior citizens', 'Working professionals', 'Women', 'Everyone'],
  education: [
    'School students',
    'College students',
    'Working professionals',
    'Parents',
    'Everyone',
  ],
  fitness: ['Young professionals', 'Women', 'Students', 'Senior citizens', 'Beginners', 'Everyone'],
  hospitality: ['Families', 'Couples', 'Tourists', 'Business travellers', 'Event hosts'],
  home_services: ['Homeowners', 'Tenants', 'Apartment communities', 'Businesses', 'Everyone'],
  other: GENERIC_AUDIENCES,
};
