import { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Product } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Package, Star } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../../lib/constants';

const PAGE_SIZE = 15;

export function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');
  const { subscribeToProducts } = useDatabase();

  useEffect(() => {
    return subscribeToProducts(setProducts);
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery.length < 2 || 
        p.name.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.searchKeywords?.some(kw => kw.toLowerCase().includes(searchLower)) ||
        p.hindiName?.toLowerCase().includes(searchLower) ||
        p.englishAliases?.some(a => a.toLowerCase().includes(searchLower));
      return matchesCategory && matchesSearch;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return a.price - b.price;
      return a.category.localeCompare(b.category);
    });

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/products/${id}`, { availabilityStatus: status });
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Kya aap yeh product delete karna chahte hain?')) {
      try {
        await api.delete(`/api/products/${id}`);
      } catch (e) {
        console.error('Failed to delete product:', e);
      }
    }
  };

  const toggleFeatured = async (product: Product) => {
    if (!product.isFeatured) {
      const featuredCount = products.filter(p => p.isFeatured).length;
      if (featuredCount >= 10) {
        alert('Maximum 10 products featured ho sakte hain. Pehle kisi ko hataiye.');
        return;
      }
    }
    try {
      await api.put(`/api/products/${product.id}`, { isFeatured: !product.isFeatured });
    } catch (e) {
      console.error('Failed to toggle featured:', e);
    }
  };

  const activeCategories = PRODUCT_CATEGORIES.filter(cat => 
    products.some(p => p.category === cat.name)
  );

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Inventory</h2>
          <p className="text-xs font-bold text-gray-400">{products.length} products total</p>
        </div>
        <Button onClick={() => setEditingProduct('new')} className="h-10 text-xs font-bold bg-gray-900 border-none hover:bg-black rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" /> Add Product
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
        <Input 
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 w-full rounded-xl border-gray-100 bg-white pl-11 text-sm font-medium shadow-sm"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button 
          onClick={() => setSelectedCategory('All')}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
            selectedCategory === 'All' 
              ? "bg-gray-900 text-white border-gray-900" 
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          )}
        >
          All ({products.length})
        </button>
        {activeCategories.map(cat => {
          const count = products.filter(p => p.category === cat.name).length;
          return (
            <button 
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={cn(
                "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
                selectedCategory === cat.name 
                  ? "bg-gray-900 text-white border-gray-900" 
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              )}
            >
              {cat.icon} {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sort:</span>
        {(['name', 'price', 'category'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-lg transition-all capitalize",
              sortBy === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="space-y-2">
        {paginatedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-bold text-gray-400">No products found</p>
          </div>
        ) : (
          paginatedProducts.map(p => (
            <motion.div 
              key={p.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-gray-100 bg-white p-3 flex items-center gap-3 shadow-sm hover:border-gray-200 transition-all"
            >
              {/* Product Icon */}
              <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                {PRODUCT_CATEGORIES.find(c => c.name === p.category)?.icon || '📦'}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0" onClick={() => setEditingProduct(p)}>
                <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-[#06833E]">
                    {formatCurrency(p.price)}/{p.unit}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                    {p.category}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <select 
                  value={p.availabilityStatus}
                  onChange={(e) => updateStatus(p.id, e.target.value)}
                  className={cn(
                    "text-[9px] border rounded-lg p-1 font-bold uppercase cursor-pointer",
                    p.availabilityStatus === 'Available Today' ? 'bg-green-50 text-green-700 border-green-200' :
                    p.availabilityStatus === 'Running Low' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  )}
                >
                  <option value="Available Today">Available</option>
                  <option value="Running Low">Low Stock</option>
                  <option value="Out of Stock">Out</option>
                </select>
                <button
                  onClick={() => toggleFeatured(p)}
                  title={p.isFeatured ? 'Featured — click to unpin' : 'Pin as frequently used'}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                    p.isFeatured
                      ? "bg-yellow-50 text-yellow-500 hover:bg-yellow-100"
                      : "bg-gray-50 text-gray-300 hover:text-yellow-400 hover:bg-yellow-50"
                  )}
                >
                  <Star className={cn("h-3.5 w-3.5", p.isFeatured && "fill-yellow-400")} />
                </button>
                <button 
                  onClick={() => setEditingProduct(p)} 
                  className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => deleteProduct(p.id)} 
                  className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "h-9 w-9 rounded-xl text-xs font-bold transition-all",
                  currentPage === page 
                    ? "bg-gray-900 text-white" 
                    : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-9 w-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Product Edit Modal */}
      {editingProduct && (
        <ProductModal 
          product={editingProduct === 'new' ? undefined : editingProduct} 
          onClose={() => setEditingProduct(null)} 
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose }: { product?: Product, onClose: () => void }) {
  // Comma-separated string states for array fields
  const [keywordsInput, setKeywordsInput] = useState<string>(
    (product?.searchKeywords || []).join(', ')
  );
  const [aliasesInput, setAliasesInput] = useState<string>(
    (product?.englishAliases || []).join(', ')
  );
  const [formData, setFormData] = useState<Partial<Product>>(product || {
    name: '',
    hindiName: '',
    category: PRODUCT_CATEGORIES[0].name,
    price: 0,
    unit: 'kg',
    availabilityStatus: 'Available Today',
    variants: [],
    isFeatured: false,
    description: '',
    searchKeywords: [],
    englishAliases: [],
  });

  const save = async () => {
    if (!formData.name || !formData.price) return alert('Naam aur price bhariye');

    const keywords = keywordsInput
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const aliases = aliasesInput
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    const dataToSave = {
      ...formData,
      searchKeywords: keywords,
      englishAliases: aliases,
      hindiName: formData.hindiName?.trim() || null,
    };
    
    try {
      if (product) {
        await api.put(`/api/products/${product.id}`, dataToSave);
      } else {
        await api.post('/api/products', dataToSave);
      }
      onClose();
    } catch (e: any) {
      alert(e.message || 'Product save nahi ho paya');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">{product ? 'Edit Product' : 'Naya Product'}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 text-xl">×</button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Product Name + Hindi Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product Naam</label>
              <Input value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Aata" className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Hindi Naam (Optional)</label>
              <Input
                value={formData.hindiName || ''}
                onChange={e => setFormData({ ...formData, hindiName: e.target.value })}
                placeholder="e.g. आटा"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description (Optional)</label>
            <textarea
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product ke baare mein kuch bataiye..."
              rows={3}
              className="w-full mt-1 px-3 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Keywords (comma separated)</label>
            <Input
              value={keywordsInput}
              onChange={e => setKeywordsInput(e.target.value)}
              placeholder="e.g. atta, flour, gehun, chakki"
              className="mt-1"
            />
            <p className="text-[9px] text-gray-400 mt-1">Hindi/English koi bhi word — search mein help karega</p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">English Aliases (comma separated)</label>
            <Input
              value={aliasesInput}
              onChange={e => setAliasesInput(e.target.value)}
              placeholder="e.g. wheat flour, chakki fresh atta"
              className="mt-1"
            />
            <p className="text-[9px] text-gray-400 mt-1">Alternative English names for better search</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Price (Rs.)</label>
              <Input type="number" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value === '' ? 0 : Number(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Unit</label>
              <select 
                value={formData.unit} 
                onChange={e => setFormData({ ...formData, unit: e.target.value as any })}
                className="w-full h-11 px-3 border rounded-xl bg-gray-50 text-sm mt-1 border-gray-300"
              >
                <option value="kg">kg</option>
                <option value="litre">litre</option>
                <option value="packet">packet</option>
                <option value="piece">piece</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</label>
            <select 
              value={formData.category} 
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full h-11 px-3 border rounded-xl bg-gray-50 text-sm mt-1 border-gray-300"
            >
              {PRODUCT_CATEGORIES.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          {/* Featured Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
            <div>
              <p className="text-xs font-bold text-yellow-800">⭐ Frequently Used</p>
              <p className="text-[10px] text-yellow-600 mt-0.5">Home page par dikhega (max 10)</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isFeatured: !formData.isFeatured })}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors duration-200",
                formData.isFeatured ? "bg-yellow-400" : "bg-gray-200"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                formData.isFeatured && "translate-x-5"
              )} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variants (Optional)</label>
              <Button size="sm" variant="outline" onClick={() => setFormData({ ...formData, variants: [...(formData.variants || []), { label: '', price: 0 }] })}>
                + Add
              </Button>
            </div>
            {(formData.variants || []).map((v, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="E.g. 1kg" value={v.label} onChange={e => {
                  const newVariants = [...(formData.variants || [])];
                  newVariants[i] = { ...newVariants[i], label: e.target.value };
                  setFormData({ ...formData, variants: newVariants });
                }} className="h-9 text-xs" />
                <Input type="number" value={v.price || ''} onChange={e => {
                  const newVariants = [...(formData.variants || [])];
                  newVariants[i] = { ...newVariants[i], price: e.target.value === '' ? 0 : Number(e.target.value) };
                  setFormData({ ...formData, variants: newVariants });
                }} className="h-9 text-xs w-24" />
                <button onClick={() => {
                  const newVariants = [...(formData.variants || [])];
                  newVariants.splice(i, 1);
                  setFormData({ ...formData, variants: newVariants });
                }} className="text-red-500 px-2 text-lg">×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={save} className="flex-1 bg-gray-900 border-none hover:bg-black">Save Product</Button>
        </div>
      </motion.div>
    </div>
  );
}
