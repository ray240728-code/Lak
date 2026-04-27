import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RefreshCw, 
  ChevronLeft, 
  Volume2, 
  X, 
  HelpCircle,
  History,
  TrendingUp,
  User as UserIcon,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Color, Number, Bet, GameMode, GameRound, BigSmall, User } from '../types';
import { getRoundId, generateRoundResult, calculatePayout } from '../lib/gameLogic';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, increment, getDoc, limit, getDocs, setDoc, runTransaction } from 'firebase/firestore';

interface WinGoProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function WinGo({ onNavigate, user }: WinGoProps) {
  const [balance, setBalance] = useState<number>(user.balance);
  const [activeMode, setActiveMode] = useState<GameMode>('1min');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [currentRoundId, setCurrentRoundId] = useState<string>('');
  const [history, setHistory] = useState<GameRound[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
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
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyTab, setHistoryTab] = useState('history');
  const [predictionConfigs, setPredictionConfigs] = useState<Record<string, any>>({});
  const lastRoundIds = useRef<Record<string, string>>({});

  useEffect(() => {
    const unsubscribeBalance = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    });

    const qHistory = query(collection(db, 'game_history'), orderBy('id', 'desc'), limit(100));
    const unsubscribeHistory = onSnapshot(qHistory, async (snapshot) => {
      const historyData = snapshot.docs.map(doc => doc.data() as GameRound);
      setHistory(historyData);

      // Check for gaps and auto-fill recent history for smooth UI (Deterministic)
      if (historyData.length > 0) {
        const latestRoundId = historyData[0].id;
        const currentId = getRoundId(activeMode, Date.now());
        
        // If there's a gap, fill up to 10 previous rounds
        // This ensures the "by line" sequential appearance
        let checkId = currentId;
        const roundsToFill = [];
        for (let i = 0; i < 10; i++) {
          // Move back in time (approximate, getRoundId is robust)
          const pastTime = Date.now() - (i + 1) * (activeMode === '1min' ? 60000 : activeMode === '3min' ? 180000 : activeMode === '5min' ? 300000 : 600000);
          const pastId = getRoundId(activeMode, pastTime);
          
          if (pastId === latestRoundId) break;
          if (historyData.find(h => h.id === pastId)) continue;
          
          const result = generateRoundResult(pastId);
          roundsToFill.push({
            id: pastId,
            mode: activeMode,
            startTime: pastTime - (activeMode === '1min' ? 60000 : 300000), // Approximate
            endTime: pastTime,
            resultColor: result.color,
            resultNumber: result.number,
            resultBigSmall: result.bigSmall,
            status: 'completed' as const
          });
        }

        for (const round of roundsToFill) {
          try {
            await setDoc(doc(db, 'game_history', round.id), round);
          } catch (e) {
            // Silently fail if someone else wrote it first or permission denied
          }
        }
      }
    });

    const qBets = query(collection(db, 'bets'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribeBets = onSnapshot(qBets, (snapshot) => {
      const betsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bet));
      setMyBets(betsData);
    });

    const predictionUnsubscribes = ['1min', '3min', '5min', '10min'].map(mode => 
      onSnapshot(doc(db, 'config', `prediction_${mode}`), (snapshot) => {
        if (snapshot.exists()) {
          setPredictionConfigs(prev => ({ ...prev, [mode]: snapshot.data() }));
        }
      })
    );

    return () => {
      unsubscribeBalance();
      unsubscribeHistory();
      unsubscribeBets();
      predictionUnsubscribes.forEach(unsub => unsub());
    };
  }, [user.id]);

  const handleRoundEnd = useCallback(async (roundId: string, mode: GameMode) => {
    console.log(`Settling round ${roundId} for ${mode}`);
    let result = generateRoundResult(roundId);
    
    // FETCH LIVE PREDICTION (Override if admin set one)
    const predData = predictionConfigs[mode];
    if (predData) {
      if (predData.currentRoundId === roundId && predData.currentResult) {
        result = predData.currentResult;
      } else if (predData.nextRoundId === roundId && predData.nextResult) {
        result = predData.nextResult;
      }
    }

    const newRound: GameRound = {
      id: roundId,
      mode: mode,
      startTime: Date.now() - (mode === '1min' ? 60000 : mode === '3min' ? 180000 : mode === '5min' ? 300000 : 600000),
      endTime: Date.now(),
      resultColor: result.color,
      resultNumber: result.number,
      resultBigSmall: result.bigSmall,
      status: 'completed'
    };

    try {
      // Find all pending bets for this round and user
      const q = query(
        collection(db, 'bets'), 
        where('roundId', '==', roundId), 
        where('status', '==', 'pending'), 
        where('userId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Even if no bets, record history if missing
      if (querySnapshot.empty) {
        const historyRef = doc(db, 'game_history', roundId);
        const historySnap = await getDoc(historyRef);
        if (!historySnap.exists()) {
          await setDoc(historyRef, newRound);
        }
        return;
      }
      
      await runTransaction(db, async (transaction) => {
        const historyRef = doc(db, 'game_history', roundId);
        const historySnap = await transaction.get(historyRef);
        
        const userRef = doc(db, 'users', user.id);
        const userSnap = await transaction.get(userRef);

        const betSnapshots = await Promise.all(
          querySnapshot.docs.map(betDoc => transaction.get(betDoc.ref))
        );

        if (!historySnap.exists()) {
          transaction.set(historyRef, newRound);
        }

        let totalWinPayout = 0;

        for (const betSnap of betSnapshots) {
          if (!betSnap.exists() || betSnap.data()?.status !== 'pending') continue;

          const betData = betSnap.data() as Bet;
          const payout = calculatePayout(betData, result);
          const status = payout > 0 ? 'win' : 'loss';
          
          transaction.update(betSnap.ref, {
            status,
            payout,
            result: {
              number: result.number,
              color: result.color,
              bigSmall: result.bigSmall
            }
          });

          if (payout > 0) {
            totalWinPayout += payout;
          }

          // UI feedback
          setLastResult({
            status: payout > 0 ? 'win' : 'loss',
            amount: payout > 0 ? payout : betData.amount,
            roundId: roundId,
            number: result.number,
            color: result.color,
            bigSmall: result.bigSmall
          });
          setShowResultPopup(true);
        }

        if (totalWinPayout > 0 && userSnap.exists()) {
          transaction.update(userRef, { balance: increment(totalWinPayout) });
        }
      });
    } catch (error) {
      console.error("Error processing round end:", error);
    }
  }, [user.id, predictionConfigs]);

  // Catch-up effect for pending old bets
  useEffect(() => {
    const pendingOldBets = myBets.filter(bet => {
      if (bet.status !== 'pending') return false;
      const currentId = getRoundId(bet.mode, Date.now());
      // Settle if the round ID is less than the current one (meaning it has passed)
      return bet.roundId < currentId;
    });

    if (pendingOldBets.length > 0) {
      console.log(`Auto-settling ${pendingOldBets.length} overdue bets`);
      // Process them one by one or in small batches if needed
      // For now, sequentially or via handleRoundEnd
      pendingOldBets.forEach(bet => {
        handleRoundEnd(bet.roundId, bet.mode);
      });
    }
  }, [myBets, handleRoundEnd]);

  useEffect(() => {
    const modes: GameMode[] = ['1min', '3min', '5min', '10min'];
    
    // Initialize round IDs if not set
    modes.forEach(mode => {
      if (!lastRoundIds.current[mode]) {
        lastRoundIds.current[mode] = getRoundId(mode, Date.now());
      }
    });
    
    setCurrentRoundId(lastRoundIds.current[activeMode]);

    const interval = setInterval(() => {
      const currentTime = Date.now();
      
      // Update time left for the active mode
      let modeSeconds = 60;
      if (activeMode === '3min') modeSeconds = 180;
      if (activeMode === '5min') modeSeconds = 300;
      if (activeMode === '10min') modeSeconds = 600;
      
      const secondsPassed = Math.floor(currentTime / 1000) % modeSeconds;
      setTimeLeft(modeSeconds - secondsPassed);
      
      // Check for round transitions in ALL modes
      modes.forEach(mode => {
        const newRoundId = getRoundId(mode, currentTime);
        if (newRoundId !== lastRoundIds.current[mode]) {
          const oldRoundId = lastRoundIds.current[mode];
          lastRoundIds.current[mode] = newRoundId;
          
          if (mode === activeMode) {
            setCurrentRoundId(newRoundId);
          }
          
          if (oldRoundId) {
            console.log(`Round ended for ${mode}: ${oldRoundId}`);
            handleRoundEnd(oldRoundId, mode);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeMode, handleRoundEnd]);

  const placeBet = async () => {
    const amount = parseFloat(betAmount) * multiplier;
    if (isNaN(amount) || amount <= 0 || amount > balance || selectedBet === null) {
      toast.error('Invalid bet or insufficient balance');
      return;
    }

    setIsPlacingBet(true);
    try {
      const newBet = {
        userId: user.id,
        roundId: currentRoundId,
        mode: activeMode,
        amount,
        selection: selectedBet,
        createdAt: serverTimestamp(),
        status: 'pending'
      };

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) throw new Error('User profile not found');
        const currentBalance = userSnap.data().balance || 0;
        
        if (currentBalance < amount) {
          throw new Error('Insufficient balance');
        }

        // 1. Deduct balance
        transaction.update(userRef, { balance: increment(-amount) });

        // 2. Create bet document
        const betRef = doc(collection(db, 'bets'));
        transaction.set(betRef, newBet);
      });

      setBetModalOpen(false);
      toast.success('Bet placed!');
    } catch (error) {
      console.error("Bet placement error:", error);
      const isBalanceError = error instanceof Error && error.message === 'Insufficient balance';
      if (isBalanceError) {
        toast.error('Insufficient balance');
      } else {
        handleFirestoreError(error, OperationType.CREATE, 'bets');
      }
    } finally {
      setIsPlacingBet(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f3f3] flex flex-col font-sans text-gray-900 overflow-x-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-[#ff4d4d] text-white sticky top-0 z-50">
        <button onClick={() => onNavigate('home')}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Win Go</h1>
        <HelpCircle className="w-6 h-6" />
      </div>

      <div className="flex-1">
        {/* Balance Card */}
        <div className="px-4 pt-4">
          <div className="bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white italic">₹{balance.toFixed(2)}</span>
                <RefreshCw className="w-5 h-5 text-white/70 cursor-pointer active:rotate-180 transition-transform" />
              </div>
              <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Wallet balance</p>
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <Button className="bg-white text-[#ff4d4d] hover:bg-white/90 rounded-full h-11 font-black text-sm shadow-md" onClick={() => onNavigate('withdraw')}>Withdraw</Button>
                <Button className="bg-white text-[#ff4d4d] hover:bg-white/90 rounded-full h-11 font-black text-sm shadow-md" onClick={() => onNavigate('deposit')}>Deposit</Button>
              </div>
            </div>
            {/* Background elements */}
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="px-4 py-3">
          <div className="bg-white rounded-full px-4 py-2 flex items-center gap-3 text-gray-500 shadow-sm border border-gray-100 overflow-hidden">
            <Volume2 className="w-4 h-4 flex-shrink-0 text-red-400" />
            <div className="flex-1 overflow-hidden">
              <motion.p 
                animate={{ x: [400, -400] }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="text-[11px] whitespace-nowrap font-bold"
              >
                Welcome to Lakshmi Club! Enjoy the best gaming experience with us.
              </motion.p>
            </div>
          </div>
        </div>

        {/* Mode Selection Tabs */}
        <div className="px-4 py-1">
          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-50">
            {[
              { id: '1min', label: 'Win Go 1Min' },
              { id: '3min', label: 'Win Go 3Min' },
              { id: '5min', label: 'Win Go 5Min' },
              { id: '10min', label: 'Win Go 10Min' },
            ].map((mode) => (
              <button 
                key={mode.id}
                onClick={() => setActiveMode(mode.id as GameMode)}
                className={`flex-1 py-3 rounded-lg text-[9px] font-black tracking-tight transition-all ${activeMode === mode.id ? 'bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d] text-white shadow-md' : 'text-gray-400'}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timer Section */}
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex justify-between items-center border border-gray-50 relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-gray-100 px-3 py-1 rounded-full w-fit">
                <HelpCircle className="w-3 h-3" />
                <span>How to play</span>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Win Go {activeMode}</p>
                <p className="text-lg font-black text-gray-800 tracking-tighter">{currentRoundId}</p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time remaining</p>
              <div className="flex gap-1.5 justify-end">
                {formatTime(timeLeft).split('').map((char, i) => (
                  <div key={i} className={`h-11 flex items-center justify-center rounded-lg text-2xl font-black ${char === ':' ? 'text-red-500 w-2' : 'w-7 bg-red-50 text-[#ff4d4d] border border-red-100/50'}`}>
                    {char}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Betting Section */}
        <div className="px-4 space-y-4 mt-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-8 border border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <Button onClick={() => { setSelectedBet('green'); setBetModalOpen(true); }} className="h-10 bg-[#38A169] hover:bg-green-600 text-white font-black rounded-xl shadow-sm text-xs uppercase tracking-widest border-none">Green</Button>
              <Button onClick={() => { setSelectedBet('violet'); setBetModalOpen(true); }} className="h-10 bg-[#805AD5] hover:bg-purple-600 text-white font-black rounded-xl shadow-sm text-xs uppercase tracking-widest border-none">Violet</Button>
              <Button onClick={() => { setSelectedBet('red'); setBetModalOpen(true); }} className="h-10 bg-[#ff4d4d] hover:bg-red-600 text-white font-black rounded-xl shadow-sm text-xs uppercase tracking-widest border-none">Red</Button>
            </div>
            
            <div className="grid grid-cols-5 gap-y-6 gap-x-3">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <div key={num} className="flex justify-center">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedBet(num as Number); setBetModalOpen(true); }}
                    className={`relative w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shadow-lg overflow-hidden border-2 border-white ${
                      num === 0 ? 'bg-gradient-to-br from-[#ff4d4d] to-[#805AD5]' :
                      num === 5 ? 'bg-gradient-to-br from-[#38A169] to-[#805AD5]' :
                      num % 2 === 0 ? 'bg-[#ff4d4d]' : 'bg-[#38A169]'
                    }`}
                  >
                    <span className="text-white drop-shadow-md">{num}</span>
                  </motion.button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {['Random', 'History', 'X1', 'X5', 'X10', 'X20', 'X50', 'X100'].map((m) => (
                <button 
                  key={m} 
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all border ${
                    m === 'X1' ? 'bg-[#ff4d4d] text-white border-red-300 shadow-md' : 
                    m === 'History' ? 'bg-orange-500 text-white border-orange-300 shadow-md' :
                    'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                  onClick={() => {
                    if (m === 'Random') {
                      const randomNum = Math.floor(Math.random() * 10);
                      setSelectedBet(randomNum as Number);
                      setBetModalOpen(true);
                    } else if (m === 'History') {
                      setShowHistoryDrawer(true);
                    } else if (m.startsWith('X')) {
                      setMultiplier(parseInt(m.slice(1)));
                    }
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => { setSelectedBet('big'); setBetModalOpen(true); }} className="h-12 bg-[#FF9933] hover:bg-orange-500 text-white font-black rounded-l-full shadow-lg text-sm uppercase tracking-widest border-none">Big</Button>
              <Button onClick={() => { setSelectedBet('small'); setBetModalOpen(true); }} className="h-12 bg-[#4299E1] hover:bg-blue-600 text-white font-black rounded-r-full shadow-lg text-sm uppercase tracking-widest border-none">Small</Button>
            </div>
          </div>
        </div>

        {/* History Button (Floating or Integrated) */}
        <div className="px-4 mt-6 mb-8 text-center">
          <Button 
            variant="outline" 
            className="w-full bg-white border-gray-100 text-gray-500 font-bold h-12 rounded-2xl flex items-center justify-center gap-2 shadow-sm"
            onClick={() => setShowHistoryDrawer(true)}
          >
            <History className="w-5 h-5 text-red-400" />
            Check Game History & My Bets
          </Button>
        </div>
      </div>

      {/* History Slide-up Panel (Full Screen) */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 top-12 bg-[#f8f3f3] z-[110] rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#ff4d4d] rounded-full" />
                  <h3 className="text-lg font-black text-gray-800 uppercase tracking-widest">Statistics</h3>
                </div>
                <button onClick={() => setShowHistoryDrawer(false)} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={historyTab} onValueChange={setHistoryTab} className="flex-1 flex flex-col">
                  <div className="px-0 flex-shrink-0 bg-white">
                    <TabsList className="w-full h-14 bg-white rounded-none p-1 flex gap-0 border-b border-gray-100 shadow-sm">
                      <TabsTrigger 
                        value="history" 
                        className="flex-1 h-full data-[state=active]:bg-[#ff4d4d] data-[state=active]:text-white text-gray-400 rounded-none font-black text-[12px] uppercase tracking-wider transition-all"
                      >
                        Game history
                      </TabsTrigger>
                      <TabsTrigger 
                        value="chart" 
                        className="flex-1 h-full data-[state=active]:bg-[#ff4d4d] data-[state=active]:text-white text-gray-400 rounded-none font-black text-[12px] uppercase tracking-wider transition-all"
                      >
                        Chart
                      </TabsTrigger>
                      <TabsTrigger 
                        value="myhistory" 
                        className="flex-1 h-full data-[state=active]:bg-[#ff4d4d] data-[state=active]:text-white text-gray-400 rounded-none font-black text-[12px] uppercase tracking-wider transition-all"
                      >
                        My history
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    <TabsContent value="history" className="m-0">
                      <div className="bg-white min-h-screen">
                        <div className="bg-[#ff4d4d] px-4 py-4 flex items-center justify-between text-[11px] font-black text-white uppercase tracking-widest sticky top-0 z-10 shadow-md">
                          <span className="w-[40%] text-center">Period</span>
                          <span className="w-[15%] text-center">Number</span>
                          <span className="w-[25%] text-center">Big Small</span>
                          <span className="w-[20%] text-center">Color</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {filteredHistory.map((round, index) => (
                            <div key={`${round.id}-${index}`} className="flex flex-col">
                              <div 
                                onClick={() => setExpandedRoundId(expandedRoundId === round.id ? null : round.id)}
                                className="px-4 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                              >
                                <span className="w-[40%] font-bold text-[13px] text-gray-500 text-center tracking-tight">{round.id}</span>
                                <div className="w-[15%] flex justify-center">
                                  <span className={`text-[20px] font-black ${
                                    round.resultNumber === 0 ? 'bg-gradient-to-b from-[#ff4d4d] to-[#805AD5] bg-clip-text text-transparent' :
                                    round.resultNumber === 5 ? 'bg-gradient-to-b from-[#38A169] to-[#805AD5] bg-clip-text text-transparent' :
                                    round.resultNumber % 2 === 0 ? 'text-[#ff4d4d]' : 'text-[#38A169]'
                                  }`}>
                                    {round.resultNumber}
                                  </span>
                                </div>
                                <span className={`w-[25%] text-center text-[13px] font-bold ${round.resultBigSmall === 'big' ? 'text-orange-400' : 'text-blue-400'}`}>
                                  {round.resultBigSmall === 'big' ? 'Big' : 'Small'}
                                </span>
                                <div className="w-[20%] flex justify-center gap-2">
                                  {round.resultColor.map((c, i) => (
                                    <div key={i} className={`w-3.5 h-3.5 rounded-full shadow-sm ${c === 'red' ? 'bg-[#ff4d4d]' : c === 'green' ? 'bg-[#38A169]' : 'bg-[#805AD5]'}`} />
                                  ))}
                                </div>
                              </div>
                              <AnimatePresence>
                                {expandedRoundId === round.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden bg-gray-50/80 px-4"
                                  >
                                    <div className="py-4 space-y-3 border-t border-gray-100">
                                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest">Details</h4>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Period ID</p>
                                          <p className="text-xs font-black text-gray-700">{round.id}</p>
                                        </div>
                                        <div className="p-3 bg-white rounded-xl border border-gray-100">
                                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Result</p>
                                          <p className="text-xs font-black text-gray-700 uppercase">{round.resultBigSmall} ({round.resultNumber})</p>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="chart" className="m-0 bg-white min-h-screen">
                      <div className="px-4 py-20 flex flex-col items-center justify-center text-gray-200">
                        <TrendingUp className="w-20 h-20 mb-4 opacity-20" />
                        <p className="text-sm font-black uppercase tracking-widest text-gray-400">Analysis Coming Soon</p>
                      </div>
                    </TabsContent>
                    <TabsContent value="myhistory" className="m-0 bg-white min-h-screen">
                      <div className="divide-y divide-gray-50">
                        {filteredMyBets.map((bet, index) => (
                          <div key={`${bet.id}-${index}`} className="flex flex-col">
                            <div 
                              onClick={() => setExpandedBetId(expandedBetId === bet.id ? null : (bet.id || null))}
                              className="px-6 py-6 flex flex-col gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{bet.roundId}</span>
                                <Badge className={`text-[10px] font-black px-4 py-1.5 rounded-full border-none shadow-sm ${bet.status === 'win' ? 'bg-green-100 text-green-600' : bet.status === 'loss' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                  {bet.status === 'win' ? `WIN ₹${bet.payout?.toFixed(2)}` : bet.status === 'loss' ? 'LOSS' : 'WAITING'}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-end">
                                <div className="flex flex-col gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected</span>
                                  <span className={`text-base font-black uppercase italic tracking-wider ${
                                    bet.selection === 'red' || bet.selection === 0 || bet.selection === 2 || bet.selection === 4 || bet.selection === 6 || bet.selection === 8 ? 'text-red-500' :
                                    bet.selection === 'green' || bet.selection === 1 || bet.selection === 3 || bet.selection === 5 || bet.selection === 7 || bet.selection === 9 ? 'text-green-500' :
                                    bet.selection === 'violet' ? 'text-purple-500' : 'text-gray-800'
                                  }`}>{bet.selection}</span>
                                </div>
                                <div className="text-right flex flex-col gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Investment</span>
                                  <span className="text-lg font-black text-gray-800">₹{bet.amount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            <AnimatePresence>
                              {expandedBetId === bet.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="overflow-hidden bg-gray-50/50 px-6"
                                >
                                  <div className="py-6 space-y-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400 font-bold uppercase tracking-widest">Transaction ID</span>
                                      <span className="font-mono text-gray-600">{bet.id?.slice(0, 12)}...</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400 font-bold uppercase tracking-widest">Time</span>
                                      <span className="text-gray-600">{new Date(bet.timestamp?.toDate()).toLocaleString()}</span>
                                    </div>
                                    <Button className="w-full h-10 bg-red-50 text-red-500 hover:bg-red-100 font-black rounded-xl text-[10px] uppercase tracking-widest">Order Details</Button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <Dialog open={betModalOpen} onOpenChange={setBetModalOpen}>
        <DialogContent className="bg-white border-none text-gray-800 rounded-t-[2rem] sm:rounded-[2rem] p-0 overflow-hidden max-w-md shadow-2xl">
          <div className="bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] p-6 text-center text-white">
            <h3 className="text-xl font-black uppercase tracking-tight">Win Go {activeMode}</h3>
            <div className="flex flex-col items-center gap-1 mt-1">
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">Select: {selectedBet}</p>
              <Badge className="bg-white/20 text-white border-none text-[9px] font-black uppercase px-2 py-0.5">
                Payout: {typeof selectedBet === 'number' ? '4x' : '1.9x'} 
              </Badge>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</span>
                <div className="flex gap-2">
                  {['10', '100', '1000', '10000'].map((amt) => (
                    <button 
                      key={amt} 
                      onClick={() => setBetAmount(amt)}
                      className={`h-8 px-3 text-[10px] font-bold rounded-lg transition-all ${betAmount === amt ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quantity</span>
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-1 border border-gray-100">
                  <button className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold" onClick={() => setMultiplier(Math.max(1, multiplier - 1))}>-</button>
                  <span className="w-8 text-center font-black text-gray-800">{multiplier}</span>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold" onClick={() => setMultiplier(multiplier + 1)}>+</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {[1, 5, 10, 20, 50, 100].map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setMultiplier(m)}
                    className={`h-7 px-3 text-[9px] font-bold rounded-md transition-all ${multiplier === m ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}
                  >
                    X{m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
              <span className="text-xl font-black text-red-500">₹{(parseFloat(betAmount || '0') * multiplier).toFixed(2)}</span>
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setBetModalOpen(false)} className="flex-1 h-12 text-gray-400 font-bold hover:bg-gray-50 rounded-xl">Cancel</Button>
              <Button onClick={placeBet} className="flex-[2] h-12 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black text-sm rounded-xl shadow-lg shadow-red-100">Confirm Bet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Result Popup */}
      <AnimatePresence>
        {showResultPopup && lastResult && (
          <Dialog open={showResultPopup} onOpenChange={setShowResultPopup}>
            <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-[320px] flex flex-col items-center justify-center">
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="w-full relative"
              >
                <div className={`rounded-[2.5rem] p-8 text-center shadow-2xl ${lastResult.status === 'win' ? 'bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d]' : 'bg-gray-800'}`}>
                  <h2 className="text-3xl font-black text-white italic mb-4">
                    {lastResult.status === 'win' ? 'CONGRATULATIONS' : 'TRY AGAIN'}
                  </h2>
                  
                  <div className="bg-white/10 rounded-2xl p-6 mb-6 backdrop-blur-sm border border-white/10">
                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Lottery Result</p>
                    <div className="flex justify-center gap-3 items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg ${
                        lastResult.number === 0 ? 'bg-gradient-to-br from-red-500 to-purple-500' :
                        lastResult.number === 5 ? 'bg-gradient-to-br from-green-500 to-purple-500' :
                        lastResult.number % 2 === 0 ? 'bg-red-500' : 'bg-green-500'
                      }`}>
                        {lastResult.number}
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-black text-white uppercase tracking-widest">{lastResult.bigSmall}</span>
                        <div className="flex gap-1">
                          {lastResult.color.map(c => (
                            <div key={c} className={`w-2 h-2 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-green-500' : 'bg-purple-500'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-inner">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                      {lastResult.status === 'win' ? 'Bonus' : 'Loss Amount'}
                    </p>
                    <p className={`text-3xl font-black ${lastResult.status === 'win' ? 'text-red-500' : 'text-gray-400'}`}>
                      ₹{lastResult.amount.toFixed(2)}
                    </p>
                    <p className="text-[8px] font-mono text-gray-300 mt-2">Period: {lastResult.roundId}</p>
                  </div>

                  <button 
                    onClick={() => setShowResultPopup(false)}
                    className="mt-8 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white border border-white/20 hover:bg-white/30 transition-colors mx-auto"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
