import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { UserProfile } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { useDatabase } from '../../hooks/useDatabase';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import { Users, Settings, User, Search } from 'lucide-react';

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<'store' | 'customers'>('store');

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Settings</h2>
      </div>

      {/* Section Toggle */}
      <div className="flex bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm">
        <button
          onClick={() => setActiveSection('store')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSection === 'store' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500"
          )}
        >
          <Settings className="h-3.5 w-3.5" /> Dukaan Settings
        </button>
        <button
          onClick={() => setActiveSection('customers')}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSection === 'customers' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500"
          )}
        >
          <Users className="h-3.5 w-3.5" /> Grahak
        </button>
      </div>

      {activeSection === 'store' ? <StoreSettings /> : <ManageCustomers />}
    </div>
  );
}

function StoreSettings() {
  const { storeConfig } = useAppStore();
  const [minOrder, setMinOrder] = useState(storeConfig?.minOrderValue || 50);
  const [reopenMsg, setReopenMsg] = useState(storeConfig?.reopenMessage || '');
  const [info, setInfo] = useState(storeConfig?.storeInfo || {
    name: 'Apni Dukan',
    ownerName: 'Hemant Natani',
    address: 'Village Near Kota',
    phone: '9999999999',
    operatingHours: '8 AM - 8 PM'
  });

  const save = async () => {
    try {
      await api.put('/api/config', { 
        minOrderValue: minOrder, 
        reopenMessage: reopenMsg,
        storeInfo: info 
      });
      alert('Settings saved!');
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-6 shadow-sm">
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Dukaan ki Jankari</h3>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dukaan ka Naam</label>
          <Input value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Malik ka Naam</label>
          <Input value={info.ownerName} onChange={e => setInfo({ ...info, ownerName: e.target.value })} className="mt-1" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Address (Pata)</label>
          <Input value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
            <Input value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Operating Hours</label>
            <Input value={info.operatingHours} onChange={e => setInfo({ ...info, operatingHours: e.target.value })} className="mt-1" />
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Settings</h3>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Minimum Order Value (Rs.)</label>
          <Input 
            type="number" 
            value={minOrder || ''} 
            onChange={(e) => setMinOrder(e.target.value === '' ? 0 : Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Dukaan Band Message</label>
          <Input 
            type="text" 
            placeholder="Kal subah 9 baje kholenge"
            value={reopenMsg} 
            onChange={(e) => setReopenMsg(e.target.value)}
            className="mt-1"
          />
          <p className="text-[10px] text-gray-400 mt-1">Jab dukaan band ho tab grahak ko yeh message dikhega</p>
        </div>
      </div>

      <Button onClick={save} className="w-full bg-gray-900 border-none hover:bg-black py-5 text-base font-black">Save All Settings</Button>

      <div className="pt-2 text-center">
        <p className="text-[10px] text-gray-400">App Version 4.0 | May 2026</p>
      </div>
    </div>
  );
}

function ManageCustomers() {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { getAllCustomers } = useDatabase();
  
  useEffect(() => {
    getAllCustomers().then(setCustomers);
  }, []);

  const filteredCustomers = customers.filter(c => {
    if (c.role === 'admin') return false;
    if (searchQuery.length < 2) return true;
    return c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.phoneNumber?.includes(searchQuery);
  });

  const updateLabel = async (uid: string, label: string) => {
    try {
      await api.put(`/api/customers/${uid}/trust-label`, { trustLabel: label });
      setCustomers(customers.map(c => c.uid === uid ? { ...c, trustLabel: label as any } : c));
    } catch (e) {
      console.error('Failed to update label:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input 
          placeholder="Search customers..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-10 pl-10 text-sm rounded-xl"
        />
      </div>

      <p className="text-xs font-bold text-gray-400 px-1">{filteredCustomers.length} registered customers</p>

      <div className="space-y-2">
        {filteredCustomers.map(c => (
          <div key={c.uid} className="rounded-xl border border-gray-100 bg-white p-4 flex items-start justify-between shadow-sm" onClick={() => setSelectedCustomer(c)}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{c.fullName}</p>
                <p className="text-[10px] font-bold text-gray-400">{c.phoneNumber} • {c.place}</p>
                <div className={cn(
                  "mt-1 inline-block text-[9px] font-bold uppercase rounded px-2 py-0.5",
                  c.trustLabel === 'trusted' ? 'bg-green-50 text-green-700' :
                  c.trustLabel === 'careful' ? 'bg-amber-50 text-amber-700' : 
                  'bg-gray-50 text-gray-600'
                )}>
                  {c.trustLabel}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCustomer && (
        <CustomerModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
          onUpdate={(updated) => {
            setCustomers(customers.map(c => c.uid === updated.uid ? updated : c));
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer, onClose, onUpdate }: { customer: UserProfile, onClose: () => void, onUpdate: (u: UserProfile) => void }) {
  const updateLabel = async (label: string) => {
    try {
      await api.put(`/api/customers/${customer.uid}/trust-label`, { trustLabel: label });
      onUpdate({ ...customer, trustLabel: label as any });
    } catch (e) {
      console.error('Failed to update label:', e);
    }
  };

  const updateLimit = async (limit: number) => {
    try {
      await api.put(`/api/customers/${customer.uid}/credit-limit`, { creditLimit: limit });
      onUpdate({ ...customer, creditLimit: limit });
    } catch (e) {
      console.error('Failed to update limit:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{customer.fullName}</h3>
            <p className="text-xs text-gray-500">{customer.phoneNumber} • {customer.place}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 text-xl">×</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trust Label</label>
            <select 
              value={customer.trustLabel}
              onChange={(e) => updateLabel(e.target.value)}
              className="w-full h-11 px-3 border rounded-xl bg-gray-50 text-sm mt-1 border-gray-300"
            >
              <option value="trusted">Trusted (Vishwaas-patra)</option>
              <option value="normal">Normal (Sadharan)</option>
              <option value="careful">Careful (Dhyan rakhein)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credit Limit (Rs.)</label>
            <Input type="number" value={customer.creditLimit || ''} onChange={e => updateLimit(e.target.value === '' ? 0 : Number(e.target.value))} className="mt-1" />
          </div>
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
      </motion.div>
    </div>
  );
}
