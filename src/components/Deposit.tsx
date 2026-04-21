import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, Copy, CheckCircle2, QrCode, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { AppSettings, DepositRequest, User } from '../types';

interface DepositProps {
  onBack: () => void;
  user: User;
}

import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';

export default function Deposit({ onBack, user }: DepositProps) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1);
  const [utr, setUtr] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    minDeposit: 100,
    minWithdrawal: 200,
    adminUpi: 'lakshmi.club@upi',
    whatsapp: '',
    customerSupport: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() as AppSettings }));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const generateOrderNumber = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 11; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleNext = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (numAmount < settings.minDeposit) {
      toast.error(`Minimum deposit is ₹${settings.minDeposit}`);
      return;
    }
    setOrderNumber(generateOrderNumber());
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!utr || utr.length < 12) {
      toast.error('Please enter a valid 12-digit UTR number');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRequest = {
        userId: user.id,
        phone: user.phone,
        amount: parseFloat(amount),
        utr,
        status: 'pending',
        createdAt: serverTimestamp(),
        orderNumber
      };

      await addDoc(collection(db, 'deposits'), newRequest);

      toast.success('Deposit request submitted! Admin will verify soon.');
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deposits');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const upiUrl = `upi://pay?pa=${settings.adminUpi}&pn=LakshmiClub&am=${amount}&cu=INR&tn=Order_${orderNumber}`;

  return (
    <div className="min-h-screen bg-[#f8f3f3] text-gray-900 border-none">
      {/* Header */}
      <div className="p-4 flex items-center bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10 mr-2">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-bold">Deposit</h1>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-6"
          >
            <Card className="border-none bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <QrCode className="w-4 h-4" />
                  <span className="text-sm font-medium">Enter Deposit Amount</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-red-500">₹</span>
                  <Input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-16 pl-10 text-3xl font-bold bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-200 rounded-2xl"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 200, 500, 1000, 10000, 20000].map((val) => (
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
              </div>
            </Card>

            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Instructions</span>
              </div>
              <ul className="text-[11px] text-gray-600 space-y-2 list-disc pl-4 opacity-80 font-medium">
                <li>Minimum deposit amount is ₹{settings.minDeposit}.</li>
                <li>Please ensure you pay the exact amount entered.</li>
                <li>After payment, you must submit the 12-digit UTR number.</li>
                <li>Deposit will be credited after admin verification (usually 5-30 mins).</li>
              </ul>
            </div>

            <Button 
              className="w-full h-14 bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-100"
              onClick={handleNext}
            >
              Deposit Now
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-4 space-y-6"
          >
            <Card className="border-none bg-white p-6 text-center space-y-6 shadow-sm border border-gray-100">
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Scan QR to Pay</p>
                <h2 className="text-3xl font-bold text-gray-800">₹{parseFloat(amount).toFixed(2)}</h2>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="px-4 py-1.5 bg-red-50 border border-red-100 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-mono font-bold text-red-500">{formatTime(timeLeft)}</span>
                </div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Payment expires in</p>
              </div>

              <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-md border border-gray-50">
                <QRCodeSVG value={upiUrl} size={200} />
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">UPI ID</p>
                    <p className="text-sm font-mono text-gray-800">{settings.adminUpi}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(settings.adminUpi, 'UPI ID')} className="text-red-500 hover:bg-red-50">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Order Number</p>
                    <p className="text-sm font-mono text-gray-800">{orderNumber}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(orderNumber, 'Order Number')} className="text-red-500 hover:bg-red-50">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="border-none bg-white p-6 space-y-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Submit UTR Number</span>
              </div>
              <Input 
                placeholder="Enter 12-digit UTR Number"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                className="h-12 bg-gray-50 border-gray-100 text-gray-800 placeholder:text-gray-300 rounded-xl font-mono text-center tracking-widest"
                maxLength={12}
              />
              <Button 
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-100"
                onClick={handleSubmit}
              >
                Submit Payment
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
