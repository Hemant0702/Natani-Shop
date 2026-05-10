import { useEffect, useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';
import { useAppStore } from '../store/useAppStore';
import { Order } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Package, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const { user } = useAppStore();
  const { subscribeToUserOrders } = useDatabase();

  useEffect(() => {
    if (!user) return;
    return subscribeToUserOrders(user.uid, setOrders);
  }, [user]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="h-10 w-10 text-gray-300" />
        <h3 className="mt-4 text-lg font-bold text-gray-900">Abhi koi order nahi hai</h3>
        <p className="mt-1 text-gray-500">Aapka pehla order yahan dikhega</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Aapke Orders</h2>
      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order, key?: any }) {
  const { updateOrderResponse } = useDatabase();
  const statusConfig = {
    'Placed': { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Placed - Taiyari shuru hogi' },
    'Being Packed': { icon: Package, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Packing ho rahi hai' },
    'Ready for Pickup': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Taiyar hai! Aajaaiye' },
    'Completed': { icon: CheckCircle2, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Mil gaya' },
    'Cancelled': { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Radd kar diya gaya' },
  };

  const config = statusConfig[order.status] || statusConfig['Placed'];

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className={cn(
        "flex items-center justify-between p-3 px-5 border-b",
        config.bg
      )}>
        <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
           {config.label}
        </span>
        <config.icon className={cn("h-4 w-4", config.color)} />
      </div>
      
      <div className="p-5 space-y-4">
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

        <div className="rounded-2xl bg-gray-50/50 border border-gray-100 p-4 space-y-3">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded bg-white border flex items-center justify-center text-[10px] font-black text-yellow-600">{item.quantity}</span>
                <span className="font-bold text-gray-700">{item.productName} {item.variantLabel ? `(${item.variantLabel})` : ''}</span>
              </div>
              <span className="font-black text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="pt-2 border-t flex justify-between items-center">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</span>
             <span className="text-base font-black text-gray-900">{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Clock className="h-3 w-3 text-gray-400" />
          <span className="font-bold text-gray-500 uppercase tracking-tighter">Pickup Slot:</span>
          <span className="font-black text-gray-900">{order.pickupSlot}</span>
        </div>

        {order.ownerNote && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Owner ki taraf se message:</p>
            <p className="text-sm text-orange-900 mt-1 italic">"{order.ownerNote}"</p>
            
            {!order.customerResponse ? (
              <div className="mt-3 flex gap-2">
                <button 
                  onClick={() => updateOrderResponse(order.id, 'OK')}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-green-700"
                >
                  Theek Hai (OK)
                </button>
                <button 
                  onClick={() => updateOrderResponse(order.id, 'Cancel Item')}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
                >
                  Nahi Chahiye
                </button>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-gray-500">
                Aapka jawab: 
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] text-white",
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
