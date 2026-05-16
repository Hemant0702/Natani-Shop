import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Bell, CheckCircle2, Truck, Package, XCircle, CreditCard, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

export function NotificationBell() {
  const { user } = useAppStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.uid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setNotifications(data || []);
        
        // Count unread
        const { count: unread } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.uid)
          .eq('is_read', false);
          
        setUnreadCount(unread || 0);
      } catch (e) {
        console.error('Error fetching notifications:', e);
        // Offline handling: try to load from localStorage
        const cached = localStorage.getItem(`notifications_${user.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setNotifications(parsed.list);
          setUnreadCount(parsed.unread);
        }
      }
    };

    fetchNotifications();

    // Subscribe to realtime updates
    const channel = supabase.channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.uid}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user]);

  // Cache to localStorage for offline
  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`notifications_${user.uid}`, JSON.stringify({
        list: notifications,
        unread: unreadCount
      }));
    }
  }, [notifications, unreadCount, user]);

  const markAsRead = async (id: string) => {
    if (!navigator.onLine) {
       alert("You're offline — this action requires internet connection. Please reconnect and try again.");
       return;
    }
    
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (e) {
      console.error('Error marking as read:', e);
      // Revert if failed
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      setUnreadCount(prev => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    if (!navigator.onLine) {
       alert("You're offline — this action requires internet connection. Please reconnect and try again.");
       return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.uid)
        .eq('is_read', false);
    } catch (e) {
      console.error('Error marking all as read:', e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'confirmed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'dispatched': return <Truck className="h-5 w-5 text-blue-500" />;
      case 'delivered': return <Package className="h-5 w-5 text-purple-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'payment_collected': return <CreditCard className="h-5 w-5 text-yellow-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-black text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-[#06833E] hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[350px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-bold">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.is_read && markAsRead(notif.id)}
                      className={cn(
                        "p-4 flex gap-3 transition-colors cursor-pointer",
                        !notif.is_read ? "bg-blue-50/30" : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={cn(
                            "text-sm font-bold truncate",
                            !notif.is_read ? "text-gray-900" : "text-gray-700"
                          )}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className={cn(
                          "text-xs mt-1 line-clamp-2",
                          !notif.is_read ? "text-gray-600 font-medium" : "text-gray-500"
                        )}>
                          {notif.message}
                        </p>
                      </div>
                      {!notif.is_read && (
                        <div className="flex-shrink-0 mt-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
