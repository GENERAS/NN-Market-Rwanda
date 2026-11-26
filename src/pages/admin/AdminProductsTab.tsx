import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Upload, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category, Product } from '../../types';
import { formatPriceRwf } from '../../utils/validation';

export const AdminProductsTab: React.FC<{ onDataChanged: () => void }> = ({ onDataChanged }) => {
  const { adminToken } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Product editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formState, setFormState] = useState({
    category_id: '',
    name_en: '',
    name_rw: '',
    slug: '',
    short_description_en: '',
    short_description_rw: '',
    full_description_en: '',
    full_description_rw: '',
    main_image: '',
    price_rwf: '',
    quantity_label: '',
    ingredients_en: '',
    ingredients_rw: '',
    manufacturer_info: '',
    classification: 'nutritional_supplement',
    availability_status: 'available',
    verification_status: 'verified',
    is_featured: false,
    is_published: true,
    seo_title: '',
    seo_description: '',
  });
  const [uploading, setUploading] = useState(false);

  // Category quick form
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameRw, setCatNameRw] = useState('');
  const [catDescEn, setCatDescEn] = useState('');

  const loadData = useCallback(async () => {
    if (!adminToken) return;
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/products', { headers: { Authorization: `Bearer ${adminToken}` } }),
        fetch('/api/admin/categories', { headers: { Authorization: `Bearer ${adminToken}` } }),
      ]);
      const pData = await pRes.json();
      const cData = await cRes.json();
      setProducts(pData.items || []);
      setCategories(cData.items || []);
    } catch {
      setError('Could not load products or categories.');
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openNewProduct() {
    setEditingId(null);
    setFormState({
      category_id: categories[0]?.id || '',
      name_en: '',
      name_rw: '',
      slug: '',
      short_description_en: '',
      short_description_rw: '',
      full_description_en: '',
      full_description_rw: '',
      main_image: '',
      price_rwf: '',
      quantity_label: '',
      ingredients_en: '',
      ingredients_rw: '',
      manufacturer_info: '',
      classification: 'nutritional_supplement',
      availability_status: 'available',
      verification_status: 'verified',
      is_featured: false,
      is_published: true,
      seo_title: '',
      seo_description: '',
    });
    setShowProductForm(true);
    setNotice(null);
    setError(null);
  }

  function openEditProduct(p: Product) {
    setEditingId(p.id);
    setFormState({
      category_id: p.category_id,
      name_en: p.name_en,
      name_rw: p.name_rw,
      slug: p.slug,
      short_description_en: p.short_description_en,
      short_description_rw: p.short_description_rw,
      full_description_en: p.full_description_en,
      full_description_rw: p.full_description_rw,
      main_image: p.main_image,
      price_rwf: p.price_rwf !== null && p.price_rwf !== undefined ? String(p.price_rwf) : '',
      quantity_label: p.quantity_label,
      ingredients_en: p.ingredients_en,
      ingredients_rw: p.ingredients_rw,
      manufacturer_info: p.manufacturer_info,
      classification: p.classification,
      availability_status: p.availability_status,
      verification_status: p.verification_status,
      is_featured: p.is_featured === 1,
      is_published: p.is_published === 1,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
    });
    setShowProductForm(true);
    setNotice(null);
    setError(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setFormState((prev) => ({ ...prev, main_image: data.url }));
      setNotice('Image uploaded successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    setError(null);
    setNotice(null);

    const payload = {
      ...formState,
      price_rwf: formState.price_rwf.trim() === '' ? null : Number(formState.price_rwf),
    };

    const url = editingId ? `/api/admin/products/${editingId}` : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to save product.');
      return;
    }

    setShowProductForm(false);
    setNotice(editingId ? 'Product updated successfully.' : 'Product created successfully.');
    await loadData();
    onDataChanged();
  }

  async function handleDeleteProduct(id: string) {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      setNotice('Product archived or removed.');
      await loadData();
      onDataChanged();
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken || !catNameEn.trim()) return;
    setError(null);
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name_en: catNameEn,
        name_rw: catNameRw || catNameEn,
        description_en: catDescEn,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not add category.');
      return;
    }
    setCatNameEn('');
    setCatNameRw('');
    setCatDescEn('');
    setNotice('Category added.');
    await loadData();
    onDataChanged();
  }

  return (
    <div className="space-y-8">
      {notice && (
        <div className="p-3.5 rounded-md bg-[#F1F7F1] border border-[#26733E]/30 text-sm text-[#26733E] font-medium">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="p-3.5 rounded-md bg-red-50 border border-[#C0392B]/30 text-sm text-[#C0392B]">
          {error}
        </div>
      )}

      {/* Products Section */}
      <section className="bg-white border border-[#E9E7E1] rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#252B25]">Products Catalogue</h2>
            <p className="text-xs text-[#647067]">Create, verify pricing, upload product photos, and control publication.</p>
          </div>
          <button
            type="button"
            onClick={openNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] rounded-md bg-[#26733E] text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Product
          </button>
        </div>

        {showProductForm && (
          <form onSubmit={handleSaveProduct} className="mb-8 p-5 rounded-lg bg-[#FBF7EF] border border-[#E9E7E1] space-y-4">
            <h3 className="text-base font-bold text-[#252B25]">
              {editingId ? 'Edit Product' : 'New Product'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Product Name (English) *</label>
                <input
                  type="text"
                  required
                  value={formState.name_en}
                  onChange={(e) => setFormState({ ...formState, name_en: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Product Name (Kinyarwanda)</label>
                <input
                  type="text"
                  value={formState.name_rw}
                  onChange={(e) => setFormState({ ...formState, name_rw: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Category *</label>
                <select
                  value={formState.category_id}
                  onChange={(e) => setFormState({ ...formState, category_id: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Price (RWF, leave blank if unverified)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={formState.price_rwf}
                  onChange={(e) => setFormState({ ...formState, price_rwf: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Classification</label>
                <select
                  value={formState.classification}
                  onChange={(e) => setFormState({ ...formState, classification: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                >
                  <option value="nutritional_supplement">Nutritional Supplement</option>
                  <option value="food_product">Food Product</option>
                  <option value="wellness_product">Wellness Product</option>
                  <option value="registered_medicine">Registered Medicine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Availability</label>
                <select
                  value={formState.availability_status}
                  onChange={(e) => setFormState({ ...formState, availability_status: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                >
                  <option value="available">Available</option>
                  <option value="awaiting_confirmation">Awaiting confirmation</option>
                  <option value="out_of_stock">Out of stock</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Verification Status</label>
                <select
                  value={formState.verification_status}
                  onChange={(e) => setFormState({ ...formState, verification_status: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                >
                  <option value="verified">Verified</option>
                  <option value="awaiting_confirmation">Awaiting confirmation</option>
                  <option value="not_available">Not currently available</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Package Size / Quantity</label>
                <input
                  type="text"
                  value={formState.quantity_label}
                  onChange={(e) => setFormState({ ...formState, quantity_label: e.target.value })}
                  placeholder="e.g. 60 Capsules"
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Product Image URL or Upload</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={formState.main_image}
                    onChange={(e) => setFormState({ ...formState, main_image: e.target.value })}
                    placeholder="/uploads/..."
                    className="flex-1 min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                  />
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[42px] rounded-md bg-white border border-[#E9E7E1] text-xs font-semibold text-[#252B25] cursor-pointer hover:border-[#A87936]">
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="sr-only" />
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Short Description (English)</label>
                <textarea
                  rows={2}
                  value={formState.short_description_en}
                  onChange={(e) => setFormState({ ...formState, short_description_en: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Short Description (Kinyarwanda)</label>
                <textarea
                  rows={2}
                  value={formState.short_description_rw}
                  onChange={(e) => setFormState({ ...formState, short_description_rw: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Full Description (English)</label>
                <textarea
                  rows={3}
                  value={formState.full_description_en}
                  onChange={(e) => setFormState({ ...formState, full_description_en: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">Verified Ingredients (English)</label>
                <input
                  type="text"
                  value={formState.ingredients_en}
                  onChange={(e) => setFormState({ ...formState, ingredients_en: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#252B25] mb-1">SEO Title</label>
                <input
                  type="text"
                  value={formState.seo_title}
                  onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                  className="w-full min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E9E7E1] rounded-md"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#252B25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.is_published}
                  onChange={(e) => setFormState({ ...formState, is_published: e.target.checked })}
                  className="w-4 h-4 accent-[#26733E]"
                />
                Published publicly
              </label>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-[#252B25] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.is_featured}
                  onChange={(e) => setFormState({ ...formState, is_featured: e.target.checked })}
                  className="w-4 h-4 accent-[#26733E]"
                />
                Featured on Homepage
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[42px] rounded-md bg-[#26733E] text-white text-sm font-semibold"
              >
                Save Product
              </button>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="px-5 py-2.5 min-h-[42px] rounded-md bg-white border border-[#E9E7E1] text-sm font-semibold text-[#252B25]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-[#647067]">Loading products...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E9E7E1] text-xs text-[#647067]">
                  <th className="py-2.5 pr-4 font-semibold">Product</th>
                  <th className="py-2.5 pr-4 font-semibold">Category</th>
                  <th className="py-2.5 pr-4 font-semibold text-right">Price</th>
                  <th className="py-2.5 pr-4 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E7E1]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBF7EF]/60">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-[#252B25]">{p.name_en}</div>
                      <div className="text-xs text-[#647067]">/{p.slug}</div>
                    </td>
                    <td className="py-3 pr-4 text-[#647067]">{p.category_name_en}</td>
                    <td className="py-3 pr-4 text-right font-medium tabular-nums">
                      {formatPriceRwf(p.price_rwf, p.currency)}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <span className={p.is_published === 1 && p.is_archived === 0 ? 'text-[#26733E] font-semibold' : 'text-[#647067]'}>
                        {p.is_archived === 1 ? 'Archived' : p.is_published === 1 ? 'Published' : 'Draft'}
                      </span>
                      <span className="text-[#647067]"> · {p.availability_status}</span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        aria-label={`Edit ${p.name_en}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#26733E] hover:bg-[#F1F7F1] rounded mr-1"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        aria-label={`Delete or archive ${p.name_en}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#C0392B] hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="bg-white border border-[#E9E7E1] rounded-lg p-6">
        <h2 className="text-lg font-bold text-[#252B25] mb-4">Product Categories</h2>
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
          <input
            type="text"
            required
            value={catNameEn}
            onChange={(e) => setCatNameEn(e.target.value)}
            placeholder="Category Name (EN)"
            className="min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
          />
          <input
            type="text"
            value={catNameRw}
            onChange={(e) => setCatNameRw(e.target.value)}
            placeholder="Name (Kinyarwanda)"
            className="min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
          />
          <input
            type="text"
            value={catDescEn}
            onChange={(e) => setCatDescEn(e.target.value)}
            placeholder="Short description"
            className="min-h-[42px] px-3 py-2 text-sm border border-[#E9E7E1] rounded-md"
          />
          <button
            type="submit"
            className="min-h-[42px] px-4 py-2 rounded-md bg-[#A87936] text-white text-sm font-semibold"
          >
            Add Category
          </button>
        </form>

        <div className="divide-y divide-[#E9E7E1] border-t border-[#E9E7E1]">
          {categories.map((cat) => (
            <div key={cat.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-[#252B25]">{cat.name_en}</span>
                <span className="text-[#647067]"> / {cat.name_rw}</span>
                <span className="text-xs text-[#647067] ml-2">({cat.slug})</span>
              </div>
              <span className="text-xs text-[#647067] tabular-nums">{cat.product_count ?? 0} products</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
