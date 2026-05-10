import { useState, useEffect } from 'react';
import { Search, Plus, Check, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Product, ProductVariant } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'All', 'Atta & Grains', 'Oil', 'Masale', 'Snacks', 'Daily Use', 'Dairy', 'Cold Drinks'
];

export function CatalogView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { subscribeToProducts } = useDatabase();
  const { addToCart, storeConfig, cart, user } = useAppStore();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [usualProducts, setUsualProducts] = useState<Product[]>([]);

  useEffect(() => {
    return subscribeToProducts(setProducts);
  }, []);

  useEffect(() => {
    if (!user) return;
    // Simulate finding usual/recent from orders
    supabase.from('orders').select('items').eq('userId', user.uid).limit(5).then(({ data }) => {
      if (!data) return;
      const allItems = data.flatMap(d => d.items);
      const productIds = Array.from(new Set(allItems.map(i => i.productId)));
      const filtered = products.filter(p => productIds.includes(p.id));
      setRecentProducts(filtered.slice(0, 3));
      setUsualProducts(filtered.slice(0, 5));
    });
  }, [user, products]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery.length < 2 || 
      p.name.toLowerCase().includes(searchLower) ||
      p.hindiName?.toLowerCase().includes(searchLower) ||
      p.englishAliases?.some(a => a.toLowerCase().includes(searchLower)) ||
      p.searchKeywords?.some(k => k.toLowerCase().includes(searchLower));
    
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (product: Product, variantLabel?: string) => {
    addToCart(product, variantLabel);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Search Header */}
      <div className="sticky top-14 z-30 -mx-4 bg-white px-4 pb-4 pt-2 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input 
            type="text"
            placeholder="Saman dhundein (Mustard oil, Atta...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 w-full rounded-2xl border-none bg-gray-100 pl-12 text-base font-medium ring-0 focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      </div>

      {recentProducts.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Dobara mangwaien</h3>
            <button className="text-[10px] font-black text-green-600 uppercase">View All</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {recentProducts.map(p => (
              <motion.div 
                key={p.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddToCart(p)}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm flex-shrink-0 w-28 p-3 transition-all hover:shadow-md"
              >
                <div className="aspect-square rounded-2xl bg-gray-50 mb-2 flex items-center justify-center text-2xl">
                  {p.category === 'Oil' ? '🧴' : p.category === 'Dairy' ? '🥛' : '📦'}
                </div>
                <p className="text-[11px] font-bold text-gray-800 truncate">{p.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-900">Add</span>
                  <div className="rounded-lg bg-yellow-400 p-1">
                    <Plus className="h-3 w-3 text-black" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Grid (Blinkit Style) */}
      <div className="grid grid-cols-4 gap-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "flex flex-col items-center gap-2 transition-all",
              selectedCategory === cat ? "scale-105" : "opacity-80"
            )}
          >
            <div className={cn(
               "aspect-square w-full rounded-2xl flex items-center justify-center text-xl shadow-sm border border-white",
               selectedCategory === cat ? "bg-yellow-400 ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-100" : "bg-white"
            )}>
              {cat === 'All' ? '🏠' : cat === 'Oil' ? '🧴' : cat === 'Atta & Grains' ? '🌾' : cat === 'Snacks' ? '🍪' : '📦'}
            </div>
            <span className={cn(
              "text-[10px] font-black tracking-tight leading-tight text-center",
              selectedCategory === cat ? "text-gray-900" : "text-gray-500"
            )}>
              {cat}
            </span>
          </button>
        ))}
      </div>

      {!storeConfig?.isOpen && (
        <div className="rounded-3xl bg-yellow-50 p-5 border border-yellow-200 flex items-start gap-4">
          <div className="rounded-full bg-yellow-400 p-2 text-black">
             <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-gray-900 italic">Dukaan Abhi Band Hai</p>
            <p className="text-xs font-bold text-yellow-700 mt-1">
              {storeConfig?.reopenMessage || "Kal subah 9 baje kholenge. Tab tak saman thaila mein rakhein."}
            </p>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="grid grid-cols-2 gap-4">
        {filteredProducts.map(product => (
          <ProductCard 
            key={product.id} 
            product={product} 
            onAdd={() => product.variants ? setSelectedProduct(product) : handleAddToCart(product)}
            inCart={cart.some(item => item.productId === product.id)}
          />
        ))}
      </div>

      {/* Variant Selector Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-10">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md rounded-2xl bg-white p-6"
            >
              <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
              <p className="text-sm text-gray-500">Guna chuniye (Pack size)</p>
              <div className="mt-4 space-y-2">
                {selectedProduct.variants?.map(variant => (
                  <button
                    key={variant.label}
                    onClick={() => handleAddToCart(selectedProduct, variant.label)}
                    className="flex w-full items-center justify-between rounded-xl border p-4 hover:border-orange-500 hover:bg-orange-50 transition-all"
                  >
                    <span className="font-medium">{variant.label}</span>
                    <span className="font-bold text-orange-600">{formatCurrency(variant.price)}</span>
                  </button>
                ) )}
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedProduct(null)}
                className="mt-4 w-full"
              >
                Cancel
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onAdd, inCart }: { product: Product, onAdd: () => void, inCart: boolean, key?: any }) {
  const isAvailable = product.availabilityStatus !== 'Out of Stock';
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col p-3 transition-all hover:shadow-md",
        !isAvailable && "opacity-60"
      )}
    >
      <div className="aspect-square w-full rounded-2xl bg-gray-50 flex items-center justify-center text-4xl mb-3 relative">
        {product.category === 'Oil' ? '🧴' : product.category === 'Snacks' ? '🍪' : '📦'}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/60 rounded-2xl flex items-center justify-center">
            <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-full uppercase">Khatam</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black text-gray-900 leading-tight line-clamp-2 min-h-[40px]">{product.name}</h3>
          <p className="text-[10px] font-bold text-gray-400">{product.unit || '1 pack'}</p>
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm font-black text-gray-900">
              {product.variants ? formatCurrency(product.variants[0].price) : formatCurrency(product.price || 0)}
              {product.variants && <span className="text-[8px] block text-gray-400">Starts at</span>}
            </p>
          </div>
          
          {isAvailable && (
            <button
              onClick={onAdd}
              className={cn(
                "h-9 px-4 rounded-xl text-xs font-black active:scale-95 transition-all outline-none",
                inCart 
                  ? "bg-green-600 text-white shadow-green-100" 
                  : "bg-white border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-400"
              )}
            >
              {inCart ? '✓' : 'ADD'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
