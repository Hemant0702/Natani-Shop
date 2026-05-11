import { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Product } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { Tag, Percent, Search, Trash2 } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../../lib/constants';

export function AdminOffers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const { subscribeToProducts } = useDatabase();

  useEffect(() => {
    return subscribeToProducts(setProducts);
  }, []);

  const productsWithOffers = products.filter(p => (p.discountPercent && p.discountPercent > 0) || (p.discountFlat && p.discountFlat > 0));
  
  const filteredProducts = products.filter(p => {
    if (searchQuery.length < 2) return true;
    return p.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const applyDiscount = async () => {
    if (!selectedProduct || discountValue <= 0) return alert('Discount value bhariye');
    
    const update: any = { discountPercent: 0, discountFlat: 0 };
    if (discountType === 'percent') {
      if (discountValue > 100) return alert('Percentage 100 se zyada nahi ho sakta');
      update.discountPercent = discountValue;
    } else {
      if (discountValue >= selectedProduct.price) return alert('Discount price se zyada nahi ho sakta');
      update.discountFlat = discountValue;
    }

    try {
      await api.put(`/api/products/${selectedProduct.id}`, update);
      setSelectedProduct(null);
      setDiscountValue(0);
      setSearchQuery('');
    } catch (e) {
      console.error('Failed to apply discount:', e);
    }
  };

  const removeDiscount = async (productId: string) => {
    try {
      await api.put(`/api/products/${productId}`, { discountPercent: 0, discountFlat: 0 });
    } catch (e) {
      console.error('Failed to remove discount:', e);
    }
  };

  const getDiscountedPrice = (p: Product) => {
    if (p.discountPercent && p.discountPercent > 0) {
      return Math.round(p.price * (1 - p.discountPercent / 100));
    }
    if (p.discountFlat && p.discountFlat > 0) {
      return p.price - p.discountFlat;
    }
    return p.price;
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900">Offers & Discounts</h2>
        <p className="text-xs font-bold text-gray-400">Set discounts on products</p>
      </div>

      {/* Active Offers */}
      {productsWithOffers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Active Offers ({productsWithOffers.length})</h3>
          {productsWithOffers.map(p => (
            <div key={p.id} className="rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-100 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">
                {PRODUCT_CATEGORIES.find(c => c.name === p.category)?.icon || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-gray-400 line-through">{formatCurrency(p.price)}</span>
                  <span className="text-sm font-black text-green-600">{formatCurrency(getDiscountedPrice(p))}</span>
                  <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">
                    {p.discountPercent ? `${p.discountPercent}% Off` : `₹${p.discountFlat} Off`}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => removeDiscount(p.id)}
                className="h-9 w-9 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Discount Section */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-gray-900">Add New Discount</h3>
        
        {/* Product Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search product to add discount..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 pl-10 text-sm rounded-xl"
          />
        </div>

        {/* Product Selection */}
        {searchQuery.length >= 2 && !selectedProduct && (
          <div className="max-h-48 overflow-y-auto space-y-1 bg-gray-50 rounded-xl p-2 border border-gray-100">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedProduct(p); setSearchQuery(p.name); }}
                className="w-full text-left p-2 rounded-lg hover:bg-white transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{PRODUCT_CATEGORIES.find(c => c.name === p.category)?.icon || '📦'}</span>
                  <span className="text-sm font-bold text-gray-900">{p.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-500">{formatCurrency(p.price)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected Product + Discount Input */}
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-lg">
                {PRODUCT_CATEGORIES.find(c => c.name === selectedProduct.category)?.icon || '📦'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{selectedProduct.name}</p>
                <p className="text-xs font-bold text-gray-500">Current Price: {formatCurrency(selectedProduct.price)}</p>
              </div>
            </div>

            {/* Discount Type Toggle */}
            <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              <button 
                onClick={() => setDiscountType('percent')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
                  discountType === 'percent' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                )}
              >
                <Percent className="h-3.5 w-3.5" /> Percentage
              </button>
              <button 
                onClick={() => setDiscountType('flat')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
                  discountType === 'flat' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                )}
              >
                ₹ Flat Amount
              </button>
            </div>

            {/* Discount Value */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {discountType === 'percent' ? 'Discount Percentage (%)' : 'Flat Discount (₹)'}
              </label>
              <Input 
                type="number" 
                value={discountValue || ''} 
                onChange={e => setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder={discountType === 'percent' ? 'E.g. 10' : 'E.g. 50'}
                className="mt-1"
              />
              {discountValue > 0 && (
                <p className="text-xs font-bold text-green-600 mt-1">
                  New Price: {formatCurrency(
                    discountType === 'percent' 
                      ? Math.round(selectedProduct.price * (1 - discountValue / 100))
                      : selectedProduct.price - discountValue
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setSelectedProduct(null); setSearchQuery(''); setDiscountValue(0); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={applyDiscount} className="flex-1 bg-gray-900 border-none hover:bg-black">
                Apply Discount
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
