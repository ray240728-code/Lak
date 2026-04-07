import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gift, Bell, ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import Layout from './Layout';
import { ActivityItem, GiftCard } from '../types';

interface ActivityProps {
  onNavigate: (page: any) => void;
}

export default function Activity({ onNavigate }: ActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [giftCode, setGiftCode] = useState('');

  useEffect(() => {
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
  }, []);

  const handleClaimGift = () => {
    if (!giftCode.trim()) {
      toast.error('Please enter a gift code');
      return;
    }

    const giftCards: GiftCard[] = JSON.parse(localStorage.getItem('lakshmi_giftcards') || '[]');
    const cardIndex = giftCards.findIndex(c => c.code === giftCode && c.status === 'available');

    if (cardIndex !== -1) {
      const card = giftCards[cardIndex];
      
      // Check min deposit requirement
      const userStr = localStorage.getItem('lakshmi_user');
      const user = userStr ? JSON.parse(userStr) : { totalDeposit: 500 }; // Mock total deposit if not found

      if (user.totalDeposit < card.minDeposit) {
        toast.error(`You need a total deposit of at least ₹${card.minDeposit} to claim this gift card. Your current total deposit: ₹${user.totalDeposit}`);
        return;
      }

      // Mark as claimed
      giftCards[cardIndex].status = 'claimed';
      giftCards[cardIndex].claimedBy = 'user123';
      localStorage.setItem('lakshmi_giftcards', JSON.stringify(giftCards));

      // Update balance
      const currentBalance = parseFloat(localStorage.getItem('lakshmi_balance') || '101.00');
      const newBalance = currentBalance + card.amount;
      localStorage.setItem('lakshmi_balance', newBalance.toString());

      // Add to transaction history
      const transactions = JSON.parse(localStorage.getItem('lakshmi_transactions') || '[]');
      const newTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'gift',
        amount: card.amount,
        status: 'completed',
        timestamp: Date.now(),
        description: `Gift card ${card.code} claimed`
      };
      localStorage.setItem('lakshmi_transactions', JSON.stringify([newTransaction, ...transactions]));

      toast.success(`Successfully claimed ₹${card.amount}!`);
      setGiftCode('');
    } else {
      toast.error('Invalid or already claimed gift code');
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
        <div className="p-4 flex items-center justify-between bg-blue-600 text-white">
          <h1 className="text-xl font-bold">Activity</h1>
          <Button variant="ghost" size="icon" className="text-white">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Gift Card Section */}
        <div className="p-4">
          <Card className="border-none bg-[#2b3270] shadow-lg overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <Gift className="w-6 h-6" />
                <h2 className="text-lg font-bold text-white">Claim Gift Card</h2>
              </div>
              <p className="text-xs text-blue-300">Enter your gift code below to claim your reward.</p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter Gift Code" 
                  className="bg-blue-900/30 border-blue-800/50 text-white"
                  value={giftCode}
                  onChange={(e) => setGiftCode(e.target.value)}
                />
                <Button onClick={handleClaimGift} className="bg-blue-500 hover:bg-blue-600">
                  Claim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activities List */}
        <div className="px-4 space-y-4">
          <h3 className="text-sm font-bold text-white pl-2 border-l-4 border-blue-400">Latest Offers & Events</h3>
          {activities.map((activity) => (
            <motion.div 
              key={activity.id}
              whileHover={{ scale: 1.02 }}
              className="group cursor-pointer"
            >
              <Card className="border-none bg-[#2b3270] overflow-hidden shadow-md">
                <img 
                  src={activity.imageUrl} 
                  alt={activity.title} 
                  className="w-full h-40 object-cover"
                  referrerPolicy="no-referrer"
                />
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-white">{activity.title}</h4>
                      <p className="text-xs text-blue-300">{activity.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Support Section */}
        <div className="p-4 mt-4">
          <Card className="border-none bg-blue-900/20 border border-blue-800/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="text-xs text-white">Need help? Contact Support</span>
              </div>
              <Button variant="ghost" size="sm" className="text-blue-400 text-[10px]">
                Chat Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </Layout>
  );
}
