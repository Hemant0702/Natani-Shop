import { PRODUCT_CATEGORIES } from '../lib/constants';

interface ProductImagePlaceholderProps {
  category: string;
  className?: string;
}

export function ProductImagePlaceholder({ category, className = '' }: ProductImagePlaceholderProps) {
  const categoryInfo = PRODUCT_CATEGORIES.find(c => c.name === category);
  
  return (
    <div className={`flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl ${className}`}>
      <span className="text-3xl opacity-50 filter drop-shadow-sm">
        {categoryInfo?.icon || '📦'}
      </span>
    </div>
  );
}
