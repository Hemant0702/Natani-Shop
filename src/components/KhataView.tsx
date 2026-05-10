import { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { KhataEntry } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export function KhataView() {
  const [entries, setEntries] = useState<KhataEntry[]>([]);
  const { user } = useAppStore();
  const { subscribeToKhata } = useDatabase();

  useEffect(() => {
    if (!user) return;
    return subscribeToKhata(user.uid, setEntries);
  }, [user]);

  const flagKhataEntry = async (id: string) => {
    if (confirm('Galat lag raha hai? Owner ko report karein?')) {
      await supabase.from('khata_entries').update({ isDisputed: true }).eq('id', id);
      alert('Report kar diya gaya hai. Owner check karenge.');
    }
  };

  const balance = user?.balance || 0;
  const limit = user?.creditLimit || 500;

  return (
    <div className="space-y-6 pb-20">
      <h2 className="text-2xl font-bold">Mera Khata</h2>

      {/* Balance Card (Modern Style) */}
      <div className="rounded-[2.5rem] bg-gray-900 p-8 text-white shadow-2xl relative overflow-hidden ring-4 ring-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 opacity-10 rounded-full -mr-16 -mt-16" />
        
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm">
              <Wallet className="h-4 w-4 text-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Village Khata Card</span>
            </div>
          </div>
          
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 mx-1">Vartaman Baaki (Due)</p>
            <p className="text-5xl font-black tracking-tighter">{formatCurrency(balance)}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 leading-none">Credit Limit</p>
              <p className="text-lg font-black">{formatCurrency(limit)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 leading-none">Safe Balance</p>
              <p className="text-lg font-black text-green-400">{formatCurrency(Math.max(0, limit - balance))}</p>
            </div>
          </div>
        </div>
      </div>

      {balance >= limit && (
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="rounded-3xl bg-red-600 p-5 text-white shadow-lg shadow-red-100 flex gap-4 ring-4 ring-white"
        >
          <div className="rounded-2xl bg-white/20 p-2 shrink-0">
             <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-black">Limit Khatam Ho Gayi!</p>
            <p className="text-xs font-bold text-red-100 mt-1">Naye order ke liye pehle pichla hisab chukayein.</p>
          </div>
        </motion.div>
      )}

      {/* Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">History & Settlement</h3>
          <button className="text-[10px] font-black text-green-600 uppercase">Statement</button>
        </div>
        
        {entries.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-2xl">📖</div>
            <p className="text-sm font-black text-gray-400">Abhi koi len-den nahi hua hai</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {entries.map((entry) => (
              <div key={entry.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                   <div className={cn(
                     "h-12 w-12 rounded-2xl flex items-center justify-center text-xl",
                     entry.amount > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                   )}>
                     {entry.amount > 0 ? '⬆️' : '⬇️'}
                   </div>
                   <div>
                    <h4 className="text-sm font-black text-gray-900">{entry.type} {entry.orderId ? `#ORD-${entry.orderId.slice(-4).toUpperCase()}` : ''}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{format(new Date(entry.date), 'dd MMM yyyy, hh:mm a')}</p>
                    {entry.note && <p className="mt-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg inline-block italic">"{entry.note}"</p>}
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <p className={cn(
                    "text-base font-black tabular-nums",
                    entry.amount > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {entry.amount > 0 ? '+' : ''}{formatCurrency(entry.amount)}
                  </p>
                  
                  {entry.isDisputed ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 px-2 py-0.5 text-[8px] font-black text-yellow-700 uppercase">
                      <AlertCircle className="h-2.5 w-2.5" /> Disputes
                    </div>
                  ) : (
                    <button 
                      onClick={() => flagKhataEntry(entry.id)}
                      className="text-[9px] font-black text-gray-300 uppercase hover:text-red-500 transition-colors"
                    >
                      Report Issue?
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
