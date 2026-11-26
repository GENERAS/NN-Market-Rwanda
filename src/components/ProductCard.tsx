import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { formatPriceRwf } from '../utils/validation';

export const ProductImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}> = ({ src, alt, className = 'w-full h-full object-cover', loading = 'lazy' }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-[#FBF7EF] text-[#A87936] p-6 text-center"
        role="img"
        aria-label={alt}
      >
        <Leaf className="w-8 h-8 mb-2 opacity-75" aria-hidden="true" />
        <span className="text-xs font-medium text-[#647067] line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { lang, t } = useApp();

  const name = lang === 'rw' && product.name_rw ? product.name_rw : product.name_en;
  const shortDesc =
    lang === 'rw' && product.short_description_rw ? product.short_description_rw : product.short_description_en;
  const categoryName =
    lang === 'rw' && product.category_name_rw
      ? product.category_name_rw
      : product.category_name_en || '';

  const classMap = t.catalog.classification as Record<string, string>;
  const availMap = t.catalog.availability as Record<string, string>;
  const classLabel = classMap[product.classification] || product.classification;
  const availLabel = availMap[product.availability_status] || product.availability_status;

  return (
    <article className="group flex flex-col bg-white border border-[#E9E7E1] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <Link to={`/products/${product.slug}`} className="block aspect-[4/3] bg-[#FBF7EF] overflow-hidden">
        <ProductImage
          src={product.main_image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </Link>

      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 text-xs text-[#647067] mb-1.5">
          <span className="font-medium text-[#A87936]">{categoryName}</span>
          <span aria-hidden="true">·</span>
          <span>{classLabel}</span>
        </div>

        <h3 className="text-[17px] font-semibold text-[#252B25] leading-snug mb-2">
          <Link to={`/products/${product.slug}`} className="hover:text-[#26733E] transition-colors">
            {name}
          </Link>
        </h3>

        <p className="text-sm text-[#647067] line-clamp-2 mb-4 flex-1">{shortDesc}</p>

        <div className="pt-3 border-t border-[#E9E7E1] space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-[15px] font-semibold text-[#252B25] tabular-nums">
              {formatPriceRwf(product.price_rwf, product.currency, lang)}
            </div>
            <div className="text-xs text-[#647067] text-right">{availLabel}</div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/products/${product.slug}`}
              className="inline-flex items-center justify-center px-3 py-2.5 min-h-[44px] text-sm font-semibold text-[#252B25] bg-[#FBF7EF] border border-[#E9E7E1] hover:border-[#A87936] rounded-md transition-colors whitespace-nowrap"
            >
              {t.catalog.viewDetails}
            </Link>
            <Link
              to={`/products/${product.slug}?action=request`}
              className="inline-flex items-center justify-center px-3 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-[#26733E] hover:bg-[#1e5c31] rounded-md transition-colors whitespace-nowrap"
            >
              {t.catalog.requestCta}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};
