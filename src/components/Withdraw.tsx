import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, CreditCard, Wallet, Info, CheckCircle2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AppSettings, WithdrawalRequest, User } from '../types';

interface WithdrawProps {
  onBack: () => void;
  user: User;
}

export default function Withdraw({ onBack, user }: WithdrawProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    holderName: ''
  });
  const [balance, setBalance] = useState<number>(user.balance);
  const [settings, setSettings] = useState<AppSettings>({
    minDeposit: 100,
    minWithdrawal: 200,
    adminUpi: '',
    whatsapp: '',
    customerSupport: ''
  });

  useEffect(() => {
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const currentUser = users.find(u => u.phone === user.phone);
    if (currentUser) setBalance(currentUser.balance);

    const savedSettings = JSON.parse(localStorage.getItem('lakshmi_settings') || '{}');
    if (savedSettings.minWithdrawal) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }
  }, [user.phone]);

  const generateOrderNumber = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (numAmount < settings.minWithdrawal) {
      toast.error(`Minimum withdrawal is ₹${settings.minWithdrawal}`);
      return;
    }
    if (numAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (method === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }

    if (method === 'bank' && (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.holderName)) {
      toast.error('Please fill all bank details');
      return;
    }

    const user = JSON.parse(localStorage.getItem('lakshmi_auth') || '{}');
    const newRequest: WithdrawalRequest = {
      id: 'W' + Date.now(),
      userId: user.phone,
      amount: numAmount,
      method,
      details: method === 'upi' ? { upiId } : bankDetails,
      status: 'pending',
      timestamp: Date.now(),
      orderNumber: generateOrderNumber()
    };

    // Deduct balance immediately in lakshmi_users
    const users: User[] = JSON.parse(localStorage.getItem('lakshmi_users') || '[]');
    const updatedUsers = users.map(u => {
      if (u.phone === user.phone) {
        return { ...u, balance: u.balance - numAmount };
      }
      return u;
    });
    localStorage.setItem('lakshmi_users', JSON.stringify(updatedUsers));
    setBalance(balance - numAmount);

    const savedRequests = JSON.parse(localStorage.getItem('lakshmi_withdrawals') || '[]');
    localStorage.setItem('lakshmi_withdrawals', JSON.stringify([newRequest, ...savedRequests]));

    toast.success('Withdrawal request submitted! Admin will verify soon.');
    onBack();
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="p-4 flex items-center bg-[#2b3270] sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white mr-2">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Withdraw</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <Card className="border-none bg-gradient-to-br from-[#2b3270] to-[#1a1f4d] p-6 text-center space-y-2">
          <p className="text-xs text-blue-300 uppercase tracking-widest">Available Balance</p>
          <h2 className="text-3xl font-bold text-white">₹{balance.toFixed(2)}</h2>
        </Card>

        {/* Amount Input */}
        <Card className="border-none bg-[#2b3270] p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-300">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Withdrawal Amount</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-blue-400">₹</span>
            <Input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-14 pl-10 text-2xl font-bold bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[200, 500, 1000, 2000, 5000, 10000].map((val) => (
              <Button 
                key={val}
                variant="outline"
                className={`h-10 border-blue-500/30 text-blue-100 rounded-xl ${amount === val.toString() ? 'bg-blue-500 border-blue-400 text-white' : 'bg-blue-900/20'}`}
                onClick={() => setAmount(val.toString())}
              >
                ₹{val}
              </Button>
            ))}
          </div>
        </Card>

        {/* Withdrawal Method */}
        <Card className="border-none bg-[#2b3270] p-6 space-y-4">
          <div className="flex items-center gap-2 text-blue-300">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-medium">Withdrawal Method</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={method === 'upi' ? 'default' : 'outline'}
              className={`flex-1 h-12 rounded-xl ${method === 'upi' ? 'bg-blue-500 border-blue-400' : 'border-blue-500/30 text-blue-100 bg-blue-900/20'}`}
              onClick={() => setMethod('upi')}
            >
              UPI ID
            </Button>
            <Button 
              variant={method === 'bank' ? 'default' : 'outline'}
              className={`flex-1 h-12 rounded-xl ${method === 'bank' ? 'bg-blue-500 border-blue-400' : 'border-blue-500/30 text-blue-100 bg-blue-900/20'}`}
              onClick={() => setMethod('bank')}
            >
              Bank Card
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {method === 'upi' ? (
              <motion.div 
                key="upi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <Input 
                  placeholder="Enter your UPI ID"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="h-12 bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
                />
              </motion.div>
            ) : (
              <motion.div 
                key="bank"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <Input 
                  placeholder="Bank Name"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({...bankDetails, bankName: e.target.value})}
                  className="h-12 bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
                />
                <Input 
                  placeholder="Account Number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                  className="h-12 bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
                />
                <Input 
                  placeholder="IFSC Code"
                  value={bankDetails.ifscCode}
                  onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
                  className="h-12 bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
                />
                <Input 
                  placeholder="Account Holder Name"
                  value={bankDetails.holderName}
                  onChange={(e) => setBankDetails({...bankDetails, holderName: e.target.value})}
                  className="h-12 bg-blue-900/20 border-blue-500/30 text-white placeholder:text-blue-500/30 rounded-xl"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Info className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Instructions</span>
          </div>
          <ul className="text-[11px] text-blue-200 space-y-2 list-disc pl-4 opacity-80">
            <li>Minimum withdrawal amount is ₹{settings.minWithdrawal}.</li>
            <li>Withdrawals are processed within 24 hours.</li>
            <li>Please ensure your payment details are correct.</li>
            <li>Platform fee of 3% may apply on withdrawals.</li>
          </ul>
        </div>

        <Button 
          className="w-full h-14 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/20"
          onClick={handleSubmit}
        >
          Withdraw Now
        </Button>
      </div>
    </div>
  );
}
