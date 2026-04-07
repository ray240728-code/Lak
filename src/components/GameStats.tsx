import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, TrendingUp, Target, Zap, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface GameStatsProps {
  onBack: () => void;
}

export default function GameStats({ onBack }: GameStatsProps) {
  // Get real stats from localStorage
  const stats = React.useMemo(() => {
    const savedBets = localStorage.getItem('lakshmi_bets');
    const bets: any[] = savedBets ? JSON.parse(savedBets) : [];
    
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
    for (let i = bets.length - 1; i >= 0; i--) {
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
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="p-4 flex items-center gap-4 bg-[#2b3270] border-b border-blue-900/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
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
          <Card className="border-none bg-[#2b3270] p-4 flex flex-col items-center justify-center text-center">
            <TrendingUp className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-[10px] text-blue-300">Total Bets</p>
            <p className="text-lg font-bold text-white">{stats.totalBets}</p>
          </Card>
          <Card className="border-none bg-[#2b3270] p-4 flex flex-col items-center justify-center text-center">
            <Target className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-[10px] text-blue-300">Win Rate</p>
            <p className="text-lg font-bold text-white">{stats.winRate}</p>
          </Card>
          <Card className="border-none bg-[#2b3270] p-4 flex flex-col items-center justify-center text-center">
            <Zap className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-[10px] text-blue-300">Total Profit</p>
            <p className="text-lg font-bold text-green-400">₹{stats.totalProfit}</p>
          </Card>
          <Card className="border-none bg-[#2b3270] p-4 flex flex-col items-center justify-center text-center">
            <Clock className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-[10px] text-blue-300">Highest Win</p>
            <p className="text-lg font-bold text-white">₹{stats.highestWin}</p>
          </Card>
        </div>

        <Card className="border-none bg-[#2b3270] overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-bold text-white">Performance Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-300">Favorite Game</span>
                <span className="text-white font-bold">{stats.favoriteGame}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-300">Recent Win Streak</span>
                <span className="text-green-400 font-bold">{stats.recentStreak} Wins</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-blue-300">Total Wins</span>
                <span className="text-white font-bold">{stats.totalWins}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-4 bg-blue-900/20 rounded-xl border border-blue-800/30 text-center">
          <p className="text-xs text-blue-300 italic">"Keep playing to improve your statistics and reach higher levels!"</p>
        </div>
      </motion.div>
    </div>
  );
}
