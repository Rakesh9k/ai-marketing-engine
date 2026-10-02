'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import type { Business, Product } from '@/types';
import { businessService, productService } from '@/services/database';
import { BusinessSelector } from '@/components/shared/BusinessSelector';
import { MitraMascot } from '@/components/mascot/MitraMascot';
import { Button } from '@/components/ui/Button';

import { ProductCard } from './ProductCard';
import { PageSkeleton } from '@/components/motion/PageSkeleton';
import { ProductInspectorPanel } from './ProductInspectorPanel';

export type ProductCatalogTab = 'products' | 'categories' | 'images';

interface ProductCatalogDashboardProps {
  userId: string;
}

const CATEGORY_CHIPS = [
  { id: 'Biryani & Rice', label: 'Biryani & Rice', count: 8, icon: '🍛' },
  { id: 'Starters & Tandoor', label: 'Starters', count: 6, icon: '🍗' },
  { id: 'Main Course', label: 'Main Course', count: 7, icon: '🍲' },
  { id: 'Beverages & Drinks', label: 'Beverages', count: 4, icon: '🥤' },
  { id: 'Desserts & Sweets', label: 'Desserts', count: 3, icon: '🍨' },
  { id: 'all', label: 'All Categories', count: 28, icon: '📋' },
];

export function ProductCatalogDashboard({ userId }: ProductCatalogDashboardProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [activeTab, setActiveTab] = useState<ProductCatalogTab>('products');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'popularity' | 'price_asc' | 'price_desc' | 'name'>(
    'popularity'
  );

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        const userBusinesses = await businessService.getByUserId(userId);
        setBusinesses(userBusinesses);

        if (userBusinesses.length > 0) {
          const activeBiz = userBusinesses[0];
          if (activeBiz) {
            setSelectedBusinessId(activeBiz.businessId);
            const prods = await productService.listByBusiness(activeBiz.businessId).catch(() => []);
            setProducts(prods);
            if (prods.length > 0) {
              setSelectedProduct(prods[0] || null);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product catalog');
      } finally {
        setLoading(false);
      }
    }
    loadBusinesses();
  }, [userId]);

  const handleSelectBusiness = async (bId: string) => {
    setSelectedBusinessId(bId);
    setLoading(true);
    try {
      const prods = await productService.listByBusiness(bId).catch(() => []);
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProduct(prods[0] || null);
      } else {
        setSelectedProduct(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted products list
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategoryFilter === 'all' || p.category === selectedCategoryFilter;

        const matchesTag = selectedTagFilter === 'all' || p.tags?.includes(selectedTagFilter);

        return matchesSearch && matchesCategory && matchesTag;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, searchQuery, selectedCategoryFilter, selectedTagFilter, sortBy]);

  const bestSellersCount = useMemo(() => {
    return products.filter((p) => p.tags?.includes('Bestseller')).length;
  }, [products]);

  const categoriesCount = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return cats.size;
  }, [products]);

  const handleCreateCreative = (product: Product) => {
    router.push(`/creative?productId=${product.productId}`);
  };

  const handleCreateCampaign = (product: Product) => {
    router.push(`/campaigns/new?productId=${product.productId}`);
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/products/${product.productId}/edit`);
  };

  if (loading) {
    return <PageSkeleton variant="cards" label="Loading Product Catalog" />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h3 className="text-lg font-bold text-red-800">Product Catalog Error</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Sub-bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 text-brand-600 flex h-10 w-10 items-center justify-center rounded-xl text-xl font-bold">
            📦
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Product Catalog</h1>
            <p className="text-xs text-neutral-500">Marketing-Aware Product & Service Library</p>
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
      <div className="to-brand-50 relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="bg-brand-500/10 text-brand-700 border-brand-500/20 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold">
              <span>🏷️ Product Catalog</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
              Your Menu, Your Story. <br className="hidden sm:inline" />
              Crafted for Every Craving.
            </h2>

            <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
              Manage your products, update prices, and create irresistible menu experiences — all in
              one place.
            </p>

            {/* Metric Pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs shadow-sm">
                <span className="text-lg">🛍️</span>
                <div>
                  <span className="block text-base font-black text-neutral-900">
                    {products.length}
                  </span>
                  <span className="font-medium text-neutral-500">Total Products</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs shadow-sm">
                <span className="text-lg">📁</span>
                <div>
                  <span className="block text-base font-black text-neutral-900">
                    {categoriesCount || 6}
                  </span>
                  <span className="font-medium text-neutral-500">Categories</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs shadow-sm">
                <span className="text-lg">🔥</span>
                <div>
                  <span className="block text-base font-black text-neutral-900">
                    {bestSellersCount || 3}
                  </span>
                  <span className="font-medium text-neutral-500">Best Sellers</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-xs shadow-sm">
                <span className="text-lg">📈</span>
                <div>
                  <span className="block text-base font-black text-emerald-600">+12%</span>
                  <span className="font-medium text-neutral-500">Avg. Order Value</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mascot Illustration with Speech Bubble */}
          <div className="relative flex items-center justify-center md:justify-end">
            <motion.div
              initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative flex items-center"
            >
              <div className="absolute -top-4 -left-12 hidden max-w-[180px] rounded-2xl border border-neutral-200 bg-white p-3 text-xs font-bold text-neutral-900 shadow-lg lg:block">
                "Good food brings people together!"
                <div className="absolute right-4 -bottom-2 h-3 w-3 rotate-45 border-r border-b border-neutral-200 bg-white" />
              </div>

              <div className="bg-brand-500/10 relative rounded-full p-4">
                <MitraMascot pose="creating" size="xl" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation Action Bar */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-brand-600 shadow-brand-500/20 text-white shadow-md'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            Products
          </button>
          <Link href="/products/categories">
            <button
              type="button"
              className="rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200"
            >
              Categories
            </button>
          </Link>
          <Link href="/products/images">
            <button
              type="button"
              className="rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-200"
            >
              Product Images
            </button>
          </Link>
        </div>

        <Link href="/products/new">
          <Button
            size="sm"
            className="bg-brand-600 hover:bg-brand-700 w-full font-bold text-white sm:w-auto"
          >
            + Add Product
          </Button>
        </Link>
      </div>

      {/* Search & Filters Bar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, categories, or tags..."
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {CATEGORY_CHIPS.filter((c) => c.id !== 'all').map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
          >
            <option value="popularity">Sort by: Popularity</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>

      {/* Main Workspace Layout (Product Grid + Right Inspector Panel) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Visual Product Cards Grid */}
        <div className="space-y-6 lg:col-span-2">
          {filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
              <MitraMascot pose="explain" size="lg" />
              <h3 className="mt-4 text-lg font-bold text-neutral-900">No products found</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Try adjusting your search query or add a new product item.
              </p>
              <Link href="/products/new" className="mt-6 inline-block">
                <Button size="sm">+ Add Product</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  isSelected={selectedProduct?.productId === product.productId}
                  onSelect={(p) => setSelectedProduct(p)}
                  onCreateCreative={handleCreateCreative}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Inspector Command Center */}
        <div>
          {selectedProduct ? (
            <ProductInspectorPanel
              product={selectedProduct}
              onEdit={handleEditProduct}
              onCreateCreative={handleCreateCreative}
              onCreateCampaign={handleCreateCampaign}
            />
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center text-neutral-400">
              <p className="text-sm font-medium">
                Select a product card to inspect marketing details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Category Quick-Filter Bar */}
      <div className="space-y-3 border-t border-neutral-200 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-900">Explore by Category</span>
          <Link
            href="/products/categories"
            className="text-brand-600 text-xs font-bold hover:underline"
          >
            Manage All Categories →
          </Link>
        </div>

        <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-2">
          {CATEGORY_CHIPS.map((cat) => {
            const active = selectedCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.id)}
                className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-brand-600 shadow-brand-500/20 text-white shadow-md'
                    : 'border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-500'}`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
