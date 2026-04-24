import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ChevronLeft, 
  Users, 
  Wallet, 
  TrendingUp, 
  Settings, 
  Check, 
  X, 
  Search, 
  Image as ImageIcon, 
  Trash2, 
  Plus, 
  Gift, 
  Bell, 
  Trophy, 
  History,
  ShieldCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityItem, GiftCard, DepositRequest, WithdrawalRequest, AppSettings, User, GameMode } from '../types';
import { getRoundId, generateRoundResult } from '../lib/gameLogic';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, where, getDocs, limit, increment } from 'firebase/firestore';

interface AdminPanelProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function AdminPanel({ onNavigate, user }: AdminPanelProps) {
  // Guard: Only admins can view this panel
  if (user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 text-center">
        <ShieldCheck className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You do not have administrative privileges to access this panel.</p>
        <Button onClick={() => onNavigate('home')} className="bg-red-600 hover:bg-red-700">
          Return to Home
        </Button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [banners, setBanners] = useState<any[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [popupBanner, setPopupBanner] = useState<string>('');
  const [newPopupUrl, setNewPopupUrl] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivity, setNewActivity] = useState({ title: '', description: '', imageUrl: '', type: 'banner' as 'banner' | 'offer' });
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [predictionConfigs, setPredictionConfigs] = useState<Record<string, any>>({});
  const [newGiftCard, setNewGiftCard] = useState({ code: '', amount: 0, minDeposit: 0 });
  const [settings, setSettings] = useState<AppSettings>({
    minDeposit: 100,
    minWithdrawal: 200,
    adminUpi: 'lakshmi.club@upi',
    whatsapp: '+91 9999999999',
    customerSupport: 'LakshmiSupport'
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const setManualPrediction = async (mode: GameMode, roundType: 'current' | 'next', number: number) => {
    try {
      const predRef = doc(db, 'config', `prediction_${mode}`);
      const predSnap = await getDoc(predRef);
      const currentData = predSnap.exists() ? predSnap.data() : {};
      
      const now = Date.now();
      let roundId = getRoundId(mode, now);
      if (roundType === 'next') {
        let modeMS = 60000;
        if (mode === '3min') modeMS = 180000;
        if (mode === '5min') modeMS = 300000;
        if (mode === '10min') modeMS = 600000;
        roundId = getRoundId(mode, now + modeMS);
      }

      const result = {
        number,
        color: number === 0 ? ['red', 'violet'] : number === 5 ? ['green', 'violet'] : number % 2 === 0 ? ['red'] : ['green'],
        bigSmall: number >= 5 ? 'big' : 'small'
      };

      await setDoc(predRef, {
        ...currentData,
        [`${roundType}RoundId`]: roundId,
        [`${roundType}Result`]: result
      }, { merge: true });
      
      toast.success(`Result set for ${mode} ${roundType} round!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `config/prediction_${mode}`);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const updatePredictions = () => {
      try {
        const modes: GameMode[] = ['1min', '3min', '5min', '10min'];
        const now = Date.now();
        const newPredictions = modes.map((mode) => {
          const currentRoundId = getRoundId(mode, now);
          let currentResult = generateRoundResult(currentRoundId);
          
          let modeMS = mode === '1min' ? 60000 : mode === '3min' ? 180000 : mode === '5min' ? 300000 : 600000;
          const nextRoundId = getRoundId(mode, now + modeMS);
          let nextResult = generateRoundResult(nextRoundId);

          const data = predictionConfigs[mode];
          if (data) {
            // Check current round
            if (data.currentRoundId === currentRoundId && data.currentResult) {
              currentResult = data.currentResult;
            } else if (data.nextRoundId === currentRoundId && data.nextResult) {
              currentResult = data.nextResult;
            }
            
            // Check next round
            if (data.nextRoundId === nextRoundId && data.nextResult) {
              nextResult = data.nextResult;
            } else if (data.currentRoundId === nextRoundId && data.currentResult) {
              nextResult = data.currentResult;
            }
          }
          
          return {
            mode,
            current: { id: currentRoundId, ...currentResult },
            next: { id: nextRoundId, ...nextResult }
          };
        });
        setPredictions(newPredictions);
      } catch (err) {
        console.error("Critical error in prediction update:", err);
      }
    };

    updatePredictions();
    interval = setInterval(updatePredictions, 1000);
    return () => clearInterval(interval);
  }, [predictionConfigs]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), 
      (snapshot) => {
        console.log("Sync success: users", snapshot.size);
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Users sync error:", error);
        toast.error("Failed to load users. Check permissions.");
      }
    );

    const unsubscribeBanners = onSnapshot(query(collection(db, 'banners'), orderBy('order', 'asc')), 
      (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Banner sync error:", error)
    );

    const unsubscribeActivities = onSnapshot(query(collection(db, 'activities'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Activities sync error:", error)
    );

    const unsubscribeSettings = onSnapshot(doc(db, 'config', 'settings'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({ ...prev, ...data }));
          setPopupBanner(data.popupBanner || '');
        }
      },
      (error) => console.error("Settings sync error:", error)
    );

    const unsubscribeGiftCards = onSnapshot(query(collection(db, 'giftcards'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        setGiftCards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GiftCard)));
      },
      (error) => console.error("Giftcards sync error:", error)
    );

    const unsubscribeDeposits = onSnapshot(query(collection(db, 'deposits'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        console.log("Sync success: deposits", snapshot.size);
        setDeposits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DepositRequest)));
      },
      (error) => console.error("Deposits sync error:", error)
    );

    const unsubscribeWithdrawals = onSnapshot(query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        console.log("Sync success: withdrawals", snapshot.size);
        setWithdrawals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRequest)));
      },
      (error) => console.error("Withdrawals sync error:", error)
    );

    const unsubscribeBets = onSnapshot(query(collection(db, 'bets'), orderBy('createdAt', 'desc'), limit(100)), 
      (snapshot) => {
        setBets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("Bets sync error:", error)
    );

    const unsubscribeHistory = onSnapshot(query(collection(db, 'game_history'), orderBy('id', 'desc'), limit(100)), 
      (snapshot) => {
        console.log("Sync success: game_history", snapshot.size);
        setGameHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => console.error("History sync error:", error)
    );

    const predictionUnsubscribes = ['1min', '3min', '5min', '10min'].map(mode => 
      onSnapshot(doc(db, 'config', `prediction_${mode}`), (snapshot) => {
        if (snapshot.exists()) {
          setPredictionConfigs(prev => ({ ...prev, [mode]: snapshot.data() }));
        }
      })
    );

    return () => {
      unsubscribeUsers();
      unsubscribeBanners();
      unsubscribeActivities();
      unsubscribeSettings();
      unsubscribeGiftCards();
      unsubscribeDeposits();
      unsubscribeWithdrawals();
      unsubscribeBets();
      unsubscribeHistory();
      predictionUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const handleAddBanner = async () => {
    if (!newBannerUrl) return;
    try {
      await addDoc(collection(db, 'banners'), {
        url: newBannerUrl,
        order: banners.length,
        createdAt: Date.now()
      });
      setNewBannerUrl('');
      toast.success('Banner added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'banners');
    }
  };

  const handleRemoveBanner = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
      toast.success('Banner removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'banners');
    }
  };

  const handleUpdatePopup = async () => {
    if (!newPopupUrl) return;
    try {
      await setDoc(doc(db, 'config', 'settings'), { popupBanner: newPopupUrl }, { merge: true });
      setPopupBanner(newPopupUrl);
      setNewPopupUrl('');
      toast.success('Pop-up banner updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/settings');
    }
  };

  const handleRemovePopup = async () => {
    try {
      await updateDoc(doc(db, 'config', 'settings'), { popupBanner: '' });
      setPopupBanner('');
      toast.success('Pop-up banner removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/settings');
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title || !newActivity.imageUrl) return;
    try {
      await addDoc(collection(db, 'activities'), {
        ...newActivity,
        createdAt: Date.now()
      });
      setNewActivity({ title: '', description: '', imageUrl: '', type: 'banner' });
      toast.success('Activity added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'activities');
    }
  };

  const handleRemoveActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
      toast.success('Activity removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activities');
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'blocked') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      toast.success(`User ${status === 'active' ? 'unblocked' : 'blocked'}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleUpdateBalance = async (userId: string, newBalance: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), { balance: newBalance });
      toast.success('Balance updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    const request = deposits.find(d => d.id === id);
    if (!request) return;
    try {
      const userRef = doc(db, 'users', request.userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        toast.error('User not found');
        return;
      }
      const userData = userSnap.data() as User;
      const isFirstDeposit = !userData.totalDeposit || userData.totalDeposit === 0;

      // Update user balance and totalDeposit
      await updateDoc(userRef, {
        balance: increment(request.amount),
        totalDeposit: increment(request.amount)
      });

      // Add transaction record for users' deposit
      await addDoc(collection(db, 'transactions'), {
        userId: request.userId,
        type: 'deposit',
        amount: request.amount,
        status: 'completed',
        createdAt: Date.now(),
        description: `Deposit Approved (Order: ${request.orderNumber})`
      });

      // Referral Bonus Logic: 30% of first deposit
      if (isFirstDeposit && userData.referredBy) {
        const bonusAmount = Math.floor(request.amount * 0.3);
        if (bonusAmount > 0) {
          // Find referrer
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('id', '==', userData.referredBy));
          const qPhone = query(usersRef, where('phone', '==', userData.referredBy));
          const [qSnap, qSnapPhone] = await Promise.all([getDocs(q), getDocs(qPhone)]);
          const referrerDoc = qSnap.docs[0] || qSnapPhone.docs[0];

          if (referrerDoc) {
            const referrerRef = doc(db, 'users', referrerDoc.id);
            await updateDoc(referrerRef, {
              balance: increment(bonusAmount),
              referralDepositCount: increment(1),
              referralDepositAmount: increment(request.amount)
            });

            // Add transaction for referrer
            await addDoc(collection(db, 'transactions'), {
              userId: referrerDoc.id,
              type: 'referral',
              amount: bonusAmount,
              status: 'completed',
              createdAt: Date.now(),
              description: `Referral bonus from ${userData.phone || userData.name}'s first deposit`
            });
            console.log(`Credited referral bonus of ₹${bonusAmount} to user ${referrerDoc.id}`);
          }
        }
      }

      await updateDoc(doc(db, 'deposits', id), { status: 'completed' });
      toast.success('Deposit approved!');
    } catch (error) {
      console.error("Deposit approval error:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'deposits');
    }
  };

  const handleRejectDeposit = async (id: string) => {
    try {
      await updateDoc(doc(db, 'deposits', id), { status: 'failed' });
      toast.error('Deposit rejected');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'deposits');
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status: 'completed' });
      toast.success('Withdrawal approved!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'withdrawals');
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const request = withdrawals.find(w => w.id === id);
    if (!request) return;
    try {
      const userRef = doc(db, 'users', request.userId);
      await updateDoc(userRef, { balance: increment(request.amount) });
      await updateDoc(doc(db, 'withdrawals', id), { status: 'failed' });
      toast.error('Withdrawal rejected and balance refunded!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'withdrawals');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'config', 'settings'), settings, { merge: true });
      toast.success('Settings saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/settings');
    }
  };

  const handleAddGiftCard = async () => {
    if (!newGiftCard.code || newGiftCard.amount <= 0) return;
    try {
      await addDoc(collection(db, 'giftcards'), {
        code: newGiftCard.code,
        amount: newGiftCard.amount,
        minDeposit: newGiftCard.minDeposit,
        status: 'available',
        maxUses: 1,
        usedCount: 0,
        claimedBy: [],
        createdAt: Date.now()
      });
      setNewGiftCard({ code: '', amount: 0, minDeposit: 0 });
      toast.success('Gift card created successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'giftcards');
    }
  };

  const handleRemoveGiftCard = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'giftcards', id));
      toast.success('Gift card removed');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'giftcards');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans text-slate-800 antialiased overflow-x-hidden">
      {/* Header - Professional Dashboard Style */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('profile')}
              className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-red-500" />
                <h1 className="text-sm font-black tracking-widest uppercase">Admin console</h1>
              </div>
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter italic">Lakshmi Club Management v2.1</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-4">
               <span className="text-[10px] font-mono text-slate-500 tracking-wider">U:{users.length} | D:{deposits.length} | W:{withdrawals.length}</span>
               <div className="flex gap-1 mt-1">
                 <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[8px] font-black text-green-500">SYSTEM LIVE</span>
               </div>
            </div>
            <button 
              className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-700 transition-colors active:scale-95"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Verification Warning */}
      {!user || user.role !== 'admin' ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
            <ShieldCheck className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed italic">You do not have administrative privileges to access the system console.</p>
          </div>
          <Button onClick={() => onNavigate('home')} className="bg-slate-900 text-white rounded-xl px-10 h-12 font-black tracking-widest uppercase text-xs shadow-lg shadow-slate-200">Return to Terminal</Button>
        </div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
            {/* Admin Tabs Bar - HORIZONTALLY SCROLLABLE - MODERNISED */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
              <div className="overflow-x-auto no-scrollbar px-4">
                <TabsList variant="line" className="bg-transparent h-14 p-0 gap-8 flex flex-nowrap w-max">
                  {[
                    { value: 'overview', icon: TrendingUp, label: 'Overview' },
                    { value: 'users', icon: Users, label: 'Users' },
                    { value: 'finance', icon: Wallet, label: 'Finance' },
                    { value: 'prediction', icon: Trophy, label: 'Win Control' },
                    { value: 'bets', icon: TrendingUp, label: 'Live Bets' },
                    { value: 'activity', icon: Bell, label: 'Promotions' },
                    { value: 'giftcards', icon: Gift, label: 'Gift' },
                    { value: 'banners', icon: ImageIcon, label: 'Banners' },
                    { value: 'history', icon: History, label: 'History' },
                    { value: 'settings', icon: Settings, label: 'Config' }
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.value}
                      value={tab.value} 
                      className="relative h-14 px-1 rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent text-slate-500 data-[state=active]:text-slate-900 font-bold text-[11px] transition-all flex items-center gap-2 group whitespace-nowrap shadow-none"
                    >
                      <tab.icon className={`w-4 h-4 transition-colors ${activeTab === tab.value ? 'text-red-500' : 'text-slate-300'}`} />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            <TabsContent value="overview" className="m-0 pt-6 px-4 space-y-8 pb-12">
                <div className="flex flex-col gap-1 pl-1">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Monitoring</h2>
                   <p className="text-sm font-black text-slate-800 tracking-tight italic">Global Performance Metrics</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Nodes', value: users.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Asset Inflow', value: `₹${deposits.reduce((acc, d) => acc + (d.status === 'completed' ? d.amount : 0), 0).toLocaleString()}`, icon: ArrowUpCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Asset Outflow', value: `₹${withdrawals.reduce((acc, w) => acc + (w.status === 'completed' ? w.amount : 0), 0).toLocaleString()}`, icon: ArrowDownCircle, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Pending Auth', value: deposits.filter(d => d.status === 'pending').length + withdrawals.filter(w => w.status === 'pending').length, icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' }
                  ].map((stat, i) => (
                    <Card key={i} className="border border-slate-100 bg-white rounded-3xl shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-red-500 transition-colors" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Flux</h3>
                      <button onClick={() => setActiveTab('bets')} className="text-[10px] font-black text-red-500 hover:underline">VIEW_ALL</button>
                    </div>
                    <div className="space-y-4">
                      {bets.slice(0, 5).map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${bet.selection === 'red' ? 'bg-red-500' : bet.selection === 'green' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                            <span className="text-[10px] font-black text-slate-900">U_{bet.userId.slice(-4)}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-900">₹{bet.amount}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Network Stability</h3>
                      <Badge className="bg-emerald-500 text-white text-[8px]">99.9% UPTIME</Badge>
                    </div>
                    <div className="flex items-end gap-1.5 h-24 mb-4">
                      {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 100].map((h, i) => (
                        <div key={i} className="flex-1 bg-slate-100 rounded-t-sm relative group">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-red-500/20 group-hover:bg-red-500 transition-all rounded-t-sm" 
                            style={{ height: `${h}%` }}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest">Real-time throughput analysis</p>
                  </Card>
                </div>
            </TabsContent>

            <TabsContent value="users" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Database Management</h2>
                    <Badge variant="outline" className="text-[9px] font-mono border-slate-200 text-slate-400">{users.length} Records</Badge>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-red-500 transition-colors" />
                    <Input 
                      placeholder="Search by name or phone..." 
                      className="pl-12 bg-white border-slate-200 text-slate-800 text-xs h-12 rounded-2xl shadow-sm focus:ring-2 focus:ring-red-500/10 transition-all"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {users.length === 0 ? (
                    <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-slate-200" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching users</p>
                    </div>
                  ) : users
                    .filter(u => 
                      (u.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                      (u.phone?.includes(searchTerm))
                    )
                    .map((u) => (
                    <Card key={u.id} className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 italic font-black text-sm">
                              {u.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 tracking-tight">{u.name || 'Anonymous User'}</h4>
                              <p className="text-[10px] font-mono text-slate-400 tracking-wider font-medium">{u.phone || 'NO_PHONE_LINKED'} | {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full border-none shadow-none uppercase ${u.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {u.status || 'active'}
                            </Badge>
                            <p className="text-[8px] text-slate-300 font-bold mt-1 uppercase tracking-tighter">Ref: {u.referralCount || 0} Reg | ₹{u.referralDepositAmount || 0} Dep</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Assets</span>
                            <span className="text-base font-black text-slate-900">₹{(u.balance || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex gap-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               className="h-8 text-[10px] font-black border-slate-200 text-slate-600 rounded-lg bg-slate-50 hover:bg-slate-100" 
                               onClick={() => handleUpdateBalance(u.id, (u.balance || 0) + 100)}
                             >
                               +100
                             </Button>
                             <Button 
                               size="sm" 
                               className={`h-8 text-[10px] font-black tracking-widest uppercase rounded-lg shadow-none border-none ${u.status === 'active' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-500 text-white hover:bg-green-600'}`} 
                               onClick={() => handleUpdateUserStatus(u.id, u.status === 'active' ? 'blocked' : 'active')}
                             >
                               {u.status === 'active' ? 'Restrict' : 'Activate'}
                             </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
            </TabsContent>

            <TabsContent value="finance" className="m-0 pt-6 px-4 space-y-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-l-4 border-emerald-500 pl-4 py-1 bg-white rounded-r-xl shadow-sm">
                    <div className="flex flex-col">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Incoming Capital</h3>
                      <p className="text-xs font-bold text-slate-800">Deposit Authorizations</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-mono text-[10px] mr-2">
                      {deposits.filter(d => d.status === 'pending').length} ACTION NEEDED
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {deposits.filter(d => d.status === 'pending').length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                        <ArrowUpCircle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue empty: No pending deposits</p>
                      </div>
                    ) : deposits.filter(d => d.status === 'pending').map((d) => (
                      <Card key={d.id} className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-5 space-y-5">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-mono font-bold text-slate-400 tracking-tighter">REF: {d.id.toUpperCase()}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900">UTR: {d.utr}</span>
                                <Badge variant="outline" className="text-[8px] border-slate-200 font-bold text-slate-400 px-1 py-0 uppercase tracking-widest">{d.userId.slice(-6)}</Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">Order: <span className="font-mono">{d.orderNumber}</span></p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Value</p>
                               <p className="text-xl font-black text-emerald-600 tracking-tight italic">₹{d.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-4 border-t border-slate-50">
                            <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95" onClick={() => handleApproveDeposit(d.id)}>Grant Credit</Button>
                            <Button className="flex-1 h-11 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" onClick={() => handleRejectDeposit(d.id)}>Decline</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between border-l-4 border-red-500 pl-4 py-1 bg-white rounded-r-xl shadow-sm">
                    <div className="flex flex-col">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Capital Outflow</h3>
                      <p className="text-xs font-bold text-slate-800">Withdrawal Dispersions</p>
                    </div>
                    <Badge className="bg-red-50 text-red-600 border-none font-mono text-[10px] mr-2">
                      {withdrawals.filter(w => w.status === 'pending').length} PENDING
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {withdrawals.filter(w => w.status === 'pending').length === 0 ? (
                      <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
                        <ArrowDownCircle className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue empty: No pending withdrawals</p>
                      </div>
                    ) : withdrawals.filter(w => w.status === 'pending').map((w) => (
                      <Card key={w.id} className="border border-slate-100 bg-white rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        <div className="p-5 space-y-5">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <p className="text-[9px] font-mono font-bold text-slate-400 tracking-tighter uppercase">DISP_ID: {w.id.toUpperCase()}</p>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-slate-900 text-[8px] font-black tracking-widest text-white uppercase px-2 py-0.5 rounded-lg">{w.method}</Badge>
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{w.userId.slice(-6)}</span>
                              </div>
                              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] leading-none">Destination Details</p>
                                 <p className="text-xs font-bold text-slate-900 break-all">
                                   {w.method === 'upi' ? w.details?.upiId : `${w.details?.bankName} - ${w.details?.accountNumber}`}
                                 </p>
                              </div>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">Grant</p>
                               <p className="text-xl font-black text-red-600 tracking-tight italic">₹{w.amount.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-4 border-t border-slate-50">
                            <Button className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200 transition-all active:scale-95" onClick={() => handleApproveWithdrawal(w.id)}>Release Funds</Button>
                            <Button className="flex-1 h-11 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" onClick={() => handleRejectWithdrawal(w.id)}>Decline</Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="prediction" className="m-0 pt-6 px-4 space-y-6">
                 <div className="flex items-center justify-between">
                   <div className="space-y-1">
                     <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Game Manipulation Engine</h2>
                     <p className="text-sm font-black text-slate-900 tracking-tight italic">Financial Variance Control</p>
                   </div>
                   <Badge className="bg-red-500 text-white border-none font-black text-[8px] tracking-[0.2em] px-3 animate-pulse">ACTIVE FEED</Badge>
                 </div>

                <div className="grid grid-cols-1 gap-6">
                  {predictions.map((p) => (
                    <Card key={p.mode} className="border-none bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="bg-slate-900 p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                              <Trophy className="w-4 h-4 text-red-500" />
                           </div>
                           <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Win Go {p.mode}</h3>
                        </div>
                        <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                      </div>
                      <div className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Current Round - STACKED ON TOP */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Active Sequence</p>
                              <span className="text-[9px] font-mono font-bold text-slate-300">{p.current.id}</span>
                            </div>
                            <div className="bg-slate-50 p-5 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                              <div className="space-y-2">
                                <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[8px] font-black tracking-widest uppercase">Locked_Record</span>
                                <div className="flex items-center gap-2">
                                   <div className={`w-3 h-3 rounded-full ${p.current.bigSmall === 'big' ? 'bg-orange-500 shadow-sm' : 'bg-blue-500 shadow-sm'}`} />
                                   <span className="text-[11px] font-black text-slate-800 uppercase italic tracking-tighter">{p.current.bigSmall}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                  {p.current.color.map((c: string) => (
                                    <div key={c} className={`w-3 h-3 rounded-full shadow-md ring-2 ring-white ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                  ))}
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl transform rotate-6 ring-4 ring-white ${p.current.color.includes('red') ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                  {p.current.number}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Next Round - STACKED BELOW */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Incoming Sequence</p>
                              <span className="text-[9px] font-mono font-bold text-slate-300">{p.next.id}</span>
                            </div>
                            <div className="bg-white p-5 rounded-[2.5rem] border-2 border-red-500 flex items-center justify-between shadow-lg shadow-red-500/5 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-1">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                              </div>
                              <div className="space-y-2">
                                <span className="inline-block px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-[8px] font-black tracking-widest uppercase">Input_Required</span>
                                <div className="flex items-center gap-2">
                                   <div className={`w-3 h-3 rounded-full ${p.next.bigSmall === 'big' ? 'bg-orange-500 shadow-sm' : 'bg-blue-500 shadow-sm'}`} />
                                   <span className="text-[11px] font-black text-slate-800 uppercase italic tracking-tighter">{p.next.bigSmall}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex gap-1.5">
                                  {p.next.color.map((c: string) => (
                                    <div key={c} className={`w-3 h-3 rounded-full shadow-md ring-2 ring-white ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                                  ))}
                                </div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl transform -rotate-6 ring-4 ring-white ${p.next.color.includes('red') ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                  {p.next.number}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-5 pt-4">
                          <div className="p-6 bg-slate-900 rounded-[2.5rem] space-y-6 shadow-2xl relative">
                            <div className="absolute top-4 right-6">
                               <Badge className="bg-red-500 text-white border-none text-[8px] tracking-[0.2em] font-black">OVERRIDE CONSOLE</Badge>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="w-3 h-3 text-red-500" />
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Manual Data Injection</p>
                            </div>
                            <div className="grid grid-cols-5 gap-3">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                                <button 
                                  key={n}
                                  onClick={() => setManualPrediction(p.mode, 'next', n)}
                                  className="aspect-square rounded-2xl bg-slate-800 text-sm font-black text-white hover:bg-red-500 transition-all border border-slate-700 shadow-inner flex items-center justify-center group relative overflow-hidden"
                                >
                                  <span className="relative z-10">{n}</span>
                                  <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                            <p className="text-[9px] text-slate-500 italic text-center font-medium font-mono uppercase tracking-tighter">Warning: manual injection overrides natural probability engine</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
            </TabsContent>

            <TabsContent value="settings" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex items-center gap-3 pl-1 mb-2">
                   <div className="w-1 h-6 bg-red-500 rounded-full" />
                   <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">System Parameters</h2>
                </div>
                <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Universal UPI Access Point</label>
                      <Input 
                        value={settings.adminUpi}
                        onChange={(e) => setSettings({...settings, adminUpi: e.target.value})}
                        className="bg-slate-50 border-slate-200 text-slate-900 font-black rounded-2xl h-14 px-6 focus:ring-4 focus:ring-red-500/5 transition-all text-sm"
                        placeholder="UPI ID for collections"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Min Liquidity In</label>
                        <div className="relative">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                           <Input 
                            type="number"
                            value={settings.minDeposit}
                            onChange={(e) => setSettings({...settings, minDeposit: parseFloat(e.target.value)})}
                            className="bg-slate-50 border-slate-200 text-slate-900 font-black rounded-2xl h-14 pl-10 pr-6 transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Min Liquidity Out</label>
                        <div className="relative">
                           <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                           <Input 
                            type="number"
                            value={settings.minWithdrawal}
                            onChange={(e) => setSettings({...settings, minWithdrawal: parseFloat(e.target.value)})}
                            className="bg-slate-50 border-slate-200 text-slate-900 font-black rounded-2xl h-14 pl-10 pr-6 transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] ml-1">Helpdesk Matrix (WhatsApp)</label>
                      <Input 
                        value={settings.whatsapp}
                        onChange={(e) => setSettings({...settings, whatsapp: e.target.value})}
                        className="bg-slate-50 border-slate-200 text-slate-900 font-black rounded-2xl h-14 px-6 transition-all text-sm"
                        placeholder="+91 Contact Number"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-[0.98] mt-4">Commit configuration changes</Button>
                </Card>
            </TabsContent>

            <TabsContent value="banners" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex flex-col gap-1 pl-1 mb-2">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Visual Assets</h2>
                   <p className="text-sm font-black text-slate-800 tracking-tight italic">Landing Page Banners</p>
                </div>
                <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset URL</label>
                        <Input 
                          placeholder="https://images.unsplash.com/..." 
                          className="bg-slate-50 border-slate-200 text-slate-800 font-bold rounded-xl h-12 text-xs"
                          value={newBannerUrl}
                          onChange={(e) => setNewBannerUrl(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddBanner} className="w-full h-11 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-slate-100 transition-all active:scale-95">Append to carousel</Button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pt-4">
                      {banners.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                           <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active banners</p>
                        </div>
                      ) : banners.map((banner) => (
                        <div key={banner.id} className="group relative flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-red-200 transition-colors">
                          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-slate-100">
                            <img src={banner.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <div className="flex-1 min-w-0 mr-4">
                              <p className="text-[9px] font-mono font-medium text-slate-400 truncate">{banner.url}</p>
                            </div>
                            <button 
                              onClick={() => handleRemoveBanner(banner.id)} 
                              className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
            </TabsContent>

            <TabsContent value="bets" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex items-center justify-between pl-1 mb-2">
                   <div className="flex flex-col gap-1">
                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Real-time Stream</h2>
                     <p className="text-sm font-black text-slate-800 tracking-tight italic">Live Market Activity</p>
                   </div>
                   <Badge className="bg-emerald-500 text-white text-[8px] font-black tracking-widest px-3 py-1 animate-pulse">STREAMING_LIVE</Badge>
                </div>
                
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-6">Node</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Period</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Stake</TableHead>
                          <TableHead className="text-[9px) font-black text-slate-500 uppercase tracking-widest text-center">Value</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right pr-6">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bets.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-12 text-center text-slate-300 font-black italic uppercase tracking-widest text-xs">No active bets detected</TableCell>
                          </TableRow>
                        ) : bets.map((bet) => (
                          <TableRow key={bet.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6">
                               <span className="text-[10px] font-black text-slate-900 tracking-tighter uppercase">{bet.userId.slice(-6)}</span>
                            </TableCell>
                            <TableCell className="text-center">
                               <span className="text-[10px] font-mono font-bold text-slate-400 tracking-tighter">{bet.roundId}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={`text-[8px] font-black tracking-widest uppercase border-none shadow-none ring-1 ring-inset ${
                                bet.selection === 'red' ? 'bg-red-50 text-red-600 ring-red-500/20' : 
                                bet.selection === 'green' ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/20' : 
                                bet.selection === 'violet' ? 'bg-indigo-50 text-indigo-600 ring-indigo-500/20' : 
                                'bg-slate-50 text-slate-600 ring-slate-500/20'
                              }`}>
                                {bet.selection}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                               <span className="text-[11px] font-black text-slate-900 tracking-tight">₹{bet.amount.toLocaleString()}</span>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Badge className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full border-none shadow-none uppercase ${
                                bet.status === 'win' ? 'bg-emerald-50 text-emerald-500' : 
                                bet.status === 'loss' ? 'bg-red-50 text-red-500' : 
                                'bg-slate-100 text-slate-400'
                              }`}>
                                {bet.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="activity" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex flex-col gap-1 pl-1 mb-2">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Marketing Pipeline</h2>
                   <p className="text-sm font-black text-slate-800 tracking-tight italic">Promotions & Events</p>
                </div>
                <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                       <Plus className="w-3 h-3 text-red-500" />
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Draft New Promotion</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                         <Input placeholder="e.g. Weekly VIP Cashback" value={newActivity.title} onChange={e => setNewActivity({...newActivity, title: e.target.value})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-bold px-6 focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Engagement Description</label>
                         <Input placeholder="Short captivating summary..." value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-bold px-6 focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Creative Asset URL</label>
                         <Input placeholder="https://..." value={newActivity.imageUrl} onChange={e => setNewActivity({...newActivity, imageUrl: e.target.value})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-bold px-6 focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner" />
                      </div>
                      <Button onClick={handleAddActivity} className="bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl h-14 shadow-xl shadow-slate-100 transition-all active:scale-[0.98] mt-2">Publish to terminal</Button>
                    </div>
                  </div>
                  
                  <div className="pt-8 border-t border-slate-50">
                    <div className="flex items-center gap-2 mb-6">
                       <History className="w-3 h-3 text-slate-400" />
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Awaiting Deployment / Live</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {activities.length === 0 ? (
                        <div className="bg-slate-50 p-10 rounded-2xl border border-dashed border-slate-200 text-center">
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No active promotions</p>
                        </div>
                      ) : activities.map(act => (
                        <div key={act.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-red-200 transition-colors group">
                          <img src={act.imageUrl} alt="" className="w-14 h-14 object-cover rounded-xl shadow-sm" referrerPolicy="no-referrer" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-slate-900 tracking-tight truncate uppercase leading-tight mb-0.5">{act.title}</h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{act.description}</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveActivity(act.id)} 
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
            </TabsContent>

            <TabsContent value="giftcards" className="m-0 pt-6 px-4 space-y-6">
                <div className="flex flex-col gap-1 pl-1 mb-2">
                   <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Incentive Management</h2>
                   <p className="text-sm font-black text-slate-800 tracking-tight italic">Gift Card Protocol</p>
                </div>
                <Card className="border border-slate-100 bg-white rounded-3xl shadow-sm p-8 space-y-8 animate-in fade-in zoom-in-95">
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                       <Plus className="w-3 h-3 text-red-500" />
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Initialize New Token</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Code</label>
                         <Input placeholder="LAKSHMI_XXXX" value={newGiftCard.code} onChange={e => setNewGiftCard({...newGiftCard, code: e.target.value})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-black px-6 focus:ring-4 focus:ring-red-500/5 transition-all shadow-inner font-mono tracking-widest" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Stored Value</label>
                           <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                              <Input type="number" placeholder="Value" value={newGiftCard.amount || ''} onChange={e => setNewGiftCard({...newGiftCard, amount: parseFloat(e.target.value)})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-black pl-10 pr-6 transition-all shadow-inner" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Min. Threshold</label>
                           <div className="relative">
                              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                              <Input type="number" placeholder="Deposit" value={newGiftCard.minDeposit || ''} onChange={e => setNewGiftCard({...newGiftCard, minDeposit: parseFloat(e.target.value)})} className="bg-slate-50 border-slate-200 h-14 rounded-2xl text-sm font-black pl-10 pr-6 transition-all shadow-inner" />
                           </div>
                        </div>
                      </div>
                      <Button onClick={handleAddGiftCard} className="bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl h-14 shadow-xl shadow-slate-100 transition-all active:scale-[0.98] mt-2">Generate Encryption Code</Button>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-2">
                         <History className="w-3 h-3 text-slate-400" />
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stored tokens</h3>
                       </div>
                       <Badge className="bg-slate-100 text-slate-500 border-none font-mono text-[9px] px-2">{giftCards.length} TOTAL</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {giftCards.length === 0 ? (
                        <div className="bg-slate-50 p-10 rounded-2xl border border-dashed border-slate-200 text-center">
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Vault is empty</p>
                        </div>
                      ) : giftCards.map(gc => (
                        <div key={gc.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-red-200 transition-colors">
                          <div className="space-y-2">
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none font-mono group-hover:text-red-500 transition-colors">{gc.code}</h4>
                            <div className="flex gap-2">
                              <Badge className="bg-emerald-50 text-emerald-600 border-none text-[9px] font-black tracking-widest px-2 py-0.5 rounded-lg shadow-none ring-1 ring-inset ring-emerald-500/20">VAL: ₹{gc.amount}</Badge>
                              <Badge className="bg-slate-50 text-slate-500 border-none text-[9px] font-black tracking-widest px-2 py-0.5 rounded-lg shadow-none ring-1 ring-inset ring-slate-500/10">REQ: ₹{gc.minDeposit}</Badge>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveGiftCard(gc.id!)} 
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
            </TabsContent>

            <TabsContent value="history" className="m-0 pt-6">
                <div className="px-4 mb-4 flex items-center justify-between">
                   <div className="flex flex-col gap-1">
                     <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Archival Records</h2>
                     <p className="text-sm font-black text-slate-800 tracking-tight italic">Global Settlement History</p>
                   </div>
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <History className="w-4 h-4 text-slate-400" />
                   </div>
                </div>
                
                <div className="bg-white min-h-[60vh] border-t border-slate-100 shadow-2xl">
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-900 border-none hover:bg-slate-900">
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-6 h-12">Log_ID</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center h-12">Resolution</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center h-12">Classification</TableHead>
                          <TableHead className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right pr-6 h-12">Verification</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameHistory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-20 text-center text-slate-300 font-black italic uppercase tracking-widest text-xs">Awaiting data logs...</TableCell>
                          </TableRow>
                        ) : gameHistory.map((history) => (
                          <TableRow key={history.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6 py-4">
                               <span className="text-[10px] font-mono font-black text-slate-900 tracking-tighter">{history.id}</span>
                            </TableCell>
                            <TableCell className="text-center py-4">
                               <div className="flex items-center justify-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${history.resultNumber <= 4 ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                  <span className="text-sm font-black text-slate-800">{history.resultNumber}</span>
                               </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                               <Badge className={`text-[8px] font-black tracking-widest uppercase border-none shadow-none ring-1 ring-inset ${
                                 history.resultBigSmall === 'big' ? 'bg-orange-50 text-orange-600 ring-orange-500/20' : 
                                 'bg-blue-50 text-blue-600 ring-blue-500/20'
                               }`}>
                                 {history.resultBigSmall}
                               </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                               <div className="flex justify-end gap-1">
                                 {history.resultColor.map((c: string, idx: number) => (
                                   <div key={idx} className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${
                                     c === 'red' ? 'bg-red-500' : 
                                     c === 'green' ? 'bg-emerald-500' : 
                                     'bg-indigo-500'
                                   }`} />
                                 ))}
                               </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
            </TabsContent>
          </Tabs>
          </div>
        )}
      </div>
    );
}
