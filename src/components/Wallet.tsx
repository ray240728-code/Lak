import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet as WalletIcon, RefreshCw, CreditCard, TrendingUp, History, Headphones } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';

import { User } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface WalletProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function Wallet({ onNavigate, user }: WalletProps) {
  const [balance, setBalance] = React.useState<number>(user.balance);

  const [stats, setStats] = React.useState({ recharge: 0, withdrawal: 0 });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const depositsQuery = query(collection(db, 'deposits'), where('userId', '==', user.id), where('status', '==', 'completed'));
        const withdrawalsQuery = query(collection(db, 'withdrawals'), where('userId', '==', user.id), where('status', '==', 'completed'));
        
        const [depositsSnap, withdrawalsSnap] = await Promise.all([
          getDocs(depositsQuery),
          getDocs(withdrawalsQuery)
        ]);
        
        const totalRecharge = depositsSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        const totalWithdrawal = withdrawalsSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
        
        setStats({ recharge: totalRecharge, withdrawal: totalWithdrawal });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'wallet-stats');
      }
    };
    
    fetchStats();
  }, [user.id]);

  const handleAction = (action: string) => {
    switch (action) {
      case 'Deposit History': onNavigate('history-deposit'); break;
      case 'Withdraw History': onNavigate('history-withdraw'); break;
      case 'Deposit': onNavigate('deposit'); break;
      case 'Withdraw': onNavigate('withdraw'); break;
      default: toast.info(`${action} feature is coming soon!`);
    }
  };

  const refreshBalance = async () => {
    try {
      const userSnap = await getDoc(doc(db, 'users', user.id));
      if (userSnap.exists()) {
        setBalance(userSnap.data().balance || 0);
        toast.success('Balance updated!');
      }
    } catch (error) {
      toast.error('Failed to update balance');
    }
  };

  return (
    <Layout onNavigate={onNavigate} activeTab="wallet">
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col min-h-screen pb-20 bg-[#f8f3f3]"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50 shadow-md">
          <h1 className="text-lg font-bold">Wallet</h1>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => handleAction('Customer Support')}>
            <Headphones className="w-6 h-6" />
          </Button>
        </div>

        {/* Balance Card */}
        <div className="p-4">
          <div className="bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black tracking-tighter">₹{balance.toFixed(2)}</h2>
                <RefreshCw 
                  className="w-6 h-6 text-white/70 cursor-pointer hover:rotate-180 transition-transform duration-500" 
                  onClick={refreshBalance}
                />
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <WalletIcon className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Total Balance</span>
              </div>
              
              <div className="grid grid-cols-2 gap-8 w-full mt-6 pt-6 border-t border-white/10">
                <div className="text-center space-y-1">
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Total Recharge</p>
                  <p className="text-sm font-black">₹{stats.recharge.toFixed(2)}</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Total Withdraw</p>
                  <p className="text-sm font-black">₹{stats.withdrawal.toFixed(2)}</p>
                </div>
              </div>
            </div>
            {/* Decorative circles */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-black/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Wallet Progress */}
        <div className="px-4 grid grid-cols-2 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeDasharray="100, 100" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-red-500" strokeDasharray="100, 100" strokeWidth="3" strokeLinecap="round" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-gray-800">100%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-gray-800">₹{balance.toFixed(2)}</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Main Wallet</p>
            </div>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 flex flex-col items-center gap-3">
            <div className="relative w-24 h-24">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-gray-100" strokeDasharray="100, 100" strokeWidth="3" fill="none" stroke="currentColor" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-gray-300">0%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-gray-300">₹0.00</p>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">P3 Wallet</p>
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 space-y-8">
          <Button 
            className="w-full h-14 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black text-sm rounded-2xl shadow-lg shadow-red-100 uppercase tracking-widest"
            onClick={() => handleAction('Deposit')}
          >
            Main Wallet Deposit
          </Button>

          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: CreditCard, label: 'Deposit', color: 'text-orange-500', bg: 'bg-orange-50' },
              { icon: TrendingUp, label: 'Withdraw', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: History, label: 'Dep. History', color: 'text-red-500', bg: 'bg-red-50' },
              { icon: History, label: 'Wit. History', color: 'text-purple-500', bg: 'bg-purple-50' },
            ].map((item, i) => (
              <motion.button 
                key={i}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-3"
                onClick={() => handleAction(item.label)}
              >
                <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shadow-sm border border-white`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-gray-500 font-bold text-center leading-tight uppercase tracking-tighter">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
