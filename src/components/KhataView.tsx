import { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Order } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { BookOpen, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function KhataView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAppStore();
  const { subscribeToUserOrders } = useDatabase();

  useEffect(() => {
    if (!user) return;
    return subscribeToUserOrders(user.uid, (allOrders) => {
      // Only show picked orders (completed sales)
      setOrders(allOrders.filter(o => o.status === 'Picked'));
    });
  }, [user]);

  const totalOrders = orders.reduce((a, o) => a + o.total, 0);
  const totalPaid = orders.filter(o => o.paymentStatus === 'collected').reduce((a, o) => a + o.total, 0);
  const totalPending = orders.filter(o => o.paymentStatus === 'pending').reduce((a, o) => a + o.total, 0);

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Mera Khata</h2>
        <p className="text-xs font-bold text-gray-400">Orders aur payment ka hisab</p>
      </div>

      {/* Summary Card */}
      <div className="rounded-[2rem] bg-gray-900 p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#06833E] opacity-10 rounded-full -mr-16 -mt-16" />
        
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm w-fit">
            <BookOpen className="h-3.5 w-3.5 text-green-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">Khata Summary</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Total</p>
              <p className="text-lg font-black">{formatCurrency(totalOrders)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Paid</p>
              <p className="text-lg font-black text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Pending</p>
              <p className="text-lg font-black text-red-400">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Warning */}
      {totalPending > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-4 flex gap-3 items-start">
          <div className="rounded-xl bg-red-100 p-2 shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-black text-red-800">Udhari baaki hai</p>
            <p className="text-xs font-bold text-red-600 mt-0.5">{formatCurrency(totalPending)} ka payment abhi baaki hai. Dukaan par jaake dukandaar ko dein.</p>
          </div>
        </div>
      )}

      {/* Orders Ledger */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Order History</h3>
        
        {orders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-3xl">📖</div>
            <p className="text-sm font-bold text-gray-400">Abhi koi order complete nahi hua</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Payment Status Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-2 border-b",
                  order.paymentStatus === 'collected' ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                )}>
                  <div className="flex items-center gap-1.5">
                    {order.paymentStatus === 'collected' 
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <Clock className="h-3.5 w-3.5 text-red-600" />
                    }
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      order.paymentStatus === 'collected' ? "text-green-700" : "text-red-700"
                    )}>
                      {order.paymentStatus === 'collected' ? '💰 Paid' : '📝 Udhari'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    {format(new Date(order.createdAt), 'dd MMM yyyy')}
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400">#ORD-{order.id.slice(-6).toUpperCase()}</p>
                    <p className="text-base font-black text-gray-900">{formatCurrency(order.total)}</p>
                  </div>

                  {/* Items Summary */}
                  <p className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg leading-relaxed">
                    {order.items.map(i => `${i.quantity}× ${i.productName}`).join(' • ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
