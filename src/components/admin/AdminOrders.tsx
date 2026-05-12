import { useState, useEffect } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { useAppStore } from '../../store/useAppStore';
import { Order } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle2, XCircle, Truck, CreditCard, AlertCircle, Phone } from 'lucide-react';
import { format } from 'date-fns';

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | 'new' | 'active' | 'completed'>('all');
  const { subscribeToAllOrders, updateOrderStatus, markOrderPicked } = useDatabase();
  const [summary, setSummary] = useState({ todaySales: 0, pendingOrders: 0, totalPending: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribeToAllOrders((allOrders) => {
      setOrders(allOrders);
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = allOrders.filter(o => o.createdAt?.startsWith(today));
      setSummary({
        todaySales: todayOrders.filter(o => o.status === 'Picked' && o.paymentStatus === 'collected').reduce((a, o) => a + o.total, 0),
        pendingOrders: allOrders.filter(o => o.status === 'Placed').length,
        totalPending: allOrders.filter(o => o.paymentStatus === 'pending' && o.status === 'Picked').reduce((a, o) => a + o.total, 0),
      });
    });
  }, []);

  const filteredOrders = orders.filter(o => {
    if (filter === 'new') return o.status === 'Placed';
    if (filter === 'active') return ['Accepted', 'Packing', 'Packed'].includes(o.status);
    if (filter === 'completed') return ['Picked', 'Cancelled'].includes(o.status);
    return matchesSearch;
  });
  
  const handleUpdateStatus = async (id: string, status: string) => {
    setLoading(true);
    try {
      await updateOrderStatus(id, status);
    } catch (e) {
      console.error(e);
      alert('Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const handlePickOrder = async (orderId: string, paymentStatus: 'collected' | 'pending') => {
    setLoading(true);
    try {
      await markOrderPicked(orderId, paymentStatus);
    } catch (e) {
      console.error(e);
      alert('Error updating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Today Sales</p>
          <p className="text-lg font-black text-green-600 mt-1">{formatCurrency(summary.todaySales)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">New</p>
          <p className="text-lg font-black text-blue-600 mt-1">{summary.pendingOrders}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Udhari</p>
          <p className="text-lg font-black text-red-600 mt-1">{formatCurrency(summary.totalPending)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm">
        {(['all', 'new', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize",
              filter === f ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {f === 'all' ? 'Sabhi' : f === 'new' ? 'Naye' : f === 'active' ? 'Active' : 'Done'}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-bold text-gray-400">Koi order nahi hai</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id}>
              <AdminOrderCard 
                order={order} 
                loading={loading}
                onStatusUpdate={handleUpdateStatus}
                onPick={handlePickOrder}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminOrderCard({ order, onStatusUpdate, onPick, loading }: { 
  order: Order; 
  onStatusUpdate: (id: string, status: string) => void;
  onPick: (id: string, paymentStatus: 'collected' | 'pending') => void;
  loading: boolean;
}) {
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    'Placed': { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100', label: '🆕 Naya Order' },
    'Accepted': { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100', label: '✅ Accept Kiya' },
    'Packing': { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100', label: '📦 Packing...' },
    'Packed': { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100', label: '✅ Pack Ho Gaya' },
    'Picked': { color: 'text-gray-600', bg: 'bg-gray-50 border-gray-100', label: '🤝 Picked Up' },
    'Cancelled': { color: 'text-red-600', bg: 'bg-red-50 border-red-100', label: '❌ Radd' },
  };

  const config = statusConfig[order.status] || statusConfig['Placed'];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300",
        order.status === 'Packed' && "bg-[#E6F3EC] border-[#06833E]/30 ring-1 ring-[#06833E]/10",
        order.status === 'Accepted' && "bg-indigo-50/50 border-indigo-100",
        order.status === 'Packing' && "bg-orange-50/50 border-orange-100",
        order.status === 'Picked' && "bg-gray-50 border-gray-100",
        order.status === 'Cancelled' && "bg-red-50 border-red-100",
        !['Packed', 'Accepted', 'Packing', 'Picked', 'Cancelled'].includes(order.status) && "border-gray-100"
      )}
    >
      {/* Status Header */}
      <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", config.bg)}>
        <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>
          {config.label}
        </span>
        {order.status === 'Picked' && (
          <span className={cn(
            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
            order.paymentStatus === 'collected' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {order.paymentStatus === 'collected' ? '💰 Paid' : '📝 Udhari'}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Customer Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-gray-900">{order.customerName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-[11px] font-bold text-gray-500">{order.customerPhone}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-black text-gray-900">{formatCurrency(order.total)}</p>
            <p className="text-[10px] font-bold text-gray-400">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</p>
          </div>
        </div>

        {/* Order Items */}
        <div className="rounded-xl bg-gray-50/80 border border-gray-100 p-3 space-y-1.5">
          {order.items.map((item, idx) => {
            // Build smart quantity label: "2×1kg=2kg" when variant exists
            const quantityLabel = (() => {
              if (!item.variantLabel) return `${item.quantity}`;
              const numVal = parseFloat(item.variantLabel);
              const unitStr = item.variantLabel.replace(/[\d.]/g, '').trim();
              if (!isNaN(numVal) && unitStr) {
                const total = parseFloat((item.quantity * numVal).toFixed(3));
                return `${item.quantity}×${item.variantLabel}=${total}${unitStr}`;
              }
              return `${item.quantity}×${item.variantLabel}`;
            })();

            return (
              <div key={idx} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-auto min-w-[1.25rem] px-1.5 py-0.5 rounded bg-white border flex items-center justify-center text-[10px] font-black text-orange-600 whitespace-nowrap">
                    {quantityLabel}
                  </span>
                  <span className="font-bold text-gray-700">{item.productName}</span>
                </div>
                <span className="font-black text-gray-800">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            );
          })}
        </div>

        {/* Owner Note */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Note (Customer ko dikhega)</label>
          <Input 
            placeholder="E.g. Sarson tel nahi hai" 
            defaultValue={order.ownerNote}
            onBlur={async (e) => {
              if (e.target.value !== order.ownerNote) {
                try {
                  await api.put(`/api/orders/${order.id}/owner-note`, { ownerNote: e.target.value });
                } catch (err) {
                  console.error('Failed to update owner note:', err);
                }
              }
            }}
            className="h-9 text-xs rounded-xl"
          />
          {order.customerResponse && (
            <p className="text-[10px] font-bold text-blue-600 italic">Grahak: {order.customerResponse}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
            <Button loading={loading} onClick={() => onStatusUpdate(order.id, 'Accepted')} className="flex-1 h-10 text-xs font-bold bg-indigo-600 border-none hover:bg-indigo-700">
              ✅ Accept Karo
            </Button>
          )}
          {order.status === 'Accepted' && (
            <Button loading={loading} onClick={() => onStatusUpdate(order.id, 'Packing')} className="flex-1 h-10 text-xs font-bold bg-orange-500 border-none hover:bg-orange-600">
              📦 Pack Karo
            </Button>
          )}
          {order.status === 'Packing' && (
            <Button loading={loading} onClick={() => onStatusUpdate(order.id, 'Packed')} className="flex-1 h-10 text-xs font-bold bg-emerald-600 border-none hover:bg-emerald-700">
              ✅ Packed!
            </Button>
          )}
          {order.status === 'Packed' && !showPaymentOptions && (
            <Button loading={loading} onClick={() => setShowPaymentOptions(true)} className="flex-1 h-10 text-xs font-bold bg-gray-900 border-none hover:bg-black">
              🤝 Picked — Payment?
            </Button>
          )}
          
          {/* Payment Options at Packed state */}
          {order.status === 'Packed' && showPaymentOptions && (
            <div className="flex gap-2 w-full">
              <Button 
                loading={loading}
                onClick={() => onPick(order.id, 'collected')} 
                className="flex-1 h-10 text-xs font-bold bg-green-600 border-none hover:bg-green-700"
              >
                💰 Paisa Liya
              </Button>
              <Button 
                loading={loading}
                onClick={() => onPick(order.id, 'pending')} 
                className="flex-1 h-10 text-xs font-bold bg-red-500 border-none hover:bg-red-600"
              >
                📝 Udhari
              </Button>
            </div>
          )}

          {/* Cancel always available before Picked */}
          {!['Picked', 'Cancelled'].includes(order.status) && (
            <Button 
              variant="outline" 
              onClick={() => onStatusUpdate(order.id, 'Cancelled')} 
              className="h-10 text-xs font-bold text-red-500 border-red-100 hover:bg-red-50 px-3"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
