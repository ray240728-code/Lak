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

import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    minDeposit: 100,
    minWithdrawal: 200,
    adminUpi: '',
    whatsapp: '',
    customerSupport: ''
  });

  useEffect(() => {
    // Real-time balance
    const unsubscribeBalance = onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
    });

    // Real-time settings
    const unsubscribeSettings = onSnapshot(doc(db, 'config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() as AppSettings }));
      }
    });

    return () => {
      unsubscribeBalance();
      unsubscribeSettings();
    };
  }, [user.id]);

  const generateOrderNumber = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async () => {
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

    setIsSubmitting(true);
    try {
      // Deduct balance first
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        balance: increment(-numAmount)
      });

      const newRequest = {
        userId: user.id,
        phone: user.phone,
        amount: numAmount,
        method,
        details: method === 'upi' ? { upiId } : bankDetails,
        status: 'pending',
        createdAt: serverTimestamp(),
        orderNumber: generateOrderNumber()
      };

      await addDoc(collection(db, 'withdrawals'), newRequest);

      toast.success('Withdrawal request submitted! Admin will verify soon.');
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900">
      {/* Header */}
      <div className="p-4 flex items-center bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50 shadow-md">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 mr-2">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Withdraw</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Balance Card */}
        <Card className="border-none bg-gradient-to-br from-[#ff7e7e] to-[#ff4d4d] p-6 text-center space-y-2 rounded-2xl shadow-lg shadow-red-100">
          <p className="text-[10px] text-white/80 uppercase tracking-widest font-bold">Available Balance</p>
          <h2 className="text-3xl font-black text-white italic">₹{balance.toFixed(2)}</h2>
        </Card>

        {/* Amount Input */}
        <Card className="border-none bg-white p-6 space-y-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400">
            <Wallet className="w-4 h-4" />
            <span className="text-sm font-medium">Withdrawal Amount</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-red-500">₹</span>
            <Input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-14 pl-10 text-2xl font-bold bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-200 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[200, 500, 1000, 2000, 5000, 10000].map((val) => (
              <Button 
                key={val}
                variant="outline"
                className={`h-10 border-gray-100 text-gray-600 rounded-xl transition-colors ${amount === val.toString() ? 'bg-red-500 border-red-400 text-white shadow-md' : 'bg-white hover:bg-gray-50'}`}
                onClick={() => setAmount(val.toString())}
              >
                ₹{val}
              </Button>
            ))}
          </div>
        </Card>

        {/* Withdrawal Method */}
        <Card className="border-none bg-white p-6 space-y-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 text-gray-400">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-medium">Withdrawal Method</span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={method === 'upi' ? 'default' : 'outline'}
              className={`flex-1 h-12 rounded-xl transition-all ${method === 'upi' ? 'bg-red-500 border-red-400 text-white shadow-md' : 'border-gray-100 text-gray-600 bg-white hover:bg-gray-50'}`}
              onClick={() => setMethod('upi')}
            >
              UPI ID
            </Button>
            <Button 
              variant={method === 'bank' ? 'default' : 'outline'}
              className={`flex-1 h-12 rounded-xl transition-all ${method === 'bank' ? 'bg-red-500 border-red-400 text-white shadow-md' : 'border-gray-100 text-gray-600 bg-white hover:bg-gray-50'}`}
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
                  className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl"
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
                  className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl"
                />
                <Input 
                  placeholder="Account Number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({...bankDetails, accountNumber: e.target.value})}
                  className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl"
                />
                <Input 
                  placeholder="IFSC Code"
                  value={bankDetails.ifscCode}
                  onChange={(e) => setBankDetails({...bankDetails, ifscCode: e.target.value})}
                  className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl"
                />
                <Input 
                  placeholder="Account Holder Name"
                  value={bankDetails.holderName}
                  onChange={(e) => setBankDetails({...bankDetails, holderName: e.target.value})}
                  className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-3">
          <div className="flex items-center gap-2 text-red-500">
            <Info className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Instructions</span>
          </div>
          <ul className="text-[11px] text-gray-600 space-y-2 list-disc pl-4 opacity-80 font-medium">
            <li>Minimum withdrawal amount is ₹{settings.minWithdrawal}.</li>
            <li>Withdrawals are processed within 24 hours.</li>
            <li>Please ensure your payment details are correct.</li>
            <li>Platform fee of 3% may apply on withdrawals.</li>
          </ul>
        </div>

        <Button 
          className="w-full h-14 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-100 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            'Withdraw Now'
          )}
        </Button>
      </div>
    </div>
  );
}
