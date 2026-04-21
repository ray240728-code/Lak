import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingUp, Target, Zap, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { User, Bet } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface GameStatsProps {
  onBack: () => void;
  user: User;
}

export default function GameStats({ onBack, user }: GameStatsProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      try {
        const q = query(collection(db, 'bets'), where('userId', '==', user.id), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        setBets(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'bets');
      } finally {
        setLoading(false);
      }
    };
    fetchBets();
  }, [user.id]);

  const stats = useMemo(() => {
    const totalBets = bets.length;
    const wins = bets.filter(b => b.status === 'win');
    const totalWins = wins.length;
    const winRate = totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(1) + '%' : '0%';
    
    const totalProfit = wins.reduce((acc, b) => acc + (b.payout || 0), 0) - bets.reduce((acc, b) => acc + b.amount, 0);
    
    const highestWin = wins.length > 0 ? Math.max(...wins.map(b => b.payout || 0)) : 0;
    
    // Find favorite game
    const gameCounts: Record<string, number> = {};
    bets.forEach(b => {
      gameCounts[b.mode] = (gameCounts[b.mode] || 0) + 1;
    });
    let favoriteGame = 'None';
    let maxCount = 0;
    Object.entries(gameCounts).forEach(([mode, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteGame = `WinGo ${mode}`;
      }
    });

    // Calculate streak
    let currentStreak = 0;
    for (let i = 0; i < bets.length; i++) {
      if (bets[i].status === 'win') {
        currentStreak++;
      } else if (bets[i].status === 'loss') {
        break;
      }
    }

    return {
      totalBets,
      totalWins,
      winRate,
      totalProfit,
      favoriteGame,
      recentStreak: currentStreak,
      highestWin
    };
  }, [bets]);

  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900 flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white shadow-md">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Game Statistics</h1>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm border border-gray-50">
            <TrendingUp className="w-6 h-6 text-red-500 mb-2" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Bets</p>
            <p className="text-lg font-black text-gray-800 italic">{stats.totalBets}</p>
          </Card>
          <Card className="border-none bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm border border-gray-50">
            <Target className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Win Rate</p>
            <p className="text-lg font-black text-gray-800 italic">{stats.winRate}</p>
          </Card>
          <Card className="border-none bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm border border-gray-50">
            <Zap className="w-6 h-6 text-orange-500 mb-2" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Profit</p>
            <p className="text-lg font-black text-green-600 italic">₹{stats.totalProfit}</p>
          </Card>
          <Card className="border-none bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm border border-gray-50">
            <Clock className="w-6 h-6 text-purple-500 mb-2" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Highest Win</p>
            <p className="text-lg font-black text-gray-800 italic font-mono">₹{stats.highestWin}</p>
          </Card>
        </div>

        <Card className="border-none bg-white overflow-hidden shadow-sm border border-gray-100">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-l-4 border-red-500 pl-3">Performance Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Favorite Game</span>
                <span className="text-gray-800 font-bold">{stats.favoriteGame}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Recent Win Streak</span>
                <span className="text-green-600 font-bold">{stats.recentStreak} Wins</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Total Wins</span>
                <span className="text-gray-800 font-bold">{stats.totalWins}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
          <p className="text-xs text-red-400 italic">"Keep playing to improve your statistics and reach higher levels!"</p>
        </div>
      </motion.div>
    </div>
  );
}
