import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Clock, Heart, Star, SlidersHorizontal, ArrowLeft, Minus } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Product, ProductVariant } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PRODUCT_CATEGORIES } from '../lib/constants';

export function CatalogView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  const { subscribeToProducts } = useDatabase();
  const { addToCart, storeConfig, cart, user } = useAppStore();

  useEffect(() => {
    return subscribeToProducts(setProducts);
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const filteredProducts = products.filter(p => {
    const matchesCategory = !isSearching && (selectedCategory === 'All' || p.category === selectedCategory)
      || isSearching; // When searching, ignore category filter
    const matchesCategory2 = isSearching ? true : (selectedCategory === 'All' || p.category === selectedCategory);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !isSearching || 
      p.name.toLowerCase().includes(searchLower) ||
      p.hindiName?.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower) ||
      p.searchKeywords?.some(kw => kw.toLowerCase().includes(searchLower)) ||
      p.englishAliases?.some(a => a.toLowerCase().includes(searchLower));
    
    return matchesCategory2 && matchesSearch;
  });

  const handleAddToCart = (product: Product, variantLabel?: string, customPrice?: number, customWeight?: string) => {
    if (customPrice && customWeight) {
        // Special case for custom weight/price items (from detail view calculator)
        addToCart({
            ...product,
            price: customPrice,
            name: `${product.name} (${customWeight})`
        });
    } else {
        // Direct add or variant add
        if (!variantLabel) {
            // No variant selected, add default unit to name if it's a direct add
            // This ensures "Milk" becomes "Milk (1 litre)"
            addToCart({
                ...product,
                name: product.unit ? `${product.name} (1 ${product.unit})` : product.name
            });
        } else {
            addToCart(product, variantLabel);
        }
    }
    setSelectedProduct(null);
    setViewingProduct(null);
  };

  const activeCategories = PRODUCT_CATEGORIES.filter(cat => 
    products.some(p => p.category === cat.name)
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Search Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input 
            type="text"
            placeholder="Search.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-full border-gray-100 bg-white pl-12 text-sm font-medium focus:ring-2 focus:ring-[#06833E]/20 shadow-sm"
          />
        </div>
        <button className="h-12 w-12 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-500">
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Banner — hidden while searching */}
      {!isSearching && (
        <div className="relative h-40 w-full rounded-3xl overflow-hidden bg-[#E6F3EC]">
          <div className="absolute inset-0 p-6 flex flex-col justify-center">
            <div className="bg-[#06833E] text-white text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-2 uppercase">Special Offer</div>
            <h2 className="text-xl font-black text-[#06833E] leading-tight">Welcome to <br/> ApniDukan</h2>
            <p className="text-[10px] font-bold text-[#06833E]/60 mt-1 uppercase tracking-wider">Sell your products here</p>
          </div>
          <div className="absolute right-0 bottom-0 h-full w-1/2 flex items-end justify-end p-2 opacity-80">
             <img src="https://img.freepik.com/free-vector/farmer-man-standing-holding-basket-vegetables_1308-41031.jpg" className="h-full object-contain" />
          </div>
        </div>
      )}

      {/* Frequently Used / Featured Products — hidden while searching */}
      {!isSearching && (() => {
        const featured = products.filter(p => p.isFeatured && p.availabilityStatus !== 'Out of Stock');
        if (featured.length === 0) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Aksar Mangate Hain 🛒</h3>
              <span className="text-[10px] font-bold text-gray-400 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full text-yellow-700">{featured.length} items</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {featured.map(product => (
                <button
                  key={product.id}
                  onClick={() => setViewingProduct(product)}
                  className="flex-shrink-0 w-24 flex flex-col items-center gap-1.5 p-2 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-[#06833E]/30 hover:shadow-md transition-all active:scale-95"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#F7F9FB] flex items-center justify-center text-2xl">
                    {PRODUCT_CATEGORIES.find(c => c.name === product.category)?.icon || '📦'}
                  </div>
                  <p className="text-[10px] font-bold text-gray-800 text-center leading-tight line-clamp-2">{product.name}</p>
                  <p className="text-[10px] font-black text-[#06833E]">{formatCurrency(product.price)}/{product.unit}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Categories Horizontal — hidden while searching */}
      {!isSearching && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">Categories</h3>
            <button onClick={() => setSelectedCategory('All')} className="text-xs font-bold text-gray-400 underline">View all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setSelectedCategory('All')}
              className={cn(
                "flex flex-col items-center gap-2 flex-shrink-0",
                selectedCategory === 'All' ? "opacity-100" : "opacity-60"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-full flex items-center justify-center text-xl bg-white border border-gray-100 shadow-sm",
                selectedCategory === 'All' && "ring-2 ring-[#06833E] ring-offset-2"
              )}>
                🏠
              </div>
              <span className="text-[10px] font-bold">All</span>
            </button>
            {activeCategories.map(cat => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "flex flex-col items-center gap-2 flex-shrink-0",
                  selectedCategory === cat.name ? "opacity-100" : "opacity-60"
                )}
              >
                <div className={cn(
                   "h-14 w-14 rounded-full flex items-center justify-center text-xl bg-white border border-gray-100 shadow-sm",
                   selectedCategory === cat.name && "ring-2 ring-[#06833E] ring-offset-2"
                )}>
                  {cat.icon}
                </div>
                <span className="text-[10px] font-bold">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            {isSearching ? `Search Results (${filteredProducts.length})` : 'Browse Products'}
          </h3>
          {!isSearching && (
            <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-xs font-bold text-gray-400 underline">View all</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} onClick={() => setViewingProduct(product)}>
              <ProductCard 
                product={product} 
                onAdd={(e) => {
                  e?.stopPropagation();
                  (product.variants && product.variants.length > 0) ? setSelectedProduct(product) : handleAddToCart(product);
                }}
                inCart={cart.some(item => item.productId === product.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Variant Selector Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-10">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md rounded-3xl bg-white p-6"
            >
              <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
              <p className="text-sm text-gray-500">Select variant</p>
              <div className="mt-4 space-y-2">
                {selectedProduct.variants?.map(variant => (
                  <button
                    key={variant.label}
                    onClick={() => handleAddToCart(selectedProduct, variant.label)}
                    className="flex w-full items-center justify-between rounded-2xl border p-4 hover:border-[#06833E] hover:bg-[#E6F3EC]/50 transition-all"
                  >
                    <span className="font-medium">{variant.label}</span>
                    <span className="font-bold text-[#06833E]">{formatCurrency(variant.price)}</span>
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

      <AnimatePresence>
        {viewingProduct && (
            <ProductDetail 
                product={viewingProduct} 
                onClose={() => setViewingProduct(null)} 
                onAdd={handleAddToCart}
                inCart={cart.some(item => item.productId === viewingProduct.id)}
            />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductDetail({ product, onClose, onAdd, inCart }: { product: Product, onClose: () => void, onAdd: any, inCart: boolean }) {
    const [weight, setWeight] = useState<string>('1');
    const [price, setPrice] = useState<number>(product.price || 0);
    const [calcMode, setCalcMode] = useState<'weight' | 'price'>('weight');
    const unitPrice = product.price || 0;
    const baseUnit = product.unit || 'kg';

    // Determine available sub-units based on base unit
    const unitOptions: { label: string; value: string; factor: number }[] = (() => {
      if (baseUnit === 'kg') return [
        { label: 'kg', value: 'kg', factor: 1 },
        { label: 'g', value: 'g', factor: 1000 },
      ];
      if (baseUnit === 'litre') return [
        { label: 'litre', value: 'litre', factor: 1 },
        { label: 'ml', value: 'ml', factor: 1000 },
      ];
      return []; // packet/piece — no sub-unit
    })();

    const [selectedUnit, setSelectedUnit] = useState<string>(baseUnit);

    // Factor = how many of selectedUnit make 1 base unit (e.g., 1000g = 1kg)
    const conversionFactor = unitOptions.find(u => u.value === selectedUnit)?.factor ?? 1;

    const handleWeightChange = (val: string) => {
        setWeight(val);
        const numericWeight = parseFloat(val);
        if (!isNaN(numericWeight)) {
            setPrice(Math.round((numericWeight / conversionFactor) * unitPrice));
        } else {
            setPrice(0);
        }
    };

    const handlePriceChange = (val: string) => {
        const numericPrice = parseFloat(val);
        setPrice(val === '' ? 0 : (numericPrice || 0));
        if (!isNaN(numericPrice) && unitPrice > 0) {
            setWeight(((numericPrice / unitPrice) * conversionFactor).toFixed(conversionFactor === 1 ? 3 : 0));
        } else if (val === '') {
            setWeight('');
        }
    };

    // When the unit dropdown changes, recalculate price from current weight
    const handleUnitChange = (newUnit: string) => {
        setSelectedUnit(newUnit);
        const newFactor = unitOptions.find(u => u.value === newUnit)?.factor ?? 1;
        const numericWeight = parseFloat(weight);
        if (!isNaN(numericWeight)) {
            setPrice(Math.round((numericWeight / newFactor) * unitPrice));
        }
    };

    const hasVariants = product.variants && product.variants.length > 0;
    const showCalculator = (baseUnit === 'kg' || baseUnit === 'litre') && !hasVariants;

    // Cart label: "500g" or "0.5kg" or "250ml" etc.
    const cartWeightLabel = `${weight}${selectedUnit}`;

    return (
        <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            className="fixed inset-0 z-[60] bg-white flex flex-col"
        >
            <div className="max-w-lg mx-auto w-full h-full flex flex-col overflow-hidden">
                {/* Compact Header */}
                <div className="relative h-40 w-full bg-[#F7F9FB] flex items-center justify-center text-7xl flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 left-4 h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 border border-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    {PRODUCT_CATEGORIES.find(c => c.name === product.category)?.icon || '📦'}
                </div>

                {/* Content Container */}
                <div className="flex-1 bg-white rounded-t-[2.5rem] -mt-8 p-5 flex flex-col gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] overflow-y-auto">
                    {/* Title and Info */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                             <div className="bg-[#E6F3EC] text-[#06833E] px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">{product.category}</div>
                             <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-xs font-bold">4.5</span>
                             </div>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">{product.name}</h2>
                        {product.description ? (
                          <p className="text-xs font-medium text-gray-600 leading-relaxed">{product.description}</p>
                        ) : (
                          <p className="text-xs font-medium text-gray-400">Shuddh aur taaza maal seedhe khet se.</p>
                        )}
                    </div>

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between p-3 bg-[#F7F9FB] rounded-2xl">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bhaav (per {baseUnit})</p>
                            <p className="text-xl font-black text-[#06833E]">{formatCurrency(unitPrice)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Stock Status</p>
                             <p className="text-xs font-bold text-gray-900">{product.availabilityStatus}</p>
                        </div>
                    </div>

                    {/* Variants or Calculator */}
                    {hasVariants ? (
                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Variants Chunnein</p>
                            <div className="grid grid-cols-2 gap-2">
                                {product.variants!.map(v => (
                                    <button
                                        key={v.label}
                                        onClick={() => onAdd(product, v.label)}
                                        className="p-2 rounded-xl border-2 border-gray-100 text-left hover:border-[#06833E] hover:bg-[#E6F3EC]/30 transition-all"
                                    >
                                        <p className="text-xs font-black text-gray-900">{v.label}</p>
                                        <p className="text-sm font-black text-[#06833E]">{formatCurrency(v.price)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : showCalculator && (
                        <div className="space-y-3">
                            <div className="flex bg-[#F7F9FB] p-1 rounded-xl border border-gray-100">
                                <button 
                                    onClick={() => setCalcMode('weight')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                                        calcMode === 'weight' ? "bg-white text-[#06833E] shadow-sm" : "text-gray-400"
                                    )}
                                >
                                    Weight se
                                </button>
                                <button 
                                    onClick={() => setCalcMode('price')}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                                        calcMode === 'price' ? "bg-white text-[#06833E] shadow-sm" : "text-gray-400"
                                    )}
                                >
                                    Paisa se
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className={cn(
                                    "p-3 rounded-2xl border-2 transition-all",
                                    calcMode === 'weight' ? "border-[#06833E] bg-[#E6F3EC]/30" : "border-gray-50 bg-[#F7F9FB]/50 opacity-60"
                                )} onClick={() => setCalcMode('weight')}>
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Vazann</label>
                                    <div className="flex items-center gap-1">
                                        <Input 
                                            type="number" 
                                            step={conversionFactor === 1 ? "0.05" : "50"}
                                            value={weight} 
                                            onChange={e => handleWeightChange(e.target.value)} 
                                            disabled={calcMode === 'price'}
                                            className="h-7 bg-transparent border-none text-lg font-black p-0 focus:ring-0 w-full"
                                        />
                                        {/* Unit dropdown — only shown when sub-units are available */}
                                        {unitOptions.length > 1 ? (
                                            <select
                                                value={selectedUnit}
                                                onChange={e => handleUnitChange(e.target.value)}
                                                disabled={calcMode === 'price'}
                                                onClick={e => e.stopPropagation()}
                                                className="text-xs font-black text-gray-500 bg-transparent border border-gray-200 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-[#06833E] cursor-pointer"
                                            >
                                                {unitOptions.map(u => (
                                                    <option key={u.value} value={u.value}>{u.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs font-black text-gray-400">{baseUnit}</span>
                                        )}
                                    </div>
                                </div>

                                <div className={cn(
                                    "p-3 rounded-2xl border-2 transition-all",
                                    calcMode === 'price' ? "border-[#06833E] bg-[#E6F3EC]/30" : "border-gray-50 bg-[#F7F9FB]/50 opacity-60"
                                )} onClick={() => setCalcMode('price')}>
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Paisa</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-gray-400">₹</span>
                                        <Input 
                                            type="number" 
                                            value={price || ''} 
                                            onChange={e => handlePriceChange(e.target.value)} 
                                            disabled={calcMode === 'weight'}
                                            className="h-7 bg-transparent border-none text-lg font-black p-0 focus:ring-0 text-[#06833E] w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bottom Action */}
                    <div className="mt-auto pt-2">
                        {inCart ? (
                             <Button disabled className="w-full h-12 rounded-full bg-gray-100 text-gray-400 font-bold text-sm">Pehle se cart mein hai</Button>
                        ) : (
                            <Button 
                                onClick={() => {
                                    if (showCalculator) {
                                        onAdd(product, undefined, price, cartWeightLabel);
                                    } else if (hasVariants) {
                                        // Variants are added via variant buttons above
                                    } else {
                                        onAdd(product);
                                    }
                                }}
                                className="w-full h-12 rounded-full bg-[#06833E] text-white font-bold text-base shadow-lg shadow-[#06833E]/20 active:scale-95 transition-transform"
                            >
                                Cart mein Daalein • {formatCurrency(price || unitPrice)}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function ProductCard({ product, onAdd, inCart }: { product: Product, onAdd: (e?: React.MouseEvent) => void, inCart: boolean }) {
  const isAvailable = product.availabilityStatus !== 'Out of Stock';
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-white rounded-[2rem] border border-gray-50 shadow-sm flex flex-col p-3 transition-all hover:shadow-md relative",
        !isAvailable && "opacity-60"
      )}
    >
      <button className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors z-10">
        <Heart className="h-4 w-4" />
      </button>

      <div className="aspect-square w-full rounded-2xl bg-[#F7F9FB] flex items-center justify-center text-5xl mb-3 relative overflow-hidden">
        {PRODUCT_CATEGORIES.find(c => c.name === product.category)?.icon || '📦'}
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-full uppercase">Sold Out</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-1">{product.name}</h3>
          <div className="flex items-center justify-between">
             <span className="text-sm font-bold text-gray-900">
               {formatCurrency((product.variants && product.variants.length > 0) ? product.variants[0].price : (product.price || 0))}
             </span>
             <div className="flex items-center gap-0.5">
               <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
               <span className="text-[10px] font-bold text-gray-400">4.5 (672)</span>
             </div>
          </div>
        </div>
        
        {isAvailable && (
          <button
            onClick={onAdd}
            className={cn(
              "w-full h-10 rounded-xl text-xs font-bold transition-all outline-none",
              inCart 
                ? "bg-gray-100 text-[#06833E]" 
                : "bg-[#06833E] text-white hover:bg-[#008037] shadow-sm"
            )}
          >
            {inCart ? 'Added to Cart' : 'Add to Cart'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
