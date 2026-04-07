import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, Bet } from '../types';

interface HistoryPageProps {
  title: string;
  type: 'bet' | 'transaction' | 'deposit' | 'withdrawal';
  onBack: () => void;
}

export default function HistoryPage({ title, type, onBack }: HistoryPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      setLoading(true);
      let data: any[] = [];
      if (type === 'bet') {
        data = JSON.parse(localStorage.getItem('lakshmi_bets') || '[]');
      } else if (type === 'transaction') {
        data = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
      } else if (type === 'deposit') {
        data = JSON.parse(localStorage.getItem('lakshmi_deposits') || '[]');
      } else if (type === 'withdrawal') {
        data = JSON.parse(localStorage.getItem('lakshmi_withdrawals') || '[]');
      }
      setItems(data);
      setLoading(false);
    };
    loadData();
  }, [type]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-[#2b3270] border-b border-blue-900/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>

      <div className="p-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
          <input 
            placeholder="Search history..." 
            className="w-full pl-10 pr-4 py-2 bg-[#2b3270] border-none rounded-lg text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <Button variant="ghost" size="icon" className="bg-[#2b3270] text-blue-300">
          <Filter className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="bg-[#2b3270] text-blue-300">
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
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-blue-300">
            <p className="text-xs">No records found</p>
          </div>
        ) : (
          items.map((item, index) => (
            <Card key={item.id || index} className="border-none bg-[#2b3270] overflow-hidden shadow-md">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {type === 'bet' ? `WinGo ${item.roundId.slice(-4)}` : item.description || item.type}
                  </p>
                  <p className="text-[10px] text-blue-300">
                    {formatDate(item.timestamp || Date.now())}
                  </p>
                  {item.orderNumber && (
                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">
                      Order: {item.orderNumber}
                    </p>
                  )}
                  {type === 'bet' && (
                    <p className="text-[10px] text-blue-400">Selection: {item.selection}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    item.status === 'win' || item.type === 'win' || item.type === 'deposit' || item.type === 'gift' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {item.status === 'win' || item.type === 'win' || item.type === 'deposit' || item.type === 'gift' ? '+' : '-'}
                    ₹{item.amount.toFixed(2)}
                  </p>
                  <p className={`text-[10px] ${
                    item.status === 'completed' || item.status === 'approved' || item.status === 'win' || item.status === 'loss'
                      ? 'text-blue-300' 
                      : 'text-yellow-400'
                  }`}>
                    {item.status}
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
