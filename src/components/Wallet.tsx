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
        className="flex flex-col min-h-screen pb-20"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Wallet</h1>
          <Button variant="ghost" size="icon" className="text-blue-300" onClick={() => handleAction('Customer Support')}>
            <Headphones className="w-6 h-6" />
          </Button>
        </div>

        {/* Balance Card */}
        <div className="px-4 mb-6">
          <Card className="border-none bg-[#2b3270] shadow-lg overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400" />
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 text-blue-200">
                <WalletIcon className="w-4 h-4" />
                <span className="text-sm font-medium">My balance:</span>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <h2 className="text-4xl font-bold text-white">₹{balance.toFixed(2)}</h2>
                <RefreshCw 
                  className="w-6 h-6 text-blue-400 cursor-pointer hover:rotate-180 transition-transform duration-500" 
                  onClick={refreshBalance}
                />
              </div>

              <div className="flex justify-between text-center pt-4 border-t border-blue-900/50">
                <div className="flex-1">
                  <p className="text-xs text-blue-300 mb-1">Total Recharge</p>
                  <p className="text-sm font-bold text-white">₹{stats.recharge.toFixed(2)}</p>
                </div>
                <div className="w-px bg-blue-900/50 h-8 self-center" />
                <div className="flex-1">
                  <p className="text-xs text-blue-300 mb-1">Total Withdrawal</p>
                  <p className="text-sm font-bold text-white">₹{stats.withdrawal.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Circles */}
        <div className="px-4 grid grid-cols-2 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border-4 border-blue-400 flex flex-col items-center justify-center bg-[#2b3270]">
              <span className="text-xs font-bold text-white">0%</span>
              <span className="text-[10px] text-blue-300">₹{balance.toFixed(2)}</span>
            </div>
            <span className="text-xs text-blue-200">Main wallet</span>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full border-4 border-blue-900 flex flex-col items-center justify-center bg-[#2b3270]">
              <span className="text-xs font-bold text-white">0%</span>
              <span className="text-[10px] text-blue-300">₹0.00</span>
            </div>
            <span className="text-xs text-blue-200">3rd party wallet</span>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 space-y-6">
          <Button 
            className="w-full h-12 bg-blue-400 hover:bg-blue-500 text-white font-bold text-lg rounded-full"
            onClick={() => handleAction('Deposit')}
          >
            MAIN WALLET DEPOSIT
          </Button>

          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: CreditCard, label: 'Deposit', color: 'bg-orange-500' },
              { icon: TrendingUp, label: 'Withdraw', color: 'bg-blue-500' },
              { icon: History, label: 'Deposit History', color: 'bg-red-500' },
              { icon: History, label: 'Withdraw History', color: 'bg-yellow-500' },
            ].map((item, i) => (
              <motion.button 
                key={i}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-2"
                onClick={() => handleAction(item.label)}
              >
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center shadow-lg`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] text-blue-200 text-center leading-tight">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
