import { useState, useEffect, useMemo } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import { Order, UserProfile } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { BookOpen, Search, Filter, CheckCircle2, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../ui/Input';

export function AdminKhata() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected'>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { subscribeToAllOrders, updatePaymentStatus, getAllCustomers } = useDatabase();

  useEffect(() => {
    const unsub = subscribeToAllOrders(setOrders);
    getAllCustomers().then(setCustomers);
    return unsub;
  }, []);

  // Only show picked orders (completed sales)
  const salesOrders = useMemo(() => {
    return orders.filter(o => o.status === 'Picked').filter(o => {
      const matchesPayment = filter === 'all' || o.paymentStatus === filter;
      const matchesCustomer = customerFilter === 'all' || o.userId === customerFilter;
      const matchesSearch = searchQuery.length < 2 || 
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPayment && matchesCustomer && matchesSearch;
    });
  }, [orders, filter, customerFilter, searchQuery]);

  const totalSales = salesOrders.reduce((a, o) => a + o.total, 0);
  const totalCollected = salesOrders.filter(o => o.paymentStatus === 'collected').reduce((a, o) => a + o.total, 0);
  const totalPending = salesOrders.filter(o => o.paymentStatus === 'pending').reduce((a, o) => a + o.total, 0);

  const handleMarkCollected = async (orderId: string) => {
    try {
      await updatePaymentStatus(orderId, 'collected');
      // Also remove khata entry if exists - the backend should ideally handle this in a transaction
      // but since we are doing separate calls, we use the khata API
      await api.delete(`/api/khata/order/${orderId}`);
    } catch (e) {
      console.error('Failed to mark as collected:', e);
    }
  };

  // Customer-wise breakdown
  const customerBreakdown = useMemo(() => {
    const map = new Map<string, { 
      name: string; 
      total: number; 
      collected: number; 
      pending: number; 
      count: number;
      rewardPoints: number;
    }>();

    salesOrders.forEach(o => {
      const cust = customers.find(c => c.uid === o.userId);
      const existing = map.get(o.userId) || { 
        name: o.customerName, 
        total: 0, 
        collected: 0, 
        pending: 0, 
        count: 0,
        rewardPoints: cust?.rewardPoints || 0
      };
      existing.total += o.total;
      existing.count++;
      if (o.paymentStatus === 'collected') existing.collected += o.total;
      else existing.pending += o.total;
      map.set(o.userId, existing);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].pending - a[1].pending);
  }, [salesOrders, customers]);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900">Khata — Sales Ledger</h2>
        <p className="text-xs font-bold text-gray-400">Track orders & payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Sales</p>
          <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(totalSales)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Collected</p>
          <p className="text-lg font-black text-green-600 mt-1">{formatCurrency(totalCollected)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pending</p>
          <p className="text-lg font-black text-red-600 mt-1">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Customer Breakdown (if pending > 0) */}
      {totalPending > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Customer-wise Udhari</h3>
          <div className="space-y-2">
            {customerBreakdown.filter(([_, c]) => c.pending > 0).map(([userId, c]) => (
              <div key={userId} className="rounded-xl bg-red-50 border border-red-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.name}</p>
                    <div className="flex gap-2">
                      <p className="text-[10px] font-bold text-gray-500">{c.count} orders</p>
                      <p className="text-[10px] font-bold text-purple-600">✨{c.rewardPoints} pts</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-black text-red-600">{formatCurrency(c.pending)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 pl-10 text-sm rounded-xl"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex bg-white rounded-xl p-1 border border-gray-100 shadow-sm flex-1">
            {(['all', 'pending', 'collected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all capitalize",
                  filter === f ? "bg-gray-900 text-white" : "text-gray-500"
                )}
              >
                {f === 'all' ? 'Sabhi' : f === 'pending' ? '📝 Udhari' : '💰 Paid'}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Filter */}
        <select
          value={customerFilter}
          onChange={e => setCustomerFilter(e.target.value)}
          className="w-full h-10 px-3 border rounded-xl bg-white text-xs font-bold border-gray-200"
        >
          <option value="all">All Customers</option>
          {customers.filter(c => c.role !== 'admin').map(c => (
            <option key={c.uid} value={c.uid}>{c.fullName}</option>
          ))}
        </select>
      </div>

      {/* Sales Ledger */}
      <div className="space-y-2">
        {salesOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-gray-300" />
            <p className="mt-4 text-sm font-bold text-gray-400">Abhi koi sale nahi hai</p>
          </div>
        ) : (
          salesOrders.map(order => (
            <div key={order.id} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className={cn(
                "flex items-center justify-between px-4 py-2 border-b",
                order.paymentStatus === 'collected' ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
              )}>
                <div className="flex items-center gap-2">
                  {order.paymentStatus === 'collected' 
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    : <Clock className="h-3.5 w-3.5 text-red-600" />
                  }
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    order.paymentStatus === 'collected' ? "text-green-700" : "text-red-700"
                  )}>
                    {order.paymentStatus === 'collected' ? 'Paid' : 'Udhari'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {format(new Date(order.createdAt), 'dd MMM, hh:mm a')}
                </span>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
                    <p className="text-[10px] font-bold text-gray-400">#ORD-{order.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <p className="text-base font-black text-gray-900">{formatCurrency(order.total)}</p>
                </div>

                {/* Items summary */}
                <p className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                  {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                </p>

                {/* Mark as collected button for pending */}
                {order.paymentStatus === 'pending' && (
                  <Button 
                    onClick={() => handleMarkCollected(order.id)}
                    className="w-full h-9 text-xs font-bold bg-green-600 border-none hover:bg-green-700 rounded-lg"
                  >
                    💰 Mark as Collected
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
