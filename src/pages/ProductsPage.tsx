import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { ProductCard } from '../components/ProductCard';
import { SeoHead } from '../components/SeoHead';
import { fetchPublicProducts } from '../utils/publicCatalogClient';

export const ProductsPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t, bootstrap } = useApp();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCategory = categorySlug || 'all';
  const categories = bootstrap?.categories || [];
  const currentCatObj = categories.find((c) => c.slug === activeCategory);

  useEffect(() => {
    const urlQ = searchParams.get('q') || '';
    if (urlQ && urlQ !== query) {
      setQuery(urlQ);
      setDebouncedQuery(urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicProducts({
          q: debouncedQuery,
          category: activeCategory,
          sort,
          page,
          limit: 12,
        });
        if (!cancelled) {
          setProducts(data.items || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load products.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeCategory, sort, page]);

  const pageHeading = currentCatObj
    ? lang === 'rw' && currentCatObj.name_rw
      ? currentCatObj.name_rw
      : currentCatObj.name_en
    : t.catalog.title;

  const pageSubtitle = currentCatObj
    ? lang === 'rw' && currentCatObj.description_rw
      ? currentCatObj.description_rw
      : currentCatObj.description_en
    : t.catalog.subtitle;

  return (
    <>
      <SeoHead
        title={`${pageHeading} | NN Market Rwanda`}
        description={pageSubtitle}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-[#5C6760] mb-4 flex items-center gap-2">
          <Link to="/" className="hover:text-[#1F5138]">
            {t.nav.home}
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/products" className="hover:text-[#1F5138]">
            {t.nav.products}
          </Link>
          {currentCatObj && (
            <>
              <span aria-hidden="true">/</span>
              <span className="text-[#1E2420] font-medium">{pageHeading}</span>
            </>
          )}
        </nav>

        <div className="mb-7">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1E2420] mb-2">{pageHeading}</h1>
          <p className="text-base text-[#5C6760] max-w-2xl">{pageSubtitle}</p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#F9F5EC] border border-[#E5DEC9] rounded-lg p-4 sm:p-5 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <label htmlFor="catalog-search" className="sr-only">
                {t.catalog.searchPlaceholder}
              </label>
              <Search
                className="w-4 h-4 text-[#5C6760] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.catalog.searchPlaceholder}
                className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm bg-white border border-[#E5DEC9] rounded-md text-[#1E2420]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="catalog-sort" className="text-sm font-medium text-[#5C6760] whitespace-nowrap">
                {t.catalog.sortLabel}
              </label>
              <select
                id="catalog-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="min-h-[44px] px-3 py-2 text-sm bg-white border border-[#E5DEC9] rounded-md text-[#1E2420]"
              >
                <option value="featured">{t.catalog.sortFeatured}</option>
                <option value="price_asc">{t.catalog.sortPriceAsc}</option>
                <option value="price_desc">{t.catalog.sortPriceDesc}</option>
                <option value="newest">{t.catalog.sortNewest}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Category filter">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                navigate('/products');
              }}
              className={`px-3.5 py-2 min-h-[44px] rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-[#1F5138] text-white'
                  : 'bg-white text-[#1E2420] border border-[#E5DEC9] hover:border-[#9C661F]'
              }`}
            >
              {t.catalog.allCategories}
            </button>
            {categories.map((cat) => {
              const catLabel = lang === 'rw' && cat.name_rw ? cat.name_rw : cat.name_en;
              const isSelected = activeCategory === cat.slug;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setPage(1);
                    navigate(`/categories/${cat.slug}`);
                  }}
                  className={`px-3.5 py-2 min-h-[44px] rounded-md text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#1F5138] text-white'
                      : 'bg-white text-[#1E2420] border border-[#E5DEC9] hover:border-[#9C661F]'
                  }`}
                >
                  {catLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between mb-5 text-sm text-[#5C6760]">
          <span className="tabular-nums">
            {total} {t.catalog.resultsCount}
          </span>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-md bg-red-50 border border-[#B83227]/30 text-sm text-[#B83227] mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-lg bg-[#F9F5EC] animate-pulse border border-[#E5DEC9]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center rounded-lg border border-[#E5DEC9] bg-[#F9F5EC]">
            <h2 className="text-lg font-semibold text-[#1E2420] mb-2">{t.catalog.emptyTitle}</h2>
            <p className="text-sm text-[#5C6760] mb-5">{t.catalog.emptyBody}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                setSort('featured');
                navigate('/products');
              }}
              className="px-5 py-2.5 min-h-[44px] rounded-md bg-[#1F5138] text-white text-sm font-semibold"
            >
              {t.catalog.clearFilters}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`min-w-[44px] min-h-[44px] px-3 rounded-md text-sm font-semibold tabular-nums ${
                      page === p
                        ? 'bg-[#1F5138] text-white'
                        : 'bg-white border border-[#E5DEC9] text-[#1E2420] hover:bg-[#F9F5EC]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
