'use client';

import { useState } from 'react';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { productService } from '@/services/database';

interface ProductsSectionProps {
  businessId: string;
  products: Product[];
  onSaved: (products: Product[]) => void;
  onCancel?: () => void;
}

export function ProductsSection({
  businessId,
  products: initialProducts,
  onSaved,
  onCancel,
}: ProductsSectionProps) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for new/editing item
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState('Main Course');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAdd = () => {
    setEditingId('new');
    setName('');
    setDescription('');
    setPrice(0);
    setOriginalPrice(undefined);
    setCategory('Main Course');
  };

  const startEdit = (p: Product) => {
    setEditingId(p.productId);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(p.price);
    setOriginalPrice(p.originalPrice);
    setCategory(p.category || 'Main Course');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price <= 0) {
      setError('Please provide a valid product name and price.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingId === 'new') {
        const newProduct: Product = {
          productId: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          businessId,
          name,
          description,
          price,
          originalPrice,
          currency: 'INR',
          category,
          tags: [],
          variants: [],
          images: [],
          attributes: {},
          status: 'active',
          sortOrder: productsList.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await productService.create(newProduct);
        const updated = [...productsList, newProduct];
        setProductsList(updated);
        onSaved(updated);
      } else if (editingId) {
        const updateData: Partial<Product> = {
          name,
          description,
          price,
          originalPrice,
          category,
          updatedAt: new Date().toISOString(),
        };
        await productService.update(editingId, updateData);
        const updated = productsList.map((p) =>
          p.productId === editingId ? { ...p, ...updateData } : p
        );
        setProductsList(updated);
        onSaved(updated);
      }
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      await productService.archive(productId);
      const updated = productsList.filter((p) => p.productId !== productId);
      setProductsList(updated);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove product.');
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Product & Service Catalog</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Items Mitra promotes in campaigns, complete with ₹ pricing and descriptions.
          </p>
        </div>
        <Button onClick={startAdd} size="sm">
          + Add Item
        </Button>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        {productsList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-sm text-neutral-500">No products or services added yet.</p>
            <Button onClick={startAdd} variant="outline" size="sm" className="mt-4">
              Add Your First Item
            </Button>
          </div>
        ) : (
          productsList.map((prod) => (
            <div
              key={prod.productId}
              className="transition-hover flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 hover:border-neutral-300"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-neutral-900">{prod.name}</h3>
                  <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
                    {prod.category}
                  </span>
                </div>
                {prod.description && (
                  <p className="mt-1 text-sm text-neutral-500">{prod.description}</p>
                )}
                <div className="text-brand-600 mt-2 flex items-center gap-2 text-sm font-bold">
                  <span>₹{prod.price}</span>
                  {prod.originalPrice && (
                    <span className="text-xs text-neutral-400 line-through">
                      ₹{prod.originalPrice}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(prod)}>
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(prod.productId)}
                  className="rounded-lg p-2 text-xs text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Form Modal inline */}
      {editingId && (
        <form
          onSubmit={handleSaveProduct}
          className="border-brand-200 bg-brand-50/30 mt-6 space-y-4 rounded-xl border p-5"
        >
          <h3 className="font-semibold text-neutral-900">
            {editingId === 'new' ? 'Add New Product / Service' : 'Edit Item'}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Item Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Special Hyderabadi Dum Biryani"
              required
            />
            <Input
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Biryani / Main Course / Starters"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Delicious fragrant rice cooked with aromatic spices..."
              className="focus:border-brand-500 focus:ring-brand-500/20 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Price (₹) *"
              type="number"
              value={price || ''}
              onChange={(e) => setPrice(Number(e.target.value))}
              placeholder="349"
              required
            />
            <Input
              label="Original / MRP Price (₹) Optional"
              type="number"
              value={originalPrice || ''}
              onChange={(e) =>
                setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="449"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      )}

      {onCancel && (
        <div className="flex justify-end border-t border-neutral-100 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
