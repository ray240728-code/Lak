import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, Bet } from '../types';

import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface HistoryPageProps {
  title: string;
  type: 'bet' | 'transaction' | 'deposit' | 'withdrawal';
  onBack: () => void;
  user: any;
}

export default function HistoryPage({ title, type, onBack, user }: HistoryPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    let collectionName = '';
    if (type === 'bet') collectionName = 'bets';
    else if (type === 'transaction') collectionName = 'transactions';
    else if (type === 'deposit') collectionName = 'deposits';
    else if (type === 'withdrawal') collectionName = 'withdrawals';

    if (!collectionName) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, collectionName),
        where('userId', 'in', [user.id, user.phone].filter(Boolean)),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, collectionName);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up history query:", err);
      setLoading(false);
    }
  }, [type, user]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return new Date().toLocaleString();
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900 flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white shadow-md">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      <div className="p-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-300" />
          <input 
            placeholder="Search history..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-lg text-xs text-gray-800 shadow-sm focus:ring-1 focus:ring-red-500 outline-none"
          />
        </div>
        <Button variant="ghost" size="icon" className="bg-white text-red-500 shadow-sm border border-gray-100">
          <Filter className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="bg-white text-red-500 shadow-sm border border-gray-100">
          <Calendar className="w-4 h-4" />
        </Button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-4 space-y-3 overflow-y-auto pb-20"
      >
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <p className="text-xs">No records found</p>
          </div>
        ) : (
          items.map((item, index) => (
            <Card key={item.id || index} className="border-none bg-white overflow-hidden shadow-sm border border-gray-100">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800">
                    {type === 'bet' ? `WinGo ${item.roundId.slice(-4)}` : item.description || item.type}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatDate(item.createdAt || item.timestamp)}
                  </p>
                  {item.orderNumber && (
                    <p className="text-[9px] text-red-400 font-bold uppercase tracking-tighter">
                      Order: {item.orderNumber}
                    </p>
                  )}
                  {type === 'bet' && (
                    <p className="text-[10px] text-red-500 font-medium">Selection: {item.selection}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    (item.status === 'win' || item.type === 'win' || item.type === 'deposit' || item.type === 'gift' || item.type === 'referral' || (type === 'deposit' && item.status === 'completed'))
                      ? 'text-green-500' 
                      : (item.status === 'pending' || item.status === 'waiting') ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    {(item.status === 'win' || item.type === 'win' || item.type === 'deposit' || item.type === 'gift' || item.type === 'referral' || type === 'deposit') ? '+' : '-'}
                    ₹{(parseFloat(item.amount || item.payout) || 0).toFixed(2)}
                  </p>
                  <p className={`text-[10px] items-center justify-end flex gap-1 ${
                    item.status === 'completed' || item.status === 'win'
                      ? 'text-green-500 font-bold' 
                      : item.status === 'failed' || item.status === 'loss'
                      ? 'text-red-500 font-bold'
                      : 'text-orange-500 font-bold'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'completed' || item.status === 'win' ? 'bg-green-500' :
                      item.status === 'failed' || item.status === 'loss' ? 'bg-red-500' : 'bg-orange-500 animate-pulse'
                    }`} />
                    {item.status?.toUpperCase() || 'UNKNOWN'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>
    </div>
  );
}
