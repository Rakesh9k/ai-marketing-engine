'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CategoryManagerProps {
  categories?: string[];
}

export function CategoryManager({
  categories: initialCategories = [
    'Biryani & Rice',
    'Starters & Tandoor',
    'Main Course',
    'Combos & Thalis',
    'Beverages & Drinks',
    'Desserts & Sweets',
  ],
}: CategoryManagerProps) {
  const [categoryList, setCategoryList] = useState<string[]>(initialCategories);
  const [newCatName, setNewCatName] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (categoryList.includes(newCatName.trim())) return;

    setCategoryList([...categoryList, newCatName.trim()]);
    setNewCatName('');
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`Are you sure you want to remove category "${cat}"?`)) {
      setCategoryList(categoryList.filter((c) => c !== cat));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Category Management
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Organize products and services into structured marketing categories.
          </p>
        </div>
        <Link href="/products">
          <Button variant="outline">← Back to Catalog</Button>
        </Link>
      </div>

      {/* Add New Category Form */}
      <form
        onSubmit={handleAddCategory}
        className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
      >
        <div className="flex-1">
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Enter new category name (e.g. Seafood Specials)"
          />
        </div>
        <Button type="submit">Add Category</Button>
      </form>

      {/* Category List Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoryList.map((cat) => (
          <div
            key={cat}
            className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:border-neutral-300"
          >
            <div>
              <h3 className="font-bold text-neutral-900">{cat}</h3>
              <p className="mt-1 text-xs text-neutral-500">Active Category</p>
            </div>
            <button
              type="button"
              onClick={() => handleDeleteCategory(cat)}
              className="rounded-lg p-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
