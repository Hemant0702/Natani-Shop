import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { UserProfile, LoyaltySettings, EnrichedCustomer, CoinTransaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { useDatabase } from '../../hooks/useDatabase';
import { motion } from 'framer-motion';
import { Users, Settings, User, Search, Gift, Award, Flame, Coins, Plus, Minus } from 'lucide-react';

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState<'store' | 'customers' | 'loyalty'>('store');

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Settings</h2>
      </div>

      {/* Section Toggle */}
      <div className="flex bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveSection('store')}
          className={cn(
            "flex-none px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSection === 'store' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Settings className="h-3.5 w-3.5" /> Dukaan Settings
        </button>
        <button
          onClick={() => setActiveSection('loyalty')}
          className={cn(
            "flex-none px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSection === 'loyalty' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Gift className="h-3.5 w-3.5" /> Loyalty Rules
        </button>
        <button
          onClick={() => setActiveSection('customers')}
          className={cn(
            "flex-none px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
            activeSection === 'customers' ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          <Users className="h-3.5 w-3.5" /> Grahak
        </button>
      </div>

      {activeSection === 'store' && <StoreSettings />}
      {activeSection === 'loyalty' && <LoyaltySettingsView />}
      {activeSection === 'customers' && <ManageCustomers />}
    </div>
  );
}

// --- STORE SETTINGS (Unchanged) ---
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
    </div>
  );
}

// --- LOYALTY SETTINGS ---
function LoyaltySettingsView() {
  const { getLoyaltySettings, updateLoyaltySettings } = useDatabase();
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLoyaltySettings().then(data => {
      if (data) setSettings(data);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!settings) return;
    try {
      await updateLoyaltySettings(settings);
      alert('Loyalty Rules Saved!');
    } catch (e) {
      console.error(e);
      alert('Failed to save loyalty rules');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading rules...</div>;
  if (!settings) return <div className="text-center py-10 text-red-500">Error loading rules.</div>;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-8 shadow-sm">
      
      {/* Streak Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Streak Rules</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Milestone (Days)</label>
            <Input 
              type="number" 
              value={settings.streakMilestone} 
              onChange={e => setSettings({ ...settings, streakMilestone: Number(e.target.value) })} 
              className="mt-1" 
            />
            <p className="text-[9px] text-gray-400 mt-1">Kitne din lagatar order pe coupon milega</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Coupon Amount (₹)</label>
            <Input 
              type="number" 
              value={settings.streakBonusAmount} 
              onChange={e => setSettings({ ...settings, streakBonusAmount: Number(e.target.value) })} 
              className="mt-1" 
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Coupon Min. Order (₹)</label>
          <Input 
            type="number" 
            value={settings.streakMinOrderValue} 
            onChange={e => setSettings({ ...settings, streakMinOrderValue: Number(e.target.value) })} 
            className="mt-1" 
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Coin Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Coin Accumulation</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Spend Milestone (₹)</label>
            <Input 
              type="number" 
              value={settings.coinSpendMilestone} 
              onChange={e => setSettings({ ...settings, coinSpendMilestone: Number(e.target.value) })} 
              className="mt-1" 
            />
            <p className="text-[9px] text-gray-400 mt-1">Har ₹{settings.coinSpendMilestone} ki kharid par coins</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Coins Earned</label>
            <Input 
              type="number" 
              value={settings.coinEarnAmount} 
              onChange={e => setSettings({ ...settings, coinEarnAmount: Number(e.target.value) })} 
              className="mt-1" 
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Min. Coins to Redeem</label>
          <Input 
            type="number" 
            value={settings.minRedeem} 
            onChange={e => setSettings({ ...settings, minRedeem: Number(e.target.value) })} 
            className="mt-1" 
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Referral Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Referral Rules</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Referrer Coins</label>
            <Input 
              type="number" 
              value={settings.referralReferrerCoins} 
              onChange={e => setSettings({ ...settings, referralReferrerCoins: Number(e.target.value) })} 
              className="mt-1" 
            />
            <p className="text-[9px] text-gray-400 mt-1">Code share karne wale ko</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Referee Discount (₹)</label>
            <Input 
              type="number" 
              value={settings.referralRefereeDiscount} 
              onChange={e => setSettings({ ...settings, referralRefereeDiscount: Number(e.target.value) })} 
              className="mt-1" 
            />
            <p className="text-[9px] text-gray-400 mt-1">Naye grahak ko pehle order pe</p>
          </div>
        </div>
      </div>

      <Button onClick={save} className="w-full bg-[#06833E] border-none hover:bg-[#008037] py-5 text-base font-black">Save Loyalty Rules</Button>
    </div>
  );
}

// --- CUSTOMERS WITH LOYALTY ---
function ManageCustomers() {
  const [customers, setCustomers] = useState<EnrichedCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<EnrichedCustomer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { getAllCustomers } = useDatabase();
  
  useEffect(() => {
    fetch();
  }, []);

  const fetch = () => {
    getAllCustomers().then(setCustomers);
  };

  const filteredCustomers = customers.filter(c => {
    if (c.role === 'admin') return false;
    if (searchQuery.length < 2) return true;
    return c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.phoneNumber?.includes(searchQuery);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input 
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-10 pl-10 text-sm rounded-xl"
        />
      </div>

      <p className="text-xs font-bold text-gray-400 px-1">{filteredCustomers.length} registered customers</p>

      <div className="space-y-2">
        {filteredCustomers.map(c => (
          <div key={c.uid} className="rounded-xl border border-gray-100 bg-white p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-green-200 transition-all" onClick={() => setSelectedCustomer(c)}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center text-xl relative">
                {c.badge ? c.badge.emoji : <User className="h-5 w-5 text-gray-400" />}
                {c.streak?.currentStreak > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                    <div className="bg-orange-100 text-orange-600 text-[9px] font-black px-1 rounded-full">
                      🔥{c.streak.currentStreak}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{c.fullName}</p>
                <p className="text-[10px] font-bold text-gray-400">{c.phoneNumber} • {c.place}</p>
                <div className="flex gap-2 mt-1">
                  <span className={cn(
                    "inline-block text-[9px] font-bold uppercase rounded px-1.5 py-0.5",
                    c.trustLabel === 'trusted' ? 'bg-green-50 text-green-700' :
                    c.trustLabel === 'careful' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                  )}>
                    {c.trustLabel}
                  </span>
                  <span className="inline-block text-[9px] font-bold uppercase rounded px-1.5 py-0.5 bg-yellow-50 text-amber-700">
                    🪙 {c.coinBalance}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs font-black text-gray-900">{c.totalOrders} Orders</p>
            </div>
          </div>
        ))}
      </div>

      {selectedCustomer && (
        <CustomerLoyaltyModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
          onRefresh={() => { fetch(); setSelectedCustomer(null); }}
        />
      )}
    </div>
  );
}

function CustomerLoyaltyModal({ customer, onClose, onRefresh }: { customer: EnrichedCustomer, onClose: () => void, onRefresh: () => void }) {
  const { adjustCoins, getCustomerLoyaltyDetail } = useDatabase();
  const [detail, setDetail] = useState<{ transactions: CoinTransaction[], referralCount: number } | null>(null);
  
  const [adjAmount, setAdjAmount] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [isAdding, setIsAdding] = useState(true);

  useEffect(() => {
    getCustomerLoyaltyDetail(customer.uid).then(data => setDetail(data as any));
  }, [customer.uid]);

  const updateLabel = async (label: string) => {
    try {
      await api.put(`/api/customers/${customer.uid}/trust-label`, { trustLabel: label });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const updateLimit = async (limit: number) => {
    try {
      await api.put(`/api/customers/${customer.uid}/credit-limit`, { creditLimit: limit });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustCoins = async () => {
    const amt = Number(adjAmount);
    if (!amt || !adjNote) return alert('Amount and note required');
    try {
      await adjustCoins(customer.uid, isAdding ? amt : -amt, adjNote);
      alert('Coins adjusted!');
      setAdjAmount('');
      setAdjNote('');
      onRefresh(); // Close and refresh to see new balance
    } catch (e: any) {
      alert(e.message || 'Failed to adjust');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] bg-white p-6 shadow-2xl space-y-6 scrollbar-hide"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{customer.badge?.emoji || '👤'}</div>
            <div>
              <h3 className="text-xl font-bold">{customer.fullName}</h3>
              <p className="text-xs font-bold text-gray-500">🪙 {customer.coinBalance} Coins • {customer.totalOrders} Orders</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">×</button>
        </div>

        {/* Adjust Coins */}
        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 space-y-3">
          <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest">Adjust Coins (Admin)</h4>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsAdding(true)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold", isAdding ? "bg-green-100 text-green-700" : "bg-white")}>
              <Plus className="h-4 w-4 mx-auto" />
            </button>
            <button onClick={() => setIsAdding(false)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold", !isAdding ? "bg-red-100 text-red-700" : "bg-white")}>
              <Minus className="h-4 w-4 mx-auto" />
            </button>
          </div>
          <Input 
            type="number" 
            placeholder="Amount" 
            value={adjAmount} 
            onChange={e => setAdjAmount(e.target.value)}
          />
          <Input 
            placeholder="Reason / Note" 
            value={adjNote} 
            onChange={e => setAdjNote(e.target.value)}
          />
          <Button onClick={handleAdjustCoins} disabled={!adjAmount || !adjNote} className="w-full text-xs h-10">
            Confirm Adjustment
          </Button>
        </div>

        {/* Existing Khata/Trust Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trust Label</label>
            <select 
              value={customer.trustLabel}
              onChange={(e) => updateLabel(e.target.value)}
              className="w-full h-11 px-3 border rounded-xl bg-gray-50 text-sm mt-1 border-gray-300"
            >
              <option value="trusted">Trusted</option>
              <option value="normal">Normal</option>
              <option value="careful">Careful</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Credit Limit</label>
            <Input type="number" value={customer.creditLimit || ''} onChange={e => updateLimit(e.target.value === '' ? 0 : Number(e.target.value))} className="mt-1" />
          </div>
        </div>

        {/* Transaction History */}
        {detail && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Coin History</h4>
            <div className="max-h-40 overflow-y-auto space-y-2 text-sm divide-y divide-gray-50 border rounded-xl p-2">
              {detail.transactions.length === 0 ? (
                <p className="text-xs text-center text-gray-400 py-4">No transactions yet</p>
              ) : (
                detail.transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-1">
                    <div>
                      <p className="text-[11px] font-bold text-gray-800">{tx.type} <span className="text-gray-400 font-normal ml-1">{new Date(tx.createdAt).toLocaleDateString()}</span></p>
                      {tx.note && <p className="text-[10px] text-gray-500">{tx.note}</p>}
                    </div>
                    <span className={cn("text-xs font-black", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="bg-blue-50 text-blue-800 rounded-xl p-3 text-xs flex justify-between items-center">
              <span className="font-bold">Total Referrals Made:</span>
              <span className="font-black text-base">{detail.referralCount}</span>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
