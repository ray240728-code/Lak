import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Shield, 
  History, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Bell, 
  Gift, 
  BarChart3, 
  Globe, 
  Headphones, 
  RefreshCw, 
  Trophy,
  ClipboardList,
  CreditCard,
  User as UserIcon,
  Copy,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';
import { doc, updateDoc, getDoc, query, collection, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { User as UserType } from '../types';

interface ProfileProps {
  onNavigate: (page: any) => void;
  onLogout: () => void;
  user: UserType;
  onClearCache: () => void;
}

export default function Profile({ onNavigate, onLogout, user, onClearCache }: ProfileProps) {
  const [balance, setBalance] = useState<number>(user.balance);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isGiftCardOpen, setIsGiftCardOpen] = useState(false);
  const [giftCode, setGiftCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ old: false, new: false, confirm: false });

  const refreshBalance = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserType;
        setBalance(userData.balance);
        toast.success('Balance updated!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.id}`);
    }
  };

  const handleUpdatePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }

    if (user.password && user.password !== passwords.old) {
      toast.error('Incorrect old password');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { password: passwords.new });
      toast.success('Password updated successfully');
      setIsChangePasswordOpen(false);
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (error) {
      toast.error('Failed to update password');
    }
  };

  const handleRedeemGiftCard = async () => {
    if (!giftCode.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    setIsRedeeming(true);
    try {
      const q = query(collection(db, 'giftcards'), where('code', '==', giftCode.trim()), where('status', '==', 'available'));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Invalid or expired gift card');
        return;
      }

      const giftDoc = querySnapshot.docs[0];
      const giftData = giftDoc.data();

      // Check if user already claimed this specific gift card
      if (giftData.claimedBy && giftData.claimedBy.includes(user.id)) {
        toast.error('You have already claimed this gift card');
        return;
      }

      // Check min deposit requirement
      if (user.totalDeposit < (giftData.minDeposit || 0)) {
        toast.error(`Minimum deposit of ₹${giftData.minDeposit} required to claim this gift card`);
        return;
      }

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.id);
        const giftRef = doc(db, 'giftcards', giftDoc.id);

        transaction.update(userRef, { 
          balance: increment(giftData.amount) 
        });

        const newUsedCount = (giftData.usedCount || 0) + 1;
        const newClaimedBy = [...(giftData.claimedBy || []), user.id];
        
        transaction.update(giftRef, {
          usedCount: newUsedCount,
          claimedBy: newClaimedBy,
          status: newUsedCount >= (giftData.maxUses || 1) ? 'claimed' : 'available'
        });

        // Add transaction record
        const logRef = doc(collection(db, 'transactions'));
        transaction.set(logRef, {
          userId: user.id,
          type: 'gift',
          amount: giftData.amount,
          status: 'completed',
          timestamp: Date.now(),
          description: `Gift card redemption: ${giftCode}`
        });
      });

      toast.success(`Redeemed ₹${giftData.amount} successfully!`);
      setIsGiftCardOpen(false);
      setGiftCode('');
      refreshBalance();
    } catch (error) {
      console.error("Redemption error:", error);
      toast.error('Failed to redeem gift card');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'Security & Safety': onNavigate('security'); break;
      case 'Guide for beginners': onNavigate('guide'); break;
      case 'About Us': onNavigate('about'); break;
      case 'Salary Record': onNavigate('salary'); break;
      case 'Game statistics': onNavigate('game-stats'); break;
      case 'Bet': onNavigate('history-bet'); break;
      case 'Transaction': onNavigate('history-transaction'); break;
      case 'Deposit': onNavigate('history-deposit'); break;
      case 'Withdraw': onNavigate('history-withdraw'); break;
      case 'Change Password': setIsChangePasswordOpen(true); break;
      case 'Gifts': setIsGiftCardOpen(true); break;
      case 'VIP': toast.info('VIP System', {
        description: 'Increase your total deposit to level up and earn more commission!'
      }); break;
      default: toast.info(`${action} feature is coming soon!`);
    }
  };

  return (
    <Layout onNavigate={onNavigate} activeTab="profile">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col min-h-screen pb-24 bg-[#f8f3f3]"
      >
        {/* Top Header Section */}
        <div className="bg-gradient-to-b from-[#ff7e7e] to-[#ff4d4d] pt-12 pb-20 px-6 rounded-b-[3rem]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-white/50 overflow-hidden bg-white/20">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">{user.name}</h2>
                <div className="bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-300" />
                  <span className="text-[10px] font-bold text-white">VIP0</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-mono text-white flex items-center gap-1">
                  UID | {user.id.slice(0, 8)}
                  <Copy className="w-3 h-3 cursor-pointer" onClick={() => handleCopy(user.id, 'UID')} />
                </div>
              </div>
              <p className="text-[9px] text-white/70 mt-1">Last login: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="px-4 -mt-12">
          <Card className="border-none shadow-lg rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Total balance</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-gray-800">₹{balance.toFixed(2)}</h3>
                    <RefreshCw className="w-4 h-4 text-gray-400 cursor-pointer active:rotate-180 transition-transform" onClick={refreshBalance} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <button className="flex flex-col items-center gap-2" onClick={() => onNavigate('wallet')}>
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-red-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Wallet</span>
                </button>
                <button className="flex flex-col items-center gap-2" onClick={() => onNavigate('deposit')}>
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                    <ArrowUpCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Deposit</span>
                </button>
                <button className="flex flex-col items-center gap-2" onClick={() => onNavigate('withdraw')}>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <ArrowDownCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Withdraw</span>
                </button>
                <button className="flex flex-col items-center gap-2" onClick={() => handleAction('VIP')}>
                  <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">VIP</span>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Grid */}
        <div className="px-4 mt-6 grid grid-cols-2 gap-4">
          <button 
            className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 active:bg-gray-50 transition-colors"
            onClick={() => onNavigate('history-bet')}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">Game History</p>
              <p className="text-[9px] text-gray-400">My game history</p>
            </div>
          </button>
          <button 
            className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 active:bg-gray-50 transition-colors"
            onClick={() => onNavigate('history-transaction')}
          >
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">Transaction</p>
              <p className="text-[9px] text-gray-400">My transaction history</p>
            </div>
          </button>
          <button 
            className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 active:bg-gray-50 transition-colors"
            onClick={() => onNavigate('history-deposit')}
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ArrowUpCircle className="w-6 h-6 text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">Deposit</p>
              <p className="text-[9px] text-gray-400">My deposit history</p>
            </div>
          </button>
          <button 
            className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3 active:bg-gray-50 transition-colors"
            onClick={() => onNavigate('history-withdraw')}
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <ArrowDownCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">Withdraw</p>
              <p className="text-[9px] text-gray-400">My withdraw history</p>
            </div>
          </button>
        </div>

        {/* Menu List */}
        <div className="px-4 mt-6 space-y-2">
          <button className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-red-400" />
            </div>
            <span className="flex-1 text-left text-xs font-bold text-gray-700">Notification</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button 
            className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => handleAction('Gifts')}
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Gift className="w-4 h-4 text-red-400" />
            </div>
            <span className="flex-1 text-left text-xs font-bold text-gray-700">Gifts</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button 
            className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
            onClick={() => onNavigate('game-stats')}
          >
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-red-400" />
            </div>
            <span className="flex-1 text-left text-xs font-bold text-gray-700">Game statistics</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-red-400" />
            </div>
            <span className="flex-1 text-left text-xs font-bold text-gray-700">Language</span>
            <span className="text-[10px] font-bold text-gray-400">English</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          
          <div className="pt-4 space-y-2">
            <button 
              className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
              onClick={() => handleAction('Change Password')}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Lock className="w-4 h-4 text-blue-400" />
              </div>
              <span className="flex-1 text-left text-xs font-bold text-gray-700">Change Password</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <button 
              className="w-full h-14 bg-white rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-gray-50 transition-colors"
              onClick={() => handleAction('Security & Safety')}
            >
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-green-400" />
              </div>
              <span className="flex-1 text-left text-xs font-bold text-gray-700">Security & Safety</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            {user.role === 'admin' && (
              <button 
                className="w-full h-14 bg-red-50 rounded-xl flex items-center px-4 gap-4 shadow-sm active:bg-red-100 transition-colors"
                onClick={() => onNavigate('admin')}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="flex-1 text-left text-xs font-bold text-red-600">Admin Panel</span>
                <ChevronRight className="w-4 h-4 text-red-300" />
              </button>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-8">
          <Button 
            variant="outline" 
            className="w-full h-12 border-red-100 text-red-500 hover:bg-red-50 rounded-xl font-bold text-sm"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            LOG OUT
          </Button>
        </div>
      </motion.div>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="bg-white border-none text-gray-800 max-w-sm rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-500" /> Change Password
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-widest">Old Password</span>
              <div className="relative">
                <Input 
                  type={showPass.old ? 'text' : 'password'}
                  className="bg-gray-50 border-gray-100 text-gray-800 pr-10 rounded-xl h-12"
                  value={passwords.old}
                  onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass({...showPass, old: !showPass.old})}
                >
                  {showPass.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-widest">New Password</span>
              <div className="relative">
                <Input 
                  type={showPass.new ? 'text' : 'password'}
                  className="bg-gray-50 border-gray-100 text-gray-800 pr-10 rounded-xl h-12"
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass({...showPass, new: !showPass.new})}
                >
                  {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-widest">Confirm New Password</span>
              <div className="relative">
                <Input 
                  type={showPass.confirm ? 'text' : 'password'}
                  className="bg-gray-50 border-gray-100 text-gray-800 pr-10 rounded-xl h-12"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})}
                >
                  {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black rounded-xl h-12 shadow-lg shadow-red-100"
              onClick={handleUpdatePassword}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Gift Card Dialog */}
      <Dialog open={isGiftCardOpen} onOpenChange={setIsGiftCardOpen}>
        <DialogContent className="bg-white border-none text-gray-800 max-w-sm rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-800 flex items-center gap-2">
              <Gift className="w-6 h-6 text-red-500" /> Redeem Gift Card
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 mb-2">
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest leading-relaxed">
                Enter your redemption code below to receive your bonus instantly.
              </p>
            </div>
            
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-widest">Gift Code</span>
              <Input 
                placeholder="Ex: LAKSHMI-XXXX-XXXX"
                className="bg-gray-50 border-gray-100 text-gray-800 rounded-xl h-12 uppercase font-mono"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-black rounded-xl h-12 shadow-lg shadow-red-100"
              onClick={handleRedeemGiftCard}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'REDEEM NOW'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
