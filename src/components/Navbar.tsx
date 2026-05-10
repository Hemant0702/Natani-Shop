import { Home, ShoppingCart, Package, Wallet, Info, ArrowRight, Settings, ShoppingBag } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { cart, user } = useAppStore();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const tabs = [
    { id: 'catalog', label: 'Bazaar', icon: ShoppingBag },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'khata', label: 'Khata', icon: Wallet },
    { id: 'info', label: 'Dukaan', icon: Info },
  ];

  return (
    <>
      {/* Floating Cart Button */}
      {cartItemCount > 0 && activeTab !== 'cart' && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-24 left-4 right-4 z-50"
        >
          <button 
            onClick={() => setActiveTab('cart')}
            className="w-full h-16 bg-green-600 rounded-3xl flex items-center justify-between px-5 text-white shadow-2xl ring-4 ring-white"
          >
            <div className="flex items-center gap-3">
              <div className="bg-green-700/50 rounded-xl px-2.5 py-1.5 font-black text-xs">
                {cartItemCount} items
              </div>
              <div className="h-6 w-[1px] bg-white/20" />
              <div className="font-black text-sm uppercase tracking-tight">Thaila Dekhein</div>
            </div>
            <div className="flex items-center gap-1 font-black text-lg">
              {formatCurrency(cartTotal)}
              <ArrowRight className="h-5 w-5 ml-1" />
            </div>
          </button>
        </motion.div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 border-t bg-white px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1.5 transition-all py-2",
              activeTab === tab.id ? "text-gray-900" : "text-gray-400"
            )}
          >
            <tab.icon className={cn(
              "h-6 w-6 transition-transform",
              activeTab === tab.id ? "scale-110 text-yellow-500" : ""
            )} />
            <span className="text-[10px] font-black uppercase tracking-tight leading-none">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabDot"
                className="absolute top-0 w-12 h-1.5 bg-yellow-400 rounded-b-full"
              />
            )}
          </button>
        ))}
        {user?.role === 'owner' && (
            <button
              onClick={() => setActiveTab('owner')}
              className={cn(
                "relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 transition-all py-2",
                activeTab === 'owner' ? "text-gray-900" : "text-gray-400"
              )}
            >
              <Settings className={cn(
                "h-6 w-6 transition-transform",
                activeTab === 'owner' ? "scale-110 text-gray-900" : ""
              )} />
              <span className="text-[10px] font-black uppercase tracking-tight leading-none">Admin</span>
              {activeTab === 'owner' && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute top-0 w-12 h-1.5 bg-gray-900 rounded-b-full"
                />
              )}
            </button>
        )}
      </nav>
    </>
  );
}
