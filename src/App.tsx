/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useAppStore } from './store/useAppStore';
import { useDatabase } from './hooks/useDatabase';
import { AuthView } from './components/AuthView';
import { AdminApp } from './components/admin/AdminApp';
import { Navbar } from './components/Navbar';
import { CatalogView } from './components/CatalogView';
import { CartView } from './components/CartView';
import { OrdersView } from './components/OrdersView';
import { KhataView } from './components/KhataView';
import { LoadingOverlay } from './components/ui/LoadingOverlay';
import { UserProfile } from './types';
import { Loader2, Bell, X, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from './lib/utils';
import { usePushNotifications } from './hooks/usePushNotifications';
import { LoyaltyWidget } from './components/LoyaltyWidget';
import { NotificationBell } from './components/NotificationBell';

export default function App() {
  const { user, setAuth, setStoreConfig, isLoading, setLoading } = useAppStore();
  const { getUserProfile, subscribeToStoreConfig } = useDatabase();
  const [activeTab, setActiveTab] = useState('catalog');
  const [showProfile, setShowProfile] = useState(false);

  // Subscribe to push notifications if logged in
  usePushNotifications(user?.uid);

  useEffect(() => {
    // Listen for auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        getUserProfile(session.user.id).then((profile) => {
          console.log('>>> Profile loaded:', profile?.role, profile);
          setAuth(profile);
        });
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

    const { getStoreConfig } = useDatabase();
    getStoreConfig().then(setStoreConfig);

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
        <Loader2 className="h-8 w-8 animate-spin text-[#06833E]" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // Admin gets a completely separate app shell
  if (user.role === 'admin') {
    return <AdminApp />;
  }

  // User App
  const renderView = () => {
    switch (activeTab) {
      case 'catalog': return <CatalogView />;
      case 'cart': return <CartView />;
      case 'orders': return <OrdersView />;
      case 'khata': return <KhataView />;
      default: return <CatalogView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] pb-24">
      {/* User Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white px-5 h-16 flex items-center justify-between border-b shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-xl font-extrabold text-[#06833E] tracking-tight">ApniDukan</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <LoyaltyWidget />
          <NotificationBell />
          {/* Profile Circle */}
          <button 
            onClick={() => setShowProfile(true)}
            className="h-9 w-9 rounded-full bg-[#E6F3EC] flex items-center justify-center text-[#06833E] font-bold text-sm border border-[#06833E]/10"
          >
            {user.fullName?.charAt(0)?.toUpperCase() || '?'}
          </button>
        </div>
      </header>

      <main className="flex flex-col pt-16">
        <div className="mx-auto w-full max-w-lg px-4 pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Profile Slide-out */}
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setShowProfile(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-80 bg-white shadow-2xl"
            >
              <div className="h-full flex flex-col">
                {/* Profile Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-black text-gray-900">Profile</h3>
                    <button onClick={() => setShowProfile(false)} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-[#E6F3EC] flex items-center justify-center text-2xl font-bold text-[#06833E]">
                      {user.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900">{user.fullName}</h4>
                      <p className="text-xs font-bold text-gray-500">{user.phoneNumber}</p>
                      <p className="text-xs font-bold text-gray-400">{user.place}</p>
                    </div>
                  </div>
                </div>

                {/* Profile Info */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Email</span>
                      <span className="text-xs font-bold text-gray-900">{user.email || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-bold text-gray-500">Trust Label</span>
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                        user.trustLabel === 'trusted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      )}>
                        {user.trustLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="p-6 border-t border-gray-100">
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 rounded-xl p-4 text-red-600 font-bold text-sm border border-red-100 hover:bg-red-100 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <LoadingOverlay />
    </div>
  );
}
