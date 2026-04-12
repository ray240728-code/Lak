import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Trophy, Timer, RefreshCw, TrendingUp, ShieldCheck, CircleHelp, ChevronLeft, Bell, Wallet, History, Headphones, Music, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Color, Number, Bet, GameMode, GameRound, BigSmall, User } from '../types';
import { getRoundId, generateRoundResult, calculatePayout } from '../lib/gameLogic';

interface WinGoProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function WinGo({ onNavigate, user }: WinGoProps) {
  const [balance, setBalance] = useState<number>(user.balance);
  const [activeMode, setActiveMode] = useState<GameMode>('1min');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [currentRoundId, setCurrentRoundId] = useState<string>('');
  const [history, setHistory] = useState<GameRound[]>(() => {
    const saved = localStorage.getItem('lakshmi_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Deduplicate by ID
      const unique = parsed.filter((round: any, index: number, self: any[]) =>
        index === self.findIndex((r) => r.id === round.id)
      );
      return unique;
    } catch (e) {
      return [];
    }
  });
  const [myBets, setMyBets] = useState<Bet[]>(() => {
    const saved = localStorage.getItem('lakshmi_bets');
    return saved ? JSON.parse(saved) : [];
  });

  // Result Popup state
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [lastResult, setLastResult] = useState<{
    status: 'win' | 'loss';
    amount: number;
    roundId: string;
    number: number;
    color: string[];
    bigSmall: string;
  } | null>(null);

  const filteredHistory = history.filter(h => h.mode === activeMode);
  const filteredMyBets = myBets.filter(b => b.mode === activeMode);
  const [betModalOpen, setBetModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Color | Number | BigSmall | null>(null);
  const [betAmount, setBetAmount] = useState<string>('10');
  const [multiplier, setMultiplier] = useState<number>(1);

  useEffect(() => {
    // Update balance in lakshmi_users
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const updatedUsers = users.map(u => {
      if (u.phone === user.phone) {
        return { ...u, balance: balance };
      }
      return u;
    });
    localStorage.setItem('lakshmi_users', JSON.stringify(updatedUsers));

    localStorage.setItem('lakshmi_history', JSON.stringify(history));
    localStorage.setItem('lakshmi_bets', JSON.stringify(myBets));
  }, [balance, history, myBets, user.phone]);

  useEffect(() => {
    // Backfill history for all modes
    const modes: GameMode[] = ['30sec', '1min', '3min', '5min'];
    const now = Date.now();
    
    setHistory(prev => {
      let updatedHistory = [...prev];
      let hasChanges = false;

      modes.forEach(mode => {
        let intervalMs = 60000;
        if (mode === '30sec') intervalMs = 30000;
        if (mode === '3min') intervalMs = 180000;
        if (mode === '5min') intervalMs = 300000;

        // Ensure at least 50 rounds for EACH mode
        const modeHistory = updatedHistory.filter(h => h.mode === mode);
        if (modeHistory.length < 50) {
          for (let i = 1; i <= 50; i++) {
            const pastTime = now - (i * intervalMs);
            const roundId = getRoundId(mode, pastTime);
            
            if (!updatedHistory.find(r => r.id === roundId)) {
              const result = generateRoundResult(roundId);
              const pastRound: GameRound = {
                id: roundId,
                mode: mode,
                startTime: pastTime - intervalMs,
                endTime: pastTime,
                resultColor: result.color,
                resultNumber: result.number,
                resultBigSmall: result.bigSmall,
                status: 'completed'
              };
              updatedHistory.push(pastRound);
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        // Sort history by ID descending
        updatedHistory.sort((a, b) => b.id.localeCompare(a.id));
        // Keep a reasonable amount of history (e.g., 500 rounds)
        return updatedHistory.slice(0, 500);
      }
      return prev;
    });
  }, []);

  const handleRoundEnd = useCallback((roundId: string, mode: GameMode) => {
    const result = generateRoundResult(roundId);
    const newRound: GameRound = {
      id: roundId,
      mode: mode,
      startTime: Date.now() - (mode === '30sec' ? 30000 : mode === '1min' ? 60000 : mode === '3min' ? 180000 : 300000),
      endTime: Date.now(),
      resultColor: result.color,
      resultNumber: result.number,
      resultBigSmall: result.bigSmall,
      status: 'completed'
    };
    setHistory(prev => {
      if (prev.some(r => r.id === roundId)) return prev;
      return [newRound, ...prev].slice(0, 200); // Keep more history
    });
    setMyBets(prev => {
      let totalWon = 0;
      let totalLost = 0;
      const updatedBets = prev.map(bet => {
        if (bet.roundId === roundId && bet.status === 'pending') {
          const payout = calculatePayout(bet, result);
          if (payout > 0) {
            totalWon += payout;
            return { ...bet, status: 'win', payout } as Bet;
          }
          totalLost += bet.amount;
          return { ...bet, status: 'loss', payout: 0 } as Bet;
        }
        return bet;
      });

      // Show popup if user had a bet in this round
      const userBet = prev.find(b => b.roundId === roundId && b.status === 'pending');
      if (userBet) {
        setLastResult({
          status: totalWon > 0 ? 'win' : 'loss',
          amount: totalWon > 0 ? totalWon : totalLost,
          roundId: roundId,
          number: result.number,
          color: result.color,
          bigSmall: result.bigSmall
        });
        setTimeout(() => setShowResultPopup(true), 1000);
      }

      if (totalWon > 0) {
        setBalance(curr => {
          const newBalance = curr + totalWon;
          localStorage.setItem('lakshmi_balance', newBalance.toString());
          
          // Record transaction
          const transaction = { id: 'W' + Date.now(), amount: totalWon, status: 'win', timestamp: Date.now(), type: 'win', description: `WinGo ${roundId} Win` };
          const transactions = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
          localStorage.setItem('lakshmi_transactions', JSON.stringify([transaction, ...transactions]));
          
          return newBalance;
        });
        toast.success(`You won ₹${totalWon.toFixed(2)}!`, {
          description: `Round ${roundId} result: ${result.number}`,
          icon: <Trophy className="w-5 h-5 text-yellow-500" />
        });
      }
      return updatedBets;
    });
  }, [activeMode]);

  useEffect(() => {
    // Initialize currentRoundId for the active mode
    setCurrentRoundId(getRoundId(activeMode, Date.now()));

    const interval = setInterval(() => {
      const now = Date.now();
      let modeSeconds = 60;
      if (activeMode === '30sec') modeSeconds = 30;
      if (activeMode === '3min') modeSeconds = 180;
      if (activeMode === '5min') modeSeconds = 300;
      
      const secondsPassed = Math.floor(now / 1000) % modeSeconds;
      const remaining = modeSeconds - secondsPassed;
      setTimeLeft(remaining);
      
      const newRoundId = getRoundId(activeMode, now);
      if (newRoundId !== currentRoundId) {
        // Only trigger handleRoundEnd if we have a valid previous round ID for THIS mode
        // We check if currentRoundId matches the current mode's ID format
        const modeCode = activeMode === '30sec' ? '30' : activeMode === '3min' ? '03' : activeMode === '5min' ? '05' : '01';
        if (currentRoundId && currentRoundId.includes(modeCode)) {
          handleRoundEnd(currentRoundId, activeMode);
        }
        setCurrentRoundId(newRoundId);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMode, currentRoundId, handleRoundEnd]);

  const placeBet = () => {
    const amount = parseFloat(betAmount) * multiplier;
    if (isNaN(amount) || amount <= 0 || amount > balance || selectedBet === null) {
      toast.error('Invalid bet or insufficient balance');
      return;
    }
    const newBet: Bet = {
      id: Math.random().toString(36).substr(2, 9),
      roundId: currentRoundId,
      mode: activeMode,
      amount,
      selection: selectedBet,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    setBalance(prev => {
      const newBalance = prev - amount;
      localStorage.setItem('lakshmi_balance', newBalance.toString());
      
      // Record transaction
      const transaction = { id: 'B' + Date.now(), amount, status: 'completed', timestamp: Date.now(), type: 'bet', description: `WinGo ${currentRoundId} Bet` };
      const transactions = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
      localStorage.setItem('lakshmi_transactions', JSON.stringify([transaction, ...transactions]));
      
      return newBalance;
    });
    setMyBets(prev => [newBet, ...prev]);
    setBetModalOpen(false);
    toast.success('Bet placed!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0f143c] flex flex-col pb-20 font-sans">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white bg-[#0f143c] sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('home')} className="text-white">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2 font-black text-2xl tracking-tight">
          <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">Lakshmi</span>
          <span className="text-white">Club</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-white"><Headphones className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-white"><Music className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Balance Section */}
      <div className="px-4 py-2">
        <Card className="border-none bg-[#2b3270] text-white shadow-xl p-6 space-y-6 rounded-3xl">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">₹{balance.toFixed(2)}</h2>
              <RefreshCw className="w-5 h-5 text-blue-300 cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={() => toast.success('Balance updated!')} />
            </div>
            <p className="text-xs text-blue-200 flex items-center gap-2 font-medium opacity-80">
              <Wallet className="w-4 h-4" /> Wallet balance
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Button className="bg-[#ff4d4d] hover:bg-[#ff3333] text-white rounded-full h-12 font-bold text-lg shadow-lg shadow-red-900/20" onClick={() => onNavigate('wallet')}>Withdraw</Button>
            <Button className="bg-[#2ecc71] hover:bg-[#27ae60] text-white rounded-full h-12 font-bold text-lg shadow-lg shadow-green-900/20" onClick={() => onNavigate('wallet')}>Deposit</Button>
          </div>
        </Card>
      </div>

      {/* Announcement Bar */}
      <div className="px-4 py-2">
        <div className="bg-[#1a1f4d] rounded-full px-4 py-2 flex items-center gap-3 text-blue-200 overflow-hidden">
          <Volume2 className="w-4 h-4 flex-shrink-0 text-blue-400" />
          <div className="flex-1 overflow-hidden">
            <motion.p 
              animate={{ x: [300, -300] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="text-[10px] whitespace-nowrap font-medium"
            >
              Welcome to Lakshmi Club! Enjoy the best gaming experience with us.
            </motion.p>
          </div>
          <Button size="sm" className="h-6 rounded-full bg-blue-500 text-[10px] px-3 hover:bg-blue-600">
            <span className="flex items-center gap-1">🔥 Detail</span>
          </Button>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="px-2 py-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-1.5 justify-between">
          {[
            { id: '30sec', label: 'WinGo 30sec' },
            { id: '1min', label: 'WinGo 1 Min' },
            { id: '3min', label: 'WinGo 3 Min' },
            { id: '5min', label: 'WinGo 5 Min' },
          ].map((mode) => (
            <motion.div 
              key={mode.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveMode(mode.id as GameMode)}
              className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl cursor-pointer transition-all flex-1 min-w-[80px] ${activeMode === mode.id ? 'bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-white shadow-lg' : 'bg-[#1e264f] text-[#4d63a3]'}`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeMode === mode.id ? 'bg-white/20' : 'bg-[#151b3d]'}`}>
                <Timer className={`w-5 h-5 ${activeMode === mode.id ? 'text-white' : 'text-[#4d63a3]'}`} />
              </div>
              <span className="text-[8px] font-black whitespace-nowrap text-center leading-none uppercase tracking-tighter">{mode.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Game Board - Ticket Design */}
      <div className="px-4 space-y-4">
        <div className="relative bg-[#2b3270] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
          {/* Ticket Cutouts */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#0f143c] rounded-r-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#0f143c] rounded-l-full" />
          
          <div className="flex justify-between items-center relative gap-2">
            {/* Left Side */}
            <div className="space-y-4 flex-1">
              <Button variant="outline" size="sm" className="h-8 text-[11px] border-blue-500/50 text-blue-100 rounded-full px-4 bg-blue-900/20 hover:bg-blue-900/40 backdrop-blur-sm transition-all duration-300">
                <CircleHelp className="w-4 h-4 mr-2 text-blue-400" /> How to play
              </Button>
              <div className="space-y-2">
                <p className="text-sm font-bold text-white opacity-90">WinGo {activeMode === '30sec' ? '30sec' : activeMode === '1min' ? '1 Min' : activeMode === '3min' ? '3 Min' : '5 Min'}</p>
                <div className="flex gap-1 flex-wrap">
                  {filteredHistory.slice(0, 5).map((h, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ${h.resultNumber % 2 === 0 ? 'bg-gradient-to-br from-[#ff4d4d] to-[#cc0000]' : 'bg-gradient-to-br from-[#2ecc71] to-[#27ae60]'}`}
                    >
                      {h.resultNumber}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vertical Dashed Line */}
            <div className="h-20 border-l border-dashed border-blue-400/30 mx-2" />

            {/* Right Side - Time Box */}
            <div className="text-right space-y-3 flex-1">
              <p className="text-[11px] text-blue-200 font-bold opacity-80 uppercase tracking-wider">Time remaining</p>
              <div className="flex gap-1 justify-end">
                {formatTime(timeLeft).split('').map((char, i) => (
                  <div 
                    key={i} 
                    className={`w-6 h-9 flex items-center justify-center rounded-lg text-lg font-black ${char === ':' ? 'text-blue-400 w-2' : 'bg-[#1a1f4d] text-white border border-blue-900/50'}`}
                  >
                    {char}
                  </div>
                ))}
              </div>
              <p className="text-[12px] font-mono font-bold text-white tracking-widest opacity-80">{currentRoundId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Button onClick={() => { setSelectedBet('green'); setBetModalOpen(true); }} className="h-10 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg">Green</Button>
              <Button onClick={() => { setSelectedBet('violet'); setBetModalOpen(true); }} className="h-10 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg">Violet</Button>
              <Button onClick={() => { setSelectedBet('red'); setBetModalOpen(true); }} className="h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg">Red</Button>
            </div>
            
            <div className="grid grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <motion.button 
                  key={num}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setSelectedBet(num as Number); setBetModalOpen(true); }}
                  className={`relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-xl border-2 border-white/10 overflow-hidden`}
                >
                  {num === 0 ? (
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 h-full bg-red-500" />
                      <div className="w-1/2 h-full bg-purple-500" />
                    </div>
                  ) : num === 5 ? (
                    <div className="absolute inset-0 flex">
                      <div className="w-1/2 h-full bg-green-500" />
                      <div className="w-1/2 h-full bg-purple-500" />
                    </div>
                  ) : (
                    <div className={`absolute inset-0 ${num % 2 === 0 ? 'bg-red-500' : 'bg-green-500'}`} />
                  )}
                  <span className="relative z-10 text-white">{num}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {['Random', 'X1', 'X5', 'X10', 'X20', 'X50', 'X100'].map((m) => (
                <Button 
                  key={m} 
                  variant="outline" 
                  size="sm" 
                  className={`h-7 text-[10px] px-3 rounded-md border-none ${m === 'X1' ? 'bg-blue-500 text-white' : 'bg-[#1a1f4d] text-blue-300'}`}
                  onClick={() => {
                    if (m === 'Random') {
                      const randomNum = Math.floor(Math.random() * 10);
                      setSelectedBet(randomNum as Number);
                      setBetModalOpen(true);
                    } else if (m.startsWith('X')) {
                      setMultiplier(parseInt(m.slice(1)));
                    }
                  }}
                >
                  {m}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => { setSelectedBet('big'); setBetModalOpen(true); }} className="h-10 bg-[#f39c12] hover:bg-[#e67e22] text-white font-bold rounded-l-full rounded-r-none">Big</Button>
              <Button onClick={() => { setSelectedBet('small'); setBetModalOpen(true); }} className="h-10 bg-[#3498db] hover:bg-[#2980b9] text-white font-bold rounded-r-full rounded-l-none">Small</Button>
            </div>
          </div>
        </div>

        {/* History Table */}
        <Card className="border-none bg-[#1a1f4d] shadow-2xl overflow-hidden rounded-2xl">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="w-full h-14 bg-[#0f143c] rounded-none border-b border-blue-900/30 p-1">
              <TabsTrigger value="history" className="flex-1 h-full data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-bold text-xs transition-all">Game history</TabsTrigger>
              <TabsTrigger value="chart" className="flex-1 h-full data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-bold text-xs transition-all">Chart</TabsTrigger>
              <TabsTrigger value="mybets" className="flex-1 h-full data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-xl font-bold text-xs transition-all">My Bets</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="m-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="bg-[#0f143c]/50">
                    <TableRow className="border-blue-900/20 hover:bg-transparent">
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider">Period</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-center">Number</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-center">Big Small</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-right">Color</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((round, index) => (
                      <TableRow key={`${round.id}-${index}`} className="border-blue-900/10 hover:bg-blue-900/10 transition-colors">
                        <TableCell className="font-mono text-[11px] text-white font-medium">{round.id}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-lg font-black drop-shadow-sm ${round.resultNumber % 2 === 0 ? 'text-[#ff4d4d]' : 'text-[#2ecc71]'}`}>{round.resultNumber}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[11px] text-white font-bold capitalize opacity-90">{round.resultBigSmall}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {round.resultColor.map((c, i) => (
                              <div key={i} className={`w-2.5 h-2.5 rounded-full shadow-sm ${c === 'red' ? 'bg-[#ff4d4d]' : c === 'green' ? 'bg-[#2ecc71]' : 'bg-[#9b59b6]'}`} />
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="mybets" className="m-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="bg-[#0f143c]/50">
                    <TableRow className="border-blue-900/20 hover:bg-transparent">
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider">Period</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-center">Selection</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-center">Amount</TableHead>
                      <TableHead className="text-[11px] font-black text-blue-200 uppercase tracking-wider text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMyBets.map((bet, index) => (
                      <TableRow key={`${bet.id}-${index}`} className="border-blue-900/10 hover:bg-blue-900/10 transition-colors">
                        <TableCell className="font-mono text-[11px] text-white font-medium">{bet.roundId}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-[11px] text-white font-bold capitalize opacity-90">{bet.selection}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[11px] text-blue-300 font-bold">₹{bet.amount.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${bet.status === 'win' ? 'bg-green-500/20 text-green-400 border-green-500/30' : bet.status === 'loss' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                            {bet.status === 'win' ? `+₹${bet.payout?.toFixed(2)}` : bet.status === 'loss' ? '-₹' + bet.amount.toFixed(2) : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Bet Modal */}
      <Dialog open={betModalOpen} onOpenChange={setBetModalOpen}>
        <DialogContent className="bg-[#2b3270] border-blue-800/50 text-white rounded-t-3xl sm:rounded-3xl p-0 overflow-hidden max-w-md">
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-black tracking-tight">WinGo {activeMode}</h3>
              <div className="inline-block bg-blue-500/20 text-blue-300 px-4 py-1 rounded-full text-xs font-bold border border-blue-500/30">
                Select {selectedBet}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-blue-200">Amount</span>
                <div className="flex gap-2">
                  {['10', '100', '1000', '10000'].map((amt) => (
                    <Button 
                      key={amt} 
                      variant="outline" 
                      size="sm"
                      onClick={() => setBetAmount(amt)}
                      className={`h-8 px-3 text-[11px] font-bold rounded-md transition-all ${betAmount === amt ? 'bg-blue-500 text-white border-none shadow-lg' : 'bg-blue-900/30 border-blue-800/50 text-blue-300'}`}
                    >
                      {amt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-blue-200">Quantity</span>
                <div className="flex items-center gap-3 bg-blue-900/30 rounded-lg p-1 border border-blue-800/50">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-300" onClick={() => setMultiplier(Math.max(1, multiplier - 1))}>-</Button>
                  <span className="w-8 text-center font-black text-white">{multiplier}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-300" onClick={() => setMultiplier(multiplier + 1)}>+</Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {[1, 5, 10, 20, 50, 100].map((m) => (
                  <Button 
                    key={m} 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMultiplier(m)}
                    className={`h-7 px-3 text-[10px] font-bold rounded-md transition-all ${multiplier === m ? 'bg-blue-500 text-white border-none shadow-md' : 'bg-blue-900/30 border-blue-800/50 text-blue-300'}`}
                  >
                    X{m}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1f4d] rounded-2xl p-4 flex justify-between items-center border border-blue-900/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-bold text-blue-300">Total Amount</span>
              </div>
              <span className="text-xl font-black text-white">₹{(parseFloat(betAmount || '0') * multiplier).toFixed(2)}</span>
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setBetModalOpen(false)} className="flex-1 h-12 text-blue-300 font-bold hover:bg-blue-900/30 rounded-xl">Cancel</Button>
              <Button onClick={placeBet} className="flex-[2] h-12 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-black text-lg rounded-xl shadow-xl shadow-blue-900/40">Total ₹{(parseFloat(betAmount || '0') * multiplier).toFixed(2)}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Result Popup */}
      <Dialog open={showResultPopup} onOpenChange={setShowResultPopup}>
        <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-[320px] sm:max-w-sm flex flex-col items-center justify-center">
          {lastResult && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-full rounded-[40px] p-6 text-center relative overflow-hidden ${lastResult.status === 'win' ? 'bg-gradient-to-b from-[#4facfe] to-[#00f2fe]' : 'bg-gradient-to-b from-[#485563] to-[#29323c]'}`}
            >
              {/* Header */}
              <div className="space-y-2 mb-4">
                <h2 className="text-4xl font-black text-white italic tracking-wider">
                  {lastResult.status === 'win' ? 'Winning' : 'Try Again'}
                </h2>
                {lastResult.status === 'win' && (
                  <div className="flex justify-center">
                    <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-lg" />
                  </div>
                )}
                {lastResult.status === 'loss' && (
                  <div className="text-4xl">🥺</div>
                )}
              </div>

              {/* Result Details */}
              <div className="flex flex-col items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white/80">Lottery Result:</span>
                  <div className="flex gap-2">
                    {lastResult.color.map(c => (
                      <Badge key={c} className={`capitalize border-none ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-green-500' : 'bg-purple-500'}`}>
                        {c}
                      </Badge>
                    ))}
                    <Badge className="bg-green-500 border-none">{lastResult.number}</Badge>
                  </div>
                </div>
                <Badge className="bg-green-500 border-none px-6 py-1 text-sm capitalize">{lastResult.bigSmall}</Badge>
              </div>

              {/* Receipt Style Card */}
              <div className="relative">
                <div className="bg-white rounded-t-xl p-4 pt-8 pb-10 shadow-inner">
                  <div className={`text-4xl font-black mb-2 ${lastResult.status === 'win' ? 'text-orange-500' : 'text-red-500'}`}>
                    {lastResult.status === 'win' ? 'WIN' : 'LOSS'} : {lastResult.amount.toFixed(0)}
                  </div>
                  <p className="text-[10px] text-orange-900/60 font-bold">
                    Period : {activeMode} {lastResult.roundId}
                  </p>
                </div>
                {/* Perforated edge effect */}
                <div className="absolute -bottom-2 left-0 right-0 h-4 bg-white rounded-b-xl flex justify-around items-end overflow-hidden">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-[#1a1a2e] rounded-full -mb-2" />
                  ))}
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowResultPopup(false)}
                className="mt-12 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
