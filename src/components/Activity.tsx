import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Bell, ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';
import { ActivityItem, GiftCard, User } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, orderBy, getDocs, where, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';

interface ActivityProps {
  onNavigate: (page: any) => void;
  user: User;
}

export default function Activity({ onNavigate, user }: ActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [giftCode, setGiftCode] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activityData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ActivityItem))
        .filter(act => act.type !== 'offer');
      
      if (activityData.length > 0) {
        setActivities(activityData);
      } else {
        setActivities([
          {
            id: '1',
            title: 'Welcome Event',
            description: 'Join our community for exclusive rewards!',
            imageUrl: 'https://picsum.photos/seed/bonus/800/400',
            type: 'banner',
            createdAt: Date.now()
          }
        ]);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activities'));

    return () => unsubscribe();
  }, []);

  const handleClaimGift = async () => {
    if (!giftCode.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    try {
      const q = query(collection(db, 'giftcards'), where('code', '==', giftCode.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast.error('Invalid gift code');
        return;
      }

      const cardDoc = querySnapshot.docs[0];
      const cardData = cardDoc.data() as GiftCard;

      if (cardData.status !== 'available' || cardData.usedCount >= 1) {
        toast.error('This gift code has already been claimed');
        return;
      }

      // Check min deposit requirement
      if (user.totalDeposit < cardData.minDeposit) {
        toast.error(`You need a total deposit of at least ₹${cardData.minDeposit} to claim this gift card. Your current total deposit: ₹${user.totalDeposit}`);
        return;
      }

      // Update card status
      await updateDoc(doc(db, 'giftcards', cardDoc.id), {
        status: 'claimed',
        usedCount: 1,
        claimedBy: [user.phone]
      });

      // Update user balance
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(cardData.amount)
      });

      // Add transaction history
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'gift',
        amount: cardData.amount,
        status: 'completed',
        createdAt: serverTimestamp(),
        description: `Gift card ${giftCode} claimed`
      });

      toast.success(`Successfully claimed ₹${cardData.amount}!`);
      setGiftCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'gift-claim');
    }
  };

  return (
    <Layout onNavigate={onNavigate} activeTab="activity">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col min-h-screen pb-20"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] text-white sticky top-0 z-50 shadow-md">
          <h1 className="text-lg font-bold">Activity</h1>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Gift Card Section */}
        <div className="p-4">
          <Card className="border-none bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-50">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <Gift className="w-6 h-6" />
                <h2 className="text-base font-black uppercase tracking-tight">Claim Gift Card</h2>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enter your gift code below to claim your reward.</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter Gift Code" 
                  className="bg-gray-50 border-gray-100 text-gray-800 font-bold rounded-xl h-12"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value)}
                />
                <Button onClick={handleClaimGift} className="bg-gradient-to-r from-[#ff7e7e] to-[#ff4d4d] hover:opacity-90 text-white font-bold rounded-xl h-12 px-6">
                  Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <div className="px-4 space-y-4">
          <div className="flex items-center gap-2 pl-2">
            <div className="w-1 h-4 bg-red-500 rounded-full" />
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">Latest Events</h3>
          </div>
          {activities.map((activity) => (
            <motion.div 
              key={activity.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group cursor-pointer"
            >
              <Card className="border-none bg-white overflow-hidden shadow-sm rounded-2xl border border-gray-50">
                <img 
                  src={activity.imageUrl} 
                  alt={activity.title} 
                  className="w-full h-44 object-cover"
                  referrerPolicy="no-referrer"
                />
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">{activity.title}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">{activity.description}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:translate-x-1 transition-transform">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Support Section */}
        <div className="p-4 mt-4">
          <Card className="border-none bg-white shadow-sm rounded-2xl border border-gray-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800">Need help?</span>
                  <span className="text-[10px] text-gray-400">Contact our 24/7 support team</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-red-500 border-red-100 hover:bg-red-50 text-[10px] font-bold rounded-lg px-4 h-8">
                Chat Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
