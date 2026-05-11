import { useState, useEffect } from 'react';
import { 
  Package, 
  BarChart3, 
  BookOpen, 
  Tag, 
  Settings, 
  Power,
  LogOut
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDatabase } from '../../hooks/useDatabase';
import { Button } from '../ui/Button';
import { cn, formatCurrency } from '../../lib/utils';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { AdminOrders } from './AdminOrders';
import { AdminInventory } from './AdminInventory';
import { AdminKhata } from './AdminKhata';
import { AdminOffers } from './AdminOffers';
import { AdminSettings } from './AdminSettings';

type AdminTab = 'orders' | 'inventory' | 'khata' | 'offers' | 'settings';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const { storeConfig, user } = useAppStore();

  const toggleStore = async () => {
    if (!storeConfig) return;
    try {
      await api.put('/api/config', { isOpen: !storeConfig.isOpen });
    } catch (e) {
      console.error('Failed to toggle store:', e);
    }
  };

  const tabs: { id: AdminTab; label: string; icon: typeof Package }[] = [
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'inventory', label: 'Inventory', icon: BarChart3 },
    { id: 'khata', label: 'Khata', icon: BookOpen },
    { id: 'offers', label: 'Offers', icon: Tag },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FB] pb-24">
      {/* Admin Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white px-5 h-16 flex items-center justify-between border-b shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Admin Panel</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{storeConfig?.storeInfo?.name || 'ApniDukan'}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={toggleStore}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              storeConfig?.isOpen 
                ? "bg-green-100 text-green-700 border border-green-200" 
                : "bg-red-100 text-red-700 border border-red-200"
            )}
          >
            <Power className="h-3.5 w-3.5" />
            {storeConfig?.isOpen ? "Open" : "Closed"}
          </button>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'orders' && <AdminOrders />}
            {activeTab === 'inventory' && <AdminInventory />}
            {activeTab === 'khata' && <AdminKhata />}
            {activeTab === 'offers' && <AdminOffers />}
            {activeTab === 'settings' && <AdminSettings />}
          </motion.div>
        </div>
      </main>

      {/* Admin Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-20 border-t bg-white px-1 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.04)] items-center justify-around">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex flex-col items-center justify-center gap-1 transition-all h-full px-2 flex-1",
              activeTab === tab.id ? "text-gray-900" : "text-gray-400"
            )}
          >
            <div className="relative">
              <tab.icon className={cn(
                "h-5 w-5 transition-transform",
                activeTab === tab.id ? "scale-110" : ""
              )} />
            </div>
            <span className="text-[9px] font-bold capitalize tracking-tight leading-none">{tab.label}</span>
            
            {activeTab === tab.id && (
              <motion.div 
                layoutId="adminTabIndicator"
                className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-900 rounded-b-full"
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
