import { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Order } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Package, CheckCircle2, Clock, XCircle, Truck, CreditCard, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAppStore();
  const { subscribeToUserOrders, updateOrderResponse } = useDatabase();

  useEffect(() => {
    if (!user) return;
    return subscribeToUserOrders(user.uid, setOrders);
  }, [user]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="h-24 w-24 rounded-full bg-[#E6F3EC] flex items-center justify-center text-4xl">
          📦
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Abhi koi order nahi hai</h3>
          <p className="mt-1 text-sm text-gray-500 font-medium">Aapka pehla order yahan dikhega</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <h2 className="text-xl font-black text-gray-900">Aapke Orders</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id}>
            <OrderCard order={order} />
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const { updateOrderResponse } = useDatabase();

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
    'Placed': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', label: '⏳ Order Placed — Dukaan dekh rahi hai' },
    'Accepted': { icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100', label: '✅ Accept Ho Gaya' },
    'Packing': { icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100', label: '📦 Pack Ho Raha Hai' },
    'Packed': { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', label: '✅ Pack Ho Gaya — Aajaaiye!' },
    'Picked': { icon: CheckCircle2, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100', label: '🤝 Mil Gaya' },
    'Cancelled': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-100', label: '❌ Radd Ho Gaya' },
  };

  const config = statusConfig[order.status] || statusConfig['Placed'];

  return (
    <div className={cn(
      "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300",
      order.status === 'Packed' && "bg-[#E6F3EC] border-[#06833E]/30 ring-1 ring-[#06833E]/10",
      order.status === 'Accepted' && "bg-indigo-50/50 border-indigo-100",
      order.status === 'Packing' && "bg-orange-50/50 border-orange-100",
      order.status === 'Picked' && "bg-gray-50 border-gray-100",
      order.status === 'Cancelled' && "bg-red-50 border-red-100",
      !['Packed', 'Accepted', 'Packing', 'Picked', 'Cancelled'].includes(order.status) && "border-gray-100"
    )}>
      {/* Status Banner */}
      <div className={cn("flex items-center justify-between p-3 px-4 border-b", config.bg)}>
        <span className={cn("text-[10px] font-black uppercase tracking-wide", config.color)}>
           {config.label}
        </span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Order ID + Date */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
            <p className="text-sm font-black text-gray-900">#ORD-{order.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</p>
            <p className="text-xs font-bold text-gray-900">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</p>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl bg-gray-50/50 border border-gray-100 p-3 space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.productName} className="h-8 w-8 rounded-lg object-cover border border-gray-200 shadow-sm" />
                ) : (
                  <span className="h-6 w-6 rounded-lg bg-white border flex items-center justify-center text-[10px] font-black text-orange-600 shadow-sm">{item.quantity}</span>
                )}
                <span className="font-bold text-gray-700">
                  {item.image_url && <span className="mr-1 text-orange-600 text-[10px]">x{item.quantity}</span>}
                  {item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''}
                </span>
              </div>
              <span className="font-black text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="pt-2 border-t flex justify-between items-center">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</span>
             <span className="text-base font-black text-gray-900">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Payment Status (for Picked orders) */}
        {order.status === 'Picked' && (
          <div className={cn(
            "flex items-center gap-2 rounded-xl p-3 border",
            order.paymentStatus === 'collected' 
              ? "bg-green-50 border-green-100" 
              : "bg-red-50 border-red-100"
          )}>
            {order.paymentStatus === 'collected' ? (
              <>
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-xs font-bold text-green-700">💰 Payment ho gaya</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-bold text-red-700">📝 Udhari — payment baaki hai</span>
              </>
            )}
          </div>
        )}

        {/* Pickup Slot */}
        {order.pickupSlot && (
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="font-bold text-gray-500">Pickup:</span>
            <span className="font-black text-gray-800">{order.pickupSlot}</span>
          </div>
        )}

        {/* Owner Note */}
        {order.ownerNote && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-1">Dukaan ki taraf se:</p>
            <p className="text-sm text-orange-900 italic">"{order.ownerNote}"</p>
            
            {!order.customerResponse ? (
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => updateOrderResponse(order.id, 'OK')}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700 transition-all"
                >
                  👍 Theek Hai
                </button>
                <button 
                  onClick={() => updateOrderResponse(order.id, 'Cancel Item')}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all"
                >
                  ❌ Nahi Chahiye
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 text-xs font-bold text-gray-500">
                Aapka jawab: 
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-black text-white",
                  order.customerResponse === 'OK' ? 'bg-green-500' : 'bg-red-500'
                )}>
                  {order.customerResponse === 'OK' ? 'THEEK HAI' : 'NAHI CHAHIYE'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
