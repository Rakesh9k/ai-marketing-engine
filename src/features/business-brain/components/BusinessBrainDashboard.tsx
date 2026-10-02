'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { Business, BrandKit, Product, BusinessBrainContext } from '@/types';
import { businessService, brandKitService, productService } from '@/services/database';
import { getBusinessBrainContext } from '../services/businessBrainService';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

// Section Components
import { BusinessProfileSection } from './BusinessProfileSection';
import { BrandProfileSection } from './BrandProfileSection';
import { ProductsSection } from './ProductsSection';
import { LocationsSection } from './LocationsSection';
import { OffersSection } from './OffersSection';
import { AudienceSection } from './AudienceSection';
import { PreferencesSection } from './PreferencesSection';
import { LocalizationSection } from './LocalizationSection';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { RulesSection } from './RulesSection';

export type BusinessBrainTab =
  | 'all'
  | 'profile'
  | 'brand'
  | 'products'
  | 'locations'
  | 'offers'
  | 'audience'
  | 'preferences'
  | 'localization'
  | 'rules';

interface BusinessBrainDashboardProps {
  userId: string;
  initialTab?: BusinessBrainTab;
}

const TABS: Array<{ id: BusinessBrainTab; label: string; icon: string }> = [
  { id: 'all', label: 'All Sections', icon: '⚡' },
  { id: 'profile', label: 'Business Profile', icon: '🏪' },
  { id: 'brand', label: 'Brand Profile', icon: '🎨' },
  { id: 'products', label: 'Products & Services', icon: '📦' },
  { id: 'locations', label: 'Locations', icon: '📍' },
  { id: 'offers', label: 'Offers & Deals', icon: '🏷️' },
  { id: 'audience', label: 'Customers / Audience', icon: '🎯' },
  { id: 'preferences', label: 'Marketing Preferences', icon: '⚙️' },
  { id: 'localization', label: 'Localization', icon: '🌐' },
  { id: 'rules', label: 'Business Rules', icon: '🛡️' },
];

export function BusinessBrainDashboard({
  userId,
  initialTab = 'all',
}: BusinessBrainDashboardProps) {
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<BusinessBrainTab>(initialTab);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brainContext, setBrainContext] = useState<BusinessBrainContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial business data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const userBusinesses = await businessService.getByUserId(userId);
        setBusinesses(userBusinesses);

        if (userBusinesses.length > 0) {
          const activeBiz = userBusinesses[0];
          if (activeBiz) {
            setSelectedBusinessId(activeBiz.businessId);
            setBusiness(activeBiz);

            const [kit, prods, ctx] = await Promise.all([
              brandKitService.get(activeBiz.businessId).catch(() => null),
              productService.listByBusiness(activeBiz.businessId).catch(() => []),
              getBusinessBrainContext(userId, activeBiz.businessId).catch(() => null),
            ]);

            setBrandKit(kit);
            setProducts(prods);
            setBrainContext(ctx);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Business Brain');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [userId]);

  // Handle business change
  const handleSelectBusiness = async (bId: string) => {
    setSelectedBusinessId(bId);
    const found = businesses.find((b) => b.businessId === bId);
    if (found) {
      setBusiness(found);
      setLoading(true);
      try {
        const [kit, prods, ctx] = await Promise.all([
          brandKitService.get(bId).catch(() => null),
          productService.listByBusiness(bId).catch(() => []),
          getBusinessBrainContext(userId, bId).catch(() => null),
        ]);
        setBrandKit(kit);
        setProducts(prods);
        setBrainContext(ctx);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Completion calculation
  const completionScore = useMemo(() => {
    if (!business) return 0;
    let score = 0;
    if (business.name && business.location?.city) score += 20;
    if (brandKit?.colors?.primary) score += 20;
    if (products.length > 0) score += 20;
    if (business.contact?.whatsapp) score += 15;
    if (business.businessBrain?.audience?.targetCustomer) score += 15;
    if (business.businessBrain?.localization?.primaryLanguage) score += 10;
    return Math.min(100, score);
  }, [business, brandKit, products]);

  if (loading) {
    return <PageSkeleton variant="cards" label="Loading Mitra Business Brain" />;
  }

  if (error || !business) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h3 className="text-lg font-bold text-red-800">Business Brain Unavailable</h3>
        <p className="mt-2 text-sm text-red-600">{error || 'No active business profile found.'}</p>
        <Link href="/onboarding" className="mt-4 inline-block">
          <Button>Complete Onboarding</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Sub-bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 text-brand-600 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold">
            🧠
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Business Brain</h1>
            <p className="text-xs text-neutral-500">
              Persistent Intelligence Layer for Mitra AI Marketing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-56">
            <BusinessSelector
              businesses={businesses}
              selectedBusinessId={selectedBusinessId}
              onSelect={handleSelectBusiness}
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
            <span>⚡ Credits: 320</span>
          </div>
        </div>
      </div>

      {/* Hero Banner with Mascot */}
      <div className="to-brand-950 relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-800 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="text-brand-300 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
              <span>✨ AI Context Core</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Your Business. Mitra's Understanding.
            </h2>

            <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
              Teach Mitra how your business operates, speaks, and sells so every campaign is 100% on
              brand, accurate, and high converting.
            </p>

            {/* Metric Pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-sm">
                <span className="text-emerald-400">●</span>
                <span>Complete Profile {completionScore}%</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-sm">
                <span className="text-brand-400">📈</span>
                <span>Better Campaigns +60%</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-sm">
                <span className="text-amber-400">🎯</span>
                <span>More Customers +45%</span>
              </div>
            </div>
          </div>

          {/* Mascot Illustration with Glowing Speech Bubble */}
          <div className="relative flex items-center justify-center md:justify-end">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center"
            >
              {/* Speech bubble */}
              <div className="absolute -top-4 -left-12 hidden max-w-[180px] animate-bounce rounded-2xl border border-neutral-200 bg-white p-3 text-xs font-bold text-neutral-900 shadow-lg lg:block">
                "The more you share, the smarter I get!"
                <div className="absolute right-4 -bottom-2 h-3 w-3 rotate-45 border-r border-b border-neutral-200 bg-white" />
              </div>

              <div className="bg-brand-500/20 relative rounded-full p-4 backdrop-blur-md">
                <MitraMascot pose="remembering" size="xl" animated />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 9 Section Navigation Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto border-b border-neutral-200 pb-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 hover:text-neutral-900'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Interactive Section Editor or Overview Grid */}
        <div className="space-y-6 lg:col-span-2">
          {activeTab === 'all' && (
            <div className="space-y-6">
              {/* Overview Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 1. Business Profile Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🏪</span>
                        <h3 className="font-bold text-neutral-900">Business Profile</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Complete
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Core identity, category, address & contact info
                    </p>
                    <div className="mt-4 space-y-1 text-xs text-neutral-700">
                      <p>
                        <span className="font-semibold text-neutral-900">Name:</span>{' '}
                        {business.name}
                      </p>
                      <p>
                        <span className="font-semibold text-neutral-900">Category:</span>{' '}
                        {business.category}
                      </p>
                      <p>
                        <span className="font-semibold text-neutral-900">Location:</span>{' '}
                        {business.location?.city}, {business.location?.state}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('profile')}
                  >
                    Edit Business Profile
                  </Button>
                </div>

                {/* 2. Brand Profile Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🎨</span>
                        <h3 className="font-bold text-neutral-900">Brand Guidelines</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Active
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Tone of voice, colors & typography rules
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex gap-1">
                        <div
                          className="h-6 w-6 rounded-full border border-neutral-200"
                          style={{ backgroundColor: brandKit?.colors?.primary || '#E84D1A' }}
                        />
                        <div
                          className="h-6 w-6 rounded-full border border-neutral-200"
                          style={{ backgroundColor: brandKit?.colors?.secondary || '#1F2126' }}
                        />
                        <div
                          className="h-6 w-6 rounded-full border border-neutral-200"
                          style={{ backgroundColor: brandKit?.colors?.accent || '#FFD700' }}
                        />
                      </div>
                      <span className="text-xs font-medium text-neutral-700 capitalize">
                        {brandKit?.tone || 'Friendly & Professional'}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('brand')}
                  >
                    Edit Brand Guidelines
                  </Button>
                </div>

                {/* 3. Products & Services Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📦</span>
                        <h3 className="font-bold text-neutral-900">Products & Services</h3>
                      </div>
                      <span className="bg-brand-100 text-brand-800 rounded-full px-2.5 py-0.5 text-xs font-bold">
                        {products.length} Items
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Items Mitra promotes with prices & combos
                    </p>
                    <div className="mt-3 text-xs text-neutral-700">
                      {products.slice(0, 2).map((p) => (
                        <p key={p.productId} className="truncate">
                          • {p.name} - ₹{p.price}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('products')}
                  >
                    Manage Products
                  </Button>
                </div>

                {/* 4. Locations Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">📍</span>
                        <h3 className="font-bold text-neutral-900">Locations & Radius</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Active
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Service coverage area & local outlet address
                    </p>
                    <p className="mt-3 text-xs text-neutral-700">
                      Delivery Radius:{' '}
                      <span className="font-semibold text-neutral-900">
                        {business.businessBrain?.businessRules?.deliveryRadiusKm || 10} km
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('locations')}
                  >
                    Edit Locations
                  </Button>
                </div>

                {/* 5. Offers & Deals Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🏷️</span>
                        <h3 className="font-bold text-neutral-900">Offers & Deals</h3>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                        Configured
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Active discounts, festive combos & pricing rules
                    </p>
                    <p className="mt-3 truncate text-xs text-neutral-700">
                      {business.businessBrain?.businessRules?.offerValidityRules ||
                        'Weekend specials & discounts'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('offers')}
                  >
                    Manage Offers
                  </Button>
                </div>

                {/* 6. Customers / Audience Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🎯</span>
                        <h3 className="font-bold text-neutral-900">Target Audience</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Defined
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Demographics, key customer personas & needs
                    </p>
                    <p className="mt-3 truncate text-xs text-neutral-700">
                      {business.businessBrain?.audience?.targetCustomer ||
                        'Food lovers & local residents'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('audience')}
                  >
                    Edit Audience
                  </Button>
                </div>

                {/* 7. Marketing Preferences Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">⚙️</span>
                        <h3 className="font-bold text-neutral-900">Preferences</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Set
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Channels, fulfillment modes & CTAs
                    </p>
                    <p className="mt-3 text-xs font-semibold text-neutral-700 capitalize">
                      Mode:{' '}
                      {business.businessBrain?.businessRules?.operatingMode || 'Dine-in & Delivery'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('preferences')}
                  >
                    Edit Preferences
                  </Button>
                </div>

                {/* 8. Localization Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🌐</span>
                        <h3 className="font-bold text-neutral-900">Localization</h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Configured
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Language mix, regional slang & festive tone
                    </p>
                    <p className="mt-3 text-xs text-neutral-700 capitalize">
                      Dialect: {business.businessBrain?.localization?.regionalStyle || 'Hyderabadi'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('localization')}
                  >
                    Edit Localization
                  </Button>
                </div>

                {/* 9. Business Rules Card */}
                <div className="hover:border-brand-300 flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:col-span-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🛡️</span>
                        <h3 className="font-bold text-neutral-900">
                          AI Guardrails & Negative Keywords
                        </h3>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        Active Protection
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                      Truth check rules, pricing verification & prohibited words
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setActiveTab('rules')}
                  >
                    Edit Business Rules
                  </Button>
                </div>
              </div>

              {/* Mascot Story Banner */}
              <div className="from-brand-500 flex items-center justify-between rounded-2xl bg-gradient-to-r to-amber-500 p-5 text-white shadow-md">
                <div className="space-y-1">
                  <h4 className="text-base font-extrabold">Mitra is learning every day!</h4>
                  <p className="text-brand-100 text-xs">
                    Keep your Business Brain updated to unlock higher converting campaign
                    recommendations.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setActiveTab('products')}
                >
                  Add New Products
                </Button>
              </div>
            </div>
          )}

          {/* Active Tab Editors */}
          {activeTab === 'profile' && (
            <BusinessProfileSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'brand' && (
            <BrandProfileSection
              businessId={business.businessId}
              brandKit={brandKit}
              onSaved={(kit) => setBrandKit(kit)}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'products' && (
            <ProductsSection
              businessId={business.businessId}
              products={products}
              onSaved={(prods) => setProducts(prods)}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'locations' && (
            <LocationsSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'offers' && (
            <OffersSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'audience' && (
            <AudienceSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'preferences' && (
            <PreferencesSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'localization' && (
            <LocalizationSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}

          {activeTab === 'rules' && (
            <RulesSection
              business={business}
              onSaved={(upd) => setBusiness({ ...business, ...upd })}
              onCancel={() => setActiveTab('all')}
            />
          )}
        </div>

        {/* Right Sidebar: Health Progress & AI Insights */}
        <div className="space-y-6">
          {/* Business Brain Health Progress */}
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-neutral-900">Business Brain Health</h3>

            <div className="flex items-center gap-4">
              <div className="bg-brand-50 border-brand-500 relative flex h-20 w-20 items-center justify-center rounded-full border-4">
                <span className="text-brand-600 text-xl font-extrabold">{completionScore}%</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">Mitra's Understanding</p>
                <p className="text-xs text-neutral-500">
                  Higher score = better targeting & conversion
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 border-t border-neutral-100 pt-2 text-xs">
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-2">✓ Business Identity</span>
                <span className="font-semibold text-emerald-600">100%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-2">✓ Brand Colors & Tone</span>
                <span className="font-semibold text-emerald-600">100%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-2">✓ Product Catalog</span>
                <span className="font-semibold text-emerald-600">
                  {products.length > 0 ? '80%' : '20%'}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-700">
                <span className="flex items-center gap-2">✓ Service Radius</span>
                <span className="font-semibold text-emerald-600">100%</span>
              </div>
              <div className="flex items-center justify-between text-neutral-500">
                <span className="flex items-center gap-2">○ Festive Offers</span>
                <span className="font-semibold text-amber-600">50%</span>
              </div>
            </div>
          </div>

          {/* AI Insights Widget */}
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900">
              <span className="text-lg">💡</span>
              <h4 className="text-sm font-bold">Mitra AI Smart Suggestion</h4>
            </div>
            <p className="text-xs leading-relaxed text-amber-800">
              Add 2 more festive combo offers to boost your upcoming weekend campaign performance by
              +35%!
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setActiveTab('offers')}
            >
              Add Festive Combos
            </Button>
          </div>

          {/* Update Reminder Mascot Card */}
          <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex justify-center">
              <MitraMascot pose="curious" size="lg" />
            </div>
            <h4 className="text-sm font-bold text-neutral-900">Need to update something?</h4>
            <p className="text-xs text-neutral-500">
              You can update your business rules anytime or ask Mitra for assistance.
            </p>
            <Link href="/assistant" className="inline-block w-full">
              <Button size="sm" variant="outline" className="w-full">
                Ask Mitra Assistant
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
