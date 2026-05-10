/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAppStore } from './store/useAppStore';
import { useDatabase } from './hooks/useDatabase';
import { AuthView } from './components/AuthView';
import { Navbar } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { CartView } from './components/CartView';
import { OrdersView } from './components/OrdersView';
import { KhataView } from './components/KhataView';
import { StoreInfoView } from './components/StoreInfoView';
import { OwnerDashboard } from './components/OwnerDashboard';
import { UserProfile } from './types';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const { user, setAuth, setStoreConfig, isLoading, setLoading } = useAppStore();
  const { getUserProfile, subscribeToStoreConfig } = useDatabase();
  const [activeTab, setActiveTab] = useState('catalog');

  useEffect(() => {
    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getUserProfile(session.user.id).then(setAuth);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUserProfile(session.user.id).then(setAuth);
      } else {
        setAuth(null);
      }
      setLoading(false);
    });

    const unsubConfig = subscribeToStoreConfig((config) => {
      setStoreConfig(config);
    });

    return () => {
      subscription.unsubscribe();
      unsubConfig();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  const renderView = () => {
    if (activeTab === 'owner' && user.role === 'owner') {
      return <OwnerDashboard />;
    }
    
    switch (activeTab) {
      case 'catalog': return <CatalogView />;
      case 'cart': return <CartView />;
      case 'orders': return <OrdersView />;
      case 'khata': return <KhataView />;
      case 'info': return <StoreInfoView />;
      default: return <CatalogView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] pb-24">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white px-4 h-16 flex items-center justify-between border-b shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-yellow-400 shadow-sm border border-yellow-500">
            <ShoppingBag className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 leading-none">Dukaan Delivery</h1>
            <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter mt-0.5">Rajasthan, India</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Namaste,</p>
            <p className="text-xs font-black text-gray-900">{user.fullName.split(' ')[0]}</p>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-gray-100 flex items-center justify-center border border-white">
             <User className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="flex flex-col pt-16">
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

import { ShoppingBag, User } from 'lucide-react';
