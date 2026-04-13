import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Wallet, CreditCard, TrendingUp, History, Bell, Gift, Settings, ShieldCheck, CircleHelp, Info, MessageSquare, LogOut, ChevronRight, RefreshCw, Star, Lock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { User as UserType } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

interface ProfileProps {
  onNavigate: (page: any) => void;
  onLogout: () => void;
  onClearCache: () => void;
  user: UserType;
}

export default function Profile({ onNavigate, onLogout, onClearCache, user }: ProfileProps) {
  const isAdmin = user.role === 'admin';
  const [balance, setBalance] = React.useState<number>(user.balance);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
  const [passwords, setPasswords] = React.useState({
    old: '',
    new: '',
    confirm: ''
  });
  const [showPass, setShowPass] = React.useState({
    old: false,
    new: false,
    confirm: false
  });

  const handleChangePassword = async () => {
    if (!passwords.old || !passwords.new || !passwords.confirm) {
      toast.error('Please fill all fields');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (user.password !== passwords.old) {
      toast.error('Incorrect old password');
      return;
    }

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { password: passwords.new });
      toast.success('Password changed successfully!');
      setIsChangePasswordOpen(false);
      setPasswords({ old: '', new: '', confirm: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

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
      case 'Whatsapp Support': {
        window.open(`https://wa.me/919999999999`, '_blank');
        break;
      }
      case 'Customer Support Online 24/7': {
        window.open(`https://t.me/LakshmiSupport`, '_blank');
        break;
      }
      default: toast.info(`${action} feature is coming soon!`);
    }
  };

  return (
    <Layout onNavigate={onNavigate} activeTab="profile">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col min-h-screen pb-20"
      >
        {/* Header */}
        <div className="bg-gradient-to-b from-blue-600 to-blue-800 p-6 text-white space-y-6">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.1 }}
              className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30"
            >
              <User className="w-10 h-10 text-white" />
            </motion.div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-xs opacity-80">UID | {user.id}</p>
              <p className="text-xs opacity-80">Mobile Number: {user.phone}</p>
            </div>
          </div>

          <Card className="border-none bg-white/10 backdrop-blur-md shadow-lg overflow-hidden">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] opacity-80">Total Balance</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">₹{balance.toFixed(2)}</h3>
                    <RefreshCw 
                      className="w-4 h-4 opacity-80 cursor-pointer hover:rotate-180 transition-transform duration-500" 
                      onClick={refreshBalance}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-white opacity-80" onClick={() => onNavigate('wallet')}>
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Wallet, label: 'Wallet', color: 'bg-red-500', page: 'wallet' },
                  { icon: CreditCard, label: 'Deposit', color: 'bg-yellow-500', action: 'Deposit' },
                  { icon: TrendingUp, label: 'Withdraw', color: 'bg-blue-500', action: 'Withdraw' },
                  { icon: Star, label: 'VIP', color: 'bg-green-500', action: 'VIP' },
                ].map((item, i) => (
                  <motion.button 
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1"
                    onClick={() => item.page ? onNavigate(item.page) : handleAction(item.action!)}
                  >
                    <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px]">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Safe Section */}
        <div className="px-4 -mt-2 mb-6">
          <motion.div whileHover={{ scale: 1.02 }} onClick={() => handleAction('Safe')}>
            <Card className="border-none bg-[#2b3270] shadow-lg cursor-pointer">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">Safe</h4>
                    <span className="text-xs font-bold text-blue-400">₹0.00 <ChevronRight className="inline w-3 h-3" /></span>
                  </div>
                  <p className="text-[10px] text-blue-300 leading-tight">Daily interest rate 0.1% + VIP extra income safe, calculated every 1 minute</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* History Grid */}
        <div className="px-4 grid grid-cols-2 gap-3 mb-8">
          {[
            { icon: History, label: 'Bet', sub: 'My betting history', color: 'bg-blue-500' },
            { icon: RefreshCw, label: 'Transaction', sub: 'My transaction history', color: 'bg-green-500' },
            { icon: CreditCard, label: 'Deposit', sub: 'My deposit history', color: 'bg-red-500' },
            { icon: TrendingUp, label: 'Withdraw', sub: 'My withdraw history', color: 'bg-yellow-500' },
          ].map((item, i) => (
            <motion.div key={i} whileTap={{ scale: 0.95 }} onClick={() => handleAction(item.label)}>
              <Card className="border-none bg-[#2b3270] shadow-lg p-4 flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{item.label}</p>
                  <p className="text-[8px] text-blue-300">{item.sub}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Menu List */}
        <div className="px-4 space-y-3 mb-8">
          <Card className="border-none bg-[#2b3270] shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {[
                { icon: Bell, label: 'Notification', color: 'text-blue-400' },
                { icon: Gift, label: 'Gifts', color: 'text-pink-400', onClick: () => onNavigate('activity') },
                { icon: TrendingUp, label: 'Game statistics', color: 'text-orange-400' },
                { icon: Star, label: 'Language', color: 'text-yellow-400', extra: 'English' },
                ...(isAdmin ? [{ icon: Settings, label: 'Admin Panel', color: 'text-red-400', onClick: () => onNavigate('admin') }] : []),
              ].map((item: any) => (
                <motion.div 
                  key={item.label} 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="flex items-center justify-between p-4 border-b border-blue-900/50 last:border-none cursor-pointer" 
                  onClick={item.onClick || (() => handleAction(item.label))}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="text-xs text-white">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.extra && <span className="text-xs text-blue-300">{item.extra}</span>}
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none bg-[#2b3270] shadow-lg overflow-hidden">
            <CardContent className="p-0">
              {[
                { label: 'Change Password', icon: Lock, color: 'text-blue-400' },
                { label: 'Security & Safety' },
                { label: 'Guide for beginners' },
                { label: 'About Us' },
                { label: 'Salary Record' },
                { label: 'Whatsapp Support' },
                { label: 'Customer Support Online 24/7' },
              ].map((item: any) => (
                <motion.div 
                  key={item.label} 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  className="flex items-center justify-between p-4 border-b border-blue-900/50 last:border-none cursor-pointer"
                  onClick={() => handleAction(item.label)}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className={`w-5 h-5 ${item.color}`} />}
                    <span className="text-xs text-white">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400" />
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <Button 
            variant="outline" 
            className="w-full h-12 border-blue-400 text-blue-400 hover:bg-blue-400/10 font-bold rounded-full"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </Button>

          <Button 
            variant="ghost" 
            className="w-full h-12 text-red-400 hover:bg-red-400/10 font-bold rounded-full"
            onClick={onClearCache}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Clear Cache
          </Button>
        </div>
      </motion.div>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent className="bg-[#1a1a2e] border-blue-900/50 text-white max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-400" /> Change Password
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-200 block">Old Password</span>
              <div className="relative">
                <Input 
                  type={showPass.old ? 'text' : 'password'}
                  className="bg-[#2b3270] border-blue-900/50 text-white pr-10"
                  value={passwords.old}
                  onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400"
                  onClick={() => setShowPass({...showPass, old: !showPass.old})}
                >
                  {showPass.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-200 block">New Password</span>
              <div className="relative">
                <Input 
                  type={showPass.new ? 'text' : 'password'}
                  className="bg-[#2b3270] border-blue-900/50 text-white pr-10"
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400"
                  onClick={() => setShowPass({...showPass, new: !showPass.new})}
                >
                  {showPass.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-blue-200 block">Confirm New Password</span>
              <div className="relative">
                <Input 
                  type={showPass.confirm ? 'text' : 'password'}
                  className="bg-[#2b3270] border-blue-900/50 text-white pr-10"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400"
                  onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})}
                >
                  {showPass.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl h-12"
              onClick={handleChangePassword}
            >
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
