import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Users, Wallet, TrendingUp, Settings, Check, X, Search, Image, Trash2, Plus, Gift, Bell, Trophy, History } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityItem, GiftCard, DepositRequest, WithdrawalRequest, AppSettings, User, GameMode } from '../types';
import { getRoundId, generateRoundResult } from '../lib/gameLogic';

interface AdminPanelProps {
  onNavigate: (page: any) => void;
}

export default function AdminPanel({ onNavigate }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [bets, setBets] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [banners, setBanners] = useState<string[]>([]);
  const [newBannerUrl, setNewBannerUrl] = useState('');
  
  // Prediction state
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    const updatePredictions = () => {
      const modes: GameMode[] = ['30sec', '1min', '3min', '5min'];
      const now = Date.now();
      const newPredictions = modes.map(mode => {
        const currentRoundId = getRoundId(mode, now);
        const currentResult = generateRoundResult(currentRoundId);
        
        // Calculate next round ID
        let nextTime = now + 60000;
        if (mode === '30sec') nextTime = now + 30000;
        if (mode === '3min') nextTime = now + 180000;
        if (mode === '5min') nextTime = now + 300000;
        
        const nextRoundId = getRoundId(mode, nextTime);
        const nextResult = generateRoundResult(nextRoundId);
        
        return {
          mode,
          current: { id: currentRoundId, ...currentResult },
          next: { id: nextRoundId, ...nextResult }
        };
      });
      setPredictions(newPredictions);
    };

    updatePredictions();
    const interval = setInterval(updatePredictions, 1000);

    // Backfill history for admin view
    const savedHistory = JSON.parse(localStorage.getItem('lakshmi_history') || '[]');
    const modes: GameMode[] = ['30sec', '1min', '3min', '5min'];
    const now = Date.now();
    let newHistory = [...savedHistory];
    let hasChanges = false;
    
    modes.forEach(mode => {
      const modeHistory = newHistory.filter(h => h.mode === mode);
      if (modeHistory.length < 20) {
        let intervalMs = 60000;
        if (mode === '30sec') intervalMs = 30000;
        if (mode === '3min') intervalMs = 180000;
        if (mode === '5min') intervalMs = 300000;

        for (let i = 1; i <= 50; i++) {
          const pastTime = now - (i * intervalMs);
          const roundId = getRoundId(mode, pastTime);
          if (!newHistory.find(r => r.id === roundId)) {
            const result = generateRoundResult(roundId);
            newHistory.push({
              id: roundId,
              mode: mode,
              startTime: pastTime - intervalMs,
              endTime: pastTime,
              resultColor: result.color,
              resultNumber: result.number,
              resultBigSmall: result.bigSmall,
              status: 'completed'
            });
            hasChanges = true;
          }
        }
      }
    });
    
    if (hasChanges) {
      newHistory.sort((a, b) => b.id.localeCompare(a.id));
      localStorage.setItem('lakshmi_history', JSON.stringify(newHistory.slice(0, 500)));
    }

    return () => clearInterval(interval);
  }, []);
  
  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivity, setNewActivity] = useState({ title: '', description: '', imageUrl: '', type: 'banner' as 'banner' | 'offer' });
  
  // Gift Card state
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [newGiftCard, setNewGiftCard] = useState({ code: '', amount: 0, minDeposit: 0 });

  // App Settings
  const [settings, setSettings] = useState<AppSettings>({
    minDeposit: 100,
    minWithdrawal: 200,
    adminUpi: 'lakshmi.club@upi',
    whatsapp: '+91 9999999999',
    customerSupport: 'LakshmiSupport'
  });

  useEffect(() => {
    // Mock loading data from localStorage
    const savedBets = JSON.parse(localStorage.getItem('lakshmi_bets') || '[]');
    setBets(savedBets);

    const savedBanners = JSON.parse(localStorage.getItem('lakshmi_banners') || '[]');
    setBanners(savedBanners.length > 0 ? savedBanners : [
      'https://picsum.photos/seed/lakshmi1/1920/1080',
      'https://picsum.photos/seed/lakshmi2/1920/1080'
    ]);

    const savedActivitiesStr = localStorage.getItem('lakshmi_activities');
    if (savedActivitiesStr === null) {
      const defaultActivities = [
        {
          id: '1',
          title: 'Welcome Bonus',
          description: 'Get ₹100 on your first deposit!',
          imageUrl: 'https://picsum.photos/seed/bonus/800/400',
          type: 'banner',
          createdAt: Date.now()
        },
        {
          id: '2',
          title: 'Daily Check-in',
          description: 'Claim your daily rewards now.',
          imageUrl: 'https://picsum.photos/seed/daily/800/400',
          type: 'offer',
          createdAt: Date.now()
        }
      ];
      setActivities(defaultActivities);
      localStorage.setItem('lakshmi_activities', JSON.stringify(defaultActivities));
    } else {
      setActivities(JSON.parse(savedActivitiesStr));
    }

    const savedGiftCards = JSON.parse(localStorage.getItem('lakshmi_giftcards') || '[]');
    setGiftCards(savedGiftCards);

    const savedSettings = JSON.parse(localStorage.getItem('lakshmi_settings') || '{}');
    if (savedSettings.adminUpi) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }

    const savedDeposits = JSON.parse(localStorage.getItem('lakshmi_deposits') || '[]');
    setDeposits(savedDeposits);

    const savedWithdrawals = JSON.parse(localStorage.getItem('lakshmi_withdrawals') || '[]');
    setWithdrawals(savedWithdrawals);

    // Load real users from localStorage
    const savedUsers = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    setUsers(savedUsers);
  }, []);

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

  const handleUpdateBalance = (userId: string, newBalance: number) => {
    setUsers(users.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
    toast.success(`Balance updated for user ${userId}`);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('lakshmi_settings', JSON.stringify(settings));
    toast.success('Settings saved successfully!');
  };

  const handleApproveDeposit = (id: string) => {
    const request = deposits.find(d => d.id === id);
    if (!request) return;

    // Update user balance in lakshmi_users
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const updatedUsers = users.map(u => {
      if (u.phone === request.userId) {
        return { 
          ...u, 
          balance: u.balance + request.amount,
          totalDeposit: u.totalDeposit + request.amount
        };
      }
      return u;
    });
    localStorage.setItem('lakshmi_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Update request status
    const updatedDeposits = deposits.map(d => d.id === id ? { ...d, status: 'completed' as const } : d);
    setDeposits(updatedDeposits);
    localStorage.setItem('lakshmi_deposits', JSON.stringify(updatedDeposits));

    // Add transaction
    const transactions = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
    const newTransaction = {
      id: 'T' + Date.now(),
      userId: request.userId,
      type: 'deposit' as const,
      amount: request.amount,
      status: 'completed' as const,
      timestamp: Date.now(),
      description: 'Deposit Approved',
      orderNumber: request.orderNumber
    };
    localStorage.setItem('lakshmi_transactions', JSON.stringify([newTransaction, ...transactions]));

    toast.success('Deposit approved!');
  };

  const handleRejectDeposit = (id: string) => {
    const updatedDeposits = deposits.map(d => d.id === id ? { ...d, status: 'failed' as const } : d);
    setDeposits(updatedDeposits);
    localStorage.setItem('lakshmi_deposits', JSON.stringify(updatedDeposits));
    toast.error('Deposit rejected!');
  };

  const handleApproveWithdrawal = (id: string) => {
    const updatedWithdrawals = withdrawals.map(w => w.id === id ? { ...w, status: 'completed' as const } : w);
    setWithdrawals(updatedWithdrawals);
    localStorage.setItem('lakshmi_withdrawals', JSON.stringify(updatedWithdrawals));

    // Add transaction
    const request = withdrawals.find(w => w.id === id);
    if (request) {
      const transactions = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
      const newTransaction = {
        id: 'T' + Date.now(),
        userId: request.userId,
        type: 'withdrawal' as const,
        amount: request.amount,
        status: 'completed' as const,
        timestamp: Date.now(),
        description: 'Withdrawal Approved',
        orderNumber: request.orderNumber
      };
      localStorage.setItem('lakshmi_transactions', JSON.stringify([newTransaction, ...transactions]));
    }

    toast.success('Withdrawal approved!');
  };

  const handleRejectWithdrawal = (id: string) => {
    const request = withdrawals.find(w => w.id === id);
    if (!request) return;

    // Refund balance in lakshmi_users
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const updatedUsers = users.map(u => {
      if (u.phone === request.userId) {
        return { ...u, balance: u.balance + request.amount };
      }
      return u;
    });
    localStorage.setItem('lakshmi_users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    const updatedWithdrawals = withdrawals.map(w => w.id === id ? { ...w, status: 'failed' as const } : w);
    setWithdrawals(updatedWithdrawals);
    localStorage.setItem('lakshmi_withdrawals', JSON.stringify(updatedWithdrawals));
    toast.error('Withdrawal rejected and balance refunded!');
  };

  const handleAddBanner = () => {
    if (!newBannerUrl) return;
    const updatedBanners = [...banners, newBannerUrl];
    setBanners(updatedBanners);
    localStorage.setItem('lakshmi_banners', JSON.stringify(updatedBanners));
    setNewBannerUrl('');
    toast.success('Banner added successfully');
  };

  const handleRemoveBanner = (index: number) => {
    const updatedBanners = banners.filter((_, i) => i !== index);
    setBanners(updatedBanners);
    localStorage.setItem('lakshmi_banners', JSON.stringify(updatedBanners));
    toast.success('Banner removed');
  };

  const handleAddActivity = () => {
    if (!newActivity.title || !newActivity.imageUrl) {
      toast.error('Please fill in title and image URL/Upload');
      return;
    }
    const activity: ActivityItem = {
      id: Math.random().toString(36).substr(2, 9),
      ...newActivity,
      createdAt: Date.now()
    };
    const updated = [activity, ...activities];
    setActivities(updated);
    localStorage.setItem('lakshmi_activities', JSON.stringify(updated));
    setNewActivity({ title: '', description: '', imageUrl: '', type: 'banner' });
    toast.success('Activity added successfully');
  };

  const handleRemoveActivity = (id: string) => {
    const updated = activities.filter(a => a.id !== id);
    setActivities(updated);
    localStorage.setItem('lakshmi_activities', JSON.stringify(updated));
    toast.success('Activity removed');
  };

  const handleAddGiftCard = () => {
    if (!newGiftCard.code || newGiftCard.amount <= 0) {
      toast.error('Please enter a valid code and amount');
      return;
    }
    const card: GiftCard = {
      id: Math.random().toString(36).substr(2, 9),
      code: newGiftCard.code,
      amount: newGiftCard.amount,
      minDeposit: newGiftCard.minDeposit,
      status: 'available',
      maxUses: 1,
      usedCount: 0,
      claimedBy: [],
      createdAt: Date.now()
    };
    const updated = [card, ...giftCards];
    setGiftCards(updated);
    localStorage.setItem('lakshmi_giftcards', JSON.stringify(updated));
    setNewGiftCard({ code: '', amount: 0, minDeposit: 0 });
    toast.success('Gift card created successfully');
  };

  const handleRemoveGiftCard = (id: string) => {
    const updated = giftCards.filter(c => c.id !== id);
    setGiftCards(updated);
    localStorage.setItem('lakshmi_giftcards', JSON.stringify(updated));
    toast.success('Gift card removed');
  };

  const handleSaveSupport = () => {
    localStorage.setItem('lakshmi_settings', JSON.stringify(settings));
    toast.success('Settings saved');
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col pb-20">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-[#2b3270] border-b border-blue-900/50">
        <Button variant="ghost" size="icon" onClick={() => onNavigate('profile')}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>

      <div className="p-4 space-y-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full bg-[#2b3270] border-blue-900/50 overflow-x-auto flex-nowrap justify-start h-12">
            <TabsTrigger value="users" className="flex-1 min-w-[80px] text-[10px]"><Users className="w-3 h-3 mr-1" /> Users</TabsTrigger>
            <TabsTrigger value="bets" className="flex-1 min-w-[80px] text-[10px]"><TrendingUp className="w-3 h-3 mr-1" /> Bets</TabsTrigger>
            <TabsTrigger value="finance" className="flex-1 min-w-[80px] text-[10px]"><Wallet className="w-3 h-3 mr-1" /> Finance</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 min-w-[80px] text-[10px]"><Bell className="w-3 h-3 mr-1" /> Offers</TabsTrigger>
            <TabsTrigger value="giftcards" className="flex-1 min-w-[80px] text-[10px]"><Gift className="w-3 h-3 mr-1" /> Gifts</TabsTrigger>
            <TabsTrigger value="banners" className="flex-1 min-w-[80px] text-[10px]"><Image className="w-3 h-3 mr-1" /> Banners</TabsTrigger>
            <TabsTrigger value="prediction" className="flex-1 min-w-[80px] text-[10px]"><Trophy className="w-3 h-3 mr-1" /> Prediction</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-[80px] text-[10px]"><History className="w-3 h-3 mr-1" /> History</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 min-w-[80px] text-[10px]"><Settings className="w-3 h-3 mr-1" /> Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4 space-y-4">
            <Card className="border-none bg-[#2b3270] overflow-hidden">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-900/50 hover:bg-transparent">
                      <TableHead className="text-blue-300">Round ID</TableHead>
                      <TableHead className="text-blue-300">Mode</TableHead>
                      <TableHead className="text-blue-300">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {JSON.parse(localStorage.getItem('lakshmi_history') || '[]').slice(0, 300).map((round: any) => (
                      <TableRow key={round.id} className="border-blue-900/50 hover:bg-white/5">
                        <TableCell className="font-mono text-xs">{round.id}</TableCell>
                        <TableCell className="text-xs uppercase">{round.mode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${round.resultColor.includes('red') ? 'bg-red-500' : 'bg-green-500'}`}>
                              {round.resultNumber}
                            </div>
                            <span className="text-[10px] uppercase text-blue-300">{round.resultBigSmall}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="prediction" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predictions.map((p) => (
                <Card key={p.mode} className="border-none bg-[#2b3270] shadow-lg overflow-hidden">
                  <CardHeader className="bg-blue-600/20 py-3">
                    <CardTitle className="text-sm font-bold flex justify-between items-center">
                      <span>WinGo {p.mode}</span>
                      <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-400">Live</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[10px] text-blue-300 uppercase font-bold">Current Round</p>
                        <div className="bg-[#1a1a2e] p-3 rounded-xl border border-blue-900/50 space-y-2">
                          <p className="text-[10px] font-mono text-blue-400">{p.current.id}</p>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${p.current.color.includes('red') ? 'bg-red-500' : 'bg-green-500'}`}>
                              {p.current.number}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold capitalize text-white">{p.current.bigSmall}</span>
                              <div className="flex gap-1">
                                {p.current.color.map((c: string) => (
                                  <div key={c} className={`w-2 h-2 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-green-500' : 'bg-purple-500'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] text-blue-300 uppercase font-bold">Next Round</p>
                        <div className="bg-[#1a1a2e] p-3 rounded-xl border border-blue-900/50 space-y-2">
                          <p className="text-[10px] font-mono text-blue-400">{p.next.id}</p>
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${p.next.color.includes('red') ? 'bg-red-500' : 'bg-green-500'}`}>
                              {p.next.number}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold capitalize text-white">{p.next.bigSmall}</span>
                              <div className="flex gap-1">
                                {p.next.color.map((c: string) => (
                                  <div key={c} className={`w-2 h-2 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'green' ? 'bg-green-500' : 'bg-purple-500'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <Input 
                placeholder="Search users..." 
                className="pl-10 bg-[#2b3270] border-blue-900/50 text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Card className="border-none bg-[#2b3270] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-900/50 hover:bg-transparent">
                    <TableHead className="text-blue-300">UID</TableHead>
                    <TableHead className="text-blue-300">Name</TableHead>
                    <TableHead className="text-blue-300">Balance</TableHead>
                    <TableHead className="text-blue-300">Ref</TableHead>
                    <TableHead className="text-blue-300">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((user) => (
                    <TableRow key={user.id} className="border-blue-900/50 hover:bg-white/5">
                      <TableCell className="font-mono text-xs">{user.id}</TableCell>
                      <TableCell className="text-xs">{user.name}</TableCell>
                      <TableCell className="text-xs">₹{user.balance.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{user.referralCount || 0}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-blue-400 text-blue-400" onClick={() => handleUpdateBalance(user.id, user.balance + 100)}>+100</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="bets" className="mt-4">
            <Card className="border-none bg-[#2b3270] overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-blue-900/50 hover:bg-transparent">
                    <TableHead className="text-blue-300">Round</TableHead>
                    <TableHead className="text-blue-300">Selection</TableHead>
                    <TableHead className="text-blue-300">Amount</TableHead>
                    <TableHead className="text-blue-300">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bets.map((bet) => (
                    <TableRow key={bet.id} className="border-blue-900/50 hover:bg-white/5">
                      <TableCell className="font-mono text-xs">{bet.roundId.slice(-4)}</TableCell>
                      <TableCell className="text-xs">{bet.selection}</TableCell>
                      <TableCell className="text-xs">₹{bet.amount}</TableCell>
                      <TableCell className="text-xs">
                        <span className={bet.status === 'win' ? 'text-green-400' : bet.status === 'loss' ? 'text-red-400' : 'text-blue-300'}>
                          {bet.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white pl-2 border-l-4 border-blue-400">Deposit Requests</h3>
              <Card className="border-none bg-[#2b3270] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-900/50 hover:bg-transparent">
                      <TableHead className="text-blue-300">User/UTR</TableHead>
                      <TableHead className="text-blue-300">Amount</TableHead>
                      <TableHead className="text-blue-300">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.filter(d => d.status === 'pending').map((d) => (
                      <TableRow key={d.id} className="border-blue-900/50 hover:bg-white/5">
                        <TableCell className="text-xs">
                          <p className="font-bold">{d.userId}</p>
                          <p className="text-[10px] text-blue-300 font-mono">{d.utr}</p>
                          <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Order: {d.orderNumber}</p>
                        </TableCell>
                        <TableCell className="text-xs font-bold">₹{d.amount}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="icon" className="w-7 h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveDeposit(d.id)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" className="w-7 h-7 bg-red-600 hover:bg-red-700" onClick={() => handleRejectDeposit(d.id)}><X className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white pl-2 border-l-4 border-blue-400">Withdrawal Requests</h3>
              <Card className="border-none bg-[#2b3270] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-blue-900/50 hover:bg-transparent">
                      <TableHead className="text-blue-300">User/Method</TableHead>
                      <TableHead className="text-blue-300">Amount</TableHead>
                      <TableHead className="text-blue-300">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.filter(w => w.status === 'pending').map((w) => (
                      <TableRow key={w.id} className="border-blue-900/50 hover:bg-white/5">
                        <TableCell className="text-xs">
                          <p className="font-bold">{w.userId}</p>
                          <p className="text-[10px] text-blue-300 uppercase">{w.method}</p>
                          <p className="text-[10px] text-white opacity-70">
                            {w.method === 'upi' ? w.details.upiId : `${w.details.bankName} - ${w.details.accountNumber}`}
                          </p>
                          <p className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Order: {w.orderNumber}</p>
                        </TableCell>
                        <TableCell className="text-xs font-bold">₹{w.amount}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button size="icon" className="w-7 h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveWithdrawal(w.id)}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" className="w-7 h-7 bg-red-600 hover:bg-red-700" onClick={() => handleRejectWithdrawal(w.id)}><X className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-4">
            <Card className="border-none bg-[#2b3270] p-4 space-y-4">
              <h3 className="text-sm font-bold text-white">Add Latest Offer & Event</h3>
              <div className="space-y-3">
                <Input 
                  placeholder="Offer/Event Title" 
                  className="bg-blue-900/30 border-blue-800/50 text-white"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                />
                <Input 
                  placeholder="Short Description" 
                  className="bg-blue-900/30 border-blue-800/50 text-white"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                />
                <div className="space-y-2">
                  <label className="text-[10px] text-blue-300">Upload Image or Enter URL</label>
                  <Input 
                    type="file"
                    accept="image/*"
                    className="bg-blue-900/30 border-blue-800/50 text-white text-xs h-8"
                    onChange={(e) => handleImageUpload(e, (url) => setNewActivity({...newActivity, imageUrl: url}))}
                  />
                  <Input 
                    placeholder="Or Image URL" 
                    className="bg-blue-900/30 border-blue-800/50 text-white"
                    value={newActivity.imageUrl}
                    onChange={(e) => setNewActivity({...newActivity, imageUrl: e.target.value})}
                  />
                  {newActivity.imageUrl && <img src={newActivity.imageUrl} className="w-full h-24 object-cover rounded-lg border border-blue-500/30" referrerPolicy="no-referrer" />}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant={newActivity.type === 'banner' ? 'default' : 'outline'}
                    className={`flex-1 text-xs h-8 ${newActivity.type === 'banner' ? 'bg-blue-500' : 'border-blue-500/50 text-blue-300'}`}
                    onClick={() => setNewActivity({...newActivity, type: 'banner'})}
                  >Banner</Button>
                  <Button 
                    variant={newActivity.type === 'offer' ? 'default' : 'outline'}
                    className={`flex-1 text-xs h-8 ${newActivity.type === 'offer' ? 'bg-blue-500' : 'border-blue-500/50 text-blue-300'}`}
                    onClick={() => setNewActivity({...newActivity, type: 'offer'})}
                  >Offer/Event</Button>
                </div>
                <Button onClick={handleAddActivity} className="w-full bg-blue-500 hover:bg-blue-600 font-bold">
                  <Plus className="w-4 h-4 mr-2" /> Add Offer/Event
                </Button>
              </div>
              <div className="space-y-3 pt-4 border-t border-blue-900/50">
                <h4 className="text-xs font-bold text-blue-200">Current Offers & Events</h4>
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                    <img src={activity.imageUrl} alt="" className="w-16 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{activity.title}</p>
                      <p className="text-[10px] text-blue-300 truncate uppercase">{activity.type}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:bg-red-500/10"
                      onClick={() => handleRemoveActivity(activity.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="giftcards" className="mt-4 space-y-4">
            <Card className="border-none bg-[#2b3270] p-4 space-y-4">
              <h3 className="text-sm font-bold text-white">Create Gift Card</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Code (e.g. LAKSHMI100)" 
                    className="bg-blue-900/30 border-blue-800/50 text-white flex-[2]"
                    value={newGiftCard.code}
                    onChange={(e) => setNewGiftCard({...newGiftCard, code: e.target.value})}
                  />
                  <Input 
                    type="number"
                    placeholder="Amount" 
                    className="bg-blue-900/30 border-blue-800/50 text-white flex-1"
                    value={newGiftCard.amount || ''}
                    onChange={(e) => setNewGiftCard({...newGiftCard, amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-blue-300">Min. Deposit Required to Claim</label>
                  <Input 
                    type="number"
                    placeholder="Min Deposit" 
                    className="bg-blue-900/30 border-blue-800/50 text-white"
                    value={newGiftCard.minDeposit || ''}
                    onChange={(e) => setNewGiftCard({...newGiftCard, minDeposit: parseFloat(e.target.value)})}
                  />
                </div>
                <Button onClick={handleAddGiftCard} className="w-full bg-blue-500">
                  <Plus className="w-4 h-4 mr-2" /> Create Gift Card
                </Button>
              </div>
              <div className="space-y-3 pt-4 border-t border-blue-900/50">
                {giftCards.map((card) => (
                  <div key={card.id} className="flex items-center justify-between p-3 bg-blue-900/20 rounded-lg border border-blue-800/30">
                    <div>
                      <p className="text-xs font-bold text-white">{card.code}</p>
                      <p className="text-[10px] text-blue-300">₹{card.amount} • Min Dep: ₹{card.minDeposit} • {card.status}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400"
                      onClick={() => handleRemoveGiftCard(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="banners" className="mt-4 space-y-4">
            <Card className="border-none bg-[#2b3270] p-4 space-y-4">
              <h3 className="text-sm font-bold text-white">Manage Home Banners</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-[10px] text-blue-300">Upload Image or Enter URL</label>
                  <Input 
                    type="file"
                    accept="image/*"
                    className="bg-blue-900/30 border-blue-800/50 text-white text-xs h-8"
                    onChange={(e) => handleImageUpload(e, (url) => setNewBannerUrl(url))}
                  />
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Or Banner Image URL" 
                      className="bg-blue-900/30 border-blue-800/50 text-white"
                      value={newBannerUrl}
                      onChange={(e) => setNewBannerUrl(e.target.value)}
                    />
                    <Button onClick={handleAddBanner} className="bg-blue-500">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {newBannerUrl && <img src={newBannerUrl} className="w-full h-20 object-cover rounded" referrerPolicy="no-referrer" />}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {banners.map((url, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-blue-900/20 rounded-lg border border-blue-800/30">
                    <img src={url} alt="Banner" className="w-20 h-12 object-cover rounded" referrerPolicy="no-referrer" />
                    <span className="flex-1 text-[10px] text-blue-300 truncate">{url}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:text-red-300"
                      onClick={() => handleRemoveBanner(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4 space-y-6">
            <Card className="border-none bg-[#2b3270] p-4 space-y-4">
              <h3 className="text-sm font-bold text-white">App Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-blue-300">Min. Deposit (₹)</label>
                  <Input 
                    type="number"
                    value={settings.minDeposit}
                    onChange={(e) => setSettings({...settings, minDeposit: parseFloat(e.target.value)})}
                    className="bg-blue-900/30 border-blue-800/50 text-white" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-blue-300">Min. Withdrawal (₹)</label>
                  <Input 
                    type="number"
                    value={settings.minWithdrawal}
                    onChange={(e) => setSettings({...settings, minWithdrawal: parseFloat(e.target.value)})}
                    className="bg-blue-900/30 border-blue-800/50 text-white" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-blue-300">Admin UPI ID (for QR Generation)</label>
                <Input 
                  value={settings.adminUpi}
                  onChange={(e) => setSettings({...settings, adminUpi: e.target.value})}
                  className="bg-blue-900/30 border-blue-800/50 text-white font-mono" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-blue-300">WhatsApp Support Number</label>
                <Input 
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({...settings, whatsapp: e.target.value})}
                  className="bg-blue-900/30 border-blue-800/50 text-white" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-blue-300">Customer Support Username</label>
                <Input 
                  value={settings.customerSupport}
                  onChange={(e) => setSettings({...settings, customerSupport: e.target.value})}
                  className="bg-blue-900/30 border-blue-800/50 text-white" 
                />
              </div>
              <Button onClick={handleSaveSettings} className="w-full bg-blue-500 hover:bg-blue-600 font-bold">
                Save All Settings
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
