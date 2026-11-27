import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category, Product } from '../../types';
import { formatPriceRwf } from '../../utils/validation';

type ModalTab = 'basics' | 'details' | 'publish';

export const AdminProductsTab: React.FC<{ onDataChanged: () => void }> = ({ onDataChanged }) => {
  const { adminToken } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Zero-Scroll Product Modal State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('basics');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    gallery_images: [] as string[],
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
    is_archived: false,
    seo_title: '',
    seo_description: '',
  });

  // Category quick form
  const [showCatForm, setShowCatForm] = useState(false);
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
    setModalTab('basics');
    setManualImageUrl('');
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
      gallery_images: [],
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
      is_archived: false,
      seo_title: '',
      seo_description: '',
    });
    setShowProductModal(true);
    setNotice(null);
    setError(null);
  }

  function openEditProduct(p: Product) {
    const initialGallery = Array.isArray(p.gallery_images) && p.gallery_images.length > 0
      ? p.gallery_images
      : p.main_image
        ? [p.main_image]
        : [];
    setEditingId(p.id);
    setModalTab('basics');
    setManualImageUrl('');
    setFormState({
      category_id: p.category_id,
      name_en: p.name_en,
      name_rw: p.name_rw,
      slug: p.slug,
      short_description_en: p.short_description_en,
      short_description_rw: p.short_description_rw,
      full_description_en: p.full_description_en,
      full_description_rw: p.full_description_rw,
      main_image: p.main_image || initialGallery[0] || '',
      gallery_images: initialGallery,
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
      is_archived: p.is_archived === 1,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
    });
    setShowProductModal(true);
    setNotice(null);
    setError(null);
  }

  async function handleMultiImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !adminToken) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      files.slice(0, 8).forEach((file) => fd.append('images', file));
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image upload failed');
      const uploadedUrls: string[] = Array.isArray(data.urls) ? data.urls : data.url ? [data.url] : [];
      setFormState((prev) => {
        const merged = [...prev.gallery_images];
        for (const u of uploadedUrls) {
          if (u && !merged.includes(u) && merged.length < 8) {
            merged.push(u);
          }
        }
        return {
          ...prev,
          gallery_images: merged,
          main_image: prev.main_image || merged[0] || '',
        };
      });
      setNotice(`${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'} uploaded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function addManualImage() {
    const trimmed = manualImageUrl.trim();
    if (!trimmed) return;
    setFormState((prev) => {
      if (prev.gallery_images.includes(trimmed) || prev.gallery_images.length >= 8) {
        return prev;
      }
      const next = [...prev.gallery_images, trimmed];
      return {
        ...prev,
        gallery_images: next,
        main_image: prev.main_image || trimmed,
      };
    });
    setManualImageUrl('');
  }

  function setMainImageUrl(url: string) {
    setFormState((prev) => {
      const reordered = [url, ...prev.gallery_images.filter((item) => item !== url)];
      return {
        ...prev,
        main_image: url,
        gallery_images: reordered,
      };
    });
  }

  function removeGalleryImage(url: string) {
    setFormState((prev) => {
      const nextGallery = prev.gallery_images.filter((item) => item !== url);
      const nextMain = prev.main_image === url ? nextGallery[0] || '' : prev.main_image;
      return {
        ...prev,
        gallery_images: nextGallery,
        main_image: nextMain,
      };
    });
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!adminToken) return;
    if (!formState.name_en.trim() || !formState.category_id) {
      setError('Product Name (EN) and Category are required.');
      setModalTab('basics');
      return;
    }

    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      const payload = {
        ...formState,
        main_image: formState.main_image || formState.gallery_images[0] || '',
        gallery_images: formState.gallery_images,
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

      setShowProductModal(false);
      setNotice(editingId ? 'Product updated successfully.' : 'Product created successfully.');
      await loadData();
      onDataChanged();
    } catch {
      setError('Network error while saving product.');
    } finally {
      setSaving(false);
    }
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
    setShowCatForm(false);
    setNotice('Category added.');
    await loadData();
    onDataChanged();
  }

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || p.name_en.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && p.is_published === 1 && p.is_archived === 0) ||
      (statusFilter === 'draft' && p.is_published === 0 && p.is_archived === 0) ||
      (statusFilter === 'archived' && p.is_archived === 1);
    return matchesSearch && matchesStatus;
  });

  const modalTabs: Array<{ id: ModalTab; label: string }> = [
    { id: 'basics', label: '1. Basics & Photos' },
    { id: 'details', label: '2. Details & Story' },
    { id: 'publish', label: '3. Status & SEO' },
  ];

  const currentTabIndex = modalTabs.findIndex((item) => item.id === modalTab);

  return (
    <div className="space-y-6">
      {notice && !showProductModal && (
        <div className="p-3.5 rounded-lg bg-[#EEF5F0] border border-[#1F5138]/30 text-sm text-[#1F5138] font-medium">
          {notice}
        </div>
      )}
      {error && !showProductModal && (
        <div role="alert" className="p-3.5 rounded-lg bg-red-50 border border-[#B83227]/30 text-sm text-[#B83227]">
          {error}
        </div>
      )}

      {/* Products Catalogue */}
      <section className="bg-white border border-[#E5DEC9] rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#1E2420]">Products Catalogue</h2>
            <p className="text-xs text-[#5C6760]">
              Tap + Add Product to upload multiple photos and edit without long scrolling.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewProduct}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Product
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter products..."
            className="sm:col-span-2 min-h-[42px] px-3 py-2 text-sm border border-[#E5DEC9] rounded-md bg-[#F9F5EC]/50 text-[#1E2420]"
          />
          <select
            aria-label="Filter products by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft' | 'archived')}
            className="min-h-[42px] px-3 py-2 text-sm border border-[#E5DEC9] rounded-md bg-white text-[#1E2420]"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[#5C6760]">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-[#5C6760]">No products match your filter.</p>
        ) : (
          <>
            {/* Mobile Product Cards */}
            <div className="md:hidden space-y-3">
              {filteredProducts.map((p) => {
                const photoCount = p.gallery_images?.length || (p.main_image ? 1 : 0);
                return (
                  <div key={p.id} className="p-3.5 rounded-lg border border-[#E5DEC9] bg-[#F9F5EC]/60 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-md bg-[#EEF5F0] border border-[#E5DEC9] overflow-hidden shrink-0 flex items-center justify-center">
                        {p.main_image ? (
                          <img src={p.main_image} alt={p.name_en} className="w-full h-full object-cover" />
                        ) : (
                          <ImagePlus className="w-5 h-5 text-[#5C6760]" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-[#1E2420] truncate">{p.name_en}</div>
                        <div className="text-xs text-[#5C6760]">
                          {p.category_name_en} · {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#1F5138] tabular-nums">
                            {formatPriceRwf(p.price_rwf, p.currency)}
                          </span>
                          <span className={p.is_published === 1 && p.is_archived === 0 ? 'text-[#1F5138] font-semibold' : 'text-[#5C6760]'}>
                            {p.is_archived === 1 ? 'Archived' : p.is_published === 1 ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-md bg-white border border-[#E5DEC9] text-xs font-semibold text-[#1F5138]"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-md bg-white border border-[#E5DEC9] text-xs font-semibold text-[#B83227]"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Archive
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Products Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5DEC9] text-xs text-[#5C6760]">
                    <th className="py-2.5 pr-4 font-semibold">Product</th>
                    <th className="py-2.5 pr-4 font-semibold">Category</th>
                    <th className="py-2.5 pr-4 font-semibold">Photos</th>
                    <th className="py-2.5 pr-4 font-semibold text-right">Price</th>
                    <th className="py-2.5 pr-4 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DEC9]">
                  {filteredProducts.map((p) => {
                    const photoCount = p.gallery_images?.length || (p.main_image ? 1 : 0);
                    return (
                      <tr key={p.id} className="hover:bg-[#F9F5EC]/60">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-[#EEF5F0] border border-[#E5DEC9] overflow-hidden shrink-0 flex items-center justify-center">
                              {p.main_image ? (
                                <img src={p.main_image} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <ImagePlus className="w-4 h-4 text-[#5C6760]" aria-hidden="true" />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-[#1E2420]">{p.name_en}</div>
                              <div className="text-xs text-[#5C6760]">/{p.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#5C6760]">{p.category_name_en}</td>
                        <td className="py-3 pr-4 text-xs text-[#5C6760] tabular-nums">{photoCount}</td>
                        <td className="py-3 pr-4 text-right font-medium text-[#1E2420] tabular-nums">
                          {formatPriceRwf(p.price_rwf, p.currency)}
                        </td>
                        <td className="py-3 pr-4 text-xs">
                          <span className={p.is_published === 1 && p.is_archived === 0 ? 'text-[#1F5138] font-semibold' : 'text-[#5C6760]'}>
                            {p.is_archived === 1 ? 'Archived' : p.is_published === 1 ? 'Published' : 'Draft'}
                          </span>
                          <span className="text-[#5C6760]"> · {p.availability_status}</span>
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            aria-label={`Edit ${p.name_en}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#1F5138] hover:bg-[#EEF5F0] rounded mr-1"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            aria-label={`Delete or archive ${p.name_en}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#B83227] hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Archive
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Categories Section */}
      <section className="bg-white border border-[#E5DEC9] rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-[#1E2420]">Product Categories</h2>
          <button
            type="button"
            onClick={() => setShowCatForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-md bg-[#9C661F] text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            {showCatForm ? 'Hide' : 'Add Category'}
          </button>
        </div>

        {showCatForm && (
          <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-5 p-3.5 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9]">
            <input
              type="text"
              required
              value={catNameEn}
              onChange={(e) => setCatNameEn(e.target.value)}
              placeholder="Category Name (EN)"
              className="min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E5DEC9] rounded-md"
            />
            <input
              type="text"
              value={catNameRw}
              onChange={(e) => setCatNameRw(e.target.value)}
              placeholder="Name (Kinyarwanda)"
              className="min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E5DEC9] rounded-md"
            />
            <input
              type="text"
              value={catDescEn}
              onChange={(e) => setCatDescEn(e.target.value)}
              placeholder="Short description"
              className="min-h-[42px] px-3 py-2 text-sm bg-white border border-[#E5DEC9] rounded-md"
            />
            <button
              type="submit"
              className="min-h-[42px] px-4 py-2 rounded-md bg-[#1F5138] text-white text-sm font-semibold"
            >
              Save Category
            </button>
          </form>
        )}

        <div className="divide-y divide-[#E5DEC9] border-t border-[#E5DEC9]">
          {categories.map((cat) => (
            <div key={cat.id} className="py-3 flex items-center justify-between text-sm gap-2">
              <div className="min-w-0">
                <span className="font-semibold text-[#1E2420]">{cat.name_en}</span>
                <span className="text-[#5C6760]"> / {cat.name_rw}</span>
              </div>
              <span className="text-xs text-[#5C6760] tabular-nums shrink-0">{cat.product_count ?? 0} products</span>
            </div>
          ))}
        </div>
      </section>

      {/* Zero-Scroll Product Upload & Edit Modal */}
      {showProductModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'Edit Product' : 'Add New Product'}
          className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-2 sm:p-4"
        >
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-4xl max-h-[calc(100dvh-16px)] sm:max-h-[90dvh] flex flex-col overflow-hidden bg-white rounded-xl border border-[#E5DEC9] shadow-2xl"
          >
            {/* Pinned Header + Section Tabs */}
            <div className="px-3.5 sm:px-5 pt-3 pb-2.5 border-b border-[#E5DEC9] bg-[#F9F5EC] shrink-0 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base sm:text-lg font-bold text-[#1E2420]">
                  {editingId ? 'Edit Product' : 'Upload New Product'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  aria-label="Close product editor"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#E5DEC9] bg-white text-[#1E2420] hover:bg-[#EEF5F0]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <div role="tablist" aria-label="Product editor sections" className="grid grid-cols-3 gap-1.5">
                {modalTabs.map((tab) => {
                  const active = modalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setModalTab(tab.id)}
                      className={`px-2 py-2 min-h-[38px] rounded-md text-[11px] sm:text-xs font-semibold truncate transition-colors ${
                        active
                          ? 'bg-[#1F5138] text-white'
                          : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:border-[#1F5138]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Zero-Scroll Modal Body */}
            <div
              data-testid="zero-scroll-modal-body"
              className="flex-1 min-h-0 p-3.5 sm:p-5 overflow-y-auto md:overflow-hidden"
            >
              {(error || notice) && (
                <div
                  className={`mb-2.5 px-3 py-2 rounded-md text-xs font-medium ${
                    error
                      ? 'bg-red-50 border border-[#B83227]/30 text-[#B83227]'
                      : 'bg-[#EEF5F0] border border-[#1F5138]/30 text-[#1F5138]'
                  }`}
                >
                  {error || notice}
                </div>
              )}

              {/* Tab 1: Basics & Multi-Photo Upload */}
              {modalTab === 'basics' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Name (English) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formState.name_en}
                        onChange={(e) => setFormState({ ...formState, name_en: e.target.value })}
                        placeholder="e.g. Liquid Chlorophyll"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Name (Kinyarwanda)
                      </label>
                      <input
                        type="text"
                        value={formState.name_rw}
                        onChange={(e) => setFormState({ ...formState, name_rw: e.target.value })}
                        placeholder="Izina mu Kinyarwanda"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Category *
                      </label>
                      <select
                        value={formState.category_id}
                        onChange={(e) => setFormState({ ...formState, category_id: e.target.value })}
                        className="w-full h-[38px] px-2 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Price (RWF)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={formState.price_rwf}
                        onChange={(e) => setFormState({ ...formState, price_rwf: e.target.value })}
                        placeholder="e.g. 25000"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Availability
                      </label>
                      <select
                        value={formState.availability_status}
                        onChange={(e) => setFormState({ ...formState, availability_status: e.target.value })}
                        className="w-full h-[38px] px-2 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      >
                        <option value="available">Available</option>
                        <option value="awaiting_confirmation">Awaiting confirmation</option>
                        <option value="out_of_stock">Out of stock</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Package Size
                      </label>
                      <input
                        type="text"
                        value={formState.quantity_label}
                        onChange={(e) => setFormState({ ...formState, quantity_label: e.target.value })}
                        placeholder="e.g. 500 ml"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                  </div>

                  {/* Multi-Image Manager */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-[#F9F5EC] border border-[#E5DEC9] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#1E2420]">
                        Product Photos ({formState.gallery_images.length}/8)
                      </span>
                      <span className="text-[11px] text-[#5C6760]">
                        Select multiple photos at once
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3.5 h-[38px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-xs font-semibold cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                        {uploading ? 'Uploading...' : 'Upload Photos'}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleMultiImageUpload}
                          className="sr-only"
                        />
                      </label>
                      <div className="flex flex-1 gap-1.5">
                        <input
                          type="text"
                          value={manualImageUrl}
                          onChange={(e) => setManualImageUrl(e.target.value)}
                          placeholder="Or paste photo URL (/uploads/...)"
                          className="flex-1 min-w-0 h-[38px] px-2.5 text-xs bg-white border border-[#E5DEC9] rounded-md"
                        />
                        <button
                          type="button"
                          onClick={addManualImage}
                          className="px-3 h-[38px] rounded-md bg-white border border-[#E5DEC9] text-xs font-semibold text-[#1E2420] hover:border-[#1F5138] shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {formState.gallery_images.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pt-1 pb-0.5">
                        {formState.gallery_images.map((url, idx) => {
                          const isMain = formState.main_image === url || (idx === 0 && !formState.main_image);
                          return (
                            <div
                              key={url}
                              className={`relative w-20 shrink-0 rounded-md border bg-white p-1 ${
                                isMain ? 'border-[#1F5138] ring-1 ring-[#1F5138]' : 'border-[#E5DEC9]'
                              }`}
                            >
                              <div className="aspect-[4/3] rounded overflow-hidden bg-[#EEF5F0]">
                                <img src={url} alt={`Product photo ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMainImageUrl(url)}
                                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1 py-0.5 rounded ${
                                    isMain ? 'bg-[#EEF5F0] text-[#1F5138]' : 'text-[#5C6760] hover:text-[#1E2420]'
                                  }`}
                                >
                                  <Star className="w-2.5 h-2.5" aria-hidden="true" />
                                  {isMain ? 'Main' : 'Use'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeGalleryImage(url)}
                                  aria-label={`Remove photo ${idx + 1}`}
                                  className="text-[#B83227] hover:bg-red-50 rounded p-0.5"
                                >
                                  <X className="w-3 h-3" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#5C6760] py-1">
                        No photos added yet. Tap Upload Photos to pick 1 or more product pictures.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Details & Bilingual Story */}
              {modalTab === 'details' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Short Summary (English)
                      </label>
                      <textarea
                        rows={2}
                        value={formState.short_description_en}
                        onChange={(e) => setFormState({ ...formState, short_description_en: e.target.value })}
                        placeholder="One-sentence summary shown on product cards"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Short Summary (Kinyarwanda)
                      </label>
                      <textarea
                        rows={2}
                        value={formState.short_description_rw}
                        onChange={(e) => setFormState({ ...formState, short_description_rw: e.target.value })}
                        placeholder="Incamake mu Kinyarwanda"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Full Description (English)
                      </label>
                      <textarea
                        rows={2}
                        value={formState.full_description_en}
                        onChange={(e) => setFormState({ ...formState, full_description_en: e.target.value })}
                        placeholder="Detailed factual overview"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Full Description (Kinyarwanda)
                      </label>
                      <textarea
                        rows={2}
                        value={formState.full_description_rw}
                        onChange={(e) => setFormState({ ...formState, full_description_rw: e.target.value })}
                        placeholder="Ibisobanuro birambuye mu Kinyarwanda"
                        className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md resize-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Ingredients (English)
                      </label>
                      <input
                        type="text"
                        value={formState.ingredients_en}
                        onChange={(e) => setFormState({ ...formState, ingredients_en: e.target.value })}
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Ingredients (Kinyarwanda)
                      </label>
                      <input
                        type="text"
                        value={formState.ingredients_rw}
                        onChange={(e) => setFormState({ ...formState, ingredients_rw: e.target.value })}
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Status, Classification & SEO */}
              {modalTab === 'publish' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Classification
                      </label>
                      <select
                        value={formState.classification}
                        onChange={(e) => setFormState({ ...formState, classification: e.target.value })}
                        className="w-full h-[38px] px-2 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      >
                        <option value="nutritional_supplement">Nutritional Supplement</option>
                        <option value="food_product">Food Product</option>
                        <option value="wellness_product">Wellness Product</option>
                        <option value="registered_medicine">Registered Medicine</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Verification
                      </label>
                      <select
                        value={formState.verification_status}
                        onChange={(e) => setFormState({ ...formState, verification_status: e.target.value })}
                        className="w-full h-[38px] px-2 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      >
                        <option value="verified">Verified</option>
                        <option value="awaiting_confirmation">Awaiting confirmation</option>
                        <option value="not_available">Not currently available</option>
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        Brand / Manufacturer
                      </label>
                      <input
                        type="text"
                        value={formState.manufacturer_info}
                        onChange={(e) => setFormState({ ...formState, manufacturer_info: e.target.value })}
                        placeholder="N-Nutrition"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        URL Slug (optional)
                      </label>
                      <input
                        type="text"
                        value={formState.slug}
                        onChange={(e) => setFormState({ ...formState, slug: e.target.value })}
                        placeholder="auto-generated-from-name"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                        SEO Page Title
                      </label>
                      <input
                        type="text"
                        value={formState.seo_title}
                        onChange={(e) => setFormState({ ...formState, seo_title: e.target.value })}
                        placeholder="Product Name | NN Market Rwanda"
                        className="w-full h-[38px] px-2.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1E2420] mb-1">
                      SEO Meta Description
                    </label>
                    <textarea
                      rows={2}
                      value={formState.seo_description}
                      onChange={(e) => setFormState({ ...formState, seo_description: e.target.value })}
                      placeholder="Short search summary for Google (N market in Rwanda)"
                      className="w-full px-2.5 py-1.5 text-xs sm:text-sm bg-white border border-[#E5DEC9] rounded-md resize-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1E2420] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.is_published}
                        onChange={(e) => setFormState({ ...formState, is_published: e.target.checked })}
                        className="w-4 h-4 accent-[#1F5138]"
                      />
                      Published publicly
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1E2420] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.is_featured}
                        onChange={(e) => setFormState({ ...formState, is_featured: e.target.checked })}
                        className="w-4 h-4 accent-[#1F5138]"
                      />
                      Featured on Homepage
                    </label>
                    {editingId && (
                      <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#1E2420] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.is_archived}
                          onChange={(e) => setFormState({ ...formState, is_archived: e.target.checked })}
                          className="w-4 h-4 accent-[#B83227]"
                        />
                        Archived
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Footer — Zero Scroll Needed to Navigate or Save */}
            <div className="px-3.5 sm:px-5 py-2.5 border-t border-[#E5DEC9] bg-[#F9F5EC] shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {currentTabIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setModalTab(modalTabs[currentTabIndex - 1].id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 min-h-[40px] rounded-md bg-white border border-[#E5DEC9] text-xs font-semibold text-[#1E2420]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    Back
                  </button>
                )}
                {currentTabIndex < modalTabs.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setModalTab(modalTabs[currentTabIndex + 1].id)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 min-h-[40px] rounded-md bg-white border border-[#E5DEC9] text-xs font-semibold text-[#1F5138]"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3.5 py-2 min-h-[40px] rounded-md bg-white border border-[#E5DEC9] text-xs sm:text-sm font-semibold text-[#1E2420]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-4 py-2 min-h-[40px] rounded-md bg-[#1F5138] hover:bg-[#173D2A] text-white text-xs sm:text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
