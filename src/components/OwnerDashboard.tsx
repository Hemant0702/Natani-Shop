import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Package, 
  Users, 
  Settings, 
  Power, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  History,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Order, Product, UserProfile, StoreConfig } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { supabase } from '../lib/supabase';

export function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'customers' | 'settings'>('orders');
  const { storeConfig } = useAppStore();
  const [summary, setSummary] = useState({ todaySales: 0, pendingOrders: 0, totalKhata: 0 });
  
  useEffect(() => {
    const fetchSummary = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: o } = await supabase.from('orders').select('total').eq('status', 'Completed').gte('createdAt', today);
      const { data: p } = await supabase.from('orders').select('id').eq('status', 'Placed');
      const { data: u } = await supabase.from('users').select('balance');
      
      setSummary({
        todaySales: o?.reduce((acc, curr) => acc + curr.total, 0) || 0,
        pendingOrders: p?.length || 0,
        totalKhata: u?.reduce((acc, curr) => acc + curr.balance, 0) || 0
      });
    };
    fetchSummary();
  }, []);

  const toggleStore = async () => {
    if (!storeConfig) return;
    await supabase.from('config').update({ isOpen: !storeConfig.isOpen }).eq('id', 'main');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-xs text-gray-500">Managing {storeConfig?.storeInfo.name}</p>
          </div>
          <Button 
            onClick={toggleStore}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all",
              storeConfig?.isOpen 
                ? "bg-green-100 text-green-700" 
                : "bg-red-100 text-red-700"
            )}
          >
            <Power className="h-4 w-4" />
            {storeConfig?.isOpen ? "Store Khula Hai" : "Dukaan Band Hai"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl bg-white p-4 border shadow-sm flex flex-col justify-between h-24">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Sales</p>
            <p className="text-xl font-black text-green-600">{formatCurrency(summary.todaySales)}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 border shadow-sm flex flex-col justify-between h-24">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
            <p className="text-xl font-black text-blue-600">{summary.pendingOrders}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 border shadow-sm flex flex-col justify-between h-24 col-span-2 md:col-span-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Khata</p>
            <p className="text-xl font-black text-red-600">{formatCurrency(summary.totalKhata)}</p>
          </div>
        </div>

        {activeTab === 'orders' && <ManageOrders />}
        {activeTab === 'products' && <ManageProducts />}
        {activeTab === 'customers' && <ManageCustomers />}
        {activeTab === 'settings' && <StoreSettings />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-white px-2 pb-safe">
        <NavButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={Package} label="Orders" />
        <NavButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={Package} label="Saman" />
        <NavButton active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={Users} label="Grahak" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings} label="Settings" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
        active ? "text-orange-600" : "text-gray-500"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

// Sub-components: ManageOrders, ManageProducts, ManageCustomers, StoreSettings

function ManageOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { subscribeToAllOrders, updateOrderStatus } = useDatabase();

  useEffect(() => {
    return subscribeToAllOrders(setOrders);
  }, []);

  const pending = orders.filter(o => o.status === 'Placed');
  const active = orders.filter(o => ['Being Packed', 'Ready for Pickup'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-4 border shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">New Orders</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{pending.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border shadow-sm">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active</p>
          <p className="mt-1 text-3xl font-bold text-orange-600">{active.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold">Current Orders</h2>
        {orders.length === 0 ? (
          <p className="text-center py-10 text-gray-500">No recent orders</p>
        ) : (
          orders.map(order => (
            <div key={order.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{order.customerName}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase",
                    order.status === 'Placed' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'Being Packed' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'Ready for Pickup' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {order.status}
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-600">{formatCurrency(order.total)}</span>
              </div>

              <div className="text-xs text-gray-600">
                {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
              </div>

              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-gray-400">Pickup: {order.pickupSlot}</span>
                <span className="text-gray-400">{order.customerPhone}</span>
              </div>

              <div className="flex gap-2 pt-2">
                {order.status === 'Placed' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'Being Packed')} className="w-full">
                    Pack Karo
                  </Button>
                )}
                {order.status === 'Being Packed' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'Ready for Pickup')} className="w-full">
                    Taiyar Hai
                  </Button>
                )}
                {order.status === 'Ready for Pickup' && (
                  <Button onClick={() => updateOrderStatus(order.id, 'Completed')} className="w-full bg-green-600 hover:bg-green-700">
                    Mil Gaya
                  </Button>
                )}
                <Button variant="outline" onClick={() => updateOrderStatus(order.id, 'Cancelled')} className="text-red-500 border-red-100">
                  Radd
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ManageProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const { subscribeToProducts } = useDatabase();

  useEffect(() => {
    return subscribeToProducts(setProducts);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('products').update({ availabilityStatus: status }).eq('id', id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Products List</h2>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Naya Saman</Button>
      </div>

      <div className="space-y-3">
        {products.map(p => (
          <div key={p.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between">
            <div>
              <p className="font-bold">{p.name}</p>
              <p className="text-xs text-gray-500">{p.category}</p>
            </div>
            <select 
              value={p.availabilityStatus}
              onChange={(e) => updateStatus(p.id, e.target.value)}
              className="text-xs border rounded-lg p-1.5 font-medium"
            >
              <option value="Available Today">Available</option>
              <option value="Running Low">Low Stack</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManageCustomers() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  
  useEffect(() => {
    supabase.from('users').select('*').order('fullName').then(({ data }) => {
      if (data) setCustomers(data as UserProfile[]);
    });
  }, []);

  const updateLabel = async (uid: string, label: string) => {
    await supabase.from('users').update({ trustLabel: label }).eq('uid', uid);
    setCustomers(customers.map(c => c.uid === uid ? { ...c, trustLabel: label as any } : c));
  };

  const updateLimit = async (uid: string, limit: number) => {
    await supabase.from('users').update({ creditLimit: limit }).eq('uid', uid);
    setCustomers(customers.map(c => c.uid === uid ? { ...c, creditLimit: limit } : c));
  };

  return (
    <div className="space-y-6">
       <h2 className="text-lg font-bold">Registered Grahak</h2>
       <div className="space-y-3">
         {customers.map(c => (
           <div key={c.uid} className="rounded-2xl border bg-white p-4 flex flex-col gap-3">
             <div className="flex items-start justify-between">
               <div>
                 <p className="font-bold">{c.fullName}</p>
                 <p className="text-xs text-gray-500">{c.phoneNumber}</p>
                 <select
                   value={c.trustLabel}
                   onChange={(e) => updateLabel(c.uid, e.target.value)}
                   className={cn(
                     "mt-1 text-[10px] font-bold uppercase rounded border p-1 outline-none",
                     c.trustLabel === 'trusted' ? 'bg-green-50 text-green-700 border-green-200' :
                     c.trustLabel === 'careful' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                     'bg-gray-50 text-gray-600 border-gray-200'
                   )}
                 >
                   <option value="trusted">Trusted</option>
                   <option value="normal">Normal</option>
                   <option value="careful">Careful</option>
                 </select>
               </div>
               <div className="text-right">
                 <p className="text-sm font-bold text-orange-600">{formatCurrency(c.balance || 0)} Due</p>
                 <div className="mt-1 flex items-center justify-end gap-1">
                   <span className="text-[10px] text-gray-400">Limit: Rs.</span>
                   <input 
                     type="number" 
                     value={c.creditLimit || 500} 
                     onChange={(e) => updateLimit(c.uid, Number(e.target.value))}
                     className="w-12 border rounded text-[10px] p-0.5 font-bold"
                   />
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>
    </div>
  );
}

function StoreSettings() {
  const { storeConfig } = useAppStore();
  const [minOrder, setMinOrder] = useState(storeConfig?.minOrderValue || 50);
  const [reopenMsg, setReopenMsg] = useState(storeConfig?.reopenMessage || '');

  const save = async () => {
    await supabase.from('config').update({ minOrderValue: minOrder, reopenMessage: reopenMsg }).eq('id', 'main');
    alert('Settings saved!');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Store Settings</h2>
      <div className="rounded-2xl border bg-white p-6 space-y-4 shadow-sm">
        <div>
          <label className="text-sm font-bold text-gray-600">Minimum Order Value (Rs.)</label>
          <Input 
            type="number" 
            value={minOrder} 
            onChange={(e) => setMinOrder(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-bold text-gray-600">Dukaan Band Message</label>
          <Input 
            type="text" 
            placeholder="Kal subah 9 baje kholenge"
            value={reopenMsg} 
            onChange={(e) => setReopenMsg(e.target.value)}
            className="mt-1"
          />
          <p className="text-[10px] text-gray-400 mt-1">Jab dukaan band ho tab grahak ko yeh message dikhega</p>
        </div>
        <Button onClick={save} className="w-full">Save Changes</Button>
      </div>

      <div className="p-4 text-center">
        <p className="text-xs text-gray-400">App Version 4.0 | May 2026</p>
      </div>
    </div>
  );
}
