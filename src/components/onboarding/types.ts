export interface OnboardingService {
  name: string;
  category: 'hair' | 'skin' | 'nails' | 'makeup' | 'bridal' | 'spa' | 'grooming' | 'other';
  price: string;
}

export interface OnboardingPackage {
  name: string;
  price: string;
}

export interface OnboardingProperty {
  title: string;
  propertyType: 'apartment' | 'villa' | 'plot' | 'commercial' | 'other';
  areaSqft: string;
  bedrooms: string;
  bathrooms: string;
  price: string;
  possessionStatus: 'ready_to_move' | 'under_construction' | 'upcoming';
}

export interface BusinessHoursState {
  openDays: string[];
  openTime: string;
  closeTime: string;
  open7Days: boolean;
}

export interface OnboardingFormData {
  name: string;
  category: 'restaurant' | 'salon' | 'real_estate' | 'other';
  description?: string;
  city: string;
  state: string;
  locality?: string;
  address?: string;
  pincode?: string;
  phone: string;
  whatsapp: string;
  email?: string;
  dining: 'dine-in' | 'takeaway' | 'delivery';
  businessHours: BusinessHoursState;
  services: OnboardingService[];
  packages: OnboardingPackage[];
  bookingChannel: 'whatsapp' | 'phone' | 'in_person';
  properties: OnboardingProperty[];
  language: 'en' | 'te' | 'hi' | 'ta' | 'te_en' | 'hi_en';
  goals: string[];
  regionalStyle: string;
  contentStyle: string;
}

export interface StepErrors {
  name?: string;
  category?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  dining?: string;
  services?: string;
  properties?: string;
  language?: string;
  regionalStyle?: string;
  contentStyle?: string;
  general?: string;
}
