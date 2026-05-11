import { Home, ShoppingCart, ClipboardList, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { cart } = useAppStore();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const tabs = [
    { id: 'catalog', label: 'Home', icon: Home },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, count: cartItemCount },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'khata', label: 'Khata', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 border-t bg-white px-2 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.04)] items-center justify-around">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 transition-all h-full px-4 flex-1",
            activeTab === tab.id ? "text-[#06833E]" : "text-gray-400"
          )}
        >
          <div className="relative">
            <tab.icon className={cn(
              "h-6 w-6 transition-transform",
              activeTab === tab.id ? "scale-110" : ""
            )} />
            {tab.count !== undefined && tab.count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold capitalize tracking-tight leading-none">{tab.label}</span>
          
          {activeTab === tab.id && (
            <motion.div 
              layoutId="activeTabIndicator"
              className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-1 bg-[#06833E] rounded-b-full"
            />
          )}
        </button>
      ))}
    </nav>
  );
}
