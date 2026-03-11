import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Member, DashboardStats } from '../types';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { motion } from 'motion/react';

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    expired: 0,
    totalRevenue: 0,
    monthlyRevenue: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'members'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memberData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Member[];
      
      setMembers(memberData);
      calculateStats(memberData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
    });

    return () => unsubscribe();
  }, []);

  const calculateStats = (data: Member[]) => {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const stats = data.reduce((acc, member) => {
      if (!member.expiryDate || typeof member.expiryDate.toDate !== 'function') {
        acc.totalMembers++;
        return acc;
      }
      const expiry = member.expiryDate.toDate();
      
      acc.totalMembers++;
      if (member.paymentStatus === 'Paid') {
        acc.totalRevenue += member.amountPaid || 0;
      }

      if (expiry < now) {
        acc.expired++;
      } else if (expiry <= sevenDaysFromNow) {
        acc.expiringSoon++;
        acc.activeMembers++;
      } else {
        acc.activeMembers++;
      }

      return acc;
    }, {
      totalMembers: 0,
      activeMembers: 0,
      expiringSoon: 0,
      expired: 0,
      totalRevenue: 0,
      monthlyRevenue: []
    } as DashboardStats);

    // Generate last 6 months revenue data
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const amount = data
        .filter(m => 
          m.paymentStatus === 'Paid' && 
          m.joinDate && 
          typeof m.joinDate.toDate === 'function' &&
          isWithinInterval(m.joinDate.toDate(), { start: monthStart, end: monthEnd })
        )
        .reduce((sum, m) => sum + (m.amountPaid || 0), 0);

      monthlyRevenue.push({
        month: format(monthDate, 'MMM'),
        amount
      });
    }
    stats.monthlyRevenue = monthlyRevenue;

    setStats(stats);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Members', value: stats.activeMembers, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Expiring Soon', value: stats.expiringSoon, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Expired', value: stats.expired, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your gym's performance</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
            <IndianRupee size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label}
            className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100"
          >
            <div className={`${card.bg} ${card.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{card.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Growth</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Membership Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Active', value: stats.activeMembers, color: '#10b981' },
                { name: 'Expiring', value: stats.expiringSoon, color: '#f59e0b' },
                { name: 'Expired', value: stats.expired, color: '#ef4444' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40} fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
